package com.omnicart.service;

import com.omnicart.dto.response.DynamicPricingPreviewResponse;
import com.omnicart.dto.response.PriceLedgerResponse;

import java.util.List;
import java.util.Map;

public interface DynamicPricingService {
    DynamicPricingPreviewResponse previewDynamicPrice(Long productId, Integer intervalHours, Long customerId);
    
    PriceLedgerResponse applyDynamicPrice(Long productId, Integer intervalHours, Long customerId);
    
    PriceLedgerResponse applyDynamicPrice(Long productId, Integer intervalHours, Long customerId, boolean forceOverride, String customReason);
    
    PriceLedgerResponse triggerInstantScarcityReprice(Long productId, int remainingStock);
    
    List<PriceLedgerResponse> recalculateAllProducts(Integer intervalHours);
    
    Map<String, Object> seedTenLedgerRecordsPerProduct();
    
    Map<String, Object> getPricingAnalytics(Integer intervalHours);
    
    Map<String, Object> getMarketplacePricingSummary(Long customerId);
}
