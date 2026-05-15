import { db } from "@/src/db";
import { matches, teams, players as playersTable, matchGames } from "@/src/db/schema";
import { eq, asc, or, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import RackEntrySystem from "./rack-entry-system";

export default async function MatchScorePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const matchId = Number(id);

  // 1. Fetch match and rosters
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return <div className="p-10 text-center">Match not found.</div>;

  const homeRoster = await db.select().from(playersTable).where(eq(playersTable.teamId, match.homeTeamId!));
  const awayRoster = await db.select().from(playersTable).where(eq(playersTable.teamId, match.awayTeamId!));
  
  const existingGames = await db
    .select()
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameOrder));

  // --- RECALCULATION HELPER ---
  async function updateTeamStandings(tx: any, teamId: number) {
    const teamMatches = await tx
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "completed"),
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))
        )
      );

    let totalPoints = 0;
    let setsWon = 0;
    let setsLost = 0;

    teamMatches.forEach((m: any) => {
      const isHome = m.homeTeamId === teamId;
      const homeScore = m.homeTeamScoreTotal || 0;
      const awayScore = m.awayTeamScoreTotal || 0;

      const teamScore = isHome ? homeScore : awayScore;
      const oppScore = isHome ? awayScore : homeScore;

      setsWon += teamScore;
      setsLost += oppScore;

      // UPDATED LEAGUE POINT LOGIC: 2 for Win, 1 for Draw, 0 for Loss
      if (teamScore > oppScore) {
        totalPoints += 2; // Set win points to 2 here
      } else if (teamScore === oppScore) {
        totalPoints += 1;
      }
    });

    await tx.update(teams)
      .set({ points: totalPoints, setsWon, setsLost })
      .where(eq(teams.id, teamId));
  }

  // --- SERVER ACTION ---
  async function saveMatchResult(formData: FormData) {
    "use server";
    
    const racks = JSON.parse(formData.get("racksJson") as string);
    const homeTotal = racks.filter((r: any) => r.winner === 'home').length;
    const awayTotal = racks.filter((r: any) => r.winner === 'away').length;

    await db.transaction(async (tx) => {
      // Update Match Score
      await tx.update(matches)
        .set({ homeTeamScoreTotal: homeTotal, awayTeamScoreTotal: awayTotal, status: "completed" })
        .where(eq(matches.id, matchId));

      // Update Match Frames
      await tx.delete(matchGames).where(eq(matchGames.matchId, matchId));
      if (racks.length > 0) {
        await tx.insert(matchGames).values(racks.map((r: any, index: number) => ({
          matchId,
          gameOrder: index + 1,
          gameType: r.type,
          player1Id: Number(r.homePlayer1Id) || null,
          player1PartnerId: Number(r.homePlayer2Id) || null,
          player2Id: Number(r.awayPlayer1Id) || null,
          player2PartnerId: Number(r.awayPlayer2Id) || null,
          player1Score: r.winner === 'home' ? 1 : 0,
          player2Score: r.winner === 'away' ? 1 : 0,
        })));
      }

      // Recalculate League Points for both teams
      if (match.homeTeamId) await updateTeamStandings(tx, match.homeTeamId);
      if (match.awayTeamId) await updateTeamStandings(tx, match.awayTeamId);
    });

    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath("/admin/matches");
    redirect("/admin/matches");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/matches" className="text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest">
          ← Back to Match Admin
        </Link>
      </div>
      <RackEntrySystem 
        homePlayers={homeRoster} 
        awayPlayers={awayRoster} 
        onSave={saveMatchResult}
        initialGames={existingGames}
      />
    </div>
  );
}