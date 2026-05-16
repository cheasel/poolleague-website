import { db } from "@/src/db";
import { teams, matches, divisions } from "@/src/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Trophy, CalendarDays, ShieldCheck, Zap, ArrowRight, Star } from "lucide-react";

export default async function LeagueHomepage() {
  // 1. Fetch data structures for the Live Previews
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = allDivisions[0]?.id; // Focus on the premier tier for the homepage spotlight

  // 2. Fetch Top 3 Leaderboard Squads for the mini-standings preview
  const topTeams = activeDivId
    ? await db
        .select()
        .from(teams)
        .where(eq(teams.divisionId, activeDivId))
        .orderBy(desc(teams.points), desc(teams.id))
        .limit(3)
    : [];

  // 3. Fetch 3 Most Recent Finalized Match Cards
  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  const recentResults = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      homeTeamName: homeTeamsAlias.name,
      awayTeamName: awayTeamsAlias.name,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
    })
    .from(matches)
    .leftJoin(homeTeamsAlias, eq(matches.homeTeamId, homeTeamsAlias.id))
    .leftJoin(awayTeamsAlias, eq(matches.awayTeamId, awayTeamsAlias.id))
    .where(eq(matches.status, "completed"))
    .orderBy(desc(matches.matchDate), desc(matches.id))
    .limit(3);

  return (
    <div className="bg-slate-50 min-h-screen pb-20 space-y-16">
      
      {/* ==========================================
          1. HERO JUMBOTRON BANNER PANEL
         ========================================== */}
      <section className="bg-slate-950 text-white relative overflow-hidden py-24 px-6 md:px-12 text-center rounded-b-[4rem] border-b border-slate-900 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
            <Zap className="w-3.5 h-3.5 fill-current animate-pulse" /> Live League Matrix Ecosystem Active
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white italic leading-tight">
            The Digital <br className="sm:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500">Pool League</span> Arena
          </h1>
          <p className="text-slate-400 font-medium text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
            Track frame scores, analyze roster performance, and follow live standings updates in real-time across the regional division pipeline.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link 
              href="/standings" 
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              Live Standings <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link 
              href="/admin/matches" 
              className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
            >
              HQ Control Center
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ==========================================
            2. RECENT RESULTS TICKER (lg:col-span-4)
           ========================================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Finalized Scores</h3>
          </div>

          <div className="space-y-3">
            {recentResults.map((match) => (
              <div 
                key={match.id} 
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition-colors"
              >
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2 block">
                  {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "Completed Fixture"}
                </div>
                <div className="flex items-center justify-between font-black uppercase text-xs tracking-tight text-slate-900">
                  <div className="w-[42%] text-right truncate">{match.homeTeamName}</div>
                  <div className="bg-slate-900 text-indigo-400 px-2.5 py-1 text-[11px] rounded-lg tabular-nums tracking-widest mx-2 shadow-inner">
                    {match.homeTeamScoreTotal} - {match.awayTeamScoreTotal}
                  </div>
                  <div className="w-[42%] text-left truncate">{match.awayTeamName}</div>
                </div>
              </div>
            ))}

            {recentResults.length === 0 && (
              <div className="bg-white border border-dashed border-slate-200 p-8 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                No scores logged for this season yet.
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            3. STANDINGS PREVIEW DISPLAY (lg:col-span-8)
           ========================================== */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                {allDivisions.find(d => d.id === activeDivId)?.name || "Premier Division"} Title Race
              </h3>
            </div>
            <Link href="/standings" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
              Full Standings 表 →
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-2 text-center">Rank</div>
              <div className="col-span-6">Club Team Squad</div>
              <div className="col-span-2 text-center">Wins</div>
              <div className="col-span-2 text-center">Points</div>
            </div>

            <div className="divide-y divide-slate-100">
              {topTeams.map((team, index) => (
                <div 
                  key={team.id} 
                  className="p-5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/40 transition-colors"
                >
                  <div className="col-span-2 text-center font-black text-slate-900 text-sm flex items-center justify-center">
                    {index === 0 ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : `#${index + 1}`}
                  </div>
                  <div className="col-span-6 font-black uppercase text-sm text-slate-800 tracking-tight truncate">
                    {team.name}
                  </div>
                  <div className="col-span-2 text-center font-bold text-slate-500 tabular-nums text-xs">
                    {/* Placeholder dynamic division wins fallback */}
                    {Math.floor((team.points ?? 0) / 2)}
                  </div>
                  <div className="col-span-2 text-center font-black text-indigo-600 tabular-nums text-sm bg-indigo-50/50 py-1 rounded-xl max-w-[50px] mx-auto w-full">
                    {team.points ?? 0}
                  </div>
                </div>
              ))}

              {topTeams.length === 0 && (
                <div className="p-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                  No active rankings calculated yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ==========================================
          4. LEAGUE FEATURES CALLOUT FOOTER
         ========================================== */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 md:p-12 text-white rounded-[2.5rem] shadow-xl border border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="p-3 bg-slate-800/80 border border-slate-700/50 text-indigo-400 rounded-xl w-max"><ShieldCheck className="w-5 h-5" /></div>
            <h4 className="font-black uppercase tracking-tight text-md">Verified Score Tracking</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Official frames are logged frame-by-frame instantly by administrative captains to prevent record desync errors.</p>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-slate-800/80 border border-slate-700/50 text-purple-400 rounded-xl w-max"><Trophy className="w-5 h-5" /></div>
            <h4 className="font-black uppercase tracking-tight text-md">Unified Points Ledger</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Match victories translate instantly into exactly 2 points onto global league ranking parameters natively via the server.</p>
          </div>
          <div className="space-y-2">
            <div className="p-3 bg-slate-800/80 border border-slate-700/50 text-emerald-400 rounded-xl w-max"><Zap className="w-5 h-5" /></div>
            <h4 className="font-black uppercase tracking-tight text-md">Community Analytics Portal</h4>
            <p className="text-slate-400 text-xs leading-relaxed">Click any team row inside the registry to reveal deep profile analytics portals, form streaks, and historical logs.</p>
          </div>
        </div>
      </section>

    </div>
  );
}