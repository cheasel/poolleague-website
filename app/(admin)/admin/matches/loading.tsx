import React from 'react';

export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 animate-pulse">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER AREA SKELETON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900/60 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-900 rounded-lg"></div>
            <div className="h-3 w-80 bg-slate-900/60 rounded-md"></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-10 w-28 bg-slate-900 rounded-xl"></div>
            <div className="h-10 w-28 bg-slate-900 rounded-xl"></div>
            <div className="h-10 w-36 bg-slate-900 rounded-xl"></div>
          </div>
        </div>

        {/* CONTROLS BAR CONTAINER SKELETON */}
        <div className="space-y-4 bg-slate-900/40 border border-slate-900 p-4 rounded-3xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl w-full md:w-auto border border-slate-900/60">
              <div className="h-8 w-36 bg-slate-900 rounded-lg"></div>
              <div className="h-8 w-28 bg-slate-900/30 rounded-lg"></div>
            </div>
            <div className="h-10 w-full md:w-64 bg-slate-950 border border-slate-900 rounded-xl"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-900/60">
            <div className="h-10 flex-1 bg-slate-950 border border-slate-900 rounded-xl"></div>
            <div className="h-10 flex-1 bg-slate-950 border border-slate-900 rounded-xl"></div>
          </div>
        </div>

        {/* MATCHES LIST SKELETON */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-3xl overflow-hidden divide-y divide-slate-900/60">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                {/* Week number badge skeleton */}
                <div className="w-12 h-12 bg-slate-950 border border-slate-900 rounded-xl shrink-0"></div>
                {/* Match details skeleton */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-32 bg-slate-900 rounded"></div>
                    <div className="h-3 w-4 bg-slate-900/40 rounded"></div>
                    <div className="h-4 w-32 bg-slate-900 rounded"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-3.5 w-24 bg-slate-900/60 rounded"></div>
                    <div className="h-3.5 w-16 bg-slate-900/60 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 justify-between md:justify-end border-t border-slate-900/60 md:border-0 pt-4 md:pt-0">
                <div className="h-8 w-12 bg-slate-950 border border-slate-900 rounded-xl"></div>
                <div className="h-10 w-36 bg-slate-950 border border-slate-900 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
