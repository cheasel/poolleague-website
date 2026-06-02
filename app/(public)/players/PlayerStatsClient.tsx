'use client';

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Trophy, Users, Star, Layers } from "lucide-react";
import Image from 'next/image';

interface PlayerStatRow {
  id: number;
  name: string;
  imageUrl: string | null;
  teamName: string;
  matchPlay: number;
  maxTeamMatches: number;
  framePlay: number;
  maxTeamFrames: number;
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

type SortOption = "winrate" | "totalwin";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(handle);
  }, []);
  const [sortBy, setSortBy] = useState<SortOption>("winrate"); // 🎯 ADDED: Sort option tracking state

  // Filter States
  const [enableFrameFilter, setEnableFrameFilter] = useState<boolean>(false);
  const [minFramePercentage, setMinFramePercentage] = useState<number>(40);
  const [enableAttendanceFilter, setEnableAttendanceFilter] = useState<boolean>(false); // 🎯 ADDED
  const [minAttendancePercentage, setMinAttendancePercentage] = useState<number>(40); // 🎯 ADDED

  const handleFilterChange = (key: 'seasonId' | 'divisionId', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const maxFramesPlayed = useMemo(() => {
    if (initialPlayers.length === 0) return 0;
    return Math.max(...initialPlayers.map(p => p.framePlay));
  }, [initialPlayers]);

  const maxMatchesPlayed = useMemo(() => {
    if (initialPlayers.length === 0) return 0;
    return Math.max(...initialPlayers.map(p => p.matchPlay));
  }, [initialPlayers]);

  const processedPlayers = useMemo(() => {
    let result = [...initialPlayers];

    // Apply Frame Play Attendance Filter (Kept behind scene logic)
    if (enableFrameFilter && maxFramesPlayed > 0) {
      result = result.filter((player) => {
        const frameAttendancePct = (player.framePlay / maxFramesPlayed) * 100;
        return frameAttendancePct >= minFramePercentage;
      });
    }

    // Apply Match Play Attendance Filter 🎯 ADDED
    if (enableAttendanceFilter && maxMatchesPlayed > 0) {
      result = result.filter((player) => {
        const matchAttendancePct = (player.matchPlay / maxMatchesPlayed) * 100;
        return matchAttendancePct >= minAttendancePercentage;
      });
    }

    // Process Sorting 🎯 ADDED
    result.sort((a, b) => {
      if (sortBy === "totalwin") {
        return b.totalWin - a.totalWin;
      } else {
        return parseFloat(b.totalPct) - parseFloat(a.totalPct);
      }
    });

    const activePageSize = mounted ? pageSize : Math.min(pageSize, 10);
    return result.slice(0, activePageSize);
  }, [initialPlayers, pageSize, enableFrameFilter, minFramePercentage, maxFramesPlayed, enableAttendanceFilter, minAttendancePercentage, maxMatchesPlayed, sortBy, mounted]);

  return (
    <div className="space-y-6">
      {/* FILTER PANEL */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <select
            value={selectedSeasonId || ""}
            onChange={(e) => handleFilterChange('seasonId', e.target.value)}
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 outline-none cursor-pointer hover:border-slate-700 transition-colors"
          >
            {seasons.map((s) => <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">{s.name}</option>)}
          </select>

          <select
            value={selectedDivisionId || ""}
            onChange={(e) => handleFilterChange('divisionId', e.target.value)}
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 outline-none cursor-pointer hover:border-slate-700 transition-colors"
          >
            {divisions.map((d) => <option key={d.id} value={d.id} className="bg-slate-950 text-slate-200">{d.name}</option>)}
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 outline-none cursor-pointer hover:border-slate-700 transition-colors"
          >
            <option value={10} className="bg-slate-950 text-slate-200">Top 10 Performers</option>
            <option value={25} className="bg-slate-950 text-slate-200">Top 25 Performers</option>
            <option value={50} className="bg-slate-950 text-slate-200">Top 50 Performers</option>
            <option value={100} className="bg-slate-950 text-slate-200">All Active Players</option>
          </select>

          {/* Sorting Controller Dropdown 🎯 ADDED */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="p-2.5 bg-indigo-950/40 border border-indigo-900/40 rounded-xl font-black text-xs text-indigo-400 outline-none cursor-pointer hover:bg-indigo-900/60 transition-all uppercase tracking-tight"
          >
            <option value="winrate" className="bg-slate-950 text-slate-200">Sort by Win Rate %</option>
            <option value="totalwin" className="bg-slate-950 text-slate-200">Sort by Total Wins</option>
          </select>
        </div>

        {/* Filters Compound Deck */}
        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          {/* Frame Attendance Filter Controller */}
          <div className="bg-slate-950/40 px-4 py-2 rounded-xl border border-slate-800 flex items-center justify-between gap-4 flex-1 sm:flex-initial">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="frameFilterToggle"
                checked={enableFrameFilter}
                onChange={(e) => setEnableFrameFilter(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-0 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="frameFilterToggle" className="text-[11px] font-black text-slate-400 uppercase tracking-tight cursor-pointer select-none">
                Filter Frame Play
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
                  enableFrameFilter ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed'
                }`}
              />
              <span className="text-[11px] font-bold text-slate-600">%</span>
            </div>
          </div>

          {/* Match Attendance Filter Controller 🎯 ADDED */}
          <div className="bg-slate-950/40 px-4 py-2 rounded-xl border border-slate-800 flex items-center justify-between gap-4 flex-1 sm:flex-initial">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="attendanceFilterToggle"
                checked={enableAttendanceFilter}
                onChange={(e) => setEnableAttendanceFilter(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-0 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="attendanceFilterToggle" className="text-[11px] font-black text-slate-400 uppercase tracking-tight cursor-pointer select-none">
                Filter Attendance
              </label>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                disabled={!enableAttendanceFilter}
                value={minAttendancePercentage}
                onChange={(e) => setMinAttendancePercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                className={`w-12 p-1 text-center font-bold text-xs border rounded-lg outline-none transition-all ${
                  enableAttendanceFilter ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed'
                }`}
              />
              <span className="text-[11px] font-bold text-slate-600">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* RENDER TABLE MATRIX */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/60 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="px-4 py-3" colSpan={3}> {/* 🎯 CHANGED: Reverted back to 3 since frame column is hidden */}
                  <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-600" /> Identity Profile</span>
                </th>
                <th className="px-4 py-3 text-center border-x border-slate-800 bg-slate-950/20" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Singles Bracket</span>
                </th>
                <th className="px-4 py-3 text-center border-r border-slate-800 bg-slate-950/10" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-400" /> Doubles Roster</span>
                </th>
                <th className="px-4 py-3 text-center bg-indigo-950/30 text-indigo-400" colSpan={4}>
                  <span className="inline-flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-indigo-400" /> Overall Metrics</span>
                </th>
              </tr>
              <tr className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="px-4 py-4 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Competitor</th>
                <th className="px-4 py-4">Club Squad</th>
                <th className="px-4 py-4 text-center bg-amber-500/[0.05] text-amber-500/80 border-r border-slate-800">Match Play</th>

                {/* Singles */}
                <th className="px-3 py-4 text-center bg-slate-950/30">Played</th>
                <th className="px-3 py-4 text-center bg-slate-950/30 text-emerald-400">Won</th>
                <th className="px-3 py-4 text-center bg-slate-950/30 text-rose-400">Lost</th>
                <th className="px-4 py-4 text-center bg-slate-950/60 font-black border-r border-slate-800">Win %</th>

                {/* Doubles */}
                <th className="px-3 py-4 text-center">Played</th>
                <th className="px-3 py-4 text-center text-emerald-400">Won</th>
                <th className="px-3 py-4 text-center text-rose-400">Lost</th>
                <th className="px-4 py-4 text-center bg-slate-950/40 font-black border-r border-slate-800">Win %</th>

                {/* Overall */}
                <th className="px-3 py-4 text-center bg-indigo-950/10 text-slate-400">Total</th>
                <th className="px-3 py-4 text-center bg-indigo-950/10 text-emerald-400">Won</th>
                <th className="px-3 py-4 text-center bg-indigo-950/10 text-rose-400">Lost</th>
                <th className="px-4 py-4 text-center bg-indigo-600/40 text-slate-100 font-black">Success %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-400">
              {processedPlayers.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-900/40 transition-colors group">
                  <td className="px-4 py-3.5 font-bold text-slate-100 sticky left-0 bg-slate-950 group-hover:bg-slate-900 border-r border-slate-800 z-10 whitespace-nowrap">
                    <Link href={`/players/${p.id}`} prefetch={false} className="hover:text-indigo-400 transition-colors flex items-center gap-3">
                      <span className="text-[11px] font-mono font-bold text-slate-600 w-4 text-center">{idx + 1}</span>
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0 hidden sm:flex items-center justify-center shadow-inner">
                        {p.imageUrl && p.imageUrl.length > 0 ? (
                          <Image 
                          src={p.imageUrl || '/placeholder.png'} 
                          alt={p.name} 
                          width={48} 
                          height={48} 
                          className="rounded-full object-cover" 
                        />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400 uppercase">
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
                  <td className="px-4 py-3.5 text-center font-bold text-slate-200 bg-amber-500/[0.02] border-r border-slate-800 tabular-nums">
                    {p.matchPlay} <span className="text-[10px] text-slate-600 font-normal">/ {p.maxTeamMatches}</span>
                  </td>

                  {/* Singles */}
                  <td className="px-3 py-3.5 text-center bg-slate-950/[0.1] font-mono tabular-nums">{p.singlePlay}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-400/80 bg-slate-950/[0.1] font-mono tabular-nums">{p.singleWin}</td>
                  <td className="px-3 py-3.5 text-center text-slate-600 bg-slate-950/[0.1] font-mono tabular-nums">{p.singleLost}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-200 bg-slate-950/40 border-r border-slate-800 font-mono tabular-nums">{p.singlePct}%</td>

                  {/* Doubles */}
                  <td className="px-3 py-3.5 text-center font-mono tabular-nums text-slate-500">{p.doublePlay}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-400/80 font-mono tabular-nums">{p.doubleWin}</td>
                  <td className="px-3 py-3.5 text-center text-slate-600 font-mono tabular-nums">{p.doubleLost}</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-slate-200 bg-slate-950/20 border-r border-slate-800 font-mono tabular-nums">{p.doublePct}%</td>

                  {/* Overall */}
                  <td className="px-3 py-3.5 text-center font-semibold text-slate-500 bg-indigo-950/[0.05] font-mono tabular-nums">{p.totalPlay}</td>
                  <td className="px-3 py-3.5 text-center font-bold text-emerald-400/90 bg-indigo-950/[0.05] font-mono tabular-nums">{p.totalWin}</td>
                  <td className="px-3 py-3.5 text-center text-slate-600 bg-indigo-950/[0.05] font-mono tabular-nums">{p.totalLost}</td>
                  <td className="px-4 py-3.5 text-center bg-indigo-950 text-indigo-400 font-black font-mono tabular-nums italic shadow-inner">
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