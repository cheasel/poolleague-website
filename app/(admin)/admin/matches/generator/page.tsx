import { db } from "@/src/db";
import { teams, divisions, matches } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MatchScheduleGeneratorPage() {
  // 1. Fetch divisions so the admin can choose which league tier bracket to schedule
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));

  // --- ROUND-ROBIN GENERATOR SERVER ACTION ---
  async function generateLeagueSchedule(formData: FormData) {
    "use server";

    const divisionId = Number(formData.get("divisionId"));
    const startDateStr = formData.get("startDate") as string;
    const matchesPerWeek = Number(formData.get("matchesPerWeek") || 1);

    if (!divisionId || !startDateStr) return;

    // 1. Pull all teams assigned to this specific division bracket
    const divisionTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.divisionId, divisionId));

    if (divisionTeams.length < 2) return;

    // 2. Prepare teams array for the Circle Method Algorithm
    // If odd, push a dummy team representing a 'BYE' week
    const list = [...divisionTeams];
    if (list.length % 2 !== 0) {
      list.push({ id: -1, name: "BYE" }); 
    }

    const numTeams = list.length;
    const roundsCount = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    const generatedFixtures: Array<{
      homeTeamId: number;
      awayTeamId: number;
      date: Date;
    }> = [];

    let currentMatchDate = new Date(startDateStr);

    // 3. Circle Rotation Round-Robin Algorithm Execution
    for (let round = 0; round < roundsCount; round++) {
      for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
        const homeIdx = (round + matchIdx) % (numTeams - 1);
        let awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

        // The last element stays locked in position while others rotate around it
        if (matchIdx === 0) {
          awayIdx = numTeams - 1;
        }

        const homeTeam = list[homeIdx];
        const awayTeam = list[awayIdx];

        // Skip fixtures involving the dummy BYE team
        if (homeTeam.id === -1 || awayTeam.id === -1) continue;

        // Alternate home/away advantages each round to maintain balance
        const finalHome = round % 2 === 0 ? homeTeam.id : awayTeam.id;
        const finalAway = round % 2 === 0 ? awayTeam.id : homeTeam.id;

        generatedFixtures.push({
          homeTeamId: finalHome,
          awayTeamId: finalAway,
          date: new Date(currentMatchDate),
        });
      }

      // Step forward by exactly 7 days for the next set of league games
      currentMatchDate.setDate(currentMatchDate.getDate() + 7);
    }

    // 4. FIXED: Explicitly map the divisionId and cast the status literal enum
    if (generatedFixtures.length > 0) {
        await db.insert(matches).values(
          generatedFixtures.map((fix) => ({
            homeTeamId: fix.homeTeamId,
            awayTeamId: fix.awayTeamId,
            divisionId: divisionId, // <-- ADDED: Bind match rows to their selected division bracket
            matchDate: fix.date,
            status: "scheduled" as const, // <-- FIXED: Cast to exact literal const type so it's not a generic string
            homeTeamScoreTotal: 0,
            awayTeamScoreTotal: 0,
          }))
        );
      }

    // Clear caches and redirect cleanly back to the dashboard index view
    revalidatePath("/admin/matches");
    redirect(`/admin/matches?division=${divisionId}`);
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <header>
        <Link href="/admin/matches" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
          <ArrowLeft className="w-4 h-4" /> Cancel and Back to Fixtures
        </Link>
      </header>

      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full blur-3xl -z-10" />
        
        <div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <Sparkles className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Schedule Engine</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Generate a full round-robin tournament calendar. The algorithm perfectly balances home/away rotations and handles odd-numbered splits automatically.
          </p>
        </div>

        {/* Warning Callout Card */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold uppercase tracking-wide space-y-1">
            <p className="font-black">Operational Notice</p>
            <p className="text-amber-700 normal-case font-medium">
              Executing this schedule generation inserts all match rows immediately. It will not delete or overwrite any existing match fixtures already logged in the system.
            </p>
          </div>
        </div>

        {/* Configurations Setup Form Panel */}
        <form action={generateLeagueSchedule} className="space-y-5 pt-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Target League Division</label>
            <select 
              name="divisionId" 
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-xs uppercase tracking-wider appearance-none"
            >
              <option value="">Select Division to Balance...</option>
              {allDivisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Season Opening Date (Week 1)</label>
            <input 
              type="date"
              name="startDate"
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs text-slate-700"
            />
          </div>

          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs p-4 rounded-2xl transition-all shadow-md mt-4">
            Execute Matrix Generation
          </button>
        </form>
      </section>
    </div>
  );
}