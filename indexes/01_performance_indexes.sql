-- ==========================================================
-- INDEXES: Optimizaciones Estratégicas y Covering Indexes
-- Database: ecom_optimization
-- Ejecutar estas sentencias para destruir los cuellos de botella detectados
-- ==========================================================

USE ecom_optimization;

-- ==========================================================
-- ✅ OPTIMIZATION 1: Resolviendo The N+1 JOIN Scan
-- ==========================================================
-- Al añadir un índice "Covering Index" sobre los campos filtrados en Orders y Products,
-- evitamos el chequeo fila-por-fila temporal.
CREATE INDEX idx_orders_date ON orders(order_date);
-- Al indexar el fk 'category' reducimos de O(N) a O(log N) los productos de electrónica.
CREATE INDEX idx_products_category ON products(category);
-- También un Covering Index vital en order_items para resolver agresivamente qué se compró
CREATE INDEX idx_orderitems_productid ON order_items(product_id);


-- ==========================================================
-- ✅ OPTIMIZATION 2: Resolviendo "Using filesort" para la Paginación
-- ==========================================================
-- Cuando consultamos un listado (WHERE country = 'USA' ORDER BY order_date DESC),
-- MySQL filtra por USA y tiene un set gigantesco desordenado. 
-- Solución: "Compound Index" que mapee el filtrado y el ordenamiento simultáneamente.

-- Ojo: No podemos forzar un Compound Index mágico en Orders cruzando hasta Customers.
-- La verdadera optimización para un paginador relacional alto es aislar el ORDER BY 
-- en la tabla principal y hacer INNER JOIN después, O añadir redundancia del país temporal.
-- Aquí, creamos un Compound en Customers y en Orders (status + order_date).
CREATE INDEX idx_customers_country ON customers(country);
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);


-- ==========================================================
-- ✅ OPTIMIZATION 3: Resolviendo "Using temporary" para Agrupaciones (GROUP BY)
-- ==========================================================
-- MySQL hace Full Scan y crea Tablas Temporales cuando intentas agrupar 
-- formateos con funciones como DATE_FORMAT(order_date). 
-- Para que el GROUP BY vuele, lo optimizaremos desde el Query limitando el formato a 
-- cálculos limpios y añadiremos un Índice Compuesto para status + date,
-- que cubre el WHERE y proyecta el order_date para agrupar en memoria B-Tree.
CREATE INDEX idx_orders_status_date_amount ON orders(status, order_date, total_amount);

-- Check applied indexes:
-- SHOW INDEX FROM orders;
-- SHOW INDEX FROM order_items;
-- SHOW INDEX FROM products;
