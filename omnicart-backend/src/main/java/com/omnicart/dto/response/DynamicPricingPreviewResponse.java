package com.omnicart.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class DynamicPricingPreviewResponse {
    private Long productId;
    private String productName;
    private Integer totalStockAllSellers;
    private Long demandOrdersInInterval;
    private Long demandUnitsInInterval;
    private Integer intervalHours;
    private Long customerId;

    private BigDecimal basePrice;
    private BigDecimal currentPrice;
    private BigDecimal calculatedDynamicPrice;
    private BigDecimal priceFluctuation;
    private Double percentageAdjustment;

    private Double demandAdjustmentPercentage;
    private String demandSignalName;

    private Double temporalAdjustmentPercentage;
    private String temporalSignalName;

    private Double inventoryAdjustmentPercentage;
    private String inventorySignalName;

    private Double customerSegmentAdjustmentPercentage;
    private String customerSegmentName;

    private String pricingRationale;
    private LocalDateTime evaluatedAt;

    private BigDecimal demandFactor = BigDecimal.valueOf(1.0000);
    private BigDecimal scarcityFactor = BigDecimal.valueOf(1.0000);
    private BigDecimal competitionFactor = BigDecimal.valueOf(1.0000);
    private BigDecimal minFloorPrice;
    private BigDecimal maxCeilingPrice;
    private Boolean isGuardrailClamped = false;
    private String changeReason;
    private Long intentVelocityCount = 0L;

    public DynamicPricingPreviewResponse() {}

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Integer getTotalStockAllSellers() { return totalStockAllSellers; }
    public void setTotalStockAllSellers(Integer totalStockAllSellers) { this.totalStockAllSellers = totalStockAllSellers; }

    public Long getDemandOrdersInInterval() { return demandOrdersInInterval; }
    public void setDemandOrdersInInterval(Long demandOrdersInInterval) { this.demandOrdersInInterval = demandOrdersInInterval; }

    public Long getDemandUnitsInInterval() { return demandUnitsInInterval; }
    public void setDemandUnitsInInterval(Long demandUnitsInInterval) { this.demandUnitsInInterval = demandUnitsInInterval; }

    public Integer getIntervalHours() { return intervalHours; }
    public void setIntervalHours(Integer intervalHours) { this.intervalHours = intervalHours; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }

    public BigDecimal getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(BigDecimal currentPrice) { this.currentPrice = currentPrice; }

    public BigDecimal getCalculatedDynamicPrice() { return calculatedDynamicPrice; }
    public void setCalculatedDynamicPrice(BigDecimal calculatedDynamicPrice) { this.calculatedDynamicPrice = calculatedDynamicPrice; }

    public BigDecimal getPriceFluctuation() { return priceFluctuation; }
    public void setPriceFluctuation(BigDecimal priceFluctuation) { this.priceFluctuation = priceFluctuation; }

    public Double getPercentageAdjustment() { return percentageAdjustment; }
    public void setPercentageAdjustment(Double percentageAdjustment) { this.percentageAdjustment = percentageAdjustment; }

    public Double getDemandAdjustmentPercentage() { return demandAdjustmentPercentage; }
    public void setDemandAdjustmentPercentage(Double demandAdjustmentPercentage) { this.demandAdjustmentPercentage = demandAdjustmentPercentage; }

    public String getDemandSignalName() { return demandSignalName; }
    public void setDemandSignalName(String demandSignalName) { this.demandSignalName = demandSignalName; }

    public Double getTemporalAdjustmentPercentage() { return temporalAdjustmentPercentage; }
    public void setTemporalAdjustmentPercentage(Double temporalAdjustmentPercentage) { this.temporalAdjustmentPercentage = temporalAdjustmentPercentage; }

    public String getTemporalSignalName() { return temporalSignalName; }
    public void setTemporalSignalName(String temporalSignalName) { this.temporalSignalName = temporalSignalName; }

    public Double getInventoryAdjustmentPercentage() { return inventoryAdjustmentPercentage; }
    public void setInventoryAdjustmentPercentage(Double inventoryAdjustmentPercentage) { this.inventoryAdjustmentPercentage = inventoryAdjustmentPercentage; }

    public String getInventorySignalName() { return inventorySignalName; }
    public void setInventorySignalName(String inventorySignalName) { this.inventorySignalName = inventorySignalName; }

    public Double getCustomerSegmentAdjustmentPercentage() { return customerSegmentAdjustmentPercentage; }
    public void setCustomerSegmentAdjustmentPercentage(Double customerSegmentAdjustmentPercentage) { this.customerSegmentAdjustmentPercentage = customerSegmentAdjustmentPercentage; }

    public String getCustomerSegmentName() { return customerSegmentName; }
    public void setCustomerSegmentName(String customerSegmentName) { this.customerSegmentName = customerSegmentName; }

    public String getPricingRationale() { return pricingRationale; }
    public void setPricingRationale(String pricingRationale) { this.pricingRationale = pricingRationale; }

    public LocalDateTime getEvaluatedAt() { return evaluatedAt; }
    public void setEvaluatedAt(LocalDateTime evaluatedAt) { this.evaluatedAt = evaluatedAt; }

    public BigDecimal getDemandFactor() { return demandFactor; }
    public void setDemandFactor(BigDecimal demandFactor) { this.demandFactor = demandFactor; }

    public BigDecimal getScarcityFactor() { return scarcityFactor; }
    public void setScarcityFactor(BigDecimal scarcityFactor) { this.scarcityFactor = scarcityFactor; }

    public BigDecimal getCompetitionFactor() { return competitionFactor; }
    public void setCompetitionFactor(BigDecimal competitionFactor) { this.competitionFactor = competitionFactor; }

    public BigDecimal getMinFloorPrice() { return minFloorPrice; }
    public void setMinFloorPrice(BigDecimal minFloorPrice) { this.minFloorPrice = minFloorPrice; }

    public BigDecimal getMaxCeilingPrice() { return maxCeilingPrice; }
    public void setMaxCeilingPrice(BigDecimal maxCeilingPrice) { this.maxCeilingPrice = maxCeilingPrice; }

    public Boolean getIsGuardrailClamped() { return isGuardrailClamped; }
    public void setIsGuardrailClamped(Boolean isGuardrailClamped) { this.isGuardrailClamped = isGuardrailClamped; }

    public String getChangeReason() { return changeReason; }
    public void setChangeReason(String changeReason) { this.changeReason = changeReason; }

    public Long getIntentVelocityCount() { return intentVelocityCount; }
    public void setIntentVelocityCount(Long intentVelocityCount) { this.intentVelocityCount = intentVelocityCount; }
}