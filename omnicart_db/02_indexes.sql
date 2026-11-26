USE OmniCartDB;

CREATE INDEX idx_custphone_phone ON CustomerPhone(PhoneNumber);

CREATE INDEX idx_custphone_customer ON CustomerPhone(CustomerID);

CREATE INDEX idx_custemail_customer ON CustomerEmail(CustomerID);

CREATE INDEX idx_addr_customer ON Address(CustomerID);

CREATE INDEX idx_addr_city ON Address(City);

CREATE INDEX idx_addr_pincode ON Address(PINCode);

CREATE INDEX idx_seller_email ON Seller(ContactEmail);

CREATE INDEX idx_category_parent ON Category(ParentCategoryID);

CREATE INDEX idx_category_name ON Category(CategoryName);

CREATE INDEX idx_product_seller ON Product(SellerID);

CREATE INDEX idx_product_category ON Product(CategoryID);

CREATE INDEX idx_product_name ON Product(Name);

CREATE INDEX idx_product_stock ON Product(StockQuantity);

CREATE FULLTEXT INDEX ft_product_search ON Product(Name, Description);

CREATE INDEX idx_prodimg_product ON ProductImage(ProductID);

CREATE INDEX idx_ledger_product_time ON PriceLedger(ProductID, RecordedAt DESC);

CREATE INDEX idx_ledger_product ON PriceLedger(ProductID);

CREATE INDEX idx_ledger_source ON PriceLedger(SourceID);

CREATE INDEX idx_ledger_recorded ON PriceLedger(RecordedAt);

CREATE INDEX idx_order_customer_date ON Orders(CustomerID, OrderDate DESC);

CREATE INDEX idx_order_status_date ON Orders(ShippingStatusID, OrderDate);

CREATE INDEX idx_order_date ON Orders(OrderDate);

CREATE INDEX idx_od_product ON OrderDetails(ProductID);

CREATE INDEX idx_od_ledger ON OrderDetails(LedgerID);

CREATE INDEX idx_payment_method ON OrderPayment(MethodID);

CREATE INDEX idx_payment_date ON OrderPayment(PaidAt);

CREATE INDEX idx_review_product ON Review(ProductID);

CREATE INDEX idx_review_customer ON Review(CustomerID);

CREATE INDEX idx_review_order ON Review(OrderID);
