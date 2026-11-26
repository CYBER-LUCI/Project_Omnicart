USE OmniCartDB;

CREATE OR REPLACE VIEW vw_current_product_price AS
SELECT ProductID, Price AS CurrentPrice, RecordedAt AS PriceAsOf, LedgerID
FROM (
  SELECT ProductID, Price, RecordedAt, LedgerID,
         ROW_NUMBER() OVER (PARTITION BY ProductID ORDER BY RecordedAt DESC, LedgerID DESC) AS rn
  FROM PriceLedger
) ranked
WHERE rn = 1;

CREATE OR REPLACE VIEW vw_product_catalog AS
SELECT p.ProductID, p.Name AS ProductName, p.Description, s.CompanyName AS SellerName,
       c.CategoryName, p.StockQuantity, cpp.CurrentPrice,
       fn_product_stock_status(p.ProductID) AS StockStatus
FROM Product p
JOIN Seller s ON p.SellerID = s.SellerID
JOIN Category c ON p.CategoryID = c.CategoryID
LEFT JOIN vw_current_product_price cpp ON p.ProductID = cpp.ProductID;

CREATE OR REPLACE VIEW vw_product_price_history AS
SELECT pl.LedgerID, pl.ProductID, p.Name AS ProductName,
       pl.Price, pl.PriceFluctuation, pl.RecordedAt,
       pls.SourceName
FROM PriceLedger pl
JOIN Product p ON pl.ProductID = p.ProductID
JOIN PriceLedgerSource pls ON pl.SourceID = pls.SourceID
ORDER BY pl.ProductID, pl.RecordedAt DESC;

CREATE OR REPLACE VIEW vw_order_summary AS
SELECT o.OrderID, o.CustomerID,
       CONCAT(c.FirstName, ' ', c.LastName) AS CustomerName,
       o.OrderDate, ss.StatusName AS ShippingStatus,
       fn_calculate_order_total(o.OrderID) AS TotalAmount
FROM Orders o
JOIN Customer c ON o.CustomerID = c.CustomerID
JOIN ShippingStatus ss ON o.ShippingStatusID = ss.StatusID;

CREATE OR REPLACE VIEW vw_order_details AS
SELECT o.OrderID, o.OrderDate, od.ProductID, p.Name AS ProductName,
       od.Quantity, od.ExactLedgerPrice,
       (od.Quantity * od.ExactLedgerPrice) AS LineTotal,
       ss.StatusName AS ShippingStatus
FROM Orders o
JOIN OrderDetails od ON o.OrderID = od.OrderID
JOIN Product p ON od.ProductID = p.ProductID
JOIN ShippingStatus ss ON o.ShippingStatusID = ss.StatusID;

CREATE OR REPLACE VIEW vw_customer_order_summary AS
SELECT c.CustomerID,
       CONCAT(c.FirstName, ' ', c.LastName) AS CustomerName,
       fn_customer_order_count(c.CustomerID) AS TotalOrders,
       fn_customer_total_spent(c.CustomerID) AS TotalSpent
FROM Customer c;

CREATE OR REPLACE VIEW vw_seller_product_catalog AS
SELECT s.SellerID, s.CompanyName, p.ProductID, p.Name AS ProductName,
       p.StockQuantity, cpp.CurrentPrice, c.CategoryName
FROM Seller s
JOIN Product p ON s.SellerID = p.SellerID
JOIN Category c ON p.CategoryID = c.CategoryID
LEFT JOIN vw_current_product_price cpp ON p.ProductID = cpp.ProductID;

CREATE OR REPLACE VIEW vw_category_product_count AS
SELECT c.CategoryID, c.CategoryName, c.Level, c.ParentCategoryID,
       COUNT(p.ProductID) AS ProductCount
FROM Category c
LEFT JOIN Product p ON c.CategoryID = p.CategoryID
GROUP BY c.CategoryID, c.CategoryName, c.Level, c.ParentCategoryID;

CREATE OR REPLACE VIEW vw_low_stock_products AS
SELECT p.ProductID, p.Name AS ProductName, p.StockQuantity,
       s.CompanyName AS SellerName, c.CategoryName,
       fn_product_stock_status(p.ProductID) AS StockStatus
FROM Product p
JOIN Seller s ON p.SellerID = s.SellerID
JOIN Category c ON p.CategoryID = c.CategoryID
WHERE p.StockQuantity <= 10;

CREATE OR REPLACE VIEW vw_product_embeddings_status AS
SELECT p.ProductID, p.Name AS ProductName,
       CASE WHEN pe.EmbeddingID IS NOT NULL THEN 'HAS_EMBEDDING' ELSE 'NO_EMBEDDING' END AS EmbeddingStatus,
       pe.ModelVersion, pe.created_at AS EmbeddingCreatedAt
FROM Product p
LEFT JOIN ProductEmbeddings pe ON p.ProductID = pe.ProductID;

CREATE OR REPLACE VIEW vw_product_reviews AS
SELECT r.ReviewID, r.ProductID, p.Name AS ProductName,
       r.CustomerID, CONCAT(c.FirstName, ' ', c.LastName) AS CustomerName,
       r.OrderID, r.Rating, r.Title, r.Comment,
       r.created_at AS ReviewDate
FROM Review r
JOIN Product p ON r.ProductID = p.ProductID
JOIN Customer c ON r.CustomerID = c.CustomerID;

CREATE OR REPLACE VIEW vw_product_review_summary AS
SELECT p.ProductID, p.Name AS ProductName,
       COUNT(r.ReviewID) AS TotalReviews,
       COALESCE(ROUND(AVG(r.Rating), 1), 0.0) AS AverageRating
FROM Product p
LEFT JOIN Review r ON p.ProductID = r.ProductID
GROUP BY p.ProductID, p.Name;
