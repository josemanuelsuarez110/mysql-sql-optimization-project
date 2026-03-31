# 🚀 MySQL SQL Optimization & Performance Tuning (Production-Ready)

This repository serves as a **Senior Database Engineering Portfolio Project**, demonstrating advanced SQL rewriting, Indexing strategies (B-Tree, Compound, Covering), and diagnostic capabilities using \`EXPLAIN ANALYZE\`.

## 📌 The Problem
An E-Commerce Database organically grew to **over 1.6 Million rows**. 
Unoptimized analytical queries, paginations, and aggregations began experiencing catastrophic timeouts (Full Table Scans, \`Using filesort\`, and \`Using temporary\`).

## 🛠️ The Solution
By deeply analyzing the Execution Plans and refactoring the Data Access layer:
- **Query Execution Times** were reduced from \`~2000ms\` down to \`<15ms\` (**99% reduction**).
- **Disk I/O** dropped by replacing costly \`ALL\` scans with \`ref\` Index Range Scans on strategic Compound Indexes.

---

## 📂 Repository Structure

1. \`/schema\`: Contains DDL table creations and a Python Generator (\`seed_data.py\`) to produce millions of fake rows.
2. \`/queries\`: The raw SQL files showing the original bottlenecks (\`01_slow_queries.sql\`) vs the rewritten efficient versions (\`02_optimized_queries.sql\`).
3. \`/indexes\`: The DDL for the B-Tree covering indexes that resolved the nested loops.
4. \`/explain\`: Deep-dive markdown reporting on MySQL's Execution Plans.
5. \`/frontend\`: Next.js (App Router) Dashboard showcasing the "Before vs After" execution times in a polished terminal aesthetic.

---

## 🚀 Running the Local Database (MySQL 8)

1. Boot a MySQL Server.
2. Create the tables:
   \`\`\`bash
   mysql -u root < schema/01_create_tables.sql
   \`\`\`
3. Generate the 1M+ rows dataset (~200MB dump):
   \`\`\`bash
   python schema/02_seed_data.py
   mysql -u root ecom_optimization < 03_seed_bulk_data.sql
   \`\`\`
4. Run the queries from \`/queries\` to see the latency, then apply \`/indexes/01_performance_indexes.sql\` and measure again.

## 📊 Running the Visualization Dashboard

The frontend is built with Next.js, Tailwind CSS, and Recharts.

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
Visit \`http://localhost:3000\` to view the interactive performance metrics.

---
> **Tech Stack**: MySQL 8.x, InnoDB, Next.js, React, Tailwind, Python (Faker)
> **Author**: Data Engineer Portfolio
