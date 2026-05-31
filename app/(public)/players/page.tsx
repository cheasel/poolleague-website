import { db } from "@/src/db";
import { teams, matches, players, seasons, divisions, matchGames, teamMemberships } from "@/src/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import PlayerStatsClient from "./PlayerStatsClient";
import { calculatePlayerStats } from "@/src/utils/stats-calculator";

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

const getCachedPlayersData = unstable_cache(
  async (selectedSeasonId: number | null, selectedDivisionId: number | null) => {
    const completedMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
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

    const teamMatchCountMap: Record<number, number> = {};
    const teamTotalFramesMap: Record<number, number> = {};

    completedMatches.forEach((m) => {
      const totalMatchFrames = Number(m.homeScore || 0) + Number(m.awayScore || 0);

      if (m.homeTeamId) {
        teamMatchCountMap[m.homeTeamId] = (teamMatchCountMap[m.homeTeamId] || 0) + 1;
        teamTotalFramesMap[m.homeTeamId] = (teamTotalFramesMap[m.homeTeamId] || 0) + totalMatchFrames;
      }
      if (m.awayTeamId) {
        teamMatchCountMap[m.awayTeamId] = (teamMatchCountMap[m.awayTeamId] || 0) + 1;
        teamTotalFramesMap[m.awayTeamId] = (teamTotalFramesMap[m.awayTeamId] || 0) + totalMatchFrames;
      }
    });

    const basePlayers = await db
      .select({
        id: players.id,
        name: players.name,
        imageUrl: players.imageUrl,
        teamId: teamMemberships.teamId,
        teamName: teams.name,
      })
      .from(players)
      .leftJoin(
        teamMemberships,
        and(
          eq(players.id, teamMemberships.playerId),
          selectedSeasonId ? eq(teamMemberships.seasonId, selectedSeasonId) : sql`1=0`
        )
      )
      .leftJoin(teams, eq(teamMemberships.teamId, teams.id))
      .where(selectedDivisionId ? eq(teamMemberships.divisionId, selectedDivisionId) : undefined);

    const gamesPlayed = completedMatchIds.length > 0
      ? await db
          .select({
            matchId: matchGames.matchId,
            gameType: matchGames.gameType,
            player1Id: matchGames.player1Id,
            player2Id: matchGames.player2Id,
            player1PartnerId: matchGames.player1PartnerId,
            player2PartnerId: matchGames.player2PartnerId,
            player1Score: matchGames.player1Score,
            player2Score: matchGames.player2Score,
          })
          .from(matchGames)
          .where(inArray(matchGames.matchId, completedMatchIds))
      : [];

    return calculatePlayerStats(
      basePlayers.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        teamId: p.teamId,
        teamName: p.teamName
      })),
      teamMatchCountMap,
      teamTotalFramesMap,
      completedMatchIds,
      gamesPlayed
    );
  },
  ["players-data"],
  { revalidate: 60, tags: ["players"] }
);

export default async function PublicPlayersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const allSeasons = await getCachedSeasons();
  const allDivisions = await getCachedDivisions();

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || null);

  const calculatedPlayers = await getCachedPlayersData(selectedSeasonId, selectedDivisionId);

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">Performance Matrix</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Statistics</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            Review performance breakdowns across singles and doubles metrics, attendance tracking, and success percentages.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <Suspense fallback={
          <div className="text-slate-400 text-center py-12 font-bold uppercase tracking-wider text-xs">
            Loading player statistics...
          </div>
        }>
          <PlayerStatsClient
            initialPlayers={calculatedPlayers}
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