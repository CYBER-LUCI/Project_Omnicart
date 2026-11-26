package com.omnicart.dto.request;

import jakarta.validation.constraints.NotNull;

public class ShippingStatusUpdateRequest {
    @NotNull(message = "Status ID is required (1: Pending, 2: Processing, 3: Shipped, 4: In Transit, 5: Delivered, 6: Cancelled, 7: Returned)")
    private Integer statusId;

    private Long sellerId;
    private Long productId;
    private String status;

    public ShippingStatusUpdateRequest() {}

    public ShippingStatusUpdateRequest(Integer statusId) {
        this.statusId = statusId;
    }

    public Integer getStatusId() { return statusId; }
    public void setStatusId(Integer statusId) { this.statusId = statusId; }

    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
