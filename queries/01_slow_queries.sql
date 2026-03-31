-- SLOW QUERIES: Identificando Cuellos de Botella en Producción
-- Database: ecom_optimization
-- Ejecuta EXPLAIN ANALYZE sobre estas consultas para ver el "Execution Plan" nefasto.

USE ecom_optimization;

-- ==========================================================
-- ❌ BOTTLENECK 1: The N+1 JOIN Scan (Full Table Scan en múltiples tablas)
-- ==========================================================
-- Problema: Busca todos los items vendidos en un rango de fechas.
-- Como no hay índice en order_date, hace un FULL TABLE SCAN de 'orders'.
-- Además, hace Nested Loop Join con 'productos' sin índices de cobertura.

EXPLAIN ANALYZE
SELECT 
    c.first_name, 
    c.last_name, 
    o.order_date, 
    p.name AS product_name, 
    oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2023-01-01 00:00:00'
  AND o.order_date <= '2023-12-31 23:59:59'
  AND p.category = 'Electronics';


-- ==========================================================
-- ❌ BOTTLENECK 2: Paginación Ineficiente con (Using filesort)
-- ==========================================================
-- Problema: Dashboards cargando los últimos pedidos de clientes 'USA'.
-- Como la base filtra por 'country' y luego ordena por 'order_date',
-- MySQL tiene que meter millones de filas en memoria, ordenarlas, y devolver 50.

EXPLAIN ANALYZE
SELECT 
    o.order_id, 
    c.email, 
    o.total_amount, 
    o.order_date
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE c.country = 'USA'
ORDER BY o.order_date DESC
LIMIT 50 OFFSET 10000;


-- ==========================================================
-- ❌ BOTTLENECK 3: Agregación Pesada (Using temporary)
-- ==========================================================
-- Problema: Reporte mensual de ingresos totales. 
-- Agrupar por la extracción de una fecha MÁS el filtrado obliga a MySQL 
-- a crear una "Temporary Table" en disco (E/S lento) para procesar el agrupamiento.

EXPLAIN ANALYZE
SELECT 
    DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
    SUM(o.total_amount) AS revenue,
    COUNT(o.order_id) AS total_orders
FROM orders o
WHERE o.status = 'COMPLETED'
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m')
ORDER BY sale_month DESC;
