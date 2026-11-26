package com.omnicart.mapper;

import com.omnicart.dto.response.OrderDetailResponse;
import com.omnicart.dto.response.OrderPaymentResponse;
import com.omnicart.dto.response.OrderResponse;
import com.omnicart.entity.Order;
import com.omnicart.entity.OrderDetails;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class OrderMapper {
    public static OrderResponse toResponse(Order order) {
        if (order == null) return null;
        OrderResponse res = new OrderResponse();
        res.setId(order.getId());
        if (order.getCustomer() != null) {
            res.setCustomerId(order.getCustomer().getId());
            res.setCustomerName(order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName());
        }
        res.setRecipientName(order.getRecipientName() != null && !order.getRecipientName().isBlank()
                ? order.getRecipientName()
                : (order.getCustomer() != null ? (order.getCustomer().getFirstName() + " " + (order.getCustomer().getLastName() != null ? order.getCustomer().getLastName() : "")).trim() : "Customer"));
        res.setDeliveryAddress(order.getDeliveryAddress());
        res.setShippingStatus(order.getShippingStatus() != null ? order.getShippingStatus().getStatusName() : null);
        res.setOrderDate(order.getOrderDate());

        BigDecimal total = BigDecimal.ZERO;
        List<OrderDetailResponse> itemResponses = new ArrayList<>();
        if (order.getOrderDetails() != null) {
            for (OrderDetails od : order.getOrderDetails()) {
                OrderDetailResponse odRes = new OrderDetailResponse();
                if (od.getProduct() != null) {
                    odRes.setProductId(od.getProduct().getId());
                    odRes.setProductName(od.getProduct().getName());
                    if (od.getProduct().getSeller() != null) {
                        odRes.setSellerId(od.getProduct().getSeller().getId());
                        odRes.setSellerName(od.getProduct().getSeller().getCompanyName());
                    }
                    if (od.getProduct().getImages() != null && !od.getProduct().getImages().isEmpty()) {
                        odRes.setImageUrl(od.getProduct().getImages().get(0).getImageUrl());
                    }
                }
                odRes.setQuantity(od.getQuantity());
                odRes.setExactLedgerPrice(od.getExactLedgerPrice());
                odRes.setLedgerId(od.getLedger() != null ? od.getLedger().getId() : null);
                odRes.setLineTotal(od.getLineTotal());
                odRes.setStatus(od.getStatus() != null ? od.getStatus() : "ACTIVE");
                if (!"CANCELLED".equalsIgnoreCase(od.getStatus())) {
                    total = total.add(od.getLineTotal());
                }
                itemResponses.add(odRes);
            }
        }
        res.setItems(itemResponses);
        res.setTotalAmount(total);

        if (order.getPayment() != null) {
            OrderPaymentResponse payRes = new OrderPaymentResponse();
            payRes.setId(order.getPayment().getId());
            payRes.setPaymentMethod(order.getPayment().getPaymentMethod() != null ? order.getPayment().getPaymentMethod().getMethodName() : null);
            payRes.setPaidAmount(order.getPayment().getPaidAmount());
            payRes.setPaidAt(order.getPayment().getPaidAt());
            res.setPayment(payRes);
        }
        return res;
    }

    public static OrderResponse toSellerResponse(Order order, Long sellerId) {
        if (order == null) return null;
        OrderResponse res = new OrderResponse();
        res.setId(order.getId());
        if (order.getCustomer() != null) {
            res.setCustomerId(order.getCustomer().getId());
            res.setCustomerName(order.getCustomer().getFirstName() + " " + order.getCustomer().getLastName());
        }
        res.setRecipientName(order.getRecipientName() != null && !order.getRecipientName().isBlank()
                ? order.getRecipientName()
                : (order.getCustomer() != null ? (order.getCustomer().getFirstName() + " " + (order.getCustomer().getLastName() != null ? order.getCustomer().getLastName() : "")).trim() : "Customer"));
        res.setDeliveryAddress(order.getDeliveryAddress());
        res.setOrderDate(order.getOrderDate());

        BigDecimal total = BigDecimal.ZERO;
        List<OrderDetailResponse> itemResponses = new ArrayList<>();
        boolean sellerHasItems = false;
        boolean allSellerItemsDelivered = true;
        boolean allSellerItemsCancelled = true;
        boolean sellerHasInTransit = false;
        boolean sellerHasShipped = false;
        boolean sellerHasProcessing = false;

        if (order.getOrderDetails() != null) {
            for (OrderDetails od : order.getOrderDetails()) {
                if (od.getProduct() != null && od.getProduct().getSeller() != null) {
                    if (sellerId != null && !sellerId.equals(od.getProduct().getSeller().getId())) {
                        continue; // Exclude products belonging to other merchants!
                    }
                }
                sellerHasItems = true;
                String itemStatus = od.getStatus() != null ? od.getStatus().toUpperCase() : "ACTIVE";
                if (!"CANCELLED".equals(itemStatus)) {
                    allSellerItemsCancelled = false;
                    if (!"DELIVERED".equals(itemStatus)) {
                        allSellerItemsDelivered = false;
                        if ("IN TRANSIT".equals(itemStatus) || "OUT_FOR_DELIVERY".equals(itemStatus)) {
                            sellerHasInTransit = true;
                        } else if ("SHIPPED".equals(itemStatus)) {
                            sellerHasShipped = true;
                        } else if ("PROCESSING".equals(itemStatus)) {
                            sellerHasProcessing = true;
                        }
                    }
                }

                OrderDetailResponse odRes = new OrderDetailResponse();
                if (od.getProduct() != null) {
                    odRes.setProductId(od.getProduct().getId());
                    odRes.setProductName(od.getProduct().getName());
                    if (od.getProduct().getSeller() != null) {
                        odRes.setSellerId(od.getProduct().getSeller().getId());
                        odRes.setSellerName(od.getProduct().getSeller().getCompanyName());
                    }
                    if (od.getProduct().getImages() != null && !od.getProduct().getImages().isEmpty()) {
                        odRes.setImageUrl(od.getProduct().getImages().get(0).getImageUrl());
                    }
                }
                odRes.setQuantity(od.getQuantity());
                odRes.setExactLedgerPrice(od.getExactLedgerPrice());
                odRes.setLedgerId(od.getLedger() != null ? od.getLedger().getId() : null);
                odRes.setLineTotal(od.getLineTotal());
                odRes.setStatus(od.getStatus() != null ? od.getStatus() : "ACTIVE");
                if (!"CANCELLED".equalsIgnoreCase(od.getStatus())) {
                    total = total.add(od.getLineTotal());
                }
                itemResponses.add(odRes);
            }
        }
        res.setItems(itemResponses);
        res.setTotalAmount(total);

        // Compute seller-specific shipping status
        if (order.getShippingStatus() != null && order.getShippingStatus().getId() == 6) {
            res.setShippingStatus("Cancelled");
        } else if (sellerHasItems && allSellerItemsCancelled) {
            res.setShippingStatus("Cancelled");
        } else if (sellerHasItems && allSellerItemsDelivered) {
            res.setShippingStatus("Delivered");
        } else if (sellerHasInTransit) {
            res.setShippingStatus("In Transit");
        } else if (sellerHasShipped) {
            res.setShippingStatus("Shipped");
        } else if (sellerHasProcessing) {
            res.setShippingStatus("Processing");
        } else {
            res.setShippingStatus(order.getShippingStatus() != null ? order.getShippingStatus().getStatusName() : "Pending");
        }

        if (order.getPayment() != null) {
            OrderPaymentResponse payRes = new OrderPaymentResponse();
            payRes.setId(order.getPayment().getId());
            payRes.setPaymentMethod(order.getPayment().getPaymentMethod() != null ? order.getPayment().getPaymentMethod().getMethodName() : null);
            payRes.setPaidAmount(order.getPayment().getPaidAmount());
            payRes.setPaidAt(order.getPayment().getPaidAt());
            res.setPayment(payRes);
        }
        return res;
    }
}
