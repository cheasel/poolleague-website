import { db } from "@/src/db";
import { matches, teams, matchGames, players, seasons, divisions, teamMemberships, teamRegistrations } from "@/src/db/schema";
import { eq, asc, desc, sql, inArray, and } from "drizzle-orm";
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

  // Fetch all matches from DB sequentially to prevent pipelining deadlock on max: 1 pool
  const allMatches = await db.query.matches.findMany({
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
  });

  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.name));
  const rawTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      divisionId: teamRegistrations.divisionId,
      homeVenueId: teams.homeVenueId,
    })
    .from(teamRegistrations)
    .innerJoin(teams, eq(teamRegistrations.teamId, teams.id));

  const activeMatch = allMatches.find((m) => m.id === activeMatchId);
  
  let availableHomePlayers: any[] = [];
  let availableAwayPlayers: any[] = [];
  let currentMatchGames: any[] = [];

  if (activeMatch && activeMatch.homeTeamId && activeMatch.awayTeamId && activeMatch.seasonId) {
    availableHomePlayers = await db
      .select({
        id: players.id,
        name: players.name,
      })
      .from(teamMemberships)
      .innerJoin(players, eq(teamMemberships.playerId, players.id))
      .where(
        and(
          eq(teamMemberships.teamId, activeMatch.homeTeamId),
          eq(teamMemberships.seasonId, activeMatch.seasonId)
        )
      );

    availableAwayPlayers = await db
      .select({
        id: players.id,
        name: players.name,
      })
      .from(teamMemberships)
      .innerJoin(players, eq(teamMemberships.playerId, players.id))
      .where(
        and(
          eq(teamMemberships.teamId, activeMatch.awayTeamId),
          eq(teamMemberships.seasonId, activeMatch.seasonId)
        )
      );

    currentMatchGames = await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, activeMatch.id))
      .orderBy(asc(matchGames.gameOrder));
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

  async function addMatchAction(formData: FormData) {
    "use server";
    const seasonId = Number(formData.get("seasonId"));
    const divisionId = Number(formData.get("divisionId"));
    const weekNumber = Number(formData.get("weekNumber") || 1);
    const matchDateStr = formData.get("matchDate") as string;

    const homeTeamIds = formData.getAll("homeTeamId").map(Number);
    const awayTeamIds = formData.getAll("awayTeamId").map(Number);

    if (!seasonId || !divisionId || !matchDateStr || homeTeamIds.length === 0 || awayTeamIds.length === 0) {
      return;
    }

    const matchDate = new Date(`${matchDateStr}T20:00:00`);

    // 1. Fetch existing matches for this division and week to check duplicates on the database level
    const existingMatches = await db.query.matches.findMany({
      where: (m, { and, eq }) => and(
        eq(m.divisionId, divisionId),
        eq(m.weekNumber, weekNumber)
      )
    });

    // Enforce Rule 1: Fetch venues of all involved teams to verify they are assigned
    const involvedTeamIds = Array.from(new Set([...homeTeamIds, ...awayTeamIds]));
    const teamVenues = await db
      .select({ id: teams.id, homeVenueId: teams.homeVenueId })
      .from(teams)
      .where(inArray(teams.id, involvedTeamIds));
    const teamVenueMap = new Map(teamVenues.map(t => [t.id, t.homeVenueId]));

    const insertValues = [];
    const seenMatchups = new Set<string>();

    for (let i = 0; i < homeTeamIds.length; i++) {
      const homeTeamId = homeTeamIds[i];
      const awayTeamId = awayTeamIds[i];

      if (!homeTeamId || !awayTeamId) continue;

      // Rule 1: Both teams must have a home venue assigned
      const homeVenue = teamVenueMap.get(homeTeamId);
      const awayVenue = teamVenueMap.get(awayTeamId);
      if (!homeVenue || !awayVenue) continue;

      // Rule 1: Same team can't play each other
      if (homeTeamId === awayTeamId) continue;

      // Rule 2a: Deduplicate within the current batch (order-independent matchup check)
      const matchupKey = [homeTeamId, awayTeamId].sort((a, b) => a - b).join('-');
      if (seenMatchups.has(matchupKey)) continue;
      seenMatchups.add(matchupKey);

      // Rule 2b: Check duplicates against existing database records for the same division/week (order-independent)
      const isDuplicate = existingMatches.some(em => {
        const emHome = em.homeTeamId;
        const emAway = em.awayTeamId;
        return (
          (emHome === homeTeamId && emAway === awayTeamId) ||
          (emHome === awayTeamId && emAway === homeTeamId)
        );
      });

      if (isDuplicate) continue;

      insertValues.push({
        seasonId,
        divisionId,
        homeTeamId,
        awayTeamId,
        weekNumber,
        date: matchDate,
        status: "scheduled" as const,
        homeScore: 0,
        awayScore: 0,
      });
    }

    if (insertValues.length > 0) {
      await db.insert(matches).values(insertValues);
    }

    revalidatePath("/admin/matches");
  }

  async function clearDivisionScheduleAction(divisionId: number) {
    "use server";

    // 1. Verify if there are completed matches in this division
    const completedMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.divisionId, divisionId),
          eq(matches.status, "completed")
        )
      )
      .limit(1);

    if (completedMatches.length > 0) {
      throw new Error("Cannot clear schedule: This division already has completed matches.");
    }

    // 2. Delete matches (cascade deletes games)
    await db.delete(matches).where(eq(matches.divisionId, divisionId));

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
      addFrameAction={addFrameAction}
      addMatchAction={addMatchAction}
      clearDivisionScheduleAction={clearDivisionScheduleAction}
      seasons={allSeasons}
      divisions={allDivisions}
    />
  );
}