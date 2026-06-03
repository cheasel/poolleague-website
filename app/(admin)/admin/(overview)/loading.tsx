import React from 'react';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-10 pb-12 animate-pulse">
      
      {/* Header Banner Skeleton */}
      <header className="h-44 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
        <div className="space-y-3">
          <div className="h-3 w-40 bg-slate-800 rounded-md"></div>
          <div className="h-9 w-96 bg-slate-800 rounded-lg"></div>
          <div className="h-3.5 w-80 bg-slate-800/60 rounded-md"></div>
        </div>
      </header>

      {/* Quick Access Shortcuts Skeleton */}
      <section className="space-y-4">
        <div className="h-3 w-32 bg-slate-900 rounded ml-1"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl flex flex-col items-start gap-3 h-28 justify-center">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-850"></div>
              <div className="space-y-2 w-full">
                <div className="h-3 w-20 bg-slate-850 rounded"></div>
                <div className="h-2.5 w-28 bg-slate-900 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Two Column Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Core Control Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900/40 rounded-[2rem] border border-slate-900 p-6 space-y-6 h-52 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-850"></div>
                    <div className="space-y-2">
                      <div className="h-2 w-16 bg-slate-850 rounded"></div>
                      <div className="h-6 w-12 bg-slate-850 rounded ml-auto"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4.5 w-24 bg-slate-850 rounded"></div>
                    <div className="h-3 w-full bg-slate-850/60 rounded"></div>
                    <div className="h-3 w-4/5 bg-slate-850/60 rounded"></div>
                  </div>
                </div>
                <div className="h-3.5 w-32 bg-slate-900 rounded"></div>
              </div>
            ))}
          </div>

          {/* Recent Activities Timeline Card */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-[2rem] p-6 space-y-6">
            <div className="h-4 w-48 bg-slate-900 rounded"></div>
            <div className="space-y-6 pl-4 border-l border-slate-850 ml-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 relative">
                  <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                  <div className="flex gap-2">
                    <div className="h-3.5 w-20 bg-slate-850 rounded"></div>
                    <div className="h-3 w-28 bg-slate-900/60 rounded"></div>
                  </div>
                  <div className="h-4 w-64 bg-slate-850 rounded"></div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Season Progress Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-[2rem] space-y-4">
            <div className="h-4.5 w-32 bg-slate-900 rounded"></div>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="h-2.5 w-24 bg-slate-850 rounded"></div>
                  <div className="h-6 w-12 bg-slate-850 rounded"></div>
                </div>
                <div className="h-8 w-12 bg-slate-850 rounded-lg"></div>
              </div>
              {/* Progress bar container */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-900 p-0.5">
                <div className="bg-slate-900 h-full rounded-full w-2/3"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-850/60 rounded"></div>
                <div className="h-3 w-3/4 bg-slate-850/60 rounded"></div>
              </div>
            </div>
          </div>

          {/* Health Checklist Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-[2rem] space-y-5">
            <div className="h-4.5 w-36 bg-slate-900 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-4.5 h-4.5 rounded-full bg-slate-900 shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-24 bg-slate-850 rounded"></div>
                    <div className="h-2.5 w-40 bg-slate-850/60 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
