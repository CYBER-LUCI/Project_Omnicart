package com.omnicart.repository;

import com.omnicart.entity.OrderDetails;
import com.omnicart.entity.OrderDetailsId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface OrderDetailsRepository extends JpaRepository<OrderDetails, OrderDetailsId> {

    List<OrderDetails> findByOrderId(Long orderId);

    @Query("SELECT od FROM OrderDetails od WHERE od.product.id = :productId")
    List<OrderDetails> findByProductId(@Param("productId") Long productId);

    @Query("SELECT COALESCE(SUM(od.quantity * od.exactLedgerPrice), 0.00) FROM OrderDetails od WHERE od.order.id = :orderId AND (od.status IS NULL OR od.status != 'CANCELLED')")
    BigDecimal calculateOrderTotal(@Param("orderId") Long orderId);

    @Query("SELECT COUNT(DISTINCT od.order.id) FROM OrderDetails od WHERE od.product.id = :productId AND od.order.orderDate >= :since")
    Long countOrdersByProductIdSince(@Param("productId") Long productId, @Param("since") java.time.LocalDateTime since);

    @Query("SELECT COALESCE(SUM(od.quantity), 0) FROM OrderDetails od WHERE od.product.id = :productId AND od.order.orderDate >= :since")
    Long sumQuantityByProductIdSince(@Param("productId") Long productId, @Param("since") java.time.LocalDateTime since);

    @Query("SELECT COUNT(DISTINCT od.order.id) FROM OrderDetails od WHERE LOWER(od.product.name) = (SELECT LOWER(p.name) FROM Product p WHERE p.id = :productId) AND od.order.orderDate >= :since")
    Long countOrdersByMatchingProductNameSince(@Param("productId") Long productId, @Param("since") java.time.LocalDateTime since);
}
