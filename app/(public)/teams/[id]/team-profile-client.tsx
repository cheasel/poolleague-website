'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, CalendarDays, ArrowUpRight, User, BarChart4, Trophy } from "lucide-react";
import Image from "next/image";

interface RosterPlayer {
  id: number;
  name: string;
  imageUrl: string | null;
}

interface PlayerStats {
  id: number;
  name: string;
  imageUrl: string | null;
  singlesPlayed: number;
  singlesWins: number;
  singlesLosses: number;
  doublesPlayed: number;
  doublesWins: number;
  doublesLosses: number;
  totalPlayed: number;
  totalWins: number;
  winPercentage: string;
  matchesPlayed: number;
  matchPlayPercentage: string;
}

interface MatchLog {
  id: number;
  matchDate: Date | string | null;
  status: "scheduled" | "live" | "completed" | "cancelled" | string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeTeamScoreTotal: number | null;
  awayTeamScoreTotal: number | null;
}

interface TeamProfileClientProps {
  teamId: number;
  teamName: string;
  logoUrl?: string | null;
  divisionName: string;
  seasonName: string;
  roster: RosterPlayer[];
  rosterStats: PlayerStats[]; // <-- DEFINE EXTENDED INTERFACE CONTRACT
  matches: MatchLog[];
}

export default function TeamProfileClient({
  teamId,
  teamName,
  logoUrl,
  divisionName,
  seasonName,
  roster,
  rosterStats,
  matches,
}: TeamProfileClientProps) {
  
  const [activeTab, setActiveTab] = useState<"roster" | "stats">("roster");
  const [enableMatchPlayFilter, setEnableMatchPlayFilter] = useState(false);
  const [minMatchPlayPercentage, setMinMatchPlayPercentage] = useState(40);

  const processedStats = useMemo(() => {
    let result = [...rosterStats];
    if (enableMatchPlayFilter) {
      result = result.filter(stat => parseFloat(stat.matchPlayPercentage) >= minMatchPlayPercentage);
    }
    return result;
  }, [rosterStats, enableMatchPlayFilter, minMatchPlayPercentage]);

  const { completedMatches, scheduledMatches, formTrend } = useMemo(() => {
    const completed = matches.filter(m => m.status === "completed");
    const scheduled = matches.filter(m => m.status === "scheduled" || m.status === "live");
    
    const trend = [...completed]
      .reverse()
      .map((match) => {
        const isHome = match.homeTeamId === teamId;
        const teamScore = isHome ? (match.homeTeamScoreTotal || 0) : (match.awayTeamScoreTotal || 0);
        const oppScore = isHome ? (match.awayTeamScoreTotal || 0) : (match.homeTeamScoreTotal || 0);
        return teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "D";
      })
      .slice(-5);

    return { completedMatches: completed, scheduledMatches: scheduled.reverse(), formTrend: trend };
  }, [matches, teamId]);

  return (
    <div className="space-y-10">
      {/* Team Identity Hero Jumbotron */}
      <section className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/10 blur-[120px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Team Logo Container */}
            {logoUrl ? (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-950/80 backdrop-blur border border-slate-800 p-1 flex items-center justify-center relative shrink-0 shadow-2xl">
                <Image
                  src={logoUrl}
                  alt={teamName}
                  width={80}
                  height={80}
                  className="object-contain max-w-full max-h-full rounded-xl"
                />
              </div>
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-2xl text-indigo-400 shrink-0 shadow-inner">
                {teamName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-900/30 shadow-sm">
                  {divisionName}
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {seasonName}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">
                {teamName}
              </h1>
              
              {/* Form Points Ribbon */}
              {formTrend.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 mr-2">Form Matrix:</span>
                  {formTrend.map((result, idx) => (
                    <span 
                      key={idx} 
                      className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center border shadow-sm transition-transform hover:scale-105 ${
                        result === 'W' ? 'bg-indigo-600 text-white border-transparent shadow-indigo-950/50' :
                        result === 'L' ? 'bg-slate-950 text-slate-600 border-slate-800' : 
                                         'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-3xl p-6 text-center w-full md:w-auto min-w-[200px] shadow-2xl">
            <div className="text-5xl font-black tracking-tight text-indigo-400 tabular-nums drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">{roster.length}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">Active Competitors</div>
          </div>
        </div>
      </section>

      {/* Roster Layout & Schedule Calendar View Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Dynamic Workspace Panel (7 Columns Wide) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                {activeTab === "roster" ? "Official Roster" : "Performance Analytics"}
              </h2>
            </div>
            
            <button
              onClick={() => setActiveTab(activeTab === "roster" ? "stats" : "roster")}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === "stats"
                  ? "bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-900/20"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              <BarChart4 className="w-3.5 h-3.5" />
              {activeTab === "roster" ? "Metric View" : "Roster List"}
            </button>
          </div>

          {activeTab === "roster" ? (
            /* STANDARD ROSTER VIEW SHEETS */
            <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="divide-y divide-slate-800/60">
                {roster.map((player) => (
                  <Link 
                    key={player.id}
                    href={`/players/${player.id}`}
                    prefetch={false}
                    className="p-5 px-8 flex items-center justify-between hover:bg-slate-900/40 transition-colors group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-indigo-500/50 transition-colors shadow-inner relative">
                        {player.imageUrl && player.imageUrl.length > 0 ? (
                          <Image src={player.imageUrl} alt={player.name} width={44} height={44} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                        )}
                      </div>
                      <span className="font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors text-sm">
                        {player.name}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* NEW FULLY OPERATIONAL TEAM STATISTICS SHEET */
            <div className="space-y-4">
              {/* Filter Control Deck */}
              <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="matchPlayFilterToggle"
                    checked={enableMatchPlayFilter}
                    onChange={(e) => setEnableMatchPlayFilter(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-0 accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="matchPlayFilterToggle" className="text-[11px] font-black text-slate-400 uppercase tracking-tight cursor-pointer select-none">
                    Filter Match Play %
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!enableMatchPlayFilter}
                    value={minMatchPlayPercentage}
                    onChange={(e) => setMinMatchPlayPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className={`w-12 p-1 text-center font-bold text-xs border rounded-lg outline-none transition-all ${
                      enableMatchPlayFilter ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-slate-600">%</span>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-500 font-black uppercase tracking-widest border-b border-slate-800">
                        <th className="p-4 pl-8">Competitor</th>
                        <th className="p-4 text-center">Singles (W/L)</th>
                        <th className="p-4 text-center">Doubles (W/L)</th>
                        <th className="p-4 text-center">Match Play</th>
                        <th className="p-4 text-center bg-indigo-950/30 text-indigo-400 pr-8 shadow-inner italic">Win %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-black uppercase tracking-tight text-slate-400">
                      {processedStats.map((stat) => (
                        <tr key={stat.id} className="hover:bg-slate-900/40 transition-colors group">
                          <td className="p-4 pl-8 font-black text-white whitespace-nowrap">
                            <Link href={`/players/${stat.id}`} prefetch={false} className="hover:text-indigo-400 transition-colors flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center relative">
                                {stat.imageUrl && stat.imageUrl.length > 0 ? (
                                  <Image src={stat.imageUrl} alt={stat.name} width={32} height={32} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-slate-700" />
                                )}
                              </div>
                              <span className="text-sm">{stat.name}</span>
                            </Link>
                          </td>
                          <td className="p-4 text-center tabular-nums">
                            <span className="text-emerald-400">{stat.singlesWins}W</span>
                            <span className="text-slate-800 mx-1.5">•</span>
                            <span className="text-slate-600">{stat.singlesLosses}L</span>
                          </td>
                          <td className="p-4 text-center tabular-nums">
                            <span className="text-emerald-400">{stat.doublesWins}W</span>
                            <span className="text-slate-800 mx-1.5">•</span>
                            <span className="text-slate-600">{stat.doublesLosses}L</span>
                          </td>
                          <td className="p-4 text-center font-mono tabular-nums text-slate-300">
                            {stat.matchesPlayed} <span className="text-[10px] text-slate-600 font-normal">/ {completedMatches.length}</span>
                            <span className="text-slate-500 text-[10px] ml-1.5">({stat.matchPlayPercentage}%)</span>
                          </td>
                          <td className="p-4 text-center font-black italic bg-indigo-950/10 text-indigo-400 tabular-nums pr-8 shadow-sm">
                            {stat.winPercentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Fixtures Calendar View Stack (5 Columns Wide) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <CalendarDays className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-black uppercase tracking-tight text-white">Fixture Timelines</h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-4">Scheduled Events</h3>
            <div className="bg-slate-900/40 border border-slate-900 rounded-[2rem] p-5 space-y-4 shadow-xl">
              {scheduledMatches.map((match) => {
                const isHome = match.homeTeamId === teamId;
                const opponentName = isHome ? match.awayTeamName : match.homeTeamName;

                return (
                  <div key={match.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col gap-3 group transition-all hover:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/80">
                        {isHome ? "Home Arena" : "Away Visit"}
                      </span>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : "TBD"}
                      </span>
                    </div>
                    <div className="font-black text-white uppercase tracking-tight text-sm group-hover:text-indigo-400 transition-colors">
                      vs {opponentName}
                    </div>
                  </div>
                );
              })}

              {scheduledMatches.length === 0 && (
                <div className="p-6 text-center text-xs font-black text-slate-700 uppercase tracking-[0.2em] italic">
                  No upcoming fixtures.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-4">Historic Ledgers</h3>
            <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] divide-y divide-slate-800/60 shadow-xl overflow-hidden">
              {completedMatches.map((match) => {
                const isHome = match.homeTeamId === teamId;
                const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
                const teamScore = isHome ? match.homeTeamScoreTotal : match.awayTeamScoreTotal;
                const oppScore = isHome ? match.awayTeamScoreTotal : match.homeTeamScoreTotal;
                const isWin = (teamScore || 0) > (oppScore || 0);

                return (
                  <div key={match.id} className="p-5 px-6 flex justify-between items-center hover:bg-slate-900/40 transition-colors group">
                    <div>
                      <div className="font-black text-white uppercase text-xs tracking-tight group-hover:text-indigo-400 transition-colors">
                        vs {opponentName}
                      </div>
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : "Past"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-black px-3 py-1 rounded-xl tabular-nums shadow-inner ${isWin ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-600 border border-slate-800'}`}>
                        {teamScore} - {oppScore}
                      </span>
                    </div>
                  </div>
                );
              })}

              {completedMatches.length === 0 && (
                <div className="p-8 text-center text-xs font-black text-slate-700 uppercase tracking-[0.2em] italic">
                  No records found.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}