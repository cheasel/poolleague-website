import { db } from "@/src/db";
import { matches, teams, matchGames, players, seasons, divisions } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
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
  const rawTeams = await db.select().from(teams);
  const allPlayersRaw = await db.select().from(players);

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

    const existing = await db.select().from(matchGames).where(eq(matchGames.matchId, matchId));
    await db.insert(matchGames).values({
      matchId,
      gameOrder: existing.length + 1,
      gameType,
      player1Id: p1Id,
      player1PartnerId: gameType === "double" ? p1PartnerId : null,
      player2Id: p2Id,
      player2PartnerId: gameType === "double" ? p2PartnerId : null,
      player1Score: p1Score,
      player2Score: p2Score,
    });

    const homeIncrement = p1Score > p2Score ? 1 : 0;
    const awayIncrement = p2Score > p1Score ? 1 : 0;

    const currentMatchRecord = await db.select().from(matches).where(eq(matches.id, matchId));
    if (currentMatchRecord[0]) {
      await db
        .update(matches)
        .set({
          homeScore: (currentMatchRecord[0].homeScore || 0) + homeIncrement,
          awayScore: (currentMatchRecord[0].awayScore || 0) + awayIncrement,
        })
        .where(eq(matches.id, matchId));
    }
    revalidatePath("/admin/matches");
  }

  async function finalizeMatchAction(formData: FormData) {
    "use server";
    const matchId = Number(formData.get("matchId"));
    if (!matchId) return;

    const currentMatch = await db.select().from(matches).where(eq(matches.id, matchId));
    if (!currentMatch[0] || !currentMatch[0].homeTeamId || !currentMatch[0].awayTeamId) return;

    const homeScore = currentMatch[0].homeScore || 0;
    const awayScore = currentMatch[0].awayScore || 0;

    let homePointsAward = 0;
    let awayPointsAward = 0;

    if (homeScore > awayScore) homePointsAward = 2;
    else if (awayScore > homeScore) awayPointsAward = 2;
    else {
      homePointsAward = 1;
      awayPointsAward = 1;
    }

    await db.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));

    const homeTeam = await db.select().from(teams).where(eq(teams.id, currentMatch[0].homeTeamId));
    if (homeTeam[0]) {
      await db.update(teams).set({ points: (homeTeam[0].points || 0) + homePointsAward }).where(eq(teams.id, homeTeam[0].id));
    }

    const awayTeam = await db.select().from(teams).where(eq(teams.id, currentMatch[0].awayTeamId));
    if (awayTeam[0]) {
      await db.update(teams).set({ points: (awayTeam[0].points || 0) + awayPointsAward }).where(eq(teams.id, awayTeam[0].id));
    }
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