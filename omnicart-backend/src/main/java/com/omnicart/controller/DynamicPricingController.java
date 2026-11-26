package com.omnicart.controller;

import com.omnicart.dto.response.ApiResponse;
import com.omnicart.dto.response.DynamicPricingPreviewResponse;
import com.omnicart.dto.response.PriceLedgerResponse;
import com.omnicart.service.DynamicPricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dynamic-pricing")
@Tag(name = "Dynamic Pricing Engine", description = "Algorithmic dynamic pricing based on real-time demand, temporal signals, inventory metrics, and customer segmentation")
public class DynamicPricingController {

    private final DynamicPricingService dynamicPricingService;

    public DynamicPricingController(DynamicPricingService dynamicPricingService) {
        this.dynamicPricingService = dynamicPricingService;
    }

    @GetMapping("/preview/{productId}")
    @Operation(summary = "Preview dynamic price calculation across all 4 market factors without persisting to ledger")
    public ResponseEntity<ApiResponse<DynamicPricingPreviewResponse>> previewDynamicPrice(
            @PathVariable Long productId,
            @RequestParam(required = false, defaultValue = "24") Integer intervalHours,
            @RequestParam(required = false) Long customerId) {
        DynamicPricingPreviewResponse preview = dynamicPricingService.previewDynamicPrice(productId, intervalHours, customerId);
        return ResponseEntity.ok(ApiResponse.success(preview));
    }

    @PostMapping("/apply/{productId}")
    @Operation(summary = "Apply dynamic price and append new entry to PriceLedger")
    public ResponseEntity<ApiResponse<PriceLedgerResponse>> applyDynamicPrice(
            @PathVariable Long productId,
            @RequestParam(required = false, defaultValue = "24") Integer intervalHours,
            @RequestParam(required = false) Long customerId) {
        PriceLedgerResponse response = dynamicPricingService.applyDynamicPrice(productId, intervalHours, customerId);
        return ResponseEntity.ok(ApiResponse.success("Dynamic price evaluated across all 4 factors and appended to PriceLedger", response));
    }

    @PostMapping("/recalculate-all")
    @Operation(summary = "Recalculate and append dynamic prices for all catalog products")
    public ResponseEntity<ApiResponse<List<PriceLedgerResponse>>> recalculateAll(
            @RequestParam(required = false, defaultValue = "24") Integer intervalHours) {
        List<PriceLedgerResponse> responses = dynamicPricingService.recalculateAllProducts(intervalHours);
        return ResponseEntity.ok(ApiResponse.success("Dynamic pricing recalculation completed across all marketplace products", responses));
    }

    @PostMapping("/seed-ten-records")
    @Operation(summary = "Ensure all products have at least 10 audited entries in PriceLedger")
    public ResponseEntity<ApiResponse<Map<String, Object>>> seedTenRecords() {
        Map<String, Object> result = dynamicPricingService.seedTenLedgerRecordsPerProduct();
        return ResponseEntity.ok(ApiResponse.success("10 records per product verified in PriceLedger", result));
    }

    @GetMapping("/analytics")
    @Operation(summary = "Get system-wide dynamic pricing analytics (stock vs demand)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAnalytics(
            @RequestParam(required = false, defaultValue = "24") Integer intervalHours) {
        Map<String, Object> analytics = dynamicPricingService.getPricingAnalytics(intervalHours);
        return ResponseEntity.ok(ApiResponse.success(analytics));
    }

    @GetMapping("/marketplace-summary")
    @Operation(summary = "Get full marketplace dynamic pricing summary for all products with factor breakdowns")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMarketplaceSummary(
            @RequestParam(required = false) Long customerId) {
        Map<String, Object> summary = dynamicPricingService.getMarketplacePricingSummary(customerId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
