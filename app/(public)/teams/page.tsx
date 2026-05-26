import { db } from "@/src/db";
import { teams, matches, seasons, divisions, matchGames } from "@/src/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import TeamStatsClient from "./TeamStatsClient";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

const getCachedSeasons = unstable_cache(
  async () => {
    return db.select().from(seasons).orderBy(desc(seasons.startDate));
  },
  ["seasons-list"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedDivisions = unstable_cache(
  async () => {
    return db.select().from(divisions).orderBy(divisions.tier);
  },
  ["divisions-list"],
  { revalidate: 300, tags: ["divisions"] }
);

const getCachedTeamStatsData = (selectedSeasonId: number | null, selectedDivisionId: number | null) => unstable_cache(
  async () => {
    const completedMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, "completed"),
          selectedSeasonId ? eq(matches.seasonId, selectedSeasonId) : undefined,
          selectedDivisionId ? eq(matches.divisionId, selectedDivisionId) : undefined
        )
      );

    const completedMatchIds = completedMatches.map((m) => m.id);

    const baseTeams = selectedDivisionId
      ? await db.select().from(teams).where(eq(teams.divisionId, selectedDivisionId))
      : await db.select().from(teams);

    const statsMap = baseTeams.reduce((acc, t) => {
      acc[t.id] = {
        id: t.id,
        name: t.name,
        logoUrl: t.logoUrl,
        singlePlay: 0,
        singleWin: 0,
        singleLost: 0,
        doublePlay: 0,
        doubleWin: 0,
        doubleLost: 0,
      };
      return acc;
    }, {} as Record<number, any>);

    if (completedMatchIds.length > 0) {
      const gamesPlayed = await db
        .select({
          matchId: matchGames.matchId,
          gameType: matchGames.gameType,
          player1Score: matchGames.player1Score,
          player2Score: matchGames.player2Score,
        })
        .from(matchGames)
        .where(sql`${matchGames.matchId} IN ${completedMatchIds}`);

      const matchTeamMap = new Map<number, { homeTeamId: number | null; awayTeamId: number | null }>();
      completedMatches.forEach((m) => {
        matchTeamMap.set(m.id, { homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId });
      });

      gamesPlayed.forEach((game) => {
        if (!game.matchId) return;
        const teamIds = matchTeamMap.get(game.matchId);
        if (!teamIds) return;

        const { homeTeamId, awayTeamId } = teamIds;
        const p1Score = Number(game.player1Score || 0);
        const p2Score = Number(game.player2Score || 0);

        const isHomeWin = p1Score > p2Score;
        const isAwayWin = p2Score > p1Score;

        if (game.gameType === "single") {
          if (homeTeamId && statsMap[homeTeamId]) {
            statsMap[homeTeamId].singlePlay += 1;
            if (isHomeWin) statsMap[homeTeamId].singleWin += 1;
            else if (isAwayWin) statsMap[homeTeamId].singleLost += 1;
          }
          if (awayTeamId && statsMap[awayTeamId]) {
            statsMap[awayTeamId].singlePlay += 1;
            if (isAwayWin) statsMap[awayTeamId].singleWin += 1;
            else if (isHomeWin) statsMap[awayTeamId].singleLost += 1;
          }
        } else if (game.gameType === "double") {
          if (homeTeamId && statsMap[homeTeamId]) {
            statsMap[homeTeamId].doublePlay += 1;
            if (isHomeWin) statsMap[homeTeamId].doubleWin += 1;
            else if (isAwayWin) statsMap[homeTeamId].doubleLost += 1;
          }
          if (awayTeamId && statsMap[awayTeamId]) {
            statsMap[awayTeamId].doublePlay += 1;
            if (isAwayWin) statsMap[awayTeamId].doubleWin += 1;
            else if (isHomeWin) statsMap[awayTeamId].doubleLost += 1;
          }
        }
      });
    }

    const calculatedTeams = Object.values(statsMap).map((t: any) => {
      const totalPlay = t.singlePlay + t.doublePlay;
      const totalWin = t.singleWin + t.doubleWin;
      const totalLost = t.singleLost + t.doubleLost;

      return {
        id: t.id,
        name: t.name,
        logoUrl: t.logoUrl,
        singlePlay: t.singlePlay,
        singleWin: t.singleWin,
        singleLost: t.singleLost,
        singlePct: t.singlePlay > 0 ? ((t.singleWin / t.singlePlay) * 100).toFixed(1) : "0.0",
        doublePlay: t.doublePlay,
        doubleWin: t.doubleWin,
        doubleLost: t.doubleLost,
        doublePct: t.doublePlay > 0 ? ((t.doubleWin / t.doublePlay) * 100).toFixed(1) : "0.0",
        totalPlay,
        totalWin,
        totalLost,
        totalPct: totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(1) : "0.0",
      };
    });

    return calculatedTeams;
  },
  ["teams-stats-data", String(selectedSeasonId), String(selectedDivisionId)],
  { revalidate: 60, tags: ["teams", "matches"] }
)();

export default async function PublicTeamsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const allSeasons = await getCachedSeasons();
  const allDivisions = await getCachedDivisions();

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || null);

  const calculatedTeams = await getCachedTeamStatsData(selectedSeasonId, selectedDivisionId);

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">Performance Matrix</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Statistics</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            Compare team performances across singles matches, doubles frames, and overall win-loss ratios.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <Suspense fallback={
          <div className="text-slate-400 text-center py-12 font-bold uppercase tracking-wider text-xs">
            Loading team statistics...
          </div>
        }>
          <TeamStatsClient
            initialTeams={calculatedTeams}
            seasons={allSeasons.map((s) => ({ id: s.id, name: s.name }))}
            divisions={allDivisions.map((d) => ({ id: d.id, name: d.name }))}
            selectedSeasonId={selectedSeasonId || undefined}
            selectedDivisionId={selectedDivisionId || undefined}
          />
        </Suspense>
      </div>
    </div>
  );
}
