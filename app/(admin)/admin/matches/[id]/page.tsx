import { db } from "@/db";
import { matches, teams, players as playersTable, matchGames } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import RackEntrySystem from "./rack-entry-system";

export default async function MatchScorePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const matchId = Number(id);

  // 1. Fetch data for the form
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return <div className="p-10 text-center text-slate-500">Match not found.</div>;

  const homeRoster = await db.select().from(playersTable).where(eq(playersTable.teamId, match.homeTeamId!));
  const awayRoster = await db.select().from(playersTable).where(eq(playersTable.teamId, match.awayTeamId!));
  
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
      // Update totals on the main match record
      await tx.update(matches)
        .set({ 
          homeTeamScoreTotal: homeTotal, 
          awayTeamScoreTotal: awayTotal, 
          status: "completed" 
        })
        .where(eq(matches.id, matchId));

      // Wipe old frames for this match to ensure a clean overwrite
      await tx.delete(matchGames).where(eq(matchGames.matchId, matchId));

      // Insert new frames with full partner support
      if (racks.length > 0) {
        await tx.insert(matchGames).values(racks.map((r: any, index: number) => ({
          matchId: matchId,
          gameOrder: index + 1,
          gameType: r.type, // 'single' or 'double'
          
          // Home Team Players
          player1Id: Number(r.homePlayer1Id) || null,
          player1PartnerId: r.type === 'double' ? (Number(r.homePlayer2Id) || null) : null,
          
          // Away Team Players
          player2Id: Number(r.awayPlayer1Id) || null,
          player2PartnerId: r.type === 'double' ? (Number(r.awayPlayer2Id) || null) : null,
          
          player1Score: r.winner === 'home' ? 1 : 0,
          player2Score: r.winner === 'away' ? 1 : 0,
        })));
      }
    });

    // Refresh all relevant caches
    revalidatePath("/admin/matches");
    revalidatePath("/standings");
    revalidatePath("/players");
    revalidatePath(`/matches/${matchId}`);
    
    redirect("/admin/matches");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/matches" className="text-slate-400 hover:text-indigo-600 font-black text-xs uppercase tracking-[0.2em] transition-colors">
          ← Back to Schedule
        </Link>
        <div className="px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">
          Admin Mode
        </div>
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