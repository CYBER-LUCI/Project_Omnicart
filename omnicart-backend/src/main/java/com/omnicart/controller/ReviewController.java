package com.omnicart.controller;

import com.omnicart.dto.request.ReviewCreateRequest;
import com.omnicart.dto.response.ApiResponse;
import com.omnicart.dto.response.ProductReviewSummaryResponse;
import com.omnicart.dto.response.ReviewResponse;
import com.omnicart.security.UserPrincipal;
import com.omnicart.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@Tag(name = "Reviews", description = "Endpoints for customer product reviews on completed orders")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @Operation(summary = "Submit or update a product review for a completed order")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @Valid @RequestBody ReviewCreateRequest request,
            Authentication authentication) {

        Long customerId = null;
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            customerId = principal.getId();
        } else if (request.getCustomerId() != null) {
            customerId = request.getCustomerId();
        }

        ReviewResponse response = reviewService.createReview(customerId, request);
        return new ResponseEntity<>(ApiResponse.success("Review submitted successfully", response), HttpStatus.CREATED);
    }

    @GetMapping("/product/{productId}")
    @Operation(summary = "Get all reviews for a product")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getProductReviews(@PathVariable Long productId) {
        List<ReviewResponse> reviews = reviewService.getReviewsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    @GetMapping("/product/{productId}/summary")
    @Operation(summary = "Get rating summary and breakdown for a product")
    public ResponseEntity<ApiResponse<ProductReviewSummaryResponse>> getProductReviewSummary(@PathVariable Long productId) {
        ProductReviewSummaryResponse summary = reviewService.getProductReviewSummary(productId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get all reviews submitted for a specific order")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getOrderReviews(@PathVariable Long orderId) {
        List<ReviewResponse> reviews = reviewService.getReviewsByOrder(orderId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Get all reviews written by a customer")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> getCustomerReviews(@PathVariable Long customerId) {
        List<ReviewResponse> reviews = reviewService.getReviewsByCustomer(customerId);
        return ResponseEntity.ok(ApiResponse.success(reviews));
    }
}

