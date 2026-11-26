package com.omnicart.service.impl;

import com.omnicart.dto.request.OrderCreateRequest;
import com.omnicart.dto.request.OrderItemRequest;
import com.omnicart.dto.request.ShippingStatusUpdateRequest;
import com.omnicart.dto.response.OrderResponse;
import com.omnicart.entity.*;
import com.omnicart.exception.*;
import com.omnicart.mapper.OrderMapper;
import com.omnicart.repository.*;
import com.omnicart.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final OrderDetailsRepository orderDetailsRepository;
    private final OrderPaymentRepository orderPaymentRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final PriceLedgerRepository priceLedgerRepository;
    private final PriceLedgerSourceRepository priceLedgerSourceRepository;
    private final ShippingStatusRepository shippingStatusRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final com.omnicart.service.DynamicPricingService dynamicPricingService;

    public OrderServiceImpl(OrderRepository orderRepository,
                            OrderDetailsRepository orderDetailsRepository,
                            OrderPaymentRepository orderPaymentRepository,
                            CustomerRepository customerRepository,
                            ProductRepository productRepository,
                            PriceLedgerRepository priceLedgerRepository,
                            PriceLedgerSourceRepository priceLedgerSourceRepository,
                            ShippingStatusRepository shippingStatusRepository,
                            PaymentMethodRepository paymentMethodRepository,
                            @org.springframework.context.annotation.Lazy com.omnicart.service.DynamicPricingService dynamicPricingService) {
        this.orderRepository = orderRepository;
        this.orderDetailsRepository = orderDetailsRepository;
        this.orderPaymentRepository = orderPaymentRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.priceLedgerRepository = priceLedgerRepository;
        this.priceLedgerSourceRepository = priceLedgerSourceRepository;
        this.shippingStatusRepository = shippingStatusRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.dynamicPricingService = dynamicPricingService;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrderResponse placeOrder(OrderCreateRequest request) {
        log.info("Initiating checkout transaction for customer ID: {}", request.getCustomerId());

        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new CustomerNotFoundException(request.getCustomerId()));

        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid PaymentMethod ID: " + request.getPaymentMethodId()));

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new InvalidOrderException("Order must contain at least one item.");
        }

        ShippingStatus pendingStatus = shippingStatusRepository.findById(1)
                .orElseGet(() -> shippingStatusRepository.save(new ShippingStatus(1, "Pending")));

        Order order = new Order(customer, pendingStatus);
        if (request.getRecipientName() != null && !request.getRecipientName().isBlank()) {
            order.setRecipientName(request.getRecipientName().trim());
        } else if (customer != null) {
            order.setRecipientName((customer.getFirstName() + " " + (customer.getLastName() != null ? customer.getLastName() : "")).trim());
        }
        if (request.getDeliveryAddress() != null && !request.getDeliveryAddress().isBlank()) {
            order.setDeliveryAddress(request.getDeliveryAddress().trim());
        } else if (customer != null && customer.getAddresses() != null && !customer.getAddresses().isEmpty()) {
            com.omnicart.entity.Address addr = customer.getAddresses().get(0);
            String hNo = addr.getHouseNumber() != null ? addr.getHouseNumber() + ", " : "";
            String street = addr.getStreet() != null ? addr.getStreet() : "";
            String city = addr.getCity() != null ? ", " + addr.getCity() : "";
            String pin = addr.getPinCode() != null ? " - " + addr.getPinCode() : "";
            order.setDeliveryAddress(hNo + street + city + pin);
        }
        Order savedOrder = orderRepository.save(order);

        BigDecimal calculatedTotal = BigDecimal.ZERO;
        List<OrderDetails> detailsList = new ArrayList<>();

        for (OrderItemRequest item : request.getItems()) {
            Product product = productRepository.findByIdWithPessimisticLock(item.getProductId())
                    .orElseThrow(() -> new ProductNotFoundException(item.getProductId()));

            if (product.getStockQuantity() < item.getQuantity()) {
                throw new InsufficientStockException(product.getId(), item.getQuantity(), product.getStockQuantity());
            }

            PriceLedger latestPrice = priceLedgerRepository.findLatestByProductId(product.getId())
                    .orElseGet(() -> {
                        PriceLedgerSource source = priceLedgerSourceRepository.findById(1)
                                .orElseGet(() -> priceLedgerSourceRepository.save(new PriceLedgerSource(1, "System Baseline")));
                        PriceLedger fallback = new PriceLedger(product, source, BigDecimal.valueOf(999), BigDecimal.ZERO);
                        return priceLedgerRepository.save(fallback);
                    });

            int oldStock = product.getStockQuantity();
            int newStock = oldStock - item.getQuantity();
            product.setStockQuantity(newStock);
            productRepository.save(product);

            // Hybrid Real-Time Event Trigger on critical stock breach
            if ((newStock < 10 && oldStock >= 10) || (newStock <= 3 && oldStock > 3)) {
                log.info("CRITICAL STOCK THRESHOLD REACHED for Product ID {} ({} -> {} units). Triggering instant event-driven scarcity dynamic repricing!",
                        product.getId(), oldStock, newStock);
                try {
                    dynamicPricingService.triggerInstantScarcityReprice(product.getId(), newStock);
                } catch (Exception e) {
                    log.warn("Could not execute instant scarcity dynamic reprice: {}", e.getMessage());
                }
            }

            OrderDetails orderDetails = new OrderDetails(
                    savedOrder,
                    product,
                    item.getQuantity(),
                    latestPrice.getPrice(),
                    latestPrice
            );
            detailsList.add(orderDetails);

            BigDecimal lineTotal = latestPrice.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            calculatedTotal = calculatedTotal.add(lineTotal);
        }

        for (OrderDetails detail : detailsList) {
            savedOrder.addOrderDetail(detail);
        }
        orderDetailsRepository.saveAll(detailsList);

        OrderPayment payment = new OrderPayment(savedOrder, paymentMethod, calculatedTotal);
        orderPaymentRepository.save(payment);
        savedOrder.setPayment(payment);

        log.info("Order successfully created! Order ID: {}, Total Amount: {}", savedOrder.getId(), calculatedTotal);
        return OrderMapper.toResponse(savedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        return OrderMapper.toResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable).map(OrderMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponse> getCustomerOrders(Long customerId, Pageable pageable) {
        if (!customerRepository.existsById(customerId)) {
            throw new CustomerNotFoundException(customerId);
        }
        return orderRepository.findByCustomerIdOrderByOrderDateDesc(customerId, pageable)
                .map(OrderMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderResponse> getSellerOrders(Long sellerId, Pageable pageable) {
        return orderRepository.findOrdersContainingSellerProducts(sellerId, pageable)
                .map(order -> OrderMapper.toSellerResponse(order, sellerId));
    }

    @Override
    @Transactional
    public OrderResponse updateShippingStatus(Long orderId, ShippingStatusUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        ShippingStatus newStatus = shippingStatusRepository.findById(request.getStatusId())
                .orElseThrow(() -> new InvalidShippingStatusException("Shipping status not found with ID: " + request.getStatusId()));

        int currentStatusId = order.getShippingStatus().getId();

        if (currentStatusId == 5 && request.getSellerId() == null) {
            throw new InvalidShippingStatusException("Cannot transition from DELIVERED state.");
        }
        if (currentStatusId == 6) {
            throw new InvalidShippingStatusException("Cannot change status of a CANCELLED order.");
        }

        String targetStatusName = newStatus.getStatusName().toUpperCase();

        if (request.getProductId() != null) {
            for (OrderDetails od : order.getOrderDetails()) {
                if (od.getProduct() != null && od.getProduct().getId().equals(request.getProductId())) {
                    if (!"CANCELLED".equalsIgnoreCase(od.getStatus())) {
                        od.setStatus(targetStatusName);
                        orderDetailsRepository.save(od);
                    }
                }
            }
        } else if (request.getSellerId() != null) {
            Long targetSellerId = request.getSellerId();
            for (OrderDetails od : order.getOrderDetails()) {
                if (od.getProduct() != null && od.getProduct().getSeller() != null
                        && targetSellerId.equals(od.getProduct().getSeller().getId())) {
                    if (!"CANCELLED".equalsIgnoreCase(od.getStatus())) {
                        od.setStatus(targetStatusName);
                        orderDetailsRepository.save(od);
                    }
                }
            }
        } else {
            for (OrderDetails od : order.getOrderDetails()) {
                if (!"CANCELLED".equalsIgnoreCase(od.getStatus())) {
                    od.setStatus(targetStatusName);
                    orderDetailsRepository.save(od);
                }
            }
        }

        // Determine derived overall order shipping status based on all non-cancelled items across all sellers
        boolean allDelivered = true;
        boolean hasDelivered = false;
        boolean hasInTransit = false;
        boolean hasShipped = false;
        boolean hasActive = false;

        for (OrderDetails od : order.getOrderDetails()) {
            if ("CANCELLED".equalsIgnoreCase(od.getStatus())) {
                continue;
            }
            hasActive = true;
            String odStatus = od.getStatus() != null ? od.getStatus().toUpperCase() : "PENDING";
            if ("DELIVERED".equals(odStatus)) {
                hasDelivered = true;
            } else {
                allDelivered = false;
                if ("IN TRANSIT".equals(odStatus) || "OUT_FOR_DELIVERY".equals(odStatus)) {
                    hasInTransit = true;
                } else if ("SHIPPED".equals(odStatus)) {
                    hasShipped = true;
                }
            }
        }

        if (hasActive && allDelivered) {
            ShippingStatus deliveredStatus = shippingStatusRepository.findById(5)
                    .orElseGet(() -> shippingStatusRepository.save(new ShippingStatus(5, "Delivered")));
            order.setShippingStatus(deliveredStatus);
            log.info("All items delivered for Order {}. Overall order marked DELIVERED.", orderId);
        } else if (hasInTransit || hasDelivered) {
            ShippingStatus inTransitStatus = shippingStatusRepository.findById(4)
                    .orElseGet(() -> shippingStatusRepository.save(new ShippingStatus(4, "In Transit")));
            order.setShippingStatus(inTransitStatus);
            log.info("Order {} in progress/in transit across merchants.", orderId);
        } else if (hasShipped) {
            ShippingStatus shippedStatus = shippingStatusRepository.findById(3)
                    .orElseGet(() -> shippingStatusRepository.save(new ShippingStatus(3, "Shipped")));
            order.setShippingStatus(shippedStatus);
        } else if (request.getSellerId() == null) {
            order.setShippingStatus(newStatus);
        }

        Order updated = orderRepository.save(order);
        log.info("Updated Order {} shipping status to {}", orderId, updated.getShippingStatus().getStatusName());
        return OrderMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getShippingStatus().getId() == 5) {
            throw new InvalidOrderException("Cannot cancel an order that has already been DELIVERED.");
        }
        if (order.getShippingStatus().getId() == 6) {
            throw new InvalidOrderException("Order is already CANCELLED.");
        }

        for (OrderDetails od : order.getOrderDetails()) {
            if (!"CANCELLED".equalsIgnoreCase(od.getStatus())) {
                Product product = productRepository.findByIdWithPessimisticLock(od.getProduct().getId())
                        .orElseThrow(() -> new ProductNotFoundException(od.getProduct().getId()));

                product.setStockQuantity(product.getStockQuantity() + od.getQuantity());
                productRepository.save(product);
                od.setStatus("CANCELLED");
                log.info("Restored {} units of product {} due to order cancellation.", od.getQuantity(), product.getId());
            }
        }

        ShippingStatus cancelledStatus = shippingStatusRepository.findById(6)
                .orElseGet(() -> shippingStatusRepository.save(new ShippingStatus(6, "Cancelled")));

        order.setShippingStatus(cancelledStatus);
        if (order.getPayment() != null) {
            order.getPayment().setPaidAmount(BigDecimal.ZERO);
            orderPaymentRepository.save(order.getPayment());
        }
        Order updated = orderRepository.save(order);
        log.info("Order ID: {} cancelled successfully.", orderId);
        return OrderMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrderItem(Long orderId, Long productId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getShippingStatus().getId() == 5) {
            throw new InvalidOrderException("Cannot cancel items from an order that has already been DELIVERED.");
        }
        if (order.getShippingStatus().getId() == 6) {
            throw new InvalidOrderException("Order is already CANCELLED.");
        }

        OrderDetails targetDetail = order.getOrderDetails().stream()
                .filter(od -> od.getProduct() != null && od.getProduct().getId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Product with ID " + productId + " not found in Order " + orderId));

        if ("CANCELLED".equalsIgnoreCase(targetDetail.getStatus())) {
            throw new InvalidOrderException("Product with ID " + productId + " is already CANCELLED in Order " + orderId);
        }

        Product product = productRepository.findByIdWithPessimisticLock(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        product.setStockQuantity(product.getStockQuantity() + targetDetail.getQuantity());
        productRepository.save(product);
        log.info("Restored {} units of product {} due to individual item cancellation from Order {}.",
                targetDetail.getQuantity(), productId, orderId);

        targetDetail.setStatus("CANCELLED");

        boolean allCancelled = order.getOrderDetails().stream()
                .allMatch(od -> "CANCELLED".equalsIgnoreCase(od.getStatus()));

        if (allCancelled) {
            ShippingStatus cancelledStatus = shippingStatusRepository.findById(6)
                    .orElseGet(() -> shippingStatusRepository.save(new ShippingStatus(6, "Cancelled")));
            order.setShippingStatus(cancelledStatus);
            if (order.getPayment() != null) {
                order.getPayment().setPaidAmount(BigDecimal.ZERO);
                orderPaymentRepository.save(order.getPayment());
            }
            log.info("All items cancelled for Order {}. Status marked CANCELLED.", orderId);
        } else {
            BigDecimal newTotal = order.getOrderDetails().stream()
                    .filter(od -> !"CANCELLED".equalsIgnoreCase(od.getStatus()))
                    .map(OrderDetails::getLineTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (order.getPayment() != null) {
                order.getPayment().setPaidAmount(newTotal);
                orderPaymentRepository.save(order.getPayment());
            }
            log.info("Updated Order {} total amount to {} after cancelling product {}.", orderId, newTotal, productId);
        }

        Order updated = orderRepository.save(order);
        return OrderMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateOrderTotal(Long orderId) {
        if (!orderRepository.existsById(orderId)) {
            throw new OrderNotFoundException(orderId);
        }
        return orderDetailsRepository.calculateOrderTotal(orderId);
    }
}
