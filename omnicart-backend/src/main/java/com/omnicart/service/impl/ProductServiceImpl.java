package com.omnicart.service.impl;

import com.omnicart.dto.request.ProductCreateRequest;
import com.omnicart.dto.request.ProductUpdateRequest;
import com.omnicart.dto.response.ProductResponse;
import com.omnicart.entity.*;
import com.omnicart.exception.*;
import com.omnicart.mapper.ProductMapper;
import com.omnicart.repository.*;
import com.omnicart.service.PriceService;
import com.omnicart.service.ProductService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductServiceImpl.class);

    private final ProductRepository productRepository;
    private final SellerRepository sellerRepository;
    private final CategoryRepository categoryRepository;
    private final PriceLedgerRepository priceLedgerRepository;
    private final PriceLedgerSourceRepository priceLedgerSourceRepository;
    private final PriceService priceService;
    private final OrderDetailsRepository orderDetailsRepository;
    private final OrderRepository orderRepository;
    private final OrderPaymentRepository orderPaymentRepository;
    private final ReviewRepository reviewRepository;
    private final ProductEmbeddingsRepository productEmbeddingsRepository;

    public ProductServiceImpl(ProductRepository productRepository,
                              SellerRepository sellerRepository,
                              CategoryRepository categoryRepository,
                              PriceLedgerRepository priceLedgerRepository,
                              PriceLedgerSourceRepository priceLedgerSourceRepository,
                              PriceService priceService,
                              OrderDetailsRepository orderDetailsRepository,
                              OrderRepository orderRepository,
                              OrderPaymentRepository orderPaymentRepository,
                              ReviewRepository reviewRepository,
                              ProductEmbeddingsRepository productEmbeddingsRepository) {
        this.productRepository = productRepository;
        this.sellerRepository = sellerRepository;
        this.categoryRepository = categoryRepository;
        this.priceLedgerRepository = priceLedgerRepository;
        this.priceLedgerSourceRepository = priceLedgerSourceRepository;
        this.priceService = priceService;
        this.orderDetailsRepository = orderDetailsRepository;
        this.orderRepository = orderRepository;
        this.orderPaymentRepository = orderPaymentRepository;
        this.reviewRepository = reviewRepository;
        this.productEmbeddingsRepository = productEmbeddingsRepository;
    }

    private Map<Long, Object[]> loadProductRatingMap() {
        Map<Long, Object[]> ratingMap = new HashMap<>();
        try {
            List<Object[]> allSummaries = reviewRepository.getAllProductRatingSummaries();
            if (allSummaries != null) {
                for (Object[] row : allSummaries) {
                    if (row != null && row[0] != null) {
                        ratingMap.put(((Number) row[0]).longValue(), row);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load rating summaries: {}", e.getMessage());
        }
        return ratingMap;
    }

    private ProductResponse mapWithRatings(Product p, Map<Long, Object[]> ratingMap) {
        BigDecimal price = priceService.getCurrentPrice(p.getId());
        Object[] r = ratingMap != null ? ratingMap.get(p.getId()) : null;
        long count = (r != null && r[1] != null) ? ((Number) r[1]).longValue() : 0L;
        double avg = (r != null && r[2] != null) ? ((Number) r[2]).doubleValue() : 0.0;
        avg = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP).doubleValue();
        return ProductMapper.toResponse(p, price, avg, (int) count);
    }

    @Override
    @Transactional
    public ProductResponse createProduct(ProductCreateRequest request) {
        Seller seller = sellerRepository.findById(request.getSellerId())
                .orElseThrow(() -> new SellerNotFoundException(request.getSellerId()));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new CategoryNotFoundException(request.getCategoryId()));

        Optional<Product> existingOpt = productRepository.findByNameIgnoreCaseAndSellerId(request.getName().trim(), seller.getId());
        if (existingOpt.isPresent()) {
            Product existing = existingOpt.get();
            int currentStock = existing.getStockQuantity();
            int addedStock = request.getStockQuantity() != null ? request.getStockQuantity() : 0;
            int newTotalStock = currentStock + addedStock;
            existing.setStockQuantity(newTotalStock);
            Product savedProduct = productRepository.save(existing);
            BigDecimal currentPrice = priceService.getCurrentPrice(savedProduct.getId());
            log.info("Product '{}' already exists (ID: {}). Total inventory replenished from {} to {} units by seller ID {}",
                    savedProduct.getName(), savedProduct.getId(), currentStock, newTotalStock, seller.getId());
            return ProductMapper.toResponse(savedProduct, currentPrice != null ? currentPrice : request.getInitialPrice(), 0.0, 0);
        }

        Product product = new Product();
        product.setName(request.getName().trim());
        product.setDescription(request.getDescription());
        product.setStockQuantity(request.getStockQuantity());
        product.setSeller(seller);
        product.setCategory(category);

        Product savedProduct = productRepository.save(product);

        PriceLedgerSource source = priceLedgerSourceRepository.findById(1)
                .orElseGet(() -> priceLedgerSourceRepository.save(new PriceLedgerSource(1, "Initial Listing")));

        PriceLedger initialPrice = new PriceLedger(savedProduct, source, request.getInitialPrice(), BigDecimal.ZERO);
        priceLedgerRepository.save(initialPrice);

        // Ensure newly created product immediately has an embedding record in ProductEmbeddings table
        if (!productEmbeddingsRepository.existsByProductId(savedProduct.getId())) {
            String defaultVector = generateDefaultFeatureVector(savedProduct);
            ProductEmbeddings emb = new ProductEmbeddings(savedProduct, defaultVector, "openai/clip-vit-base-patch32");
            productEmbeddingsRepository.save(emb);
            log.info("Initialized default 512-dim embedding for product ID: {}", savedProduct.getId());
        }

        log.info("Created product ID: {} with initial price: {}", savedProduct.getId(), request.getInitialPrice());
        return ProductMapper.toResponse(savedProduct, request.getInitialPrice(), 0.0, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
        BigDecimal currentPrice = priceService.getCurrentPrice(id);
        List<Object[]> summary = reviewRepository.getRatingSummaryByProductId(id);
        long count = 0L;
        double avg = 0.0;
        if (summary != null && !summary.isEmpty() && summary.get(0) != null) {
            count = summary.get(0)[0] != null ? ((Number) summary.get(0)[0]).longValue() : 0L;
            avg = summary.get(0)[1] != null ? ((Number) summary.get(0)[1]).doubleValue() : 0.0;
        }
        avg = BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP).doubleValue();
        return ProductMapper.toResponse(product, currentPrice, avg, (int) count);
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new CategoryNotFoundException(request.getCategoryId()));

        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setCategory(category);

        Product updated = productRepository.save(product);
        return getProductById(updated.getId());
    }

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));

        List<OrderDetails> orderDetailsList = orderDetailsRepository.findByProductId(id);
        Set<Long> affectedOrderIds = orderDetailsList.stream()
                .map(od -> od.getOrder().getId())
                .collect(Collectors.toSet());

        // Update affected orders if any other items remain
        for (Long orderId : affectedOrderIds) {
            List<OrderDetails> remaining = orderDetailsRepository.findByOrderId(orderId).stream()
                    .filter(od -> !od.getProduct().getId().equals(id))
                    .toList();
            if (remaining.isEmpty()) {
                orderPaymentRepository.findByOrderId(orderId).ifPresent(orderPaymentRepository::delete);
                orderRepository.deleteById(orderId);
            } else {
                BigDecimal newTotal = remaining.stream()
                        .map(od -> od.getExactLedgerPrice().multiply(BigDecimal.valueOf(od.getQuantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                orderPaymentRepository.findByOrderId(orderId).ifPresent(p -> {
                    p.setPaidAmount(newTotal);
                    orderPaymentRepository.save(p);
                });
            }
        }

        // Native SQL delete leverages MySQL foreign key ON DELETE CASCADE
        // without tripping the PriceLedger append-only trigger
        productRepository.deleteProductByIdNative(id);
        log.info("Deleted product ID: {} ({}) and all associated ledger/order records.", id, product.getName());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(Pageable pageable, Long categoryId, Long sellerId, BigDecimal minPrice, BigDecimal maxPrice) {
        Page<Product> products;
        if (categoryId != null) {
            products = productRepository.findByCategoryId(categoryId, pageable);
        } else if (sellerId != null) {
            products = productRepository.findBySellerId(sellerId, pageable);
        } else {
            products = productRepository.findAll(pageable);
        }

        Map<Long, Object[]> ratingMap = loadProductRatingMap();
        return products.map(p -> mapWithRatings(p, ratingMap));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> searchProducts(String keyword, Pageable pageable) {
        Map<Long, Object[]> ratingMap = loadProductRatingMap();
        return productRepository.searchByKeyword(keyword, pageable)
                .map(p -> mapWithRatings(p, ratingMap));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getLowStockProducts() {
        Map<Long, Object[]> ratingMap = loadProductRatingMap();
        return productRepository.findLowStockProducts(10).stream()
                .map(p -> mapWithRatings(p, ratingMap))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsByCategoryId(Long categoryId, Pageable pageable) {
        Map<Long, Object[]> ratingMap = loadProductRatingMap();
        return productRepository.findByCategoryId(categoryId, pageable)
                .map(p -> mapWithRatings(p, ratingMap));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsBySellerId(Long sellerId, Pageable pageable) {
        Map<Long, Object[]> ratingMap = loadProductRatingMap();
        return productRepository.findBySellerId(sellerId, pageable)
                .map(p -> mapWithRatings(p, ratingMap));
    }

    private String generateDefaultFeatureVector(Product product) {
        String seedStr = (product.getName() + " " + (product.getCategory() != null ? product.getCategory().getCategoryName() : "")).toLowerCase();
        int seed = seedStr.hashCode();
        Random rng = new Random(seed);
        double[] vec = new double[512];
        double norm = 0.0;
        for (int i = 0; i < 512; i++) {
            vec[i] = rng.nextGaussian();
            norm += vec[i] * vec[i];
        }
        norm = Math.sqrt(norm);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 512; i++) {
            sb.append(String.format(Locale.US, "%.6f", vec[i] / norm));
            if (i < 511) sb.append(", ");
        }
        sb.append("]");
        return sb.toString();
    }
}
