package com.omnicart.dto.response;

import java.util.HashMap;
import java.util.Map;

public class ProductReviewSummaryResponse {

    private Long productId;
    private Double averageRating = 0.0;
    private Long totalReviews = 0L;
    private Map<Integer, Long> ratingCounts = new HashMap<>();

    public ProductReviewSummaryResponse() {
        for (int i = 1; i <= 5; i++) {
            ratingCounts.put(i, 0L);
        }
    }

    public ProductReviewSummaryResponse(Long productId, Double averageRating, Long totalReviews, Map<Integer, Long> ratingCounts) {
        this.productId = productId;
        this.averageRating = averageRating;
        this.totalReviews = totalReviews;
        this.ratingCounts = ratingCounts;
    }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Long getTotalReviews() { return totalReviews; }
    public void setTotalReviews(Long totalReviews) { this.totalReviews = totalReviews; }

    public Map<Integer, Long> getRatingCounts() { return ratingCounts; }
    public void setRatingCounts(Map<Integer, Long> ratingCounts) { this.ratingCounts = ratingCounts; }
}

