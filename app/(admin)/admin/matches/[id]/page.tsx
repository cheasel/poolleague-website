import { db } from "@/db";
import { matches, teams, players, matchGames } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import RackEntrySystem from "./rack-entry-system";

export default async function MatchScorePage({ params }: { params: { id: string } }) {
  const matchId = Number(params.id);

  // 1. Fetch data
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return <div>Match not found</div>;

  const homeRoster = await db.select().from(players).where(eq(players.teamId, match.homeTeamId!));
  const awayRoster = await db.select().from(players).where(eq(players.teamId, match.awayTeamId!));
  
  const existingGames = await db
    .select()
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameOrder));

  // 2. The Transactional Save Action
  async function saveMatchResult(formData: FormData) {
    "use server";
    
    const racks = JSON.parse(formData.get("racksJson") as string);
    const homeTotal = racks.filter((r: any) => r.winner === 'home').length;
    const awayTotal = racks.filter((r: any) => r.winner === 'away').length;

    await db.transaction(async (tx) => {
      // Update totals
      await tx.update(matches)
        .set({ homeTeamScoreTotal: homeTotal, awayTeamScoreTotal: awayTotal, status: "completed" })
        .where(eq(matches.id, matchId));

      // Wipe old racks to prevent duplicates
      await tx.delete(matchGames).where(eq(matchGames.matchId, matchId));

      // Insert new racks
      if (racks.length > 0) {
        await tx.insert(matchGames).values(racks.map((r: any, index: number) => ({
          matchId: matchId,
          gameOrder: index + 1,
          // Mapping players for Singles/Doubles
          player1Id: Number(r.homePlayer1Id) || null,
          player2Id: Number(r.awayPlayer1Id) || null,
          // These columns assume your schema supports doubles (e.g., home partner/away partner)
          // If your schema uses different names for doubles, adjust here:
          // player1PartnerId: Number(r.homePlayer2Id) || null,
          // player2PartnerId: Number(r.awayPlayer2Id) || null,
          player1Score: r.winner === 'home' ? 1 : 0,
          player2Score: r.winner === 'away' ? 1 : 0,
        })));
      }
    });

    revalidatePath("/admin/matches");
    revalidatePath("/standings");
    redirect("/admin/matches");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/matches" className="text-slate-500 hover:text-indigo-600 font-medium">
          ← Back to Match List
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