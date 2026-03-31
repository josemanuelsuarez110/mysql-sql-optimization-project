"use client";

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Database, Zap, Clock, Code2, AlertTriangle, Search, Filter, Server } from 'lucide-react';

const optimizations = [
  {
    id: 1,
    title: "The N+1 JOIN Scan Fixed",
    desc: "Resolved Full Table Scans turning expensive JOINs into Index Range Scans.",
    beforeTime: 1450,
    afterTime: 12,
    beforeCode: `EXPLAIN ANALYZE
SELECT c.first_name, o.order_date, p.name 
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2023-01-01'
  AND p.category = 'Electronics';`,
    afterCode: `EXPLAIN ANALYZE
SELECT c.first_name, o.order_date, p.name 
FROM orders o
-- Early Join with Index filter:
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id 
  AND p.category = 'Electronics'
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date >= '2023-01-01';`,
    indexCode: `CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_products_category ON products(category);`,
    bottleneck: "type: ALL (Full Table Scan)",
    fix: "type: ref (Using index condition)",
    rowsScanned: "500,000 → 850"
  },
  {
    id: 2,
    title: "Filesort Pagination Eliminated",
    desc: "Late Row Lookups applied to destroy Memory QuickSorts on massive limits.",
    beforeTime: 2200,
    afterTime: 5,
    beforeCode: `EXPLAIN ANALYZE
SELECT o.order_id, c.email, o.total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE c.country = 'USA'
ORDER BY o.order_date DESC
LIMIT 50 OFFSET 10000;`,
    afterCode: `-- Deferred Join Pattern
EXPLAIN ANALYZE
SELECT o.order_id, c.email, o.total_amount
FROM (
    SELECT id, customer_id FROM orders 
    ORDER BY order_date DESC 
    LIMIT 50 OFFSET 10000
) AS o
JOIN customers c ON o.customer_id = c.customer_id
WHERE c.country = 'USA';`,
    indexCode: `CREATE INDEX idx_customers_country ON customers(country);
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);`,
    bottleneck: "Extra: Using filesort; Using temporary",
    fix: "Extra: Using index",
    rowsScanned: "75,000 → 50"
  },
  {
    id: 3,
    title: "Covering Indexes for Aggregations",
    desc: "Fixed heavy temporary tables caused by formatting strings dynamically during clustering.",
    beforeTime: 980,
    afterTime: 9,
    beforeCode: `EXPLAIN ANALYZE
SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
       SUM(o.total_amount) AS revenue
FROM orders o
WHERE o.status = 'COMPLETED'
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m');`,
    afterCode: `EXPLAIN ANALYZE
SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
       SUM(o.total_amount) AS revenue
FROM orders o
WHERE o.status = 'COMPLETED'
-- The engine now groups entirely on the B-Tree memory
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m');`,
    indexCode: `CREATE INDEX idx_orders_status_date_amount 
ON orders(status, order_date, total_amount);`,
    bottleneck: "Extra: Using temporary; Using filesort",
    fix: "Extra: Using index (O(1) memory lookup)",
    rowsScanned: "100,000 → 12,000"
  }
];

export default function SqlPerformanceDashboard() {
  const [activeTab, setActiveTab] = useState(1);
  const activeData = optimizations.find(o => o.id === activeTab);

  if (!activeData) return null;

  const chartData = [
    { name: 'Before (Unoptimized)', ms: activeData.beforeTime },
    { name: 'After (Optimized)', ms: activeData.afterTime },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 flex items-center justify-between border-t-amber-500/50">
          <div>
            <p className="text-zinc-400 text-sm font-medium">Database Volume</p>
            <p className="text-2xl font-bold font-mono mt-1 text-white">1,600,000<span className="text-amber-500 text-lg"> rows</span></p>
          </div>
          <Database className="w-8 h-8 text-amber-500/20" />
        </div>
        <div className="glass-panel p-5 flex items-center justify-between border-t-emerald-500/50">
          <div>
            <p className="text-zinc-400 text-sm font-medium">Avg. Performance Gain</p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-400">99.2%<span className="text-emerald-500/50 text-lg"> faster</span></p>
          </div>
          <Zap className="w-8 h-8 text-emerald-500/20" />
        </div>
        <div className="glass-panel p-5 flex items-center justify-between border-t-cyan-500/50">
          <div>
            <p className="text-zinc-400 text-sm font-medium">Target Engine</p>
            <p className="text-2xl font-bold font-mono mt-1 text-white">MySQL <span className="text-cyan-400 text-lg">8.0 InnoDB</span></p>
          </div>
          <Server className="w-8 h-8 text-cyan-500/20" />
        </div>
      </div>

      {/* Main Panel */}
      <div className="glass-panel mt-4 overflow-hidden flex flex-col xl:flex-row">
        
        {/* Sidebar Nav */}
        <div className="w-full xl:w-72 border-b xl:border-b-0 xl:border-r border-white/10 bg-black/20 p-4 shrink-0">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-4 px-2">Bottlenecks Fixed</p>
          <div className="flex flex-col gap-2">
            {optimizations.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id)}
                className={`text-left px-4 py-3 rounded-lg transition-all ${activeTab === opt.id ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'hover:bg-white/5 text-zinc-400 border border-transparent'}`}
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm truncate">{opt.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{activeData.title}</h2>
            <p className="text-zinc-400 max-w-2xl">{activeData.desc}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Chart */}
            <div className="bg-[#09090b] rounded-xl p-4 border border-white/5">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Execution Time (ms)
              </h3>
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff'}} />
                    <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#09090b] rounded-xl p-4 border border-white/5 flex-1 flex flex-col justify-center">
                <h3 className="text-sm font-medium text-zinc-500 mb-1 flex items-center gap-2">
                  <Search className="w-4 h-4 text-pink-400" />
                  Rows Scanned (EXPLAIN limit)
                </h3>
                <p className="text-xl font-mono text-white mt-1">{activeData.rowsScanned}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-[#09090b] rounded-xl p-4 border border-red-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <h3 className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Bottleneck</h3>
                  <p className="text-sm font-mono text-zinc-300 break-words">{activeData.bottleneck}</p>
                </div>
                <div className="bg-[#09090b] rounded-xl p-4 border border-emerald-500/20 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <h3 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Zap className="w-3 h-3"/> Solution</h3>
                  <p className="text-sm font-mono text-zinc-300 break-words">{activeData.fix}</p>
                </div>
              </div>
            </div>
            
          </div>

          {/* DDL Indexing Solution */}
          <div className="mb-6 border border-amber-500/20 rounded-xl overflow-hidden bg-[#13110d]">
             <div className="px-4 py-2 border-b border-amber-500/10 bg-amber-500/5 flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500/70 font-semibold tracking-wide">01_performance_indexes.sql</span>
                <span className="text-[10px] uppercase text-amber-500/50 border border-amber-500/20 px-2 rounded-full">DDL Optimization</span>
             </div>
             <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">
               <code>{activeData.indexCode}</code>
             </pre>
          </div>

          {/* Code Before/After */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-white/5 rounded-xl overflow-hidden bg-[#09090b]">
              <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">01_slow_queries.sql</span>
                <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono text-red-200/70 overflow-x-auto h-48">
                <code>{activeData.beforeCode}</code>
              </pre>
            </div>
            <div className="border border-emerald-500/10 rounded-xl overflow-hidden bg-[#040d08]">
              <div className="px-4 py-2 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-500/50">02_optimized_queries.sql</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono text-emerald-300/90 overflow-x-auto h-48">
                <code>{activeData.afterCode}</code>
              </pre>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
