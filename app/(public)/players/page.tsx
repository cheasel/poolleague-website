import { db } from "@/src/db";
import { teams, matches, players, seasons, divisions, matchGames } from "@/src/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import PlayerStatsClient from "./PlayerStatsClient"; // Double check if your file name is PlayerStatsClient.tsx or PlayerStatsClient.tsx

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

export default async function PublicPlayersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch lookups for dropdown selectors
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const allDivisions = await db.select().from(divisions).orderBy(divisions.tier);

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || null);

  // 2. Fetch completed matches within selected scope
  const completedMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, "completed"),
        selectedSeasonId ? eq(matches.seasonId, selectedSeasonId) : undefined,
        selectedDivisionId ? eq(matches.divisionId, selectedDivisionId) : undefined
      )
    );

  const completedMatchIds = completedMatches.map((m) => m.id);

  // 3. Fetch player roster with their assigned teams
  const basePlayers = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(selectedDivisionId ? eq(teams.divisionId, selectedDivisionId) : undefined);

  // Initialize statistics ledger object mapped exactly to PlayerStatRow interface
  const statsMap = basePlayers.reduce((acc, p) => {
    acc[p.id] = {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      teamName: p.teamName || "Free Agent",
      matchPlay: 0,
      maxTeamMatches: 0,
      singlePlay: 0,
      singleWin: 0,
      singleLost: 0,
      singlePct: "0.0",
      doublePlay: 0,
      doubleWin: 0,
      doubleLost: 0,
      doublePct: "0.0",
      totalPlay: 0,
      totalWin: 0,
      totalLost: 0,
      totalPct: "0.0",
    };
    return acc;
  }, {} as Record<number, any>);

  // 4. Calculate stats from game logs if matches exist
  if (completedMatchIds.length > 0) {
    const gamesPlayed = await db
      .select()
      .from(matchGames)
      .where(sql`${matchGames.matchId} IN ${completedMatchIds}`);

    gamesPlayed.forEach((game) => {
      const p1Id = game.player1Id;
      const p2Id = game.player2Id;
      const p1Score = Number(game.player1Score || 0);
      const p2Score = Number(game.player2Score || 0);

      // --- Singles Bracket Processing ---
      if (game.gameType === "single") {
        if (p1Id && statsMap[p1Id]) {
          statsMap[p1Id].singlePlay += 1;
          if (p1Score > p2Score) statsMap[p1Id].singleWin += 1;
          else if (p1Score < p2Score) statsMap[p1Id].singleLost += 1;
        }
        if (p2Id && statsMap[p2Id]) {
          statsMap[p2Id].singlePlay += 1;
          if (p2Score > p1Score) statsMap[p2Id].singleWin += 1;
          else if (p2Score < p1Score) statsMap[p2Id].singleLost += 1;
        }
      }

      // --- Doubles Roster Processing ---
      if (game.gameType === "double") {
        const partners = [
          { main: p1Id, partner: game.player1PartnerId, won: p1Score > p2Score, lost: p1Score < p2Score },
          { main: game.player1PartnerId, partner: p1Id, won: p1Score > p2Score, lost: p1Score < p2Score },
          { main: p2Id, partner: game.player2PartnerId, won: p2Score > p1Score, lost: p2Score < p1Score },
          { main: game.player2PartnerId, partner: p2Id, won: p2Score > p1Score, lost: p2Score < p1Score },
        ];

        partners.forEach(({ main, won, lost }) => {
          if (main && statsMap[main]) {
            statsMap[main].doublePlay += 1;
            if (won) statsMap[main].doubleWin += 1;
            if (lost) statsMap[main].doubleLost += 1;
          }
        });
      }
    });
  }

  // 5. Build calculations and dynamic ratios
  const calculatedPlayers = Object.values(statsMap).map((p: any) => {
    const totalPlay = p.singlePlay + p.doublePlay;
    const totalWin = p.singleWin + p.doubleWin;
    const totalLost = p.singleLost + p.doubleLost;

    // Approximate total match configurations safely
    const matchPlay = Math.max(p.singlePlay, p.doublePlay); 

    return {
      ...p,
      matchPlay,
      maxTeamMatches: completedMatchIds.length,
      totalPlay,
      totalWin,
      totalLost,
      singlePct: p.singlePlay > 0 ? ((p.singleWin / p.singlePlay) * 100).toFixed(1) : "0.0",
      doublePct: p.doublePlay > 0 ? ((p.doubleWin / p.doublePlay) * 100).toFixed(1) : "0.0",
      totalPct: totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(1) : "0.0",
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Player Statistics</h1>
        <p className="text-slate-500 text-sm mt-1">Review performance breakdowns across singles and doubles metrics.</p>
      </div>

      <PlayerStatsClient
        initialPlayers={calculatedPlayers}
        seasons={allSeasons.map((s) => ({ id: s.id, name: s.name }))}
        divisions={allDivisions.map((d) => ({ id: d.id, name: d.name }))}
        selectedSeasonId={selectedSeasonId || undefined}
        selectedDivisionId={selectedDivisionId || undefined}
      />
    </div>
  );
}