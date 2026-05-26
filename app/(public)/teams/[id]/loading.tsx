export default function TeamProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="h-4 w-36 bg-slate-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-8 w-56 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {/* Team Identity Jumbotron skeleton */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 border border-slate-900 animate-pulse">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-6 w-28 bg-slate-800 rounded-xl" />
                <div className="h-6 w-20 bg-slate-800/60 rounded" />
              </div>
              <div className="h-12 w-56 bg-slate-800 rounded-lg" />
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-lg bg-slate-800" />
                ))}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 w-full md:w-auto min-w-[200px]">
              <div className="h-12 w-16 mx-auto bg-slate-800 rounded-lg" />
              <div className="h-3 w-28 mx-auto mt-2 bg-slate-800/60 rounded" />
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="h-6 w-40 bg-slate-800 rounded animate-pulse" />
              <div className="h-9 w-28 bg-slate-800 rounded-xl animate-pulse" />
            </div>
            <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] overflow-hidden animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-5 px-8 border-b border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-11 h-11 rounded-xl bg-slate-800" />
                    <div className="h-4 w-28 bg-slate-800 rounded" />
                  </div>
                  <div className="w-4 h-4 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="h-6 w-40 bg-slate-800 rounded animate-pulse px-2" />
            <div className="bg-slate-900/40 border border-slate-900 rounded-[2rem] p-5 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 mb-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <div className="h-3 w-20 bg-slate-800 rounded mb-2" />
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
