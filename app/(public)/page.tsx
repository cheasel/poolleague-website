import TitleRace from "@/components/TitleRace";
import { db } from "@/src/db";
import { seasons, divisions, matches, teams } from "@/src/db/schema";
import { desc, eq, and, sql, asc } from "drizzle-orm";
import { Trophy, CalendarDays, Users, ArrowRight, Zap, Target, Star, Flame } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getRecentResults(seasonId: number, divisionId: number) {
  const rawMatches = await db
    .select({
      id: matches.id,
      date: matches.date,
      homeTeamName: sql<string>`home_teams.name`,
      awayTeamName: sql<string>`away_teams.name`,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
    .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
    .where(
      and(
        eq(matches.status, "completed"),
        eq(matches.seasonId, seasonId),
        eq(matches.divisionId, divisionId)
      )
    )
    .orderBy(desc(matches.date))
    .limit(3);

  return rawMatches;
}

// 🎯 ADDED: Fetch and compute consecutive win streaks
async function getTopFormStreaks(seasonId: number, divisionId: number) {
  const allCompleted = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeTeamName: sql<string>`home_teams.name`,
      awayTeamName: sql<string>`away_teams.name`,
    })
    .from(matches)
    .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
    .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
    .where(
      and(
        eq(matches.status, "completed"),
        eq(matches.seasonId, seasonId),
        eq(matches.divisionId, divisionId)
      )
    )
    .orderBy(asc(matches.date));

  const streaks: Record<string, { name: string; current: number }> = {};

  allCompleted.forEach((m) => {
    if (!m.homeTeamId || !m.awayTeamId) return;

    if (!streaks[m.homeTeamId]) streaks[m.homeTeamId] = { name: m.homeTeamName, current: 0 };
    if (!streaks[m.awayTeamId]) streaks[m.awayTeamId] = { name: m.awayTeamName, current: 0 };

    const hScore = m.homeScore ?? 0;
    const aScore = m.awayScore ?? 0;

    if (hScore > aScore) {
      streaks[m.homeTeamId].current += 1;
      streaks[m.awayTeamId].current = 0;
    } else if (aScore > hScore) {
      streaks[m.awayTeamId].current += 1;
      streaks[m.homeTeamId].current = 0;
    } else {
      // Draw resets a winning streak
      streaks[m.homeTeamId].current = 0;
      streaks[m.awayTeamId].current = 0;
    }
  });

  return Object.values(streaks)
    .sort((a, b) => b.current - a.current);
}

export default async function PublicHomePage() {
  const currentSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1);
  const activeSeasonId = currentSeasons[0]?.id || 1;
  const activeSeasonName = currentSeasons[0]?.name || "Current Season";

  const currentDivisions = await db.select().from(divisions).orderBy(divisions.tier).limit(1);
  const activeDivisionId = currentDivisions[0]?.id || 1;

  const recentResults = await getRecentResults(activeSeasonId, activeDivisionId);
  const sortedStreaks = await getTopFormStreaks(activeSeasonId, activeDivisionId); // 🎯 ADDED

  // Select hot streak leaders or fallbacks safely
  const leader1 = sortedStreaks[0]?.current > 0 ? sortedStreaks[0] : null;
  const leader2 = sortedStreaks[1]?.current > 0 ? sortedStreaks[1] : null;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      
      {/* HERO DASHBOARD BRANDING HEADER */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200/80">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-indigo-50/30 to-transparent pointer-events-none transform skew-x-12" />
        
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" /> Live League Ecosystem
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-slate-950 uppercase tracking-tighter italic leading-[0.9] max-w-3xl">
            The Arena for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600">Cue Sport Analytics</span>
          </h1>
          
          <p className="text-slate-500 font-medium text-xs sm:text-sm max-w-xl leading-relaxed">
            Review detailed live performance metrics, authentic structural standings point distributions, and frame-by-frame match timeline matrices.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link 
              href="/standings" 
              className="px-5 py-3 bg-slate-950 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-md shadow-slate-950/10 hover:-translate-y-0.5"
            >
              <Trophy className="w-3.5 h-3.5" /> View Live Standings
            </Link>
            <Link 
              href="/matches" 
              className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 hover:text-slate-950 transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Match Timelines
            </Link>
          </div>
        </div>
      </div>

      {/* METRICS ROW CARDS STRIP */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><Star className="w-4 h-4 fill-amber-500" /></div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Active Season</span>
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight block mt-0.5">{activeSeasonName}</span>
            </div>
          </div>
          
          {/* 🎯 CHANGED: Replaced "Current Rule" with Streak Leader 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-100"><Flame className="w-4 h-4 fill-orange-500" /></div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Form Leader</span>
              <span className="text-sm font-black text-orange-600 uppercase tracking-tight block mt-0.5 truncate max-w-[160px]">
                {leader1 ? `${leader1.name} (${leader1.current} W)` : "No Active Streak"}
              </span>
            </div>
          </div>

          {/* 🎯 CHANGED: Replaced "Active Division" with Streak Leader 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100"><Flame className="w-4 h-4" /></div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">On Fire</span>
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight block mt-0.5 truncate max-w-[160px]">
                {leader2 ? `${leader2.name} (${leader2.current} W)` : "No Secondary Streak"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE CONTENT GRID FRAMEWORK */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* PRIMARY CONTENT BLOCK: RECENT TIMELINE LEDGER */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 block">Recent Showcase</span>
                  <h3 className="font-black uppercase tracking-tight text-sm text-slate-950 mt-0.5">Latest Match Results</h3>
                </div>
                <Link href="/matches" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                  All Matches <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentResults.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                  No completed matches recorded inside the system yet for this timeline frame.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentResults.map((match) => (
                    <div key={match.id} className="py-4 flex items-center justify-between gap-4 first:pt-1 last:pb-1">
                      <div className="flex-1 text-right font-black text-slate-900 uppercase tracking-tight text-xs truncate">
                        {match.homeTeamName}
                      </div>
                      <div className="bg-slate-950 text-white font-mono font-black text-xs px-3 py-1 rounded-lg shrink-0 shadow-inner tracking-wider">
                        {match.homeScore} - {match.awayScore}
                      </div>
                      <div className="flex-1 text-left font-black text-slate-900 uppercase tracking-tight text-xs truncate">
                        {match.awayTeamName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR BLOCK: TITLE RACE ACTION WIDGET */}
          <div className="w-full">
            <TitleRace 
              divisionId={activeDivisionId} 
              seasonId={activeSeasonId} 
            />
          </div>

        </div>
      </div>

    </div>
  );
}