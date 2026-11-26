package com.omnicart.dto.response;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ReviewResponse {

    private Long id;
    private Long productId;
    private String productName;
    private Long customerId;
    private String customerName;
    private Long orderId;
    private Integer rating;
    private String title;
    private String comment;
    private LocalDateTime createdAt;
    private String formattedDate;

    public ReviewResponse() {}

    public ReviewResponse(Long id, Long productId, String productName, Long customerId, String customerName,
                          Long orderId, Integer rating, String title, String comment, LocalDateTime createdAt) {
        this.id = id;
        this.productId = productId;
        this.productName = productName;
        this.customerId = customerId;
        this.customerName = customerName;
        this.orderId = orderId;
        this.rating = rating;
        this.title = title;
        this.comment = comment;
        this.createdAt = createdAt;
        if (createdAt != null) {
            this.formattedDate = createdAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
        if (createdAt != null) {
            this.formattedDate = createdAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        }
    }

    public String getFormattedDate() { return formattedDate; }
    public void setFormattedDate(String formattedDate) { this.formattedDate = formattedDate; }
}

