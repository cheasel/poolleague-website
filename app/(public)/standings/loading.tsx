export default function StandingsLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-32 bg-slate-800 rounded-full" />
        <div className="h-10 w-64 bg-slate-800 rounded-xl" />
      </div>

      {/* Filters Bar Skeleton */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="h-10 sm:w-48 bg-slate-800 rounded-xl" />
        <div className="h-10 sm:w-48 bg-slate-800 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] p-6 space-y-4">
        <div className="flex border-b border-slate-800/60 pb-4">
          <div className="h-4 w-12 bg-slate-800 rounded-full" />
          <div className="h-4 w-48 bg-slate-800 rounded-full ml-10" />
          <div className="h-4 w-12 bg-slate-800 rounded-full ml-auto" />
          <div className="h-4 w-12 bg-slate-800 rounded-full ml-12" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center py-4 border-b border-slate-800/30 last:border-0">
            <div className="h-6 w-6 bg-slate-800 rounded-full" />
            <div className="h-4 w-36 bg-slate-800 rounded-full ml-10" />
            <div className="h-4 w-8 bg-slate-800 rounded-full ml-auto" />
            <div className="h-4 w-8 bg-slate-800 rounded-full ml-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
