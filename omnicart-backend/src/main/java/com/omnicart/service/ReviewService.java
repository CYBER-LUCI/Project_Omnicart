package com.omnicart.service;

import com.omnicart.dto.request.ReviewCreateRequest;
import com.omnicart.dto.response.ProductReviewSummaryResponse;
import com.omnicart.dto.response.ReviewResponse;

import java.util.List;

public interface ReviewService {

    ReviewResponse createReview(Long customerId, ReviewCreateRequest request);

    List<ReviewResponse> getReviewsByProduct(Long productId);

    List<ReviewResponse> getReviewsByCustomer(Long customerId);

    List<ReviewResponse> getReviewsByOrder(Long orderId);

    ProductReviewSummaryResponse getProductReviewSummary(Long productId);
}

