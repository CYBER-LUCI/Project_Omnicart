package com.omnicart.dto.response;

import java.math.BigDecimal;

public class OrderDetailResponse {
    private Long productId;
    private String productName;
    private Integer quantity;
    private BigDecimal exactLedgerPrice;
    private Long ledgerId;
    private BigDecimal lineTotal;
    private String imageUrl;
    private Long sellerId;
    private String sellerName;
    private String status = "ACTIVE";

    public OrderDetailResponse() {}

    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getExactLedgerPrice() { return exactLedgerPrice; }
    public void setExactLedgerPrice(BigDecimal exactLedgerPrice) { this.exactLedgerPrice = exactLedgerPrice; }

    public Long getLedgerId() { return ledgerId; }
    public void setLedgerId(Long ledgerId) { this.ledgerId = ledgerId; }

    public BigDecimal getLineTotal() { return lineTotal; }
    public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
