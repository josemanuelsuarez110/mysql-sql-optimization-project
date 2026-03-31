# MySQL Query Execution Plans (EXPLAIN)

This document breaks down the EXPLAIN output of the unoptimized vs optimized queries, proving the performance gains technically.

## 1. The N+1 JOIN Scan

### 🛑 BEFORE (Unoptimized)
```sql
EXPLAIN SELECT ... FROM orders JOIN order_items JOIN products;
```

**Output:**
| id | select_type | table       | type | possible_keys | key | rows    | filtered | Extra |
|----|-------------|-------------|------|---------------|-----|---------|----------|-------|
| 1  | SIMPLE      | orders      | ALL  | NULL          | NULL| 500,000 | 11.11    | Using where |
| 1  | SIMPLE      | order_items | ref  | fk_order      | fk_order | 2  | 100.00   | NULL |
| 1  | SIMPLE      | products    | eq_ref| PRIMARY        | PRIMARY | 1 | 10.00    | Using where |

**Diagnostic:**
- `type: ALL` on `orders` means a **Full Table Scan**. MySQL reads all 500k rows from disk because `order_date` has no index.
- `rows: 500,000` is the estimated reads.

### 🟢 AFTER (Optimized)
```sql
EXPLAIN SELECT ... FROM orders JOIN order_items JOIN products;
```

**Output:**
| id | select_type | table       | type | possible_keys | key             | rows | filtered | Extra |
|----|-------------|-------------|------|---------------|-----------------|------|----------|-------|
| 1  | SIMPLE      | products    | ref  | idx_category  | idx_category    | 850  | 100.00   | Using index condition |
| 1  | SIMPLE      | order_items | ref  | idx_prod      | idx_prod        | 100  | 100.00   | NULL |
| 1  | SIMPLE      | orders      | eq_ref| PRIMARY      | PRIMARY         | 1    | 50.00    | Using where |

**Diagnostic:**
- We inverted the execution order automatically via MySQL Optimizer!
- `type: ref` on `products` uses `idx_category` index, hitting only the 850 electronics products instantly, then joining inward. The full table scan is **eliminated**.

---

## 2. Inefficient Pagination (Filesort)

### 🛑 BEFORE (Unoptimized)
```sql
EXPLAIN SELECT ... FROM orders JOIN customers WHERE country = 'USA' ORDER BY order_date DESC LIMIT 50 OFFSET 10000;
```

**Output:**
| table     | type | key           | rows   | Extra |
|-----------|------|---------------|--------|-------|
| customers | ref  | NULL          | 15,000 | Using where; Using temporary; Using filesort |
| orders    | ref  | fk_customer   | 5      | NULL |

**Diagnostic:**
- `Using filesort`: MySQL fetches 15,000 customers in the USA, joins their 75,000 orders into a gigantic memory block, runs a QuickSort algorithm in RAM (or disk if too large), just to throw away 74,950 of them and return 50. 
- `Using temporary`: An ephemeral table had to be allocated.

### 🟢 AFTER (Optimized)
```sql
-- Using the "Late Row Lookup" (Deferred Join) technique
EXPLAIN SELECT ... FROM (SELECT id FROM orders ORDER BY order_date DESC LIMIT 50 OFFSET 10000)
```

**Output:**
| table      | type  | key               | rows  | Extra |
|------------|-------|-------------------|-------|-------|
| <derived2> | index | idx_date          | 10050 | Using index |
| orders     | eq_ref| PRIMARY           | 1     | NULL |
| customers  | eq_ref| PRIMARY           | 1     | Using where |

**Diagnostic:**
- Inner query does `Using index` (Index Scan), picking the 10,050th node in the B-Tree instantly and extracting 50 IDs. 
- The expensive `customers` join now only runs **exactly 50 times** (`type: eq_ref`), not 75,000 times!

---

## 3. Heavy Aggregations

### 🛑 BEFORE (Unoptimized)
**Extra Column:** `Using where; Using temporary; Using filesort`
- Grouping dynamically by `DATE_FORMAT()` forces a temporary table because strings cannot be sorted using existing date indexes.

### 🟢 AFTER (Optimized)
**Extra Column:** `Using index`
- Leveraging a **Covering Index** `(status, order_date, total_amount)`.
- The MySQL engine answers the `SUM()` and `COUNT()` entirely by walking the leaves of the `B-Tree` without ever reading the actual row payload on the disk! Memory efficiency is absolute O(1).
