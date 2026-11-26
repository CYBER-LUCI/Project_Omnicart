package com.omnicart.service.impl;

import com.omnicart.dto.response.DynamicPricingPreviewResponse;
import com.omnicart.dto.response.PriceLedgerResponse;
import com.omnicart.entity.PriceLedger;
import com.omnicart.entity.PriceLedgerSource;
import com.omnicart.entity.Product;
import com.omnicart.exception.ProductNotFoundException;
import com.omnicart.mapper.PriceLedgerMapper;
import com.omnicart.repository.OrderDetailsRepository;
import com.omnicart.repository.OrderRepository;
import com.omnicart.repository.PriceLedgerRepository;
import com.omnicart.repository.PriceLedgerSourceRepository;
import com.omnicart.repository.ProductRepository;
import com.omnicart.service.DynamicPricingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class DynamicPricingServiceImpl implements DynamicPricingService {

    private static final Logger log = LoggerFactory.getLogger(DynamicPricingServiceImpl.class);

    private static final int DEFAULT_INTERVAL_HOURS = 24;
    private static final int BENCHMARK_DEMAND_ORDERS = 5;

    // Hard margin safety bounds (Requirement 4)
    private static final double DEFAULT_MIN_PRICE_RATIO = 0.70; // 30% max discount floor
    private static final double DEFAULT_MAX_PRICE_RATIO = 1.40; // 40% max surge ceiling

    // Anti-Thrashing Hysteresis threshold (Requirement 3)
    private static final double HYSTERESIS_MIN_PERCENT_DELTA = 1.0; // 1.0% min change to append to ledger

    private final ProductRepository productRepository;
    private final OrderDetailsRepository orderDetailsRepository;
    private final PriceLedgerRepository priceLedgerRepository;
    private final PriceLedgerSourceRepository priceLedgerSourceRepository;
    private final OrderRepository orderRepository;

    public DynamicPricingServiceImpl(ProductRepository productRepository,
                                     OrderDetailsRepository orderDetailsRepository,
                                     PriceLedgerRepository priceLedgerRepository,
                                     PriceLedgerSourceRepository priceLedgerSourceRepository,
                                     OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderDetailsRepository = orderDetailsRepository;
        this.priceLedgerRepository = priceLedgerRepository;
        this.priceLedgerSourceRepository = priceLedgerSourceRepository;
        this.orderRepository = orderRepository;
    }

    private PriceLedgerSource getOrCreateDynamicPricingSource() {
        return priceLedgerSourceRepository.findById(7)
                .orElseGet(() -> {
                    PriceLedgerSource src = new PriceLedgerSource(7, "Dynamic Pricing Algorithm");
                    return priceLedgerSourceRepository.save(src);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public DynamicPricingPreviewResponse previewDynamicPrice(Long productId, Integer intervalHours, Long customerId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        int effectiveHours = (intervalHours != null && intervalHours > 0) ? intervalHours : DEFAULT_INTERVAL_HOURS;
        LocalDateTime since = LocalDateTime.now().minusHours(effectiveHours);

        // 1. Demand Velocity Signals
        Long demandOrders = orderDetailsRepository.countOrdersByMatchingProductNameSince(productId, since);
        if (demandOrders == null) demandOrders = 0L;

        Long demandUnits = orderDetailsRepository.sumQuantityByProductIdSince(productId, since);
        if (demandUnits == null) demandUnits = 0L;

        double demandDelta = (double) (demandOrders - BENCHMARK_DEMAND_ORDERS) / BENCHMARK_DEMAND_ORDERS;
        double demandAdj = Math.max(-0.06, Math.min(0.09, demandDelta * 0.05));
        String demandSignalName;
        if (demandOrders >= 8) {
            demandSignalName = String.format("Surging Real-Time Demand (%d orders in %dh)", demandOrders, effectiveHours);
        } else if (demandOrders <= 1) {
            demandSignalName = String.format("Off-Peak Demand Volume (%d orders in %dh)", demandOrders, effectiveHours);
        } else {
            demandSignalName = String.format("Steady Retail Velocity (%d orders in %dh)", demandOrders, effectiveHours);
        }

        // Requirement 5: Intent Velocity / Conversion Pressure (high unit purchase velocity in interval)
        double intentVelocityAdj = 0.0;
        if (demandUnits >= 10) {
            intentVelocityAdj = 0.02; // +2% conversion pressure
        } else if (demandUnits >= 5) {
            intentVelocityAdj = 0.01;
        }

        // 2. Temporal & Competition Signals
        LocalDateTime now = LocalDateTime.now();
        int hour = now.getHour();
        DayOfWeek day = now.getDayOfWeek();

        double timeAdj = 0.0;
        String timeSignalDesc;
        if (hour >= 18 && hour <= 22) {
            timeAdj = 0.035;
            timeSignalDesc = "Peak Evening Window (18:00 - 22:00)";
        } else if (hour >= 12 && hour <= 14) {
            timeAdj = 0.015;
            timeSignalDesc = "Midday Shopping Window (12:00 - 14:00)";
        } else if (hour >= 1 && hour <= 6) {
            timeAdj = -0.025;
            timeSignalDesc = "Late Night Off-Peak (01:00 - 06:00)";
        } else {
            timeSignalDesc = "Standard Shopping Hours";
        }

        double weekendAdj = 0.0;
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
            weekendAdj = 0.025;
            timeSignalDesc += " • Weekend Traffic Surge";
        }
        double temporalAdj = timeAdj + weekendAdj;

        // 3. Multi-Seller Inventory & Scarcity Signals
        Integer totalStock = productRepository.findTotalStockByProductId(productId);
        if (totalStock == null || totalStock <= 0) {
            totalStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        }

        double inventoryAdj = 0.0;
        String inventorySignalName;
        if (totalStock <= 3) {
            inventoryAdj = 0.12; // +12% extreme critical scarcity
            inventorySignalName = String.format("Ultra-Critical Scarcity (%d left across all sellers)", totalStock);
        } else if (totalStock <= 8) {
            inventoryAdj = 0.06; // +6% low stock pressure
            inventorySignalName = String.format("Low Stock Reserve Pressure (%d left across all sellers)", totalStock);
        } else if (totalStock >= 40) {
            inventoryAdj = -0.06;
            inventorySignalName = String.format("Surplus Inventory Clearance (%d units)", totalStock);
        } else if (totalStock >= 25) {
            inventoryAdj = -0.02;
            inventorySignalName = String.format("Ample Stock Buffer (%d units)", totalStock);
        } else {
            inventorySignalName = String.format("Balanced Marketplace Inventory (%d units)", totalStock);
        }

        // 4. Customer Segmentation Loyalty Incentive
        double customerAdj = 0.0;
        String customerSegmentName = "Marketplace Guest / Standard";
        if (customerId != null && customerId > 0) {
            long pastOrderCount = orderRepository.countByCustomerId(customerId);
            BigDecimal totalSpent = orderRepository.calculateCustomerTotalSpent(customerId);
            if (pastOrderCount >= 3 || (totalSpent != null && totalSpent.compareTo(BigDecimal.valueOf(5000)) >= 0)) {
                customerAdj = -0.05;
                customerSegmentName = String.format("VIP Loyalty Privilege (Past Orders: %d)", pastOrderCount);
            } else if (pastOrderCount == 0) {
                customerAdj = -0.04;
                customerSegmentName = "First-Time Customer Welcome Incentive";
            } else {
                customerSegmentName = String.format("Valued Returning Customer (Past Orders: %d)", pastOrderCount);
            }
        }

        // Baseline and Current Price Resolution
        Optional<PriceLedger> latestSellerOpt = priceLedgerRepository.findLatestSellerPrice(productId);
        Optional<PriceLedger> baselineOpt = priceLedgerRepository.findBaselineByProductId(productId);
        Optional<PriceLedger> latestOpt = priceLedgerRepository.findLatestByProductId(productId);

        BigDecimal basePrice = latestSellerOpt.map(PriceLedger::getPrice)
                .orElse(baselineOpt.map(PriceLedger::getPrice)
                        .orElse(latestOpt.map(PriceLedger::getPrice).orElse(BigDecimal.valueOf(999))));
        BigDecimal currentPrice = latestOpt.map(PriceLedger::getPrice).orElse(basePrice);

        // Combined Net Multiplier
        double netMultiplier = 1.0 + demandAdj + temporalAdj + inventoryAdj + customerAdj + intentVelocityAdj;

        // Requirement 1: Multiplier Factor Breakdown
        BigDecimal demandFactor = BigDecimal.valueOf(1.0 + demandAdj + intentVelocityAdj).setScale(4, RoundingMode.HALF_UP);
        BigDecimal scarcityFactor = BigDecimal.valueOf(1.0 + inventoryAdj).setScale(4, RoundingMode.HALF_UP);
        BigDecimal competitionFactor = BigDecimal.valueOf(1.0 + temporalAdj).setScale(4, RoundingMode.HALF_UP);

        BigDecimal rawCalculatedPrice = basePrice.multiply(BigDecimal.valueOf(netMultiplier)).setScale(2, RoundingMode.HALF_UP);

        // Requirement 4: Hard Margin Guardrails (min_floor_price & max_ceiling_price)
        BigDecimal minFloor = product.getMinFloorPrice() != null
                ? product.getMinFloorPrice()
                : basePrice.multiply(BigDecimal.valueOf(DEFAULT_MIN_PRICE_RATIO)).setScale(2, RoundingMode.HALF_UP);

        BigDecimal maxCeiling = product.getMaxCeilingPrice() != null
                ? product.getMaxCeilingPrice()
                : basePrice.multiply(BigDecimal.valueOf(DEFAULT_MAX_PRICE_RATIO)).setScale(2, RoundingMode.HALF_UP);

        BigDecimal finalPrice = rawCalculatedPrice;
        boolean isClamped = false;
        String changeReason;

        if (finalPrice.compareTo(minFloor) < 0) {
            finalPrice = minFloor;
            isClamped = true;
            changeReason = String.format("Hard Margin Guardrail: Clamped to Seller Floor ₹%.2f (Low demand loss protection)", minFloor);
        } else if (finalPrice.compareTo(maxCeiling) > 0) {
            finalPrice = maxCeiling;
            isClamped = true;
            changeReason = String.format("Hard Margin Guardrail: Clamped to Anti-Gouging Ceiling ₹%.2f (Ceiling cap enforced)", maxCeiling);
        } else if (inventoryAdj > 0) {
            changeReason = String.format("Scarcity surge: Stock fell to %d units (+%.1f%%) | %s", totalStock, inventoryAdj * 100.0, demandSignalName);
        } else if (inventoryAdj < 0) {
            changeReason = String.format("Clearance markdowns: Surplus reserve (%d units) (-%.1f%%) | %s", totalStock, Math.abs(inventoryAdj * 100.0), demandSignalName);
        } else if (demandAdj > 0) {
            changeReason = String.format("Demand velocity premium: %d orders in 24h (+%.1f%%) | %s", demandOrders, demandAdj * 100.0, timeSignalDesc);
        } else {
            changeReason = String.format("Algorithmic Equilibrium: %s | %s", inventorySignalName, timeSignalDesc);
        }

        BigDecimal fluctuation = finalPrice.subtract(currentPrice);
        double percentAdjustment = currentPrice.compareTo(BigDecimal.ZERO) > 0
                ? fluctuation.divide(currentPrice, 4, RoundingMode.HALF_UP).doubleValue() * 100.0
                : 0.0;

        String rationale = String.format("Dynamic Pricing Model: Demand [%+.1f%%, %s] • Temporal [%+.1f%%, %s] • Inventory [%+.1f%%, %s] • Segment [%+.1f%%, %s] => Net Multiplier: %.3fx%s",
                (demandAdj + intentVelocityAdj) * 100.0, demandSignalName,
                temporalAdj * 100.0, timeSignalDesc,
                inventoryAdj * 100.0, inventorySignalName,
                customerAdj * 100.0, customerSegmentName,
                netMultiplier,
                isClamped ? " [GUARDRAIL CLAMPED]" : "");

        DynamicPricingPreviewResponse response = new DynamicPricingPreviewResponse();
        response.setProductId(productId);
        response.setProductName(product.getName());
        response.setTotalStockAllSellers(totalStock);
        response.setDemandOrdersInInterval(demandOrders);
        response.setDemandUnitsInInterval(demandUnits);
        response.setIntervalHours(effectiveHours);
        response.setCustomerId(customerId);

        response.setBasePrice(basePrice);
        response.setCurrentPrice(currentPrice);
        response.setCalculatedDynamicPrice(finalPrice);
        response.setPriceFluctuation(fluctuation);
        response.setPercentageAdjustment(Math.round(percentAdjustment * 100.0) / 100.0);

        response.setDemandAdjustmentPercentage(Math.round((demandAdj + intentVelocityAdj) * 1000.0) / 10.0);
        response.setDemandSignalName(demandSignalName);

        response.setTemporalAdjustmentPercentage(Math.round(temporalAdj * 1000.0) / 10.0);
        response.setTemporalSignalName(timeSignalDesc);

        response.setInventoryAdjustmentPercentage(Math.round(inventoryAdj * 1000.0) / 10.0);
        response.setInventorySignalName(inventorySignalName);

        response.setCustomerSegmentAdjustmentPercentage(Math.round(customerAdj * 1000.0) / 10.0);
        response.setCustomerSegmentName(customerSegmentName);

        // Requirement 1 & 4 Audit Trail Fields
        response.setDemandFactor(demandFactor);
        response.setScarcityFactor(scarcityFactor);
        response.setCompetitionFactor(competitionFactor);
        response.setMinFloorPrice(minFloor);
        response.setMaxCeilingPrice(maxCeiling);
        response.setIsGuardrailClamped(isClamped);
        response.setChangeReason(changeReason);
        response.setIntentVelocityCount(demandUnits);

        response.setPricingRationale(rationale);
        response.setEvaluatedAt(LocalDateTime.now());

        return response;
    }

    @Override
    @Transactional
    public PriceLedgerResponse applyDynamicPrice(Long productId, Integer intervalHours, Long customerId) {
        return applyDynamicPrice(productId, intervalHours, customerId, false, null);
    }

    @Override
    @Transactional
    public PriceLedgerResponse applyDynamicPrice(Long productId, Integer intervalHours, Long customerId,
                                                boolean forceOverride, String customReason) {
        DynamicPricingPreviewResponse preview = previewDynamicPrice(productId, intervalHours, customerId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        PriceLedgerSource dynamicSource = getOrCreateDynamicPricingSource();

        Optional<PriceLedger> latestOpt = priceLedgerRepository.findLatestByProductId(productId);

        // Requirement 3: Anti-Thrashing Hysteresis (Noise Filter)
        if (!forceOverride && latestOpt.isPresent()) {
            double absPercentDelta = Math.abs(preview.getPercentageAdjustment());
            if (absPercentDelta < HYSTERESIS_MIN_PERCENT_DELTA) {
                log.info("Anti-Thrashing Hysteresis: Price change of {}% is below {}% threshold for Product ID {}. Suppressing noisy ledger entry.",
                        preview.getPercentageAdjustment(), HYSTERESIS_MIN_PERCENT_DELTA, productId);
                return PriceLedgerMapper.toResponse(latestOpt.get());
            }
        }

        // If identical price and fluctuation is zero, skip duplicate
        if (!forceOverride && latestOpt.isPresent() && preview.getPriceFluctuation().compareTo(BigDecimal.ZERO) == 0 &&
                latestOpt.get().getPrice().compareTo(preview.getCalculatedDynamicPrice()) == 0) {
            log.info("Product ID {} is already at equilibrium price {}. Skipping duplicate ledger record.",
                    productId, preview.getCalculatedDynamicPrice());
            return PriceLedgerMapper.toResponse(latestOpt.get());
        }

        String finalReason = (customReason != null && !customReason.isBlank())
                ? customReason
                : preview.getChangeReason();

        PriceLedger newEntry = new PriceLedger(
                product,
                dynamicSource,
                preview.getCalculatedDynamicPrice(),
                preview.getPriceFluctuation(),
                preview.getDemandFactor(),
                preview.getScarcityFactor(),
                preview.getCompetitionFactor(),
                finalReason
        );
        PriceLedger saved = priceLedgerRepository.save(newEntry);

        log.info("Appended Audited Dynamic Price to PriceLedger for Product ID {}: {} -> {} (Fluctuation: {}) [Reason: {}]",
                productId, preview.getCurrentPrice(), preview.getCalculatedDynamicPrice(),
                preview.getPriceFluctuation(), finalReason);

        return PriceLedgerMapper.toResponse(saved);
    }

    // Requirement 2: Hybrid Real-Time Event Trigger
    @Override
    @Transactional
    public PriceLedgerResponse triggerInstantScarcityReprice(Long productId, int remainingStock) {
        log.info("INSTANT SCARCITY TRIGGER: Product ID {} stock dropped across critical threshold to {} units. Executing immediate event-driven reprice!",
                productId, remainingStock);
        String reason = String.format("Instant Buyout Scarcity Trigger: Stock dropped to %d units across all sellers (+Scarcity Surge)", remainingStock);
        return applyDynamicPrice(productId, 24, null, true, reason);
    }

    @Override
    @Transactional
    public List<PriceLedgerResponse> recalculateAllProducts(Integer intervalHours) {
        List<Product> products = productRepository.findAll();
        List<PriceLedgerResponse> results = new ArrayList<>();

        for (Product product : products) {
            try {
                PriceLedgerResponse res = applyDynamicPrice(product.getId(), intervalHours, null);
                results.add(res);
            } catch (Exception e) {
                log.warn("Could not recalculate dynamic price for product ID {}: {}", product.getId(), e.getMessage());
            }
        }
        return results;
    }

    @Override
    @Transactional
    public Map<String, Object> seedTenLedgerRecordsPerProduct() {
        List<Product> products = productRepository.findAll();
        PriceLedgerSource dynamicSource = getOrCreateDynamicPricingSource();
        PriceLedgerSource sellerSource = priceLedgerSourceRepository.findById(1)
                .orElseGet(() -> priceLedgerSourceRepository.save(new PriceLedgerSource(1, "Seller Update")));
        PriceLedgerSource discountSource = priceLedgerSourceRepository.findById(2)
                .orElseGet(() -> priceLedgerSourceRepository.save(new PriceLedgerSource(2, "Automated Discount")));
        PriceLedgerSource campaignSource = priceLedgerSourceRepository.findById(3)
                .orElseGet(() -> priceLedgerSourceRepository.save(new PriceLedgerSource(3, "Platform Campaign")));

        int totalSeeded = 0;
        int productsUpdated = 0;

        for (Product product : products) {
            long existingCount = priceLedgerRepository.countByProductId(product.getId());
            if (existingCount >= 10) {
                continue;
            }

            int recordsNeeded = (int) (10 - existingCount);
            BigDecimal latestPrice = priceLedgerRepository.findLatestByProductId(product.getId())
                    .map(PriceLedger::getPrice)
                    .orElse(BigDecimal.valueOf(1999.00));

            BigDecimal currentRunningPrice = latestPrice.multiply(BigDecimal.valueOf(0.90)).setScale(2, RoundingMode.HALF_UP);
            LocalDateTime baseTime = LocalDateTime.now().minusDays(10);

            for (int i = 0; i < recordsNeeded; i++) {
                LocalDateTime entryTime = baseTime.plusDays(i).plusHours(2 * i);
                double demandFactorVal = 0.95 + (Math.sin(i * 1.2) * 0.12);
                BigDecimal newPrice = currentRunningPrice.multiply(BigDecimal.valueOf(demandFactorVal))
                        .setScale(2, RoundingMode.HALF_UP);

                BigDecimal fluctuation = newPrice.subtract(currentRunningPrice);

                PriceLedgerSource src = (i % 3 == 0) ? dynamicSource : (i % 3 == 1 ? discountSource : campaignSource);
                if (i == 0 && existingCount == 0) src = sellerSource;

                String reason = String.format("Audited Historical Dynamic Ledger Shift (Signal: %.2fx demand)", demandFactorVal);

                PriceLedger entry = new PriceLedger(
                        product, src, newPrice, fluctuation,
                        BigDecimal.valueOf(demandFactorVal).setScale(4, RoundingMode.HALF_UP),
                        BigDecimal.valueOf(1.0000),
                        BigDecimal.valueOf(1.0000),
                        reason
                );
                entry.setRecordedAt(entryTime);
                priceLedgerRepository.save(entry);

                currentRunningPrice = newPrice;
                totalSeeded++;
            }
            productsUpdated++;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("productsEvaluated", products.size());
        result.put("productsUpdated", productsUpdated);
        result.put("recordsSeeded", totalSeeded);
        result.put("targetRecordsPerProduct", 10);
        result.put("status", "SUCCESS");
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getPricingAnalytics(Integer intervalHours) {
        int effectiveHours = (intervalHours != null && intervalHours > 0) ? intervalHours : DEFAULT_INTERVAL_HOURS;
        List<Product> products = productRepository.findAll();

        int totalStock = 0;
        long totalOrdersInInterval = 0;
        BigDecimal totalDynamicValue = BigDecimal.ZERO;

        List<Map<String, Object>> productSummaries = new ArrayList<>();

        for (Product p : products) {
            DynamicPricingPreviewResponse preview = previewDynamicPrice(p.getId(), effectiveHours, null);
            totalStock += preview.getTotalStockAllSellers();
            totalOrdersInInterval += preview.getDemandOrdersInInterval();
            totalDynamicValue = totalDynamicValue.add(preview.getCalculatedDynamicPrice());

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("productId", p.getId());
            item.put("name", p.getName());
            item.put("basePrice", preview.getBasePrice());
            item.put("dynamicPrice", preview.getCalculatedDynamicPrice());
            item.put("percentAdjustment", preview.getPercentageAdjustment());
            item.put("demandAdjustment", preview.getDemandAdjustmentPercentage());
            item.put("temporalAdjustment", preview.getTemporalAdjustmentPercentage());
            item.put("inventoryAdjustment", preview.getInventoryAdjustmentPercentage());
            item.put("changeReason", preview.getChangeReason());
            item.put("demandFactor", preview.getDemandFactor());
            item.put("scarcityFactor", preview.getScarcityFactor());
            item.put("competitionFactor", preview.getCompetitionFactor());
            item.put("isGuardrailClamped", preview.getIsGuardrailClamped());
            item.put("totalStock", preview.getTotalStockAllSellers());
            item.put("ordersInInterval", preview.getDemandOrdersInInterval());
            productSummaries.add(item);
        }

        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("intervalHours", effectiveHours);
        analytics.put("totalProducts", products.size());
        analytics.put("totalStockAcrossAllSellers", totalStock);
        analytics.put("totalOrdersInInterval", totalOrdersInInterval);
        analytics.put("averageDynamicPrice", products.isEmpty() ? BigDecimal.ZERO : totalDynamicValue.divide(BigDecimal.valueOf(products.size()), 2, RoundingMode.HALF_UP));
        analytics.put("products", productSummaries);
        return analytics;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMarketplacePricingSummary(Long customerId) {
        List<Product> products = productRepository.findAll();
        List<DynamicPricingPreviewResponse> previews = new ArrayList<>();

        for (Product p : products) {
            try {
                previews.add(previewDynamicPrice(p.getId(), DEFAULT_INTERVAL_HOURS, customerId));
            } catch (Exception ignored) {}
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("evaluatedProductsCount", previews.size());
        summary.put("customerId", customerId);
        summary.put("evaluatedAt", LocalDateTime.now());
        summary.put("previews", previews);
        return summary;
    }

    // Automatic 30-min background scheduler disabled per user requirement.
    // Dynamic pricing is strictly manual on-demand when the store owner / merchant triggers it via the dashboard.
    public void scheduledAutoDynamicPricing() {
        log.info("[DYNAMIC PRICING] Automatic 30-min scheduler is disabled. Dynamic pricing is strictly manual on-demand.");
    }
}
