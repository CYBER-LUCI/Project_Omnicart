USE OmniCartDB;

DELIMITER $$

CREATE FUNCTION fn_get_current_product_price(p_product_id BIGINT UNSIGNED)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_price DECIMAL(12,2);

    SELECT Price INTO v_price
    FROM PriceLedger
    WHERE ProductID = p_product_id
    ORDER BY RecordedAt DESC, LedgerID DESC
    LIMIT 1;

    RETURN v_price;
END$$

CREATE FUNCTION fn_calculate_order_total(p_order_id BIGINT UNSIGNED)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);

    SELECT COALESCE(SUM(Quantity * ExactLedgerPrice), 0.00) INTO v_total
    FROM OrderDetails
    WHERE OrderID = p_order_id;

    RETURN v_total;
END$$

CREATE FUNCTION fn_customer_order_count(p_customer_id BIGINT UNSIGNED)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_count INT;

    SELECT COUNT(*) INTO v_count
    FROM Orders
    WHERE CustomerID = p_customer_id;

    RETURN v_count;
END$$

CREATE FUNCTION fn_customer_total_spent(p_customer_id BIGINT UNSIGNED)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_spent DECIMAL(12,2);

    SELECT COALESCE(SUM(od.Quantity * od.ExactLedgerPrice), 0.00) INTO v_total_spent
    FROM OrderDetails od
    JOIN Orders o ON od.OrderID = o.OrderID
    WHERE o.CustomerID = p_customer_id
      AND o.ShippingStatusID <> 6;

    RETURN v_total_spent;
END$$

CREATE FUNCTION fn_product_stock_status(p_product_id BIGINT UNSIGNED)
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_stock INT UNSIGNED;

    SELECT StockQuantity INTO v_stock
    FROM Product
    WHERE ProductID = p_product_id;

    IF v_stock IS NULL THEN
        RETURN 'NOT_FOUND';
    ELSEIF v_stock = 0 THEN
        RETURN 'OUT_OF_STOCK';
    ELSEIF v_stock <= 10 THEN
        RETURN 'LOW_STOCK';
    ELSE
        RETURN 'AVAILABLE';
    END IF;
END$$

DELIMITER ;
