import { db } from "@/db";
import { matches, teams, players as playersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import RackEntrySystem from "./rack-entry-system"; // We will create this client component next

export default async function MatchScorePage({ params }: { params: { id: string } }) {
  const matchId = Number(params.id);

  // 1. Fetch match and associated teams
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));

  if (!match) return <div className="p-10 text-center">Match not found.</div>;

  const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId!));
  const [awayTeam] = await db.select().from(teams).where(eq(teams.id, match.awayTeamId!));

  // 2. Fetch rosters for both teams to populate player selects
  const homeRoster = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, homeTeam.id));

  const awayRoster = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.teamId, awayTeam.id));

  // 3. Server Action to save the final rack data and update totals
  async function saveMatchResult(formData: FormData) {
    "use server";
    
    // In a real implementation, you would parse the rack-by-rack JSON here
    // For now, we update the totals to keep the Standing Page working
    const homeTotal = Number(formData.get("homeTotalScore"));
    const awayTotal = Number(formData.get("awayTotalScore"));

    await db.update(matches)
      .set({
        homeTeamScoreTotal: homeTotal,
        awayTeamScoreTotal: awayTotal,
        status: "completed",
      })
      .where(eq(matches.id, matchId));

    revalidatePath("/admin/matches");
    revalidatePath("/standings");
    redirect("/admin/matches");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/matches" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
          ← Back to Schedule
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div className="text-center w-1/3">
            <h2 className="text-xl font-black uppercase tracking-tight">{homeTeam.name}</h2>
            <p className="text-slate-400 text-xs mt-1">HOME TEAM</p>
          </div>
          
          <div className="text-slate-500 font-black italic text-2xl">VS</div>

          <div className="text-center w-1/3">
            <h2 className="text-xl font-black uppercase tracking-tight">{awayTeam.name}</h2>
            <p className="text-slate-400 text-xs mt-1">AWAY TEAM</p>
          </div>
        </div>

        {/* Rack-by-Rack Entry System (Client Side) */}
        <div className="p-8">
          <RackEntrySystem 
            homePlayers={homeRoster} 
            awayPlayers={awayRoster} 
            onSave={saveMatchResult}
          />
        </div>
      </div>
    </div>
  );
}