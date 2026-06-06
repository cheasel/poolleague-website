'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Columns, LayoutList, Home, Plane, Award, History, ArrowRight, CalendarDays } from "lucide-react";
import Image from "next/image";

interface StandingRow {
  id: number;
  name: string;
  logoUrl: string | null;
  overallPlayed: number;
  overallWins: number;
  overallDraws: number;
  overallLosses: number;
  overallFramesWon: number;
  overallFramesLost: number;
  frameDifference: number;
  overallPoints: number;
  form: ('W' | 'L' | 'D')[];
  home: { played: number; wins: number; draws: number; losses: number; fw: number; fl: number; };
  away: { played: number; wins: number; draws: number; losses: number; fw: number; fl: number; };
}

interface DropdownItem {
  id: number;
  name: string;
}

interface MatchRow {
  id: number;
  date: string;
  status: string;
  weekNumber: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface StandingsClientProps {
  standings: StandingRow[];
  seasons: DropdownItem[];
  divisions: DropdownItem[];
  selectedSeasonId?: number;
  selectedDivisionId?: number;
  resultsByWeek: {
    weekNumber: number;
    matches: MatchRow[];
  }[];
  fixturesByWeek: {
    weekNumber: number;
    matches: MatchRow[];
  }[];
  isTopTier?: boolean;
}

export default function StandingsClient({
  standings,
  seasons,
  divisions,
  selectedSeasonId,
  selectedDivisionId,
  resultsByWeek = [],
  fixturesByWeek = [],
  isTopTier = true
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
      if (key === 'seasonId') {
        params.delete('divisionId');
      }
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

      {/* ZONE LEGEND BAR */}
      <div className="flex flex-wrap items-center gap-4 px-2 py-0.5 text-[11px] font-bold text-slate-400">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mr-1">Zone Legend:</span>
        {!isTopTier && (
          <div className="flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded-lg text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Promotion (Top 2)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-900/40 px-2.5 py-1 rounded-lg text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Relegation (Bottom 2)</span>
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
                    <th className="px-4 py-4 text-center text-slate-500 hidden sm:table-cell">Drawn</th>
                    <th className="px-4 py-4 text-center text-rose-400 hidden sm:table-cell">Lost</th>
                    <th className="px-4 py-4 text-center hidden md:table-cell">Frames +/-</th>
                    <th className="px-4 py-4 text-center w-28">Form</th>
                    <th className="px-6 py-4 text-center bg-indigo-600/20 text-indigo-400 font-black w-24 border-l border-slate-800">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                  {standings.map((row, index) => {
                    const isPromotion = !isTopTier && index < 2;
                    const isRelegation = standings.length >= 2 && index >= standings.length - 2;

                    const rowBgClass = isPromotion
                      ? "bg-emerald-950/10 hover:bg-emerald-950/20 transition-colors group"
                      : isRelegation
                      ? "bg-rose-950/10 hover:bg-rose-950/20 transition-colors group"
                      : "hover:bg-slate-900/40 transition-colors group";

                    const posCellClass = `px-6 py-4 text-center font-mono font-bold text-[11px] ${
                      isPromotion
                        ? "border-l-4 border-emerald-500 text-emerald-400"
                        : isRelegation
                        ? "border-l-4 border-rose-500 text-rose-400"
                        : "text-slate-500"
                    }`;

                    return (
                      <tr key={row.id} className={rowBgClass}>
                        <td className={posCellClass}>
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-100 text-[13px] uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                          <div className="flex items-center gap-2">
                            {row.logoUrl ? (
                              <div className="w-6 h-6 rounded bg-slate-950 border border-slate-850 p-0.5 flex items-center justify-center shrink-0">
                                <Image
                                  src={row.logoUrl}
                                  alt={row.name}
                                  width={24}
                                  height={24}
                                  className="object-contain max-w-full max-h-full"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[9px] text-indigo-400 shrink-0">
                                {row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <Link href={`/teams/${row.id}`} prefetch={false}>{row.name}</Link>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center font-mono tabular-nums">{row.overallPlayed}</td>
                        <td className="px-4 py-4 text-center font-bold text-emerald-400 font-mono tabular-nums">{row.overallWins}</td>
                        <td className="px-4 py-4 text-center text-slate-500 font-mono tabular-nums hidden sm:table-cell">{row.overallDraws}</td>
                        <td className="px-4 py-4 text-center text-rose-400/80 font-mono tabular-nums hidden sm:table-cell">{row.overallLosses}</td>
                        <td className="px-3 py-3 text-center bg-indigo-950/[0.1] border-l border-slate-800 whitespace-nowrap hidden md:table-cell">
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {(row.form || []).map((outcome, i) => {
                              let dotColor = "bg-slate-700 text-slate-400";
                              let label = "D";
                              if (outcome === 'W') {
                                dotColor = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
                                label = "W";
                              } else if (outcome === 'L') {
                                dotColor = "bg-rose-500/20 text-rose-400 border border-rose-500/30";
                                label = "L";
                              } else if (outcome === 'D') {
                                dotColor = "bg-slate-800 text-slate-400 border border-slate-700/50";
                                label = "D";
                              }

                              return (
                                <span
                                  key={i}
                                  className={`w-5 h-5 flex items-center justify-center rounded-full font-mono text-[9px] font-black select-none ${dotColor}`}
                                  title={outcome === 'W' ? 'Win' : outcome === 'L' ? 'Loss' : 'Draw'}
                                >
                                  {label}
                                </span>
                              );
                            })}
                            {(!row.form || row.form.length === 0) && (
                              <span className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider">No matches</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center bg-indigo-950/30 text-indigo-400 font-black font-mono text-sm border-l border-slate-800">
                          {row.overallPoints}
                        </td>
                      </tr>
                    );
                  })}
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
                    <th className="px-4 py-3.5 text-center bg-indigo-600/40 text-slate-100 font-black border-l border-slate-800">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-400 text-[11px]">
                  {standings.map((row, index) => {
                    const isPromotion = !isTopTier && index < 2;
                    const isRelegation = standings.length >= 2 && index >= standings.length - 2;

                    const rowBgClass = isPromotion
                      ? "bg-emerald-950/10 hover:bg-emerald-950/20 transition-colors group"
                      : isRelegation
                      ? "bg-rose-950/10 hover:bg-rose-950/20 transition-colors group"
                      : "hover:bg-slate-900/40 transition-colors group";

                    const posCellClass = `px-4 py-3 text-center font-mono font-bold border-r border-slate-900 ${
                      isPromotion
                        ? "border-l-4 border-emerald-500 text-emerald-400"
                        : isRelegation
                        ? "border-l-4 border-rose-500 text-rose-400"
                        : "text-slate-600"
                    }`;

                    return (
                      <tr key={row.id} className={rowBgClass}>
                        <td className={posCellClass}>{index + 1}</td>
                        <td className="px-4 py-3 font-black text-slate-100 uppercase border-r border-slate-800 tracking-tight text-[12px] group-hover:text-indigo-400 transition-colors">
                          <div className="flex items-center gap-2">
                            {row.logoUrl ? (
                              <div className="w-6 h-6 rounded bg-slate-950 border border-slate-850 p-0.5 flex items-center justify-center shrink-0">
                                <Image
                                  src={row.logoUrl}
                                  alt={row.name}
                                  width={24}
                                  height={24}
                                  className="object-contain max-w-full max-h-full"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[9px] text-indigo-400 shrink-0">
                                {row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <Link href={`/teams/${row.id}`} prefetch={false}>{row.name}</Link>
                          </div>
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
                    );
                  })}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>

      {/* BOTTOM ACTION SECTION: RESULTS & FIXTURES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* MATCH RESULTS COLUMN */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Completed Outcomes</span>
                <h3 className="font-black uppercase tracking-tight text-sm text-slate-100 mt-0.5 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-400" /> Match Results
                </h3>
              </div>
              <Link 
                href={`/matches?seasonId=${selectedSeasonId || ""}&divisionId=${selectedDivisionId || ""}&tab=results`}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                All Results <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {resultsByWeek.length === 0 ? (
              <p className="text-xs font-medium text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                No recent match results found.
              </p>
            ) : (
              <div className="space-y-6">
                {resultsByWeek.map((week) => (
                  <div key={week.weekNumber} className="space-y-3">
                    <span className="inline-flex items-center bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Week {week.weekNumber}
                    </span>
                    <div className="divide-y divide-slate-800/40 border border-slate-900 bg-slate-950/20 rounded-2xl overflow-hidden">
                      {week.matches.map((match) => (
                        <Link
                          key={match.id}
                          href={`/matches/${match.id}`}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900/30 transition-colors group/match"
                        >
                          <div className="flex-1 text-right font-black text-slate-300 uppercase tracking-tight text-xs truncate group-hover/match:text-indigo-400 transition-colors">
                            {match.homeTeam}
                          </div>
                          <div className="bg-slate-950 text-indigo-400 border border-slate-800 font-mono font-black text-[11px] px-2.5 py-1 rounded-lg shrink-0 shadow-inner tracking-wider">
                            {match.homeScore} - {match.awayScore}
                          </div>
                          <div className="flex-1 text-left font-black text-slate-300 uppercase tracking-tight text-xs truncate group-hover/match:text-indigo-400 transition-colors">
                            {match.awayTeam}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MATCH FIXTURES COLUMN */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Upcoming Schedule</span>
                <h3 className="font-black uppercase tracking-tight text-sm text-slate-100 mt-0.5 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-indigo-400" /> Match Fixtures
                </h3>
              </div>
              <Link 
                href={`/matches?seasonId=${selectedSeasonId || ""}&divisionId=${selectedDivisionId || ""}&tab=fixtures`}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                All Fixtures <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {fixturesByWeek.length === 0 ? (
              <p className="text-xs font-medium text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                No upcoming match fixtures scheduled.
              </p>
            ) : (
              <div className="space-y-6">
                {fixturesByWeek.map((week) => (
                  <div key={week.weekNumber} className="space-y-3">
                    <span className="inline-flex items-center bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Week {week.weekNumber}
                    </span>
                    <div className="divide-y divide-slate-800/40 border border-slate-900 bg-slate-950/20 rounded-2xl overflow-hidden">
                      {week.matches.map((match) => (
                        <Link
                          key={match.id}
                          href={`/matches/${match.id}`}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/30 transition-colors group/fixture"
                        >
                          <div className="flex-1 flex items-center justify-between sm:justify-center gap-4 w-full">
                            <div className="text-right flex-1 font-black text-slate-300 uppercase tracking-tight text-xs truncate group-hover/fixture:text-indigo-400 transition-colors">
                              {match.homeTeam}
                            </div>
                            <div className="bg-slate-950 text-slate-500 border border-slate-800 rounded-lg px-2.5 py-1 font-bold text-[9px] uppercase tracking-widest flex items-center gap-0.5 shadow-inner shrink-0">
                              VS
                            </div>
                            <div className="text-left flex-1 font-black text-slate-300 uppercase tracking-tight text-xs truncate group-hover/fixture:text-indigo-400 transition-colors">
                              {match.awayTeam}
                            </div>
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 font-mono text-center sm:text-right shrink-0 mt-1 sm:mt-0">
                            {match.date}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}