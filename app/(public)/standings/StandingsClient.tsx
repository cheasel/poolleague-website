'use client';

import { useState } from "react";
import Link from "next/link";
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
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Season Select Menu */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => handleParamChange('seasonId', e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 transition-colors outline-none cursor-pointer hover:border-slate-700"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Division Select Menu */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedDivisionId || ""}
              onChange={(e) => handleParamChange('divisionId', e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 transition-colors outline-none cursor-pointer hover:border-slate-700"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-950 text-slate-200">{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* VIEW CONTROLLER TABS */}
        <div className="bg-slate-950 p-1 rounded-xl flex items-center w-full md:w-auto border border-slate-800/60">
          <button
            onClick={() => setViewMode('simple')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              viewMode === 'simple' ? 'bg-slate-900 text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Simple View
          </button>
          <button
            onClick={() => setViewMode('advanced')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              viewMode === 'advanced' ? 'bg-slate-900 text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Columns className="w-3.5 h-3.5" /> Advanced Matrix
          </button>
        </div>
      </div>

      {/* CORE STATS RENDER BOARD */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            
            {/* SIMPLE TABLE VIEW */}
            {viewMode === 'simple' && (
              <>
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="px-6 py-4 w-16 text-center">Pos</th>
                    <th className="px-6 py-4">Squad Club</th>
                    <th className="px-4 py-4 text-center">Played</th>
                    <th className="px-4 py-4 text-center text-emerald-400">Won</th>
                    <th className="px-4 py-4 text-center text-slate-500">Drawn</th>
                    <th className="px-4 py-4 text-center text-rose-400">Lost</th>
                    <th className="px-4 py-4 text-center">Frames +/-</th>
                    <th className="px-6 py-4 text-center bg-indigo-600/20 text-indigo-400 font-black w-24 border-l border-slate-800">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                  {standings.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-900/40 transition-colors group">
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-500 text-[11px]">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-black text-white text-[13px] uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                        <Link href={`/teams/${row.id}`}>{row.name}</Link>
                      </td>
                      <td className="px-4 py-4 text-center font-mono tabular-nums">{row.overallPlayed}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-400 font-mono tabular-nums">{row.overallWins}</td>
                      <td className="px-4 py-4 text-center text-slate-500 font-mono tabular-nums">{row.overallDraws}</td>
                      <td className="px-4 py-4 text-center text-rose-400/80 font-mono tabular-nums">{row.overallLosses}</td>
                      <td className="px-3 py-3 text-center bg-indigo-950/[0.1] border-l border-slate-800 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Raw Frames */}
                          <span className="font-mono font-semibold tabular-nums text-slate-300 text-[11px]">
                            {row.overallFramesWon}:{row.overallFramesLost}
                          </span>
                          
                          {/* Difference with dynamic coloring */}
                          <span className={`font-mono text-[10px] font-bold ${
                            row.frameDifference > 0 ? 'text-emerald-400' : 
                            row.frameDifference < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            ({row.frameDifference > 0 ? `+${row.frameDifference}` : row.frameDifference})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center bg-indigo-950/30 text-indigo-400 font-black font-mono text-sm border-l border-slate-800">
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
                  <tr className="bg-slate-900/60 text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                    <th className="px-4 py-2" colSpan={2}></th>
                    <th className="px-4 py-2 text-center border-x border-slate-800 bg-slate-950/40" colSpan={4}>
                      <span className="inline-flex items-center gap-1.5"><Home className="w-3 h-3 text-amber-500" /> Home Context</span>
                    </th>
                    <th className="px-4 py-2 text-center border-r border-slate-800 bg-slate-950/20" colSpan={4}>
                      <span className="inline-flex items-center gap-1.5"><Plane className="w-3 h-3 text-indigo-400" /> Away Context</span>
                    </th>
                    <th className="px-4 py-2 text-center bg-indigo-950/40 text-indigo-400" colSpan={6}>
                      <span className="inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-indigo-400" /> Aggregate Totals</span>
                    </th>
                  </tr>
                  <tr className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800">
                    <th className="px-4 py-3.5 text-center w-12">Rank</th>
                    <th className="px-4 py-3.5 border-r border-slate-800">Squad Club</th>
                    
                    {/* Home */}
                    <th className="px-2.5 py-3.5 text-center">P</th>
                    <th className="px-2.5 py-3.5 text-center text-emerald-400">W</th>
                    <th className="px-2.5 py-3.5 text-center text-slate-500">D</th>
                    <th className="px-2.5 py-3.5 text-center border-r border-slate-800 text-rose-400">L</th>

                    {/* Away */}
                    <th className="px-2.5 py-3.5 text-center">P</th>
                    <th className="px-2.5 py-3.5 text-center text-emerald-400">W</th>
                    <th className="px-2.5 py-3.5 text-center text-slate-500">D</th>
                    <th className="px-2.5 py-3.5 text-center border-r border-slate-800 text-rose-400">L</th>

                    {/* Aggregate */}
                    <th className="px-2.5 py-3.5 text-center bg-indigo-950/10">P</th>
                    <th className="px-2.5 py-3.5 text-center bg-indigo-950/10 text-emerald-400">W</th>
                    <th className="px-2.5 py-3.5 text-center bg-indigo-950/10 text-slate-500">D</th>
                    <th className="px-2.5 py-3.5 text-center bg-indigo-950/10 text-rose-400">L</th>
                    <th className="px-3 py-3.5 text-center bg-indigo-950/20 font-bold border-l border-slate-800">Frames (+/-)</th>
                    <th className="px-4 py-3.5 text-center bg-indigo-600/40 text-white font-black border-l border-slate-800">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-400 text-[11px]">
                  {standings.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-900/40 transition-colors group">
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-600 border-r border-slate-900">{index + 1}</td>
                      <td className="px-4 py-3 font-black text-white uppercase border-r border-slate-800 tracking-tight text-[12px] group-hover:text-indigo-400 transition-colors">
                        <Link href={`/teams/${row.id}`}>{row.name}</Link>
                      </td>
                      
                      {/* Home Data */}
                      <td className="px-2.5 py-3 text-center font-mono">{row.home.played}</td>
                      <td className="px-2.5 py-3 text-center font-bold text-emerald-400/80 font-mono">{row.home.wins}</td>
                      <td className="px-2.5 py-3 text-center text-slate-600 font-mono">{row.home.draws}</td>
                      <td className="px-2.5 py-3 text-center text-rose-400/60 font-mono border-r border-slate-800">{row.home.losses}</td>

                      {/* Away Data */}
                      <td className="px-2.5 py-3 text-center font-mono">{row.away.played}</td>
                      <td className="px-2.5 py-3 text-center font-bold text-emerald-400/80 font-mono">{row.away.wins}</td>
                      <td className="px-2.5 py-3 text-center text-slate-600 font-mono">{row.away.draws}</td>
                      <td className="px-2.5 py-3 text-center text-rose-400/60 font-mono border-r border-slate-800">{row.away.losses}</td>

                      {/* Aggregate Data */}
                      <td className="px-2.5 py-3 text-center font-mono bg-indigo-950/[0.05]">{row.overallPlayed}</td>
                      <td className="px-2.5 py-3 text-center font-extrabold text-emerald-400/90 bg-indigo-950/[0.05]">{row.overallWins}</td>
                      <td className="px-2.5 py-3 text-center font-extrabold text-slate-500 bg-indigo-950/[0.05]">{row.overallDraws}</td>
                      <td className="px-2.5 py-3 text-center font-extrabold text-rose-400/70 bg-indigo-950/[0.05]">{row.overallLosses}</td>
                      
                      {/* Combined Frame Diff Cell */}
                      <td className="px-3 py-3 text-center bg-indigo-950/[0.1] border-l border-slate-800 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Raw Frames */}
                          <span className="font-mono font-semibold tabular-nums text-slate-300 text-[11px]">
                            {row.overallFramesWon}:{row.overallFramesLost}
                          </span>
                          
                          {/* Difference with dynamic coloring */}
                          <span className={`font-mono text-[10px] font-bold ${
                            row.frameDifference > 0 ? 'text-emerald-400' : 
                            row.frameDifference < 0 ? 'text-rose-400' : 'text-slate-500'
                          }`}>
                            ({row.frameDifference > 0 ? `+${row.frameDifference}` : row.frameDifference})
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center bg-indigo-950 text-indigo-400 font-black font-mono text-xs shadow-inner border-l border-slate-800 italic">
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