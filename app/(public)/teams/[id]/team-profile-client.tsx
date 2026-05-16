'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, CalendarDays, ArrowUpRight, User, BarChart4, Trophy } from "lucide-react";

interface RosterPlayer {
  id: number;
  name: string;
  imageUrl: string | null;
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
  divisionName: string;
  seasonName: string;
  roster: RosterPlayer[];
  matches: MatchLog[];
}

export default function TeamProfileClient({
  teamId,
  teamName,
  divisionName,
  seasonName,
  roster,
  matches,
}: TeamProfileClientProps) {
  
  // 1. Interactive Client State Control for View Modes
  const [activeTab, setActiveTab] = useState<"roster" | "stats">("roster");

  // 2. Partition match datasets and map form trends reactively
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
      <section className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/10 blur-[120px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-md border border-indigo-500/20">
                {divisionName}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {seasonName}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">
              {teamName}
            </h1>
            
            {/* Form Points Ribbon */}
            {formTrend.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mr-1">Recent Form:</span>
                {formTrend.map((result, idx) => (
                  <span 
                    key={idx} 
                    className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border ${
                      result === 'W' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                      result === 'L' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                                       'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    {result}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-3xl p-6 text-center w-full md:w-auto min-w-[180px]">
            <div className="text-5xl font-black tracking-tight text-indigo-400 tabular-nums">{roster.length}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Active Competitors</div>
          </div>
        </div>
      </section>

      {/* Roster Layout & Schedule Calendar View Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Dynamic Workspace Panel (7 Columns Wide) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header & Toggle Strategy Button Group */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
                {activeTab === "roster" ? "Official Roster" : "Squad Performance Analytics"}
              </h2>
            </div>
            
            {/* NEW INTERACTIVE TEAM STATS CONTROLLER */}
            <button
              onClick={() => setActiveTab(activeTab === "roster" ? "stats" : "roster")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                activeTab === "stats"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              <BarChart4 className="w-3.5 h-3.5" />
              {activeTab === "roster" ? "View Team Stats" : "View Roster List"}
            </button>
          </div>

          {/* Tab View Conditional Renderer */}
          {activeTab === "roster" ? (
            /* STANDARD ROSTER SHEET */
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {roster.map((player) => (
                  <Link 
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="p-5 px-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-indigo-300 transition-colors">
                        {player.imageUrl ? (
                          <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        )}
                      </div>
                      <span className="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {player.name}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </Link>
                ))}

                {roster.length === 0 && (
                  <div className="p-16 text-center text-sm font-bold text-slate-400 italic uppercase tracking-widest">
                    No players currently registered to this club roster.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TEAM STATS SHEET SUB-VIEW PORTAL */
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-wider italic">
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <Trophy className="w-8 h-8" />
                  <span>Team Stat matrix queries are cross-referenced dynamically.</span>
                </div>
                <p className="mt-4 text-[11px] font-medium text-slate-400 normal-case">
                  Click on any player profile card in the roster sheet layout to see full frame analytics, singles breakdown logs, and partner win percentages.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Fixtures Calendar View Stack (5 Columns Wide) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <CalendarDays className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Fixtures Calendar</h2>
          </div>

          {/* Upcoming Matches Panel */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Upcoming Matches</h3>
            <div className="bg-white rounded-[2rem] border border-slate-200 p-4 space-y-3 shadow-sm">
              {scheduledMatches.map((match) => {
                const isHome = match.homeTeamId === teamId;
                const opponentName = isHome ? match.awayTeamName : match.homeTeamName;

                return (
                  <div key={match.id} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {isHome ? "HOME FIXTURE" : "AWAY FIXTURE"}
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white px-2.5 py-1 rounded-md border border-slate-100">
                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "TBD"}
                      </span>
                    </div>
                    <div className="font-black text-slate-900 uppercase tracking-tight text-sm">
                      vs {opponentName}
                    </div>
                  </div>
                );
              })}

              {scheduledMatches.length === 0 && (
                <div className="p-6 text-center text-xs font-bold text-slate-300 uppercase tracking-wider italic">
                  No upcoming matches scheduled.
                </div>
              )}
            </div>
          </div>

          {/* Past Match Outcomes Sheet */}
          <div className="space-y-3 pt-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Recent Results</h3>
            <div className="bg-white rounded-[2rem] border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
              {completedMatches.map((match) => {
                const isHome = match.homeTeamId === teamId;
                const opponentName = isHome ? match.awayTeamName : match.homeTeamName;
                const teamScore = isHome ? match.homeTeamScoreTotal : match.awayTeamScoreTotal;
                const oppScore = isHome ? match.awayTeamScoreTotal : match.homeTeamScoreTotal;
                const isWin = (teamScore || 0) > (oppScore || 0);

                return (
                  <div key={match.id} className="p-4 flex justify-between items-center hover:bg-slate-50/40 transition-colors">
                    <div>
                      <div className="font-black text-slate-900 uppercase text-xs tracking-tight">
                        vs {opponentName}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB') : "Past"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${isWin ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                        {teamScore}-{oppScore}
                      </span>
                    </div>
                  </div>
                );
              })}

              {completedMatches.length === 0 && (
                <div className="p-8 text-center text-xs font-bold text-slate-300 uppercase tracking-wider italic">
                  No match results entered yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}