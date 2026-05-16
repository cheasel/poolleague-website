import { db } from "@/src/db";
import { matches, teams, players, divisions } from "@/src/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Trophy, Target, History, ChevronRight, Star } from "lucide-react";

export default async function HomePage() {
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  // 1. Fetch Top 3 Teams from the first division found (usually the top tier)
  const [topDiv] = await db
  .select()
  .from(divisions)
  .where(eq(divisions.tier, 1)) // Forces look up of your true top division
  .limit(1);
  
  const topTeams = topDiv 
    ? await db.select().from(teams)
        .where(eq(teams.divisionId, topDiv.id))
        .orderBy(desc(teams.points), desc(sql`${teams.setsWon} - ${teams.setsLost}`))
        .limit(3)
    : [];

  // 2. Fetch 3 Most Recent Completed Matches
  const recentMatches = await db
    .select({
      id: matches.id,
      homeTeam: homeTeams.name,
      awayTeam: awayTeams.name,
      homeScore: matches.homeTeamScoreTotal,
      awayScore: matches.awayTeamScoreTotal,
    })
    .from(matches)
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .where(eq(matches.status, "completed"))
    .orderBy(desc(matches.matchDate))
    .limit(3);

  // 3. Simple Counts
  const [playerCount] = await db.select({ count: sql<number>`count(*)` }).from(players);
  const [matchCount] = await db.select({ count: sql<number>`count(*)` }).from(matches);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white pt-24 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/10 blur-[120px] rounded-full -mr-20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-8">
            <Star className="w-3 h-3 text-indigo-400 fill-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">2026 Season Live</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-8 italic">
            Precision <br />
            <span className="text-indigo-500">Analytics</span>
          </h1>
          <div className="flex flex-wrap gap-4">
            <Link href="/standings" className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 hover:text-white transition-all shadow-xl">
              Table
            </Link>
            <Link href="/players" className="bg-slate-800 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all">
              Players
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bento Grid */}
      <section className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Top Tier Leaderboard */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">{topDiv?.name || 'League'} Leaders</h2>
              </div>
            </div>
            <div className="space-y-5">
              {topTeams.map((team, idx) => (
                <div key={team.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-200 font-black text-2xl italic leading-none group-hover:text-indigo-100 transition-colors">#0{idx + 1}</span>
                    <span className="font-black text-slate-900 uppercase text-sm tracking-tight">{team.name}</span>
                  </div>
                  <span className="font-black text-indigo-600 tabular-nums">{team.points} <span className="text-[10px] text-slate-300">PTS</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Matches Preview */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <History className="w-5 h-5 text-indigo-500" />
              <h2 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Latest Results</h2>
            </div>
            <div className="space-y-5">
              {recentMatches.map((m) => (
                <Link href={`/matches/${m.id}`} key={m.id} className="flex justify-between items-center group">
                  <div className="text-[11px] font-black text-slate-500 group-hover:text-indigo-600 transition-colors uppercase truncate max-w-[140px]">
                    {m.homeTeam} <span className="text-slate-200 mx-1">v</span> {m.awayTeam}
                  </div>
                  <div className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg text-sm tabular-nums">
                    {m.homeScore}-{m.awayScore}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pulse Stats */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-200 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Target className="w-5 h-5 text-indigo-300" />
                <h2 className="font-black uppercase tracking-[0.2em] text-[10px] text-indigo-300">League Pulse</h2>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-5xl font-black tabular-nums">{playerCount.count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-1">Players</div>
                </div>
                <div>
                  <div className="text-5xl font-black tabular-nums">{matchCount.count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-1">Matches</div>
                </div>
              </div>
            </div>
            <Link href="/players" className="mt-8 flex justify-between items-center group">
              <span className="text-[10px] font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Explore Analytics</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}