import TitleRace from "@/components/TitleRace";
import { db } from "@/src/db";
import { seasons, divisions, matches, teams, matchGames, players } from "@/src/db/schema";
import { desc, eq, and, sql, asc } from "drizzle-orm";
import { Trophy, CalendarDays, ArrowRight, Zap, Star, Flame, Award, Medal } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;


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
      streaks[m.homeTeamId].current = 0;
      streaks[m.awayTeamId].current = 0;
    }
  });

  return Object.values(streaks).sort((a, b) => b.current - a.current);
}

// 🎯 ADDED: Aggregates game/frame level data inside the active season/division context
async function getTopPlayerStats(seasonId: number, divisionId: number) {
  const games = await db
    .select({
      player1Id: matchGames.player1Id,
      player2Id: matchGames.player2Id,
      p1Score: matchGames.player1Score,
      p2Score: matchGames.player2Score,
      p1Name: sql<string>`p1.name`,
      p2Name: sql<string>`p2.name`,
      p1Image: sql<string | null>`p1.image_url`,
      p2Image: sql<string | null>`p2.image_url`,
      teamName: sql<string>`t.name`,
    })
    .from(matchGames)
    .innerJoin(matches, eq(matchGames.matchId, matches.id))
    .leftJoin(players, eq(matchGames.player1Id, players.id))
    .leftJoin(sql`players as p1`, eq(matchGames.player1Id, sql`p1.id`))
    .leftJoin(sql`players as p2`, eq(matchGames.player2Id, sql`p2.id`))
    .leftJoin(teams, eq(players.teamId, teams.id))
    .leftJoin(sql`teams as t`, eq(sql`p1.team_id`, sql`t.id`))
    .where(
      and(
        eq(matches.status, "completed"),
        eq(matches.seasonId, seasonId),
        eq(matches.divisionId, divisionId)
      )
    );

  const stats: Record<number, { name: string; team: string; wins: number; image: string | null }> = {};

  games.forEach((g) => {
    const p1Id = g.player1Id;
    const p2Id = g.player2Id;
    const s1 = g.p1Score ?? 0;
    const s2 = g.p2Score ?? 0;

    if (p1Id && g.p1Name) {
      if (!stats[p1Id]) stats[p1Id] = { name: g.p1Name, team: g.teamName || "Independent", wins: 0, image: g.p1Image };
      if (s1 > s2) stats[p1Id].wins += 1;
    }
    if (p2Id && g.p2Name) {
      if (!stats[p2Id]) stats[p2Id] = { name: g.p2Name, team: g.teamName || "Independent", wins: 0, image: g.p2Image };
      if (s2 > s1) stats[p2Id].wins += 1;
    }
  });

  return Object.values(stats)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 3);
}

export default async function PublicHomePage() {
  const currentSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1);
  const activeSeasonId = currentSeasons[0]?.id || 1;
  const activeSeasonName = currentSeasons[0]?.name || "Current Season";

  const currentDivisions = await db.select().from(divisions).orderBy(divisions.tier).limit(1);
  const activeDivisionId = currentDivisions[0]?.id || 1;

  const recentResults = await getRecentResults(activeSeasonId, activeDivisionId);
  const sortedStreaks = await getTopFormStreaks(activeSeasonId, activeDivisionId);
  const topPlayers = await getTopPlayerStats(activeSeasonId, activeDivisionId); // 🎯 ADDED



  const leader1 = sortedStreaks[0]?.current > 0 ? sortedStreaks[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">

      {/* HERO DASHBOARD BRANDING HEADER */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-900/60 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm shadow-indigo-950/40">
            <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" /> Live Arena Ecosystem
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter italic leading-[0.9] max-w-3xl">
            The Arena for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 drop-shadow-sm">
              Cue Sport Analytics
            </span>
          </h1>

          <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-xl leading-relaxed">
            Review detailed live performance metrics, authentic structural standings point distributions, and frame-by-frame match timeline matrices.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link 
              href="/standings" 
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-950/50 hover:-translate-y-0.5"
            >
              <Trophy className="w-3.5 h-3.5" /> View Live Standings
            </Link>
            <Link 
              href="/matches" 
              className="px-5 py-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 shadow-md hover:-translate-y-0.5"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Match Timelines
            </Link>
          </div>
        </div>
      </div>

      {/* METRICS ROW CARDS STRIP */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

          {/* Card 1: Active Season */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
            <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl border border-amber-900/50 shadow-inner"><Star className="w-4 h-4 fill-amber-400" /></div>
            <div>
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Active Season</span>
              <span className="text-sm font-black text-slate-100 uppercase tracking-tight block mt-0.5">{activeSeasonName}</span>
            </div>
          </div>

          {/* Card 2: Team Form Leader */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4 transition-all hover:border-orange-900/60 group">
            <div className="p-3 bg-orange-950/60 text-orange-400 rounded-xl border border-orange-900/50 shadow-inner group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 fill-orange-500" />
            </div>

            {/* 🎯 THE FIX: Add min-w-0 here to allow the text container to shrink properly inside the flexbox */}
            <div className="min-w-0 flex-1"> 
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Form Leader</span>
              <span className="text-sm font-black text-orange-400 uppercase tracking-tight block mt-0.5 truncate">
                {leader1 ? `${leader1.name} (${leader1.current} W)` : "No Active Streak"}
              </span>
            </div>
          </div>

          {/* 🎯 CHANGED: Card 3 is now a high-density player list compatible with displaying multi-rank metrics */}
          <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col min-h-[160px] transition-all hover:border-indigo-900/60">
            <div className="flex items-center gap-1.5 mb-3 px-1 border-b border-slate-800/50 pb-2">
              <Award className="w-3 h-3 text-indigo-400" />
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Frame MVP Leaders</span>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-2">
              {topPlayers.length === 0 ? (
                <span className="text-[10px] font-bold text-slate-600 uppercase text-center">No Data</span>
              ) : (
                topPlayers.map((player, index) => (
                  <div key={player.name} className="flex items-center justify-between text-xs px-1 group/row">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className={`font-mono text-[10px] font-black w-4 h-4 flex items-center justify-center rounded ${
                        index === 0 ? 'bg-indigo-900/40 text-indigo-400 border border-indigo-800/50' : 'text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-black text-slate-200 uppercase truncate group-hover/row:text-white transition-colors">
                        {player.name}
                      </span>
                      <span className="text-[9px] text-slate-500 font-semibold truncate uppercase tracking-tighter">
                        {player.team}
                      </span>
                    </div>
                    <span className="font-mono font-black bg-slate-950 border border-slate-800 text-indigo-400 px-1.5 py-0.5 rounded text-[10px] shrink-0 tabular-nums">
                      {player.wins} W
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* CORE CONTENT GRID FRAMEWORK */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* PRIMARY CONTENT BLOCK: RECENT TIMELINE LEDGER */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Recent Showcase</span>
                  <h3 className="font-black uppercase tracking-tight text-sm text-white mt-0.5">Latest Match Results</h3>
                </div>
                <Link href="/matches" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  All Matches <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentResults.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 py-8 text-center border border-dashed border-slate-800 rounded-2xl">
                  No completed matches recorded inside the system yet for this timeline frame.
                </p>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {recentResults.map((match) => (
                    <div key={match.id} className="py-4 flex items-center justify-between gap-4 first:pt-1 last:pb-1 group hover:bg-slate-900/20 px-2 rounded-xl transition-colors">
                      <div className="flex-1 text-right font-black text-slate-200 uppercase tracking-tight text-xs truncate">
                        {match.homeTeamName}
                      </div>
                      <div className="bg-slate-950 text-indigo-400 border border-slate-800 font-mono font-black text-xs px-3 py-1 rounded-lg shrink-0 shadow-inner tracking-wider">
                        {match.homeScore} - {match.awayScore}
                      </div>
                      <div className="flex-1 text-left font-black text-slate-200 uppercase tracking-tight text-xs truncate">
                        {match.awayTeamName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR BLOCK: TITLE RACE ACTION WIDGET */}
          <div className="w-full bg-slate-900/20 border border-slate-900 rounded-3xl p-1 shadow-lg">
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