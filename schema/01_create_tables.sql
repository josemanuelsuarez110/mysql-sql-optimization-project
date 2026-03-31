-- Database Schema for E-Commerce SQL Optimization
-- Designed for MySQL 8.x
-- Note: Certain secondary indexes are intentionally omitted here 
-- to simulate a legacy/organically grown database bottleneck.

CREATE DATABASE IF NOT EXISTS ecom_optimization;
USE ecom_optimization;

-- 1. Customers Table
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    registration_date DATETIME NOT NULL,
    country VARCHAR(50) NOT NULL,
    is_active TINYINT(1) DEFAULT 1
);
-- Note: No index on email or country initially.

-- 2. Products Table
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0
);
-- Note: No index on category.

-- 3. Orders Table
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATETIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(12,2) NOT NULL,
    -- We define Foreign Key, but MySQL automatically creates an index for FKs. 
    -- However, we lack a Compound Index for (customer_id, order_date) which breaks pagination.
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- 4. Order Items Table
CREATE TABLE order_items (
    order_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Note: In production, reading order_items by product_id frequently requires an index.
-- InnoDB creates a foreign key index on product_id, but it is NOT a covering index 
-- for metrics like SUM(quantity * unit_price) filtering by date.
