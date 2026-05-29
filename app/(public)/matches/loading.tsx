export default function MatchesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-32 bg-slate-800 rounded-full" />
        <div className="h-10 w-64 bg-slate-800 rounded-xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-slate-800 rounded-xl" />
        <div className="h-10 w-32 bg-slate-800 rounded-xl" />
      </div>

      {/* Matches Grid Skeleton */}
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-28 bg-slate-800 rounded-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="bg-slate-900/40 border border-slate-900 rounded-[2rem] p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <div className="h-4 w-20 bg-slate-800 rounded-full" />
                    <div className="h-6 w-6 bg-slate-800 rounded-lg" />
                  </div>
                  <div className="h-8 w-16 bg-slate-800 rounded-xl" />
                  <div className="flex items-center gap-2 flex-1 justify-start">
                    <div className="h-6 w-6 bg-slate-800 rounded-lg" />
                    <div className="h-4 w-20 bg-slate-800 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
