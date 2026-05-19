'use client';

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Trophy, Shield, Columns, LayoutList, Home, Plane, Award } from "lucide-react";

interface StandingRow {
  id: number;
  name: string;
  overallPlayed: number;
  overallWins: number;
  overallDraws: number;
  overallLosses: number;
  overallFramesWon: number;
  overallFramesLost: number;
  frameDifference: number;
  overallPoints: number;
  home: { played: number; wins: number; draws: number; losses: number; fw: number; fl: number; };
  away: { played: number; wins: number; draws: number; losses: number; fw: number; fl: number; };
}

interface DropdownItem {
  id: number;
  name: string;
}

interface StandingsClientProps {
  standings: StandingRow[];
  seasons: DropdownItem[];
  divisions: DropdownItem[];
  selectedSeasonId?: number;
  selectedDivisionId?: number;
}

export default function StandingsClient({
  standings,
  seasons,
  divisions,
  selectedSeasonId,
  selectedDivisionId
}: StandingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // View States Toggle: 'simple' vs 'advanced'
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');

  const handleParamChange = (key: 'seasonId' | 'divisionId', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      
      {/* SELECTION CONTROL PANEL */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Season Select Menu */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => handleParamChange('seasonId', e.target.value)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Division Select Menu */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedDivisionId || ""}
              onChange={(e) => handleParamChange('divisionId', e.target.value)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* VIEW CONTROLLER TABS */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center w-full md:w-auto border border-slate-200/40">
          <button
            onClick={() => setViewMode('simple')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              viewMode === 'simple' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Simple View
          </button>
          <button
            onClick={() => setViewMode('advanced')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              viewMode === 'advanced' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" /> Advanced Matrix
          </button>
        </div>
      </div>

      {/* CORE STATS RENDER BOARD */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* SIMPLE TABLE VIEW */}
            {viewMode === 'simple' && (
              <>
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4 w-16 text-center">Pos</th>
                    <th className="px-6 py-4">Squad Club</th>
                    <th className="px-4 py-4 text-center">Played</th>
                    <th className="px-4 py-4 text-center text-emerald-600">Won</th>
                    <th className="px-4 py-4 text-center text-slate-400">Drawn</th>
                    <th className="px-4 py-4 text-center text-rose-500">Lost</th>
                    <th className="px-4 py-4 text-center">Frames +/-</th>
                    <th className="px-6 py-4 text-center bg-indigo-600 text-white font-black w-24">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium text-slate-600">
                  {standings.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-400 text-[11px]">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 text-[13px] uppercase tracking-tight">
                        {row.name}
                      </td>
                      <td className="px-4 py-4 text-center font-mono tabular-nums">{row.overallPlayed}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600 font-mono tabular-nums">{row.overallWins}</td>
                      <td className="px-4 py-4 text-center text-slate-400 font-mono tabular-nums">{row.overallDraws}</td>
                      <td className="px-4 py-4 text-center text-rose-400 font-mono tabular-nums">{row.overallLosses}</td>
                      <td className="px-4 py-4 text-center font-mono tabular-nums font-semibold">
                        {row.overallFramesWon}-{row.overallFramesLost} ({row.frameDifference > 0 ? `+${row.frameDifference}` : row.frameDifference})
                      </td>
                      <td className="px-6 py-4 text-center bg-indigo-50/30 text-indigo-600 font-black font-mono text-sm shadow-inner">
                        {row.overallPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* ADVANCED MATRIX TABLE VIEW */}
            {viewMode === 'advanced' && (
              <>
                <thead>
                  <tr className="bg-slate-50/70 text-slate-400 text-[9px] font-bold uppercase tracking-widest border-b border-slate-200/60">
                    <th className="px-4 py-2" colSpan={2}></th>
                    <th className="px-4 py-2 text-center border-x border-slate-200/60 bg-slate-50/40" colSpan={4}>
                      <span className="inline-flex items-center gap-1.5"><Home className="w-3 h-3 text-amber-600" /> Home Context</span>
                    </th>
                    <th className="px-4 py-2 text-center border-r border-slate-200/60 bg-slate-50/20" colSpan={4}>
                      <span className="inline-flex items-center gap-1.5"><Plane className="w-3 h-3 text-indigo-500" /> Away Context</span>
                    </th>
                    <th className="px-4 py-2 text-center bg-indigo-50/40 text-indigo-950" colSpan={5}>
                      <span className="inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-indigo-600" /> Aggregate Totals</span>
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3.5 text-center w-12">Rank</th>
                    <th className="px-4 py-3.5 border-r border-slate-200/60">Squad Club</th>
                    
                    {/* Home Segment */}
                    <th className="px-2.5 py-3.5 text-center">P</th>
                    <th className="px-2.5 py-3.5 text-center text-emerald-600">W</th>
                    <th className="px-2.5 py-3.5 text-center text-slate-400">D</th>
                    <th className="px-2.5 py-3.5 text-center border-r border-slate-200/60 text-rose-400">L</th>

                    {/* Away Segment */}
                    <th className="px-2.5 py-3.5 text-center">P</th>
                    <th className="px-2.5 py-3.5 text-center text-emerald-600">W</th>
                    <th className="px-2.5 py-3.5 text-center text-slate-400">D</th>
                    <th className="px-2.5 py-3.5 text-center border-r border-slate-200/60 text-rose-400">L</th>

                    {/* Global Segment */}
                    <th className="px-2.5 py-3.5 text-center bg-indigo-50/10">Played</th>
                    <th className="px-2.5 py-3.5 text-center bg-indigo-50/10 text-emerald-600 font-black">W</th>
                    <th className="px-2.5 py-3.5 text-center bg-indigo-50/10 text-rose-400 font-black">L</th>
                    <th className="px-3 py-3.5 text-center bg-indigo-50/20 font-bold">Frames</th>
                    <th className="px-4 py-3.5 text-center bg-indigo-600 text-white font-black">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium text-slate-600 text-[11px]">
                  {standings.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-400 border-r border-slate-100">{index + 1}</td>
                      <td className="px-4 py-3 font-black text-slate-900 uppercase border-r border-slate-200/60 tracking-tight text-[12px]">{row.name}</td>
                      
                      {/* Home */}
                      <td className="px-2.5 py-3 text-center font-mono text-slate-500">{row.home.played}</td>
                      <td className="px-2.5 py-3 text-center font-bold text-emerald-600 font-mono">{row.home.wins}</td>
                      <td className="px-2.5 py-3 text-center text-slate-400 font-mono">{row.home.draws}</td>
                      <td className="px-2.5 py-3 text-center text-rose-400 font-mono border-r border-slate-200/60">{row.home.losses}</td>

                      {/* Away */}
                      <td className="px-2.5 py-3 text-center font-mono text-slate-500">{row.away.played}</td>
                      <td className="px-2.5 py-3 text-center font-bold text-emerald-600 font-mono">{row.away.wins}</td>
                      <td className="px-2.5 py-3 text-center text-slate-400 font-mono">{row.away.draws}</td>
                      <td className="px-2.5 py-3 text-center text-rose-400 font-mono border-r border-slate-200/60">{row.away.losses}</td>

                      {/* Aggregate */}
                      <td className="px-2.5 py-3 text-center font-mono bg-indigo-50/[0.05] text-slate-500">{row.overallPlayed}</td>
                      <td className="px-2.5 py-3 text-center font-extrabold text-emerald-600 bg-indigo-50/[0.05] font-mono">{row.overallWins}</td>
                      <td className="px-2.5 py-3 text-center font-extrabold text-rose-400 bg-indigo-50/[0.05] font-mono">{row.overallLosses}</td>
                      <td className="px-3 py-3 text-center font-mono bg-indigo-50/[0.1] font-semibold tabular-nums text-slate-700">
                        {row.overallFramesWon}:{row.overallFramesLost}
                      </td>
                      <td className="px-4 py-3 text-center bg-indigo-600 text-white font-black font-mono text-xs shadow-sm italic">
                        {row.overallPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>
    </div>
  );
}