package com.omnicart.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public class PriceLedgerRequest {
    @NotNull(message = "New price is required")
    @PositiveOrZero(message = "Price cannot be negative")
    private BigDecimal price;

    private Integer sourceId = 1;

    private String changeReason;

    public PriceLedgerRequest() {}

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getSourceId() { return sourceId != null ? sourceId : 1; }
    public void setSourceId(Integer sourceId) { this.sourceId = sourceId; }

    public String getChangeReason() { return changeReason; }
    public void setChangeReason(String changeReason) { this.changeReason = changeReason; }
}

