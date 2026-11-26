package com.omnicart.repository;

import com.omnicart.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Review> findByOrderId(Long orderId);

    Optional<Review> findByOrderIdAndProductId(Long orderId, Long productId);

    boolean existsByOrderIdAndProductId(Long orderId, Long productId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.product.id = :productId GROUP BY r.rating")
    List<Object[]> countByRatingForProduct(@Param("productId") Long productId);

    @Query("SELECT COUNT(r), COALESCE(AVG(r.rating), 0.0) FROM Review r WHERE r.product.id = :productId")
    List<Object[]> getRatingSummaryByProductId(@Param("productId") Long productId);

    @Query("SELECT r.product.id, COUNT(r), COALESCE(AVG(r.rating), 0.0) FROM Review r GROUP BY r.product.id")
    List<Object[]> getAllProductRatingSummaries();
}

