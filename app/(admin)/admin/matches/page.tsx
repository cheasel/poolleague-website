import { db } from "@/src/db";
import { matches, teams, matchGames, players, seasons, divisions } from "@/src/db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import MatchDashboard from "./MatchDashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    selectedMatch?: string;
    sort?: "asc" | "desc";
  }>;
}

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeMatchId = params.selectedMatch ? Number(params.selectedMatch) : null;
  const sortParam = params.sort === "asc" ? "asc" : "desc";

  const sortOrder = sortParam === "asc" ? asc(matches.date) : desc(matches.date);

  // Fetch all matches from DB with division, season, team logos, and home venue relations
  const [
    allMatches,
    allSeasons,
    allDivisions,
    rawTeams,
    allPlayersRaw
  ] = await Promise.all([
    db.query.matches.findMany({
      with: {
        homeTeam: {
          with: {
            venue: true
          }
        },
        awayTeam: true,
        division: {
          with: {
            season: true
          }
        }
      },
      orderBy: sortOrder,
    }),
    db.select().from(seasons).orderBy(desc(seasons.startDate)),
    db.select().from(divisions).orderBy(asc(divisions.name)),
    db.select().from(teams),
    db.select().from(players)
  ]);

  const activeMatch = allMatches.find((m) => m.id === activeMatchId);
  
  let availableHomePlayers: any[] = [];
  let availableAwayPlayers: any[] = [];
  let currentMatchGames: any[] = [];

  if (activeMatch && activeMatch.homeTeamId && activeMatch.awayTeamId) {
    availableHomePlayers = allPlayersRaw.filter(p => p.teamId === activeMatch.homeTeamId);
    availableAwayPlayers = allPlayersRaw.filter(p => p.teamId === activeMatch.awayTeamId);
    currentMatchGames = await db.select().from(matchGames).where(eq(matchGames.matchId, activeMatch.id)).orderBy(asc(matchGames.gameOrder));
  }

  // Server Actions passed cleanly across the wire boundary
  async function addFrameAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    const gameType = formData.get("gameType") as "single" | "double";
    
    const p1Id = formData.get("player1Id") ? Number(formData.get("player1Id")) : null;
    const p1PartnerId = formData.get("player1PartnerId") ? Number(formData.get("player1PartnerId")) : null;
    const p2Id = formData.get("player2Id") ? Number(formData.get("player2Id")) : null;
    const p2PartnerId = formData.get("player2PartnerId") ? Number(formData.get("player2PartnerId")) : null;

    const p1Score = Number(formData.get("player1Score") || 0);
    const p2Score = Number(formData.get("player2Score") || 0);

    if (!matchId) return;

    await db.transaction(async (tx) => {
      // 1. Fetch current max gameOrder in transaction
      const [{ maxOrder }] = await tx
        .select({ maxOrder: sql<number>`COALESCE(MAX(${matchGames.gameOrder}), 0)` })
        .from(matchGames)
        .where(eq(matchGames.matchId, matchId));

      // 2. Insert new frame
      await tx.insert(matchGames).values({
        matchId,
        gameOrder: maxOrder + 1,
        gameType,
        player1Id: p1Id,
        player1PartnerId: gameType === "double" ? p1PartnerId : null,
        player2Id: p2Id,
        player2PartnerId: gameType === "double" ? p2PartnerId : null,
        player1Score: p1Score,
        player2Score: p2Score,
      });

      // 3. Recalculate score from scratch inside transaction to prevent increment drift
      const allGames = await tx.select().from(matchGames).where(eq(matchGames.matchId, matchId));
      const homeScore = allGames.filter(g => (g.player1Score ?? 0) > (g.player2Score ?? 0)).length;
      const awayScore = allGames.filter(g => (g.player2Score ?? 0) > (g.player1Score ?? 0)).length;

      await tx
        .update(matches)
        .set({ homeScore, awayScore })
        .where(eq(matches.id, matchId));
    });

    revalidatePath("/admin/matches");
  }

  async function finalizeMatchAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    if (!matchId) return;

    await db.transaction(async (tx) => {
      const [currentMatch] = await tx.select().from(matches).where(eq(matches.id, matchId));
      if (!currentMatch || !currentMatch.homeTeamId || !currentMatch.awayTeamId) return;

      // Prevent race conditions / double point awarding
      if (currentMatch.status === "completed") return;

      const homeScore = currentMatch.homeScore || 0;
      const awayScore = currentMatch.awayScore || 0;

      let homePointsAward = 0;
      let awayPointsAward = 0;

      if (homeScore > awayScore) homePointsAward = 2;
      else if (awayScore > homeScore) awayPointsAward = 2;
      else {
        homePointsAward = 1;
        awayPointsAward = 1;
      }

      await tx.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));

      const [homeTeam] = await tx.select().from(teams).where(eq(teams.id, currentMatch.homeTeamId));
      if (homeTeam) {
        await tx.update(teams).set({ points: (homeTeam.points || 0) + homePointsAward }).where(eq(teams.id, homeTeam.id));
      }

      const [awayTeam] = await tx.select().from(teams).where(eq(teams.id, currentMatch.awayTeamId));
      if (awayTeam) {
        await tx.update(teams).set({ points: (awayTeam.points || 0) + awayPointsAward }).where(eq(teams.id, awayTeam.id));
      }
    });

    revalidatePath("/admin/matches");
  }

  return (
    <MatchDashboard
      activeMatchId={activeMatchId}
      sortParam={sortParam}
      allMatches={allMatches as any}
      rawTeams={rawTeams}
      availableHomePlayers={availableHomePlayers}
      availableAwayPlayers={availableAwayPlayers}
      currentMatchGames={currentMatchGames}
      allPlayersRaw={allPlayersRaw}
      addFrameAction={addFrameAction}
      finalizeMatchAction={finalizeMatchAction}
      seasons={allSeasons}
      divisions={allDivisions}
    />
  );
}