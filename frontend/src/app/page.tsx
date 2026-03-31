import SqlPerformanceDashboard from "@/components/SqlPerformanceDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-amber-500/30">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-10 flex flex-col items-start gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                MySQL Performance Tuning
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                  Production Ready
                </span>
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Query Rewriting, Index Strategies & EXPLAIN Analysis
              </p>
            </div>
          </div>
        </header>

        <SqlPerformanceDashboard />
      </div>
    </main>
  );
}
