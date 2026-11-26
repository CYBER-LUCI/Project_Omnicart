package com.omnicart.service.impl;

import com.omnicart.dto.request.ReviewCreateRequest;
import com.omnicart.dto.response.ProductReviewSummaryResponse;
import com.omnicart.dto.response.ReviewResponse;
import com.omnicart.entity.Customer;
import com.omnicart.entity.Order;
import com.omnicart.entity.Product;
import com.omnicart.entity.Review;
import com.omnicart.exception.ResourceNotFoundException;
import com.omnicart.repository.CustomerRepository;
import com.omnicart.repository.OrderRepository;
import com.omnicart.repository.ProductRepository;
import com.omnicart.repository.ReviewRepository;
import com.omnicart.service.ReviewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ReviewServiceImpl implements ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewServiceImpl.class);

    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    public ReviewServiceImpl(ReviewRepository reviewRepository,
                             OrderRepository orderRepository,
                             ProductRepository productRepository,
                             CustomerRepository customerRepository) {
        this.reviewRepository = reviewRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
    }

    @Override
    @Transactional
    public ReviewResponse createReview(Long customerId, ReviewCreateRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + request.getOrderId()));

        // Determine effective customer
        Customer customer = order.getCustomer();
        if (customer == null && customerId != null) {
            customer = customerRepository.findById(customerId).orElse(null);
        }
        if (customerId != null && customer != null && !customer.getId().equals(customerId)) {
            throw new IllegalArgumentException("You can only submit reviews for orders placed by your account.");
        }

        // Validate that order or product is Completed / Delivered
        String statusName = order.getShippingStatus() != null ? order.getShippingStatus().getStatusName() : "";
        int statusId = order.getShippingStatus() != null ? order.getShippingStatus().getId() : 0;
        boolean isDelivered = statusId == 5 || "Delivered".equalsIgnoreCase(statusName) || "COMPLETED".equalsIgnoreCase(statusName);

        boolean isProductDelivered = order.getOrderDetails().stream()
                .anyMatch(od -> od.getProduct() != null && od.getProduct().getId().equals(request.getProductId())
                        && "DELIVERED".equalsIgnoreCase(od.getStatus()));

        if (!isDelivered && !isProductDelivered) {
            throw new IllegalStateException("Reviews can only be given after the product has been delivered. Current status: " + statusName);
        }

        // Validate that the product belongs to this order
        boolean productInOrder = order.getOrderDetails().stream()
                .anyMatch(od -> od.getProduct() != null && od.getProduct().getId().equals(request.getProductId()));
        if (!productInOrder) {
            throw new IllegalArgumentException("Product ID " + request.getProductId() + " was not part of Order #" + request.getOrderId());
        }

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + request.getProductId()));

        // Check if an existing review already exists for this order + product
        Optional<Review> existingOpt = reviewRepository.findByOrderIdAndProductId(request.getOrderId(), request.getProductId());
        Review review;
        if (existingOpt.isPresent()) {
            review = existingOpt.get();
            review.setRating(request.getRating());
            review.setTitle(request.getTitle() != null && !request.getTitle().isBlank() ? request.getTitle() : "Verified Purchase Review");
            review.setComment(request.getComment());
            log.info("Updated existing review ID: {} for Order: {}, Product: {}", review.getId(), order.getId(), product.getId());
        } else {
            String title = (request.getTitle() != null && !request.getTitle().isBlank())
                    ? request.getTitle()
                    : "Verified Purchase Review";
            review = new Review(product, customer, order, request.getRating(), title, request.getComment());
            log.info("Created new review for Order: {}, Product: {} by Customer: {}", order.getId(), product.getId(), customer != null ? customer.getId() : null);
        }

        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByProduct(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByCustomer(Long customerId) {
        return reviewRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviewsByOrder(Long orderId) {
        return reviewRepository.findByOrderId(orderId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProductReviewSummaryResponse getProductReviewSummary(Long productId) {
        List<Object[]> summaryList = reviewRepository.getRatingSummaryByProductId(productId);
        long totalReviews = 0L;
        double averageRating = 0.0;

        if (summaryList != null && !summaryList.isEmpty() && summaryList.get(0) != null) {
            Object[] row = summaryList.get(0);
            totalReviews = row[0] != null ? ((Number) row[0]).longValue() : 0L;
            averageRating = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
        }

        averageRating = BigDecimal.valueOf(averageRating).setScale(1, RoundingMode.HALF_UP).doubleValue();

        Map<Integer, Long> counts = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            counts.put(i, 0L);
        }

        List<Object[]> breakdown = reviewRepository.countByRatingForProduct(productId);
        if (breakdown != null) {
            for (Object[] b : breakdown) {
                if (b[0] != null && b[1] != null) {
                    int rating = ((Number) b[0]).intValue();
                    long count = ((Number) b[1]).longValue();
                    counts.put(rating, count);
                }
            }
        }

        return new ProductReviewSummaryResponse(productId, averageRating, totalReviews, counts);
    }

    private ReviewResponse mapToResponse(Review r) {
        String customerName = "Verified Customer";
        if (r.getCustomer() != null) {
            String fn = r.getCustomer().getFirstName() != null ? r.getCustomer().getFirstName() : "";
            String ln = r.getCustomer().getLastName() != null ? r.getCustomer().getLastName() : "";
            customerName = (fn + " " + ln).trim();
            if (customerName.isEmpty()) customerName = "Verified Buyer";
        }

        String productName = r.getProduct() != null ? r.getProduct().getName() : "Product";
        Long orderId = r.getOrder() != null ? r.getOrder().getId() : null;

        return new ReviewResponse(
                r.getId(),
                r.getProduct() != null ? r.getProduct().getId() : null,
                productName,
                r.getCustomer() != null ? r.getCustomer().getId() : null,
                customerName,
                orderId,
                r.getRating(),
                r.getTitle(),
                r.getComment(),
                r.getCreatedAt()
        );
    }
}
