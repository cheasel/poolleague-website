import React from 'react';
import { Trophy, Calendar, Edit } from 'lucide-react';

export default function MatchDetailLoading() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 px-4 text-slate-200 animate-pulse">
      {/* Back button skeleton placeholder */}
      <header>
        <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest">
          <div className="w-4 h-4 rounded bg-slate-900" />
          <div className="h-3 w-40 bg-slate-900 rounded-md" />
        </div>
      </header>

      {/* MATCH SUMMARY DISPLAY CARD SKELETON */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-slate-800 border border-slate-900 shadow-inner">
              <Trophy className="w-5 h-5 text-slate-800" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Match Overview</h1>
              <div className="h-2.5 w-24 bg-slate-900 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-[0.2em] bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-900 shadow-inner min-w-[180px]">
            <Calendar className="w-4 h-4 text-slate-800" />
            <div className="h-3 w-28 bg-slate-900 rounded" />
          </div>
        </div>

        {/* COMPACT SCOREBOARD SKELETON */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center text-center py-4 relative z-10">
          <div className="md:col-span-3 md:text-right space-y-2 flex flex-col md:items-end items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Home Club</span>
            <div className="h-6 w-48 bg-slate-900 rounded-md" />
          </div>

          <div className="md:col-span-1 mx-auto flex flex-col items-center">
            <div className="h-11 w-24 bg-slate-950 border border-slate-900 rounded-2xl" />
            <div className="h-2 w-12 bg-slate-900 rounded mt-2.5" />
          </div>

          <div className="md:col-span-3 md:text-left space-y-2 flex flex-col md:items-start items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Away Club</span>
            <div className="h-6 w-48 bg-slate-900 rounded-md" />
          </div>
        </div>

        <div className="flex items-center justify-center pt-4 relative z-10">
          <div className="h-12 w-64 bg-slate-900 border border-slate-850 rounded-2xl" />
        </div>
      </section>

      {/* EDIT MATCH DETAILS FORM SKELETON */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-slate-800 border border-slate-900 shadow-inner">
            <Edit className="w-5 h-5 text-slate-850" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Edit Match Details</h2>
            <div className="h-2.5 w-64 bg-slate-900 rounded-md" />
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="h-3 w-20 bg-slate-900 rounded-md ml-2" />
                <div className="w-full h-11 bg-slate-950 border border-slate-900 rounded-xl" />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <div className="h-12 w-48 bg-slate-900 border border-slate-850 rounded-xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
