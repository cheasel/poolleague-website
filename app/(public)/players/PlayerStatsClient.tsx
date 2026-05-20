'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Trophy, Users, Star, Layers } from "lucide-react";

interface PlayerStatRow {
  id: number;
  name: string;
  imageUrl: string | null;
  teamName: string;
  matchPlay: number;
  framePlay: number; // 🎯 ADDED
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

interface FilterDropdownItem {
  id: number;
  name: string;
}

interface PlayerStatsClientProps {
  initialPlayers: PlayerStatRow[];
  seasons: FilterDropdownItem[];
  divisions: FilterDropdownItem[];
  selectedSeasonId?: number;
  selectedDivisionId?: number;
}

export default function PlayerStatsClient({ 
  initialPlayers, 
  seasons, 
  divisions, 
  selectedSeasonId, 
  selectedDivisionId 
}: PlayerStatsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pageSize, setPageSize] = useState<number>(25);
  const [enableFrameFilter, setEnableFrameFilter] = useState<boolean>(false); // 🎯 CHANGED: Named for frame logic explicitly
  const [minFramePercentage, setMinFramePercentage] = useState<number>(30); // 🎯 CHANGED: Target frame logic percentage

  // URL Parameter Sync Handler
  const handleFilterChange = (key: 'seasonId' | 'divisionId', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const maxFramesPlayed = useMemo(() => {
    if (initialPlayers.length === 0) return 0;
    return Math.max(...initialPlayers.map(p => p.framePlay)); // 🎯 CHANGED: Find maximum frame play context
  }, [initialPlayers]);

  const processedPlayers = useMemo(() => {
    let result = [...initialPlayers];
    if (enableFrameFilter && maxFramesPlayed > 0) {
      result = result.filter((player) => {
        const frameAttendancePct = (player.framePlay / maxFramesPlayed) * 100; // 🎯 CHANGED: Evaluate based on frames played
        return frameAttendancePct >= minFramePercentage;
      });
    }
    return result.slice(0, pageSize);
  }, [initialPlayers, pageSize, enableFrameFilter, minFramePercentage, maxFramesPlayed]);

  return (
    <div className="space-y-6">
      {/* FILTER PANEL */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">

        {/* Scope Selectors: Season & Division */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => handleFilterChange('seasonId', e.target.value)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <select
              value={selectedDivisionId || ""}
              onChange={(e) => handleFilterChange('divisionId', e.target.value)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              <option value={10}>Top 10 Performers</option>
              <option value={25}>Top 25 Performers</option>
              <option value={50}>Top 50 Performers</option>
              <option value={100}>All Active Players</option>
            </select>
          </div>
        </div>

        {/* 🎯 CHANGED: Frame Attendance Filter Component */}
        <div className="bg-slate-50/60 px-4 py-2 rounded-xl border border-slate-200/60 flex items-center justify-between gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="frameFilterToggle"
              checked={enableFrameFilter}
              onChange={(e) => setEnableFrameFilter(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-0 accent-indigo-600 cursor-pointer"
            />
            <label htmlFor="frameFilterToggle" className="text-[11px] font-bold text-slate-600 uppercase tracking-tight cursor-pointer select-none">
              Filter Low Frame Play
            </label>
          </div>

          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              disabled={!enableFrameFilter}
              value={minFramePercentage}
              onChange={(e) => setMinFramePercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
              className={`w-12 p-1 text-center font-bold text-xs border rounded-lg outline-none transition-all ${
                enableFrameFilter ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            />
            <span className="text-[11px] font-bold text-slate-400">%</span>
          </div>
        </div>
      </div>

      {/* RENDER TABLE MATRIX */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200/60">
                <th className="px-4 py-3" colSpan={4}> {/* 🎯 CHANGED: Increased colSpan from 3 to 4 to cover new frame column */}
                  <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> Identity Profile</span>
                </th>
                <th className="px-4 py-3 text-center border-x border-slate-200/60 bg-slate-50/40" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Singles Bracket</span>
                </th>
                <th className="px-4 py-3 text-center border-r border-slate-200/60" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-500" /> Doubles Roster</span>
                </th>
                <th className="px-4 py-3 text-center bg-indigo-50/40 text-indigo-950" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-indigo-600" /> Overall Metrics</span>
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="px-4 py-4 sticky left-0 bg-slate-50 z-10 border-r border-slate-200/60">Competitor</th>
                <th className="px-4 py-4 text-slate-500">Club Squad</th>
                <th className="px-4 py-4 text-center bg-amber-500/10 text-amber-800 border-r border-slate-200/60">Match Play</th>
                <th className="px-4 py-4 text-center bg-blue-500/10 text-blue-800 border-r border-slate-200/60">Frame Play</th> {/* 🎯 ADDED */}

                {/* Singles */}
                <th className="px-3 py-4 text-center bg-slate-50/40">Played</th>
                <th className="px-3 py-4 text-center bg-slate-50/40 text-emerald-600">Won</th>
                <th className="px-3 py-4 text-center bg-slate-50/40 text-rose-500">Lost</th>
                <th className="px-4 py-4 text-center bg-slate-100/80 font-black border-r border-slate-200/60">Win %</th>

                {/* Doubles */}
                <th className="px-3 py-4 text-center">Played</th>
                <th className="px-3 py-4 text-center text-emerald-600">Won</th>
                <th className="px-3 py-4 text-center text-rose-500">Lost</th>
                <th className="px-4 py-4 text-center bg-slate-50 font-black border-r border-slate-200/60">Win %</th>

                {/* Overall */}
                <th className="px-3 py-4 text-center bg-indigo-50/20 text-slate-600">Total</th>
                <th className="px-3 py-4 text-center bg-indigo-50/20 text-emerald-600">Won</th>
                <th className="px-3 py-4 text-center bg-indigo-50/20 text-rose-500">Lost</th>
                <th className="px-4 py-4 text-center bg-indigo-600 text-white font-black">Success %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium text-slate-600">
              {processedPlayers.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3.5 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50/60 border-r border-slate-200/60 z-10 whitespace-nowrap">
                    <Link href={`/players/${p.id}`} className="hover:text-indigo-600 transition-colors flex items-center gap-3">
                      <span className="text-[11px] font-mono font-bold text-slate-400 w-4 text-center">{idx + 1}</span>
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 hidden sm:flex items-center justify-center shadow-inner">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600">
                            {p.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="uppercase tracking-tight text-[12px]">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold uppercase tracking-tight whitespace-nowrap text-[11px]">
                    {p.teamName}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-900 bg-amber-500/[0.04] border-r border-slate-200/60 tabular-nums">
                    {p.matchPlay}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-900 bg-blue-500/[0.04] border-r border-slate-200/60 tabular-nums">
                    {p.framePlay} {/* 🎯 ADDED */}
                  </td>

                  {/* Singles */}
                  <td className="px-3 py-3.5 text-center bg-slate-50/[0.15] font-mono tabular-nums">{p.singlePlay}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-600 bg-slate-50/[0.15] font-mono tabular-nums">{p.singleWin}</td>
                  <td className="px-3 py-3.5 text-center text-slate-400 bg-slate-50/[0.15] font-mono tabular-nums">{p.singleLost}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900 bg-slate-100/40 border-r border-slate-200/60 font-mono tabular-nums">{p.singlePct}%</td>

                  {/* Doubles */}
                  <td className="px-3 py-3.5 text-center font-mono tabular-nums">{p.doublePlay}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-600 font-mono tabular-nums">{p.doubleWin}</td>
                  <td className="px-3 py-3.5 text-center text-slate-400 font-mono tabular-nums">{p.doubleLost}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-900 bg-slate-50/50 border-r border-slate-200/60 font-mono tabular-nums">{p.doublePct}%</td>

                  {/* Overall (Singles + Doubles Aggregate) */}
                  <td className="px-3 py-3.5 text-center font-semibold text-slate-700 bg-indigo-50/[0.1] font-mono tabular-nums">{p.totalPlay}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-600 bg-indigo-50/[0.1] font-mono tabular-nums">{p.totalWin}</td>
                  <td className="px-3 py-3.5 text-center text-slate-400 bg-indigo-50/[0.1] font-mono tabular-nums">{p.totalLost}</td>
                  <td className="px-4 py-3.5 text-center bg-indigo-600 text-white font-black font-mono tabular-nums italic shadow-sm">
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