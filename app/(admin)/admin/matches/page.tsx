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
      seasons={allSeasons}
      divisions={allDivisions}
    />
  );
}