import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function MatchScorePage({ params }: { params: { id: string } }) {
  const matchId = Number(params.id);

  // 1. Fetch the match details
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));

  const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId!));
  const [awayTeam] = await db.select().from(teams).where(eq(teams.id, match.awayTeamId!));

  // 2. Server Action to save the score
  async function updateScore(formData: FormData) {
    "use server";
    const homeScore = Number(formData.get("homeScore"));
    const awayScore = Number(formData.get("awayScore"));

    await db.update(matches)
      .set({
        homeTeamScoreTotal: homeScore,
        awayTeamScoreTotal: awayScore,
        status: "completed", // This triggers the League Table update!
      })
      .where(eq(matches.id, matchId));

    revalidatePath("/admin/matches");
    revalidatePath("/standings");
    redirect("/admin/matches");
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Enter Match Result</h1>
      
      <form action={updateScore} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center w-1/3">
            <div className="font-bold text-slate-900 mb-2">{homeTeam.name}</div>
            <input 
              name="homeScore" 
              type="number" 
              className="w-20 text-center text-3xl font-black p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              defaultValue={match.homeTeamScoreTotal || 0}
            />
          </div>

          <div className="text-slate-400 font-black text-xl italic">VS</div>

          <div className="text-center w-1/3">
            <div className="font-bold text-slate-900 mb-2">{awayTeam.name}</div>
            <input 
              name="awayScore" 
              type="number" 
              className="w-20 text-center text-3xl font-black p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
              defaultValue={match.awayTeamScoreTotal || 0}
            />
          </div>
        </div>

        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 transition-colors">
          Complete Match & Update Standings
        </button>
      </form>
    </div>
  );
}