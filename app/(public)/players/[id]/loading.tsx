export default function PlayerProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="h-4 w-48 bg-slate-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-8 w-64 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Jumbotron skeleton */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 border border-slate-900 animate-pulse">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-800" />
              <div className="space-y-3">
                <div className="h-3 w-24 bg-slate-800 rounded" />
                <div className="h-10 w-48 bg-slate-800 rounded-lg" />
                <div className="flex gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded-lg bg-slate-800" />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 w-full md:w-auto min-w-[180px]">
              <div className="h-12 w-20 mx-auto bg-slate-800 rounded-lg" />
              <div className="h-3 w-24 mx-auto mt-2 bg-slate-800/60 rounded" />
            </div>
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-900 animate-pulse">
              <div className="h-3 w-24 bg-slate-800/60 rounded mb-4" />
              <div className="h-6 w-32 bg-slate-800 rounded" />
            </div>
          ))}
        </div>

        {/* Ledger skeleton */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] overflow-hidden animate-pulse">
          <div className="p-6 md:px-8 border-b border-slate-800 bg-slate-900/60">
            <div className="h-5 w-48 bg-slate-800 rounded" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6 md:px-8 border-b border-slate-800/60 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="h-6 w-16 bg-slate-800 rounded-xl" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-3 w-48 bg-slate-800/60 rounded" />
                </div>
              </div>
              <div className="h-5 w-16 bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
