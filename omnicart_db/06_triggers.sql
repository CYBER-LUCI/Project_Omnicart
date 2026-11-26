USE OmniCartDB;

DELIMITER $$

CREATE TRIGGER trg_priceLedger_before_update
BEFORE UPDATE ON PriceLedger
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'PriceLedger is append-only. UPDATE operations are prohibited.';
END$$

CREATE TRIGGER trg_priceLedger_before_delete
BEFORE DELETE ON PriceLedger
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'PriceLedger is append-only. DELETE operations are prohibited.';
END$$

CREATE TRIGGER trg_orderDetails_before_insert
BEFORE INSERT ON OrderDetails
FOR EACH ROW
BEGIN
    DECLARE v_ledger_product_id BIGINT UNSIGNED;

    IF NEW.Quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order quantity must be greater than zero.';
    END IF;

    IF NEW.ExactLedgerPrice < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ExactLedgerPrice cannot be negative.';
    END IF;

    SELECT ProductID INTO v_ledger_product_id
    FROM PriceLedger
    WHERE LedgerID = NEW.LedgerID;

    IF v_ledger_product_id IS NULL OR v_ledger_product_id <> NEW.ProductID THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'LedgerID does not match the given ProductID in PriceLedger.';
    END IF;
END$$

CREATE TRIGGER trg_orderDetails_before_update
BEFORE UPDATE ON OrderDetails
FOR EACH ROW
BEGIN

    IF OLD.OrderID <> NEW.OrderID THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot modify OrderID after order creation.';
    END IF;

    IF OLD.ProductID <> NEW.ProductID THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot modify ProductID after order creation.';
    END IF;

    IF OLD.ExactLedgerPrice <> NEW.ExactLedgerPrice THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot modify ExactLedgerPrice after order creation.';
    END IF;

    IF OLD.LedgerID <> NEW.LedgerID THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot modify LedgerID after order creation.';
    END IF;
END$$

CREATE TRIGGER trg_orderDetails_before_delete
BEFORE DELETE ON OrderDetails
FOR EACH ROW
BEGIN
    DECLARE v_status_id TINYINT UNSIGNED;

    SELECT ShippingStatusID INTO v_status_id
    FROM Orders
    WHERE OrderID = OLD.OrderID;

    IF v_status_id IN (3, 4, 5) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete order details for shipped or completed orders.';
    END IF;
END$$

DELIMITER ;
