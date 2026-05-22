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

    if (!divisionId || !startDateStr) return;

    // 1. Pull all teams assigned to this specific division bracket
    const divisionTeams = await db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.divisionId, divisionId));

    if (divisionTeams.length < 2) return;

    // 2. Prepare teams array for the Circle Method Algorithm
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

    // Base calendar anchor timestamp
    const baseTimelineMs = new Date(startDateStr).getTime();

    // 3. Circle Rotation Round-Robin Algorithm Execution
    for (let round = 0; round < roundsCount; round++) {
      // Calculate isolated date for this round safely without reference leaks
      // Adds exactly (round * 7) days worth of milliseconds to the anchor date
      const roundDate = new Date(baseTimelineMs + round * 7 * 24 * 60 * 60 * 1000);

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
          date: roundDate,
        });
      }
    }

    // 4. Plant fixtures into your database schema using explicit property keys
    if (generatedFixtures.length > 0) {
      await db.insert(matches).values(
        generatedFixtures.map((fix) => ({
          homeTeamId: fix.homeTeamId,
          awayTeamId: fix.awayTeamId,
          divisionId: divisionId, 
          date: fix.date, // 🎯 FIXED: Key aligned to matches.date schema
          status: "scheduled" as const, // 🎯 FIXED: Strict enum casting
          homeScore: 0, // 🎯 FIXED: Key aligned to matches.homeScore schema
          awayScore: 0, // 🎯 FIXED: Key aligned to matches.awayScore schema
        }))
      );
    }

    // Clear caches and redirect cleanly back to the division dashboard
    revalidatePath("/admin/matches");
    redirect(`/admin/matches?division=${divisionId}`);
  }

  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-16 px-4 pt-4 text-slate-200">
      <header>
        <Link href="/admin/matches" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
          <ArrowLeft className="w-4 h-4" /> Cancel and Back to Fixtures
        </Link>
      </header>

      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 space-y-8 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 mb-6 shadow-inner">
            <Sparkles className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Schedule <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Engine</span></h1>
          <p className="text-slate-500 font-medium text-xs mt-2 max-w-xl leading-relaxed">
            Generate a full round-robin tournament calendar. The algorithm perfectly balances home/away rotations and handles odd-numbered splits automatically.
          </p>
        </div>

        {/* Warning Callout Card */}
        <div className="p-5 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex gap-4 text-amber-500 relative z-10 shadow-inner">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 opacity-80" />
          <div className="text-[10px] font-black uppercase tracking-widest space-y-1.5">
            <p className="text-amber-400">Operational Notice</p>
            <p className="text-amber-500/60 normal-case font-bold leading-relaxed">
              Executing this schedule generation inserts all match rows immediately into the production ledger. It will not overwrite any existing match fixtures already logged in the system.
            </p>
          </div>
        </div>

        {/* Configurations Setup Form Panel */}
        <form action={generateLeagueSchedule} className="space-y-6 pt-4 relative z-10">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Target League Division</label>
            <select 
              name="divisionId" 
              required
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase tracking-[0.1em] appearance-none transition-all shadow-inner"
            >
              <option value="">Select Division to Balance...</option>
              {allDivisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Season Opening Date (Week 1)</label>
            <input 
              type="date"
              name="startDate"
              required
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase tracking-widest transition-all shadow-inner"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[10px] p-5 rounded-[1.5rem] transition-all shadow-lg shadow-indigo-900/20 mt-6 active:scale-[0.98]">
            Execute Matrix Generation
          </button>
        </form>
      </section>
    </div>
  );
}