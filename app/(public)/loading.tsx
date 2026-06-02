import React from 'react';

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100 relative animate-pulse">
      
      {/* Hero Header Skeleton */}
      <div className="relative overflow-hidden bg-slate-950/60 border-b border-slate-900/60 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex gap-2">
            <div className="h-6 w-36 bg-slate-900 rounded-xl"></div>
            <div className="h-6 w-48 bg-slate-900 rounded-xl"></div>
          </div>
          <div className="space-y-3">
            <div className="h-10 w-96 bg-slate-900 rounded-lg"></div>
            <div className="h-10 w-64 bg-slate-900 rounded-lg"></div>
          </div>
          <div className="h-12 w-full max-w-xl bg-slate-900/60 rounded-xl"></div>
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-44 bg-slate-900 rounded-xl"></div>
            <div className="h-11 w-44 bg-slate-900 rounded-xl"></div>
            <div className="h-11 w-36 bg-slate-900 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* Division Switcher Skeleton */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="bg-slate-900/60 p-1 rounded-2xl inline-flex gap-1 border border-slate-900">
          <div className="h-8 w-28 bg-slate-950 rounded-xl"></div>
          <div className="h-8 w-28 bg-slate-950/40 rounded-xl"></div>
        </div>
      </div>

      {/* Stats Spotlight Grid Skeleton */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 h-44 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-3 w-32 bg-slate-850 rounded"></div>
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-850"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-850 rounded"></div>
                    <div className="h-3 w-20 bg-slate-900 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="h-3.5 w-full bg-slate-850/50 rounded pt-3 border-t border-slate-800/40"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Content Grid Skeleton */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Leaderboard Table Skeleton */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-slate-850 rounded"></div>
                  <div className="h-4.5 w-44 bg-slate-850 rounded"></div>
                </div>
                <div className="h-4 w-20 bg-slate-850 rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2.5">
                    <div className="h-4 w-8 bg-slate-900 rounded"></div>
                    <div className="h-4 w-40 bg-slate-850 rounded"></div>
                    <div className="h-4 w-32 bg-slate-850 rounded"></div>
                    <div className="h-6 w-12 bg-slate-900 rounded-xl"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Match Outcomes Skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-slate-900 rounded"></div>
                  <div className="h-4 w-36 bg-slate-850 rounded"></div>
                </div>
                <div className="h-4 w-20 bg-slate-850 rounded"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex items-center justify-between h-16 animate-pulse">
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <div className="h-4 w-24 bg-slate-850 rounded"></div>
                      <div className="w-6 h-6 rounded bg-slate-950 border border-slate-850"></div>
                    </div>
                    <div className="h-8 w-16 bg-slate-950 border border-slate-850 rounded-xl mx-4"></div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-6 h-6 rounded bg-slate-950 border border-slate-850"></div>
                      <div className="h-4 w-24 bg-slate-850 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (4 cols) */}
          <div className="w-full bg-slate-900/20 border border-slate-900 rounded-3xl p-5 h-80">
            <div className="space-y-4">
              <div className="h-5 w-32 bg-slate-850 rounded"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-slate-950/60 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
