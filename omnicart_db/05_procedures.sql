USE OmniCartDB;

DELIMITER $$
CREATE PROCEDURE sp_create_customer(
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_phone VARCHAR(20),
    IN p_password_hash VARCHAR(255),
    OUT p_customer_id BIGINT UNSIGNED
)

BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO Customer (FirstName, LastName, PasswordHash)
    VALUES (p_first_name, p_last_name, p_password_hash);

    SET p_customer_id = LAST_INSERT_ID();

    INSERT INTO CustomerEmail (CustomerID, EmailAddress, IsPrimary)
    VALUES (p_customer_id, p_email, 1);

    INSERT INTO CustomerPhone (CustomerID, PhoneNumber, IsPrimary)
    VALUES (p_customer_id, p_phone, 1);

    COMMIT;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_add_customer_address(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_house_number VARCHAR(50),
    IN p_street VARCHAR(255),
    IN p_city VARCHAR(100),
    IN p_pin_code VARCHAR(10),
    IN p_address_type VARCHAR(50),
    OUT p_address_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_address_type_id TINYINT UNSIGNED;

    IF NOT EXISTS (SELECT 1 FROM Customer WHERE CustomerID = p_customer_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer not found';
    END IF;

    SELECT AddressTypeID INTO v_address_type_id
    FROM AddressType
    WHERE TypeName = p_address_type;

    IF v_address_type_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid address type';
    END IF;

    INSERT INTO Address (CustomerID, AddressTypeID, HouseNumber, Street, City, PINCode)
    VALUES (p_customer_id, v_address_type_id, p_house_number, p_street, p_city, p_pin_code);

    SET p_address_id = LAST_INSERT_ID();
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_create_seller(
    IN p_company_name VARCHAR(255),
    IN p_gstin VARCHAR(15),
    IN p_email VARCHAR(255),
    IN p_phone VARCHAR(20),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    OUT p_seller_id BIGINT UNSIGNED
)
BEGIN
    INSERT INTO Seller (CompanyName, GSTIN, ContactEmail, ContactPhone, City, State, PasswordHash)
    VALUES (p_company_name, p_gstin, p_email, p_phone, p_city, p_state, p_password_hash);

    SET p_seller_id = LAST_INSERT_ID();
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_create_category(
    IN p_name VARCHAR(100),
    IN p_description TEXT,
    IN p_parent_id BIGINT UNSIGNED,
    OUT p_category_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_parent_level TINYINT UNSIGNED DEFAULT 0;

    IF p_parent_id IS NOT NULL THEN

        SELECT Level INTO v_parent_level
        FROM Category
        WHERE CategoryID = p_parent_id;

        IF v_parent_level IS NULL AND NOT EXISTS (SELECT 1 FROM Category WHERE CategoryID = p_parent_id) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parent category not found';
        END IF;

        SET v_parent_level = v_parent_level + 1;
    END IF;

    INSERT INTO Category (CategoryName, CategoryDescription, ParentCategoryID, Level)
    VALUES (p_name, p_description, p_parent_id, v_parent_level);

    SET p_category_id = LAST_INSERT_ID();
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_create_product(
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_stock INT UNSIGNED,
    IN p_seller_id BIGINT UNSIGNED,
    IN p_category_id BIGINT UNSIGNED,
    IN p_initial_price DECIMAL(12,2),
    OUT p_product_id BIGINT UNSIGNED
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM Seller WHERE SellerID = p_seller_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seller not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Category WHERE CategoryID = p_category_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Category not found';
    END IF;

    IF p_initial_price < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Initial price must be >= 0';
    END IF;

    INSERT INTO Product (Name, Description, StockQuantity, SellerID, CategoryID)
    VALUES (p_name, p_description, p_stock, p_seller_id, p_category_id);

    SET p_product_id = LAST_INSERT_ID();

    INSERT INTO PriceLedger (ProductID, SourceID, Price, PriceFluctuation)
    VALUES (p_product_id, 1, p_initial_price, 0.00);

    COMMIT;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_add_product_image(
    IN p_product_id BIGINT UNSIGNED,
    IN p_image_url VARCHAR(500),
    IN p_display_order SMALLINT UNSIGNED,
    IN p_is_primary TINYINT(1),
    OUT p_image_id BIGINT UNSIGNED
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Product WHERE ProductID = p_product_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found';
    END IF;

    IF p_is_primary = 1 THEN
        UPDATE ProductImage SET IsPrimary = 0 WHERE ProductID = p_product_id;
    END IF;

    INSERT INTO ProductImage (ProductID, ImageURL, DisplayOrder, IsPrimary)
    VALUES (p_product_id, p_image_url, p_display_order, p_is_primary);

    SET p_image_id = LAST_INSERT_ID();
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_add_product_embedding(
    IN p_product_id BIGINT UNSIGNED,
    IN p_feature_vector JSON,
    IN p_model_version VARCHAR(50),
    OUT p_embedding_id BIGINT UNSIGNED
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Product WHERE ProductID = p_product_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found';
    END IF;

    INSERT INTO ProductEmbeddings (ProductID, FeatureVector, ModelVersion)
    VALUES (p_product_id, p_feature_vector, p_model_version)
    ON DUPLICATE KEY UPDATE
        FeatureVector = VALUES(FeatureVector),
        ModelVersion = VALUES(ModelVersion);

    SELECT EmbeddingID INTO p_embedding_id
    FROM ProductEmbeddings
    WHERE ProductID = p_product_id;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_add_price_ledger_entry(
    IN p_product_id BIGINT UNSIGNED,
    IN p_price DECIMAL(12,2),
    IN p_source_id TINYINT UNSIGNED,
    OUT p_ledger_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_previous_price DECIMAL(12,2);
    DECLARE v_fluctuation DECIMAL(12,2) DEFAULT 0.00;

    IF NOT EXISTS (SELECT 1 FROM Product WHERE ProductID = p_product_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found';
    END IF;

    IF p_price < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Price must be >= 0';
    END IF;

    SET v_previous_price = fn_get_current_product_price(p_product_id);

    IF v_previous_price IS NOT NULL THEN
        SET v_fluctuation = p_price - v_previous_price;
    END IF;

    INSERT INTO PriceLedger (ProductID, SourceID, Price, PriceFluctuation)
    VALUES (p_product_id, p_source_id, p_price, v_fluctuation);

    SET p_ledger_id = LAST_INSERT_ID();
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_update_product_stock(
    IN p_product_id BIGINT UNSIGNED,
    IN p_new_stock INT UNSIGNED
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Product WHERE ProductID = p_product_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found';
    END IF;

    UPDATE Product
    SET StockQuantity = p_new_stock
    WHERE ProductID = p_product_id;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_place_order(
    IN p_customer_id BIGINT UNSIGNED,
    IN p_product_ids JSON,
    IN p_quantities JSON,
    IN p_payment_method_id TINYINT UNSIGNED,
    OUT p_order_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_item_count INT;
    DECLARE v_idx INT;
    DECLARE v_total_amount DECIMAL(12,2);
    DECLARE v_product_id BIGINT UNSIGNED;
    DECLARE v_quantity INT UNSIGNED;
    DECLARE v_current_stock INT UNSIGNED;
    DECLARE v_ledger_id BIGINT UNSIGNED;
    DECLARE v_price DECIMAL(12,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM Customer WHERE CustomerID = p_customer_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer not found';
    END IF;

    SET v_item_count = JSON_LENGTH(p_product_ids);
    IF v_item_count <> JSON_LENGTH(p_quantities) OR v_item_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product IDs and quantities arrays must have equal non-zero length';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM PaymentMethod WHERE MethodID = p_payment_method_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid payment method';
    END IF;

    INSERT INTO Orders (CustomerID, ShippingStatusID) VALUES (p_customer_id, 1);
    SET p_order_id = LAST_INSERT_ID();

    SET v_idx = 0;
    SET v_total_amount = 0.00;

    WHILE v_idx < v_item_count DO
        SET v_product_id = JSON_EXTRACT(p_product_ids, CONCAT('$[', v_idx, ']'));
        SET v_quantity = JSON_EXTRACT(p_quantities, CONCAT('$[', v_idx, ']'));

        IF v_quantity <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be greater than zero';
        END IF;

        SELECT StockQuantity INTO v_current_stock
        FROM Product
        WHERE ProductID = v_product_id
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found';
        END IF;

        IF v_current_stock < v_quantity THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
        END IF;

        SELECT LedgerID, Price INTO v_ledger_id, v_price
        FROM PriceLedger
        WHERE ProductID = v_product_id
        ORDER BY RecordedAt DESC, LedgerID DESC
        LIMIT 1;

        IF v_ledger_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No price found for product';
        END IF;

        INSERT INTO OrderDetails (OrderID, ProductID, Quantity, ExactLedgerPrice, LedgerID)
        VALUES (p_order_id, v_product_id, v_quantity, v_price, v_ledger_id);

        UPDATE Product
        SET StockQuantity = StockQuantity - v_quantity
        WHERE ProductID = v_product_id;

        SET v_total_amount = v_total_amount + (v_quantity * v_price);

        SET v_idx = v_idx + 1;
    END WHILE;

    INSERT INTO OrderPayment (OrderID, MethodID, PaidAmount)
    VALUES (p_order_id, p_payment_method_id, v_total_amount);

    COMMIT;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_update_shipping_status(
    IN p_order_id BIGINT UNSIGNED,
    IN p_status_id TINYINT UNSIGNED
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderID = p_order_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ShippingStatus WHERE StatusID = p_status_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid shipping status';
    END IF;

    UPDATE Orders
    SET ShippingStatusID = p_status_id
    WHERE OrderID = p_order_id;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_cancel_order(
    IN p_order_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_status_id TINYINT UNSIGNED;
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_product_id BIGINT UNSIGNED;
    DECLARE v_quantity INT UNSIGNED;

    DECLARE cur_items CURSOR FOR
        SELECT ProductID, Quantity FROM OrderDetails WHERE OrderID = p_order_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT ShippingStatusID INTO v_status_id
    FROM Orders
    WHERE OrderID = p_order_id FOR UPDATE;

    IF v_status_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order not found';
    END IF;

    IF v_status_id = 5 OR v_status_id = 6 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order cannot be cancelled from its current status';
    END IF;

    OPEN cur_items;
    read_loop: LOOP
        FETCH cur_items INTO v_product_id, v_quantity;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        UPDATE Product
        SET StockQuantity = StockQuantity + v_quantity
        WHERE ProductID = v_product_id;
    END LOOP;
    CLOSE cur_items;

    UPDATE Orders
    SET ShippingStatusID = 6
    WHERE OrderID = p_order_id;

    COMMIT;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE sp_cancel_order_item(
    IN p_order_id BIGINT UNSIGNED,
    IN p_product_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_status_id TINYINT UNSIGNED;
    DECLARE v_quantity INT UNSIGNED;
    DECLARE v_remaining_count INT UNSIGNED;
    DECLARE v_new_total DECIMAL(12,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT ShippingStatusID INTO v_status_id
    FROM Orders
    WHERE OrderID = p_order_id FOR UPDATE;

    IF v_status_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order not found';
    END IF;

    IF v_status_id = 5 OR v_status_id = 6 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot cancel items from delivered or cancelled orders';
    END IF;

    SELECT Quantity INTO v_quantity
    FROM OrderDetails
    WHERE OrderID = p_order_id AND ProductID = p_product_id;

    IF v_quantity IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item not found in order';
    END IF;

    -- Restore stock atomically
    UPDATE Product
    SET StockQuantity = StockQuantity + v_quantity
    WHERE ProductID = p_product_id;

    -- Mark line item as CANCELLED so it remains visible in order history
    UPDATE OrderDetails
    SET Status = 'CANCELLED'
    WHERE OrderID = p_order_id AND ProductID = p_product_id;

    -- Check remaining active items
    SELECT COUNT(*) INTO v_remaining_count
    FROM OrderDetails
    WHERE OrderID = p_order_id AND Status = 'ACTIVE';

    IF v_remaining_count = 0 THEN
        UPDATE Orders
        SET ShippingStatusID = 6
        WHERE OrderID = p_order_id;

        UPDATE OrderPayment
        SET PaidAmount = 0.00
        WHERE OrderID = p_order_id;
    ELSE
        SELECT COALESCE(SUM(Quantity * ExactLedgerPrice), 0.00) INTO v_new_total
        FROM OrderDetails
        WHERE OrderID = p_order_id AND Status = 'ACTIVE';

        UPDATE OrderPayment
        SET PaidAmount = v_new_total
        WHERE OrderID = p_order_id;
    END IF;

    COMMIT;
END $$
DELIMITER ;

