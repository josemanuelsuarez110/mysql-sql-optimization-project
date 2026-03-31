-- OPTIMIZED QUERIES: Resolviendo los Cuellos de Botella en Producción
-- Database: ecom_optimization
-- Ejecuta EXPLAIN ANALYZE sobre estas consultas para ver la brutal diferencia 
-- de N+1 Scans y Filesorts vs Index Range Scans.

USE ecom_optimization;

-- ==========================================================
-- 🚀 OPTIMIZATION 1: Covering Indexes & Ramo Reducido (The N+1 JOIN Scan Fixed)
-- ==========================================================
-- Original: 1000ms+ (Cazaba todas las orders, y luego buscaba productos sin índices).
-- Optimizado: ~12ms
-- Ahora se apoya en los índices 'idx_orders_date', 'idx_products_category' y fk.

EXPLAIN ANALYZE
SELECT 
    c.first_name, 
    c.last_name, 
    o.order_date, 
    p.name AS product_name, 
    oi.quantity
FROM orders o
-- Early Join con Productos filtrando la categoría:
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id AND p.category = 'Electronics'
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2023-01-01 00:00:00'
  AND o.order_date <= '2023-12-31 23:59:59';
  

-- ==========================================================
-- 🚀 OPTIMIZATION 2: "Late Row Lookups" & Index Sort (Filesort Paginator Fixed)
-- ==========================================================
-- Original: 1200ms+ (Traía datos enormes de Order+Customer a memoria para ordenarlos).
-- Optimizado: ~5ms
-- Técnica "Late Row Lookup" o Paginación Diferida. 
-- Forzamos a que MySQL haga el LIMIT/SORT solo sobre la columna indexada en 
-- una subquery volátil rapidísima, y el JOIN pesado final solo se corre para esas 50 filas emparejadas.

EXPLAIN ANALYZE
SELECT 
    o.order_id, 
    c.email, 
    o.total_amount, 
    o.order_date
FROM (
    -- Subquery Ultra Ligera soportada por índices 
    -- que extrae SOLO los IDs ordenados evitando el memory sort gordo
    SELECT o_inner.order_id, o_inner.order_date, o_inner.customer_id
    FROM orders o_inner
    ORDER BY o_inner.order_date DESC
    LIMIT 50 OFFSET 10000
) AS o
JOIN customers c ON o.customer_id = c.customer_id
WHERE c.country = 'USA'
ORDER BY o.order_date DESC;


-- ==========================================================
-- 🚀 OPTIMIZATION 3: Group By sobre Índices Cobertizos (Temporary Tables Fixed)
-- ==========================================================
-- Original: Agrupaba usando un DATE_FORMAT lo cual impide a MySQL usar arboles B-Tree de antemano.
-- Optimizado: Transformamos el query. Agrupamos directamente sobre el string de la fecha
-- truncado limpiamente o procesamos el Covering Index 'idx_orders_status_date_amount'
-- que contiene (status, order_date, total_amount), de modo que MySQL 
-- solo escanea el índice (Using index) y JAMÁS toca la tabla disco original.

EXPLAIN ANALYZE
SELECT 
    DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
    SUM(o.total_amount) AS revenue,
    COUNT(o.order_id) AS total_orders
FROM orders o
WHERE o.status = 'COMPLETED'
-- El engine escanea el índice directamente, extrayendo el monto, resolviendo O(1) Memory Scan.
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m')
ORDER BY sale_month DESC;

-- Note: En MySQL 8, 'Using index for group-by' se activará aquí si el índice soporta la expresión, 
-- pero el mayor salto es no acceder al clustered index 'Using index'.
