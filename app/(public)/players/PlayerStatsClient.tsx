'use client';

import { useState, useMemo } from "react";
import Link from "next/link";

interface PlayerStatRow {
  id: number;
  name: string;
  imageUrl: string | null;
  teamName: string;
  matchPlay: number;
  maxTeamMatches: number; // 🎯 Added to track custom team counts dynamically
  singlePlay: number;
  singleWin: number;
  singleLost: number;
  singlePct: string;
  doublePlay: number;
  doubleWin: number;
  doubleLost: number;
  doublePct: string;
  totalPlay: number;
  totalWin: number;
  totalLost: number;
  totalPct: string;
}

interface PlayerStatsClientProps {
  initialPlayers: PlayerStatRow[];
  divisions: { id: number; name: string; tier: number }[];
  activeDivId: number;
}

export default function PlayerStatsClient({ initialPlayers, divisions, activeDivId }: PlayerStatsClientProps) {
  const [pageSize, setPageSize] = useState<number>(25);
  const [enableMpFilter, setEnableMpFilter] = useState<boolean>(false);
  const [minMpPercentage, setMinMpPercentage] = useState<number>(30);

  const maxMatchesPlayed = useMemo(() => {
    if (initialPlayers.length === 0) return 0;
    return Math.max(...initialPlayers.map(p => p.matchPlay));
  }, [initialPlayers]);

  const processedPlayers = useMemo(() => {
    let result = [...initialPlayers];
    if (enableMpFilter && maxMatchesPlayed > 0) {
      result = result.filter((player) => {
        const attendancePct = (player.matchPlay / maxMatchesPlayed) * 100;
        return attendancePct >= minMpPercentage;
      });
    }
    return result.slice(0, pageSize);
  }, [initialPlayers, pageSize, enableMpFilter, minMpPercentage, maxMatchesPlayed]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Show Records</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>Top 10 Players</option>
              <option value={25}>Top 25 Players</option>
              <option value={50}>Top 50 Players</option>
              <option value={100}>All Records</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="mpFilterToggle"
              checked={enableMpFilter}
              onChange={(e) => setEnableMpFilter(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
            />
            <label htmlFor="mpFilterToggle" className="text-xs font-black text-slate-700 uppercase tracking-tight cursor-pointer selection:bg-transparent">
              Exclude players with low attendance
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              disabled={!enableMpFilter}
              value={minMpPercentage}
              onChange={(e) => setMinMpPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
              className={`w-16 p-2 text-center font-black border rounded-xl outline-none transition-all ${
                enableMpFilter ? 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            />
            <span className="text-xs font-black text-slate-400">%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] md:text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-500 uppercase tracking-[0.2em] font-black border-b border-slate-800">
                <th className="px-4 py-4" colSpan={3}>Identity & Attendance</th>
                <th className="px-4 py-4 text-center border-x border-slate-800 bg-slate-800/50" colSpan={4}>Singles</th>
                <th className="px-4 py-4 text-center border-r border-slate-800 bg-slate-800/30" colSpan={4}>Doubles</th>
                <th className="px-4 py-4 text-center bg-indigo-950 text-indigo-400" colSpan={4}>Overall Totals</th>
              </tr>
              <tr className="bg-slate-900 text-white uppercase tracking-widest font-black border-b border-slate-800">
                <th className="px-4 py-6 sticky left-0 bg-slate-900 z-10">Player</th>
                <th className="px-4 py-6 text-slate-400">Team</th>
                <th className="px-4 py-6 text-center bg-amber-500 text-slate-900 ring-inset ring-1 ring-amber-400">Match Play (MP)</th>
                <th className="px-4 py-6 text-center bg-slate-800/50">Play</th>
                <th className="px-4 py-6 text-center bg-slate-800/50">Win</th>
                <th className="px-4 py-6 text-center bg-slate-800/50">Lost</th>
                <th className="px-4 py-6 text-center bg-slate-800/50 text-indigo-400">W%</th>
                <th className="px-4 py-6 text-center bg-slate-800/30">Play</th>
                <th className="px-4 py-6 text-center bg-slate-800/30">Win</th>
                <th className="px-4 py-6 text-center bg-slate-800/30">Lost</th>
                <th className="px-4 py-6 text-center bg-slate-800/30 text-indigo-400">W%</th>
                <th className="px-4 py-6 text-center bg-indigo-900/20">Play</th>
                <th className="px-4 py-6 text-center bg-indigo-900/20">Win</th>
                <th className="px-4 py-6 text-center bg-indigo-900/20">Lost</th>
                <th className="px-4 py-6 text-center bg-indigo-600 text-white">Total W%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedPlayers.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-5 font-black text-slate-900 uppercase whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10">
                    <Link href={`/players/${p.id}`} className="hover:text-indigo-600 transition-colors flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 hidden sm:flex items-center justify-center">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black bg-slate-200 text-slate-500">
                            {p.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span>{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-5 text-slate-500 font-bold uppercase tracking-tight whitespace-nowrap">
                    {p.teamName}
                  </td>
                  
                  {/* 🎯 UPDATED: Displays their individual appearances alongside their team's max completed matches */}
                  <td className="px-4 py-5 text-center font-black text-slate-900 bg-amber-50 border-x border-amber-100 italic text-sm">
                    {p.matchPlay} <span className="text-[10px] text-amber-700/60 font-normal">/ {p.maxTeamMatches}</span>
                  </td>
                  
                  <td className="px-4 py-5 text-center font-medium bg-slate-50/30">{p.singlePlay}</td>
                  <td className="px-4 py-5 text-center font-bold text-green-600 bg-slate-50/30">{p.singleWin}</td>
                  <td className="px-4 py-5 text-center font-bold text-red-400 bg-slate-50/30">{p.singleLost}</td>
                  <td className="px-4 py-5 text-center font-black text-indigo-600 bg-slate-50/30 italic">{p.singlePct}%</td>
                  <td className="px-4 py-5 text-center font-medium">{p.doublePlay}</td>
                  <td className="px-4 py-5 text-center font-bold text-green-600">{p.doubleWin}</td>
                  <td className="px-4 py-5 text-center font-bold text-red-400">{p.doubleLost}</td>
                  <td className="px-4 py-5 text-center font-black text-indigo-600 italic">{p.doublePct}%</td>
                  <td className="px-4 py-5 text-center font-black text-slate-900 bg-indigo-50/20">{p.totalPlay}</td>
                  <td className="px-4 py-5 text-center font-black text-green-600 bg-indigo-50/20">{p.totalWin}</td>
                  <td className="px-4 py-5 text-center font-black text-red-400 bg-indigo-50/20">{p.totalLost}</td>
                  <td className="px-4 py-5 text-center bg-indigo-600 text-white font-black italic shadow-inner">
                    {p.totalPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}