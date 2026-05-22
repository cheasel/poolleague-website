import { db } from "@/src/db";
import { divisions, teams, players, matches } from "@/src/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ShieldAlert, Plus, Users, Shield, Calendar, ArrowRight, Trophy, Zap, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // 1. Fetch High-Level Aggregation Metrics for Summary Badges
  const [divisionCount] = await db.select({ value: count() }).from(divisions);
  const [teamCount] = await db.select({ value: count() }).from(teams);
  const [playerCount] = await db.select({ value: count() }).from(players);
  const [matchCount] = await db.select({ value: count() }).from(matches);

  // 2. Fetch Selection Contexts for Form Dropdowns
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

  // =========================================================================
  // SERVER ACTION: AUTO-GENERATE BALANCED ROUND-ROBIN FIXTURES
  // =========================================================================
  async function generateRoundRobinAction(formData: FormData) {
    "use server";
    const divisionIdStr = formData.get("divisionId") as string;
    if (!divisionIdStr) return;
    const divisionId = Number(divisionIdStr);

    // 1. Fetch all teams currently assigned to this division tier
    const divisionTeams = await db.select().from(teams).where(eq(teams.divisionId, divisionId));
    if (divisionTeams.length < 2) return; // Need at least two teams to form a competitive schedule

    const list = [...divisionTeams];
    
    // Berger/Round-Robin Scheduling Algorithm Matrix Construction Loop
    // If the count is odd, add a dummy element to act as a "Bye-Week" indicator slot
    if (list.length % 2 !== 0) {
      // ✅ FIXED: Explicitly matching all required schema properties to pass the type check
      list.push({
        id: -1,
        name: "BYE",
        divisionId,
        points: 0,
        homeVenueId: null,
        setsWon: 0,
        setsLost: 0,
        createdAt: new Date(),
      }); 
    }

    const numTeams = list.length;
    const rounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;
    
    let baseDate = new Date(); // Start scheduling fixtures from today onwards

    // Generate balanced home/away iterations iteratively
    for (let round = 0; round < rounds; round++) {
      for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
        const homeIdx = (round + matchIdx) % (numTeams - 1);
        let awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

        if (matchIdx === 0) {
          awayIdx = numTeams - 1;
        }

        const homeTeam = list[homeIdx];
        const awayTeam = list[awayIdx];

        // Skip any matches involving our phantom Bye week placeholder
        if (homeTeam.id === -1 || awayTeam.id === -1) continue;

        // Space each fixture round exactly 7 days apart (Weekly match play cycle)
        const matchDay = new Date(baseDate);
        matchDay.setDate(baseDate.getDate() + round * 7);

        const seasonId = formData.get("seasonId") ? Number(formData.get("seasonId")) : null;
        const divisionId = formData.get("divisionId") ? Number(formData.get("divisionId")) : null;

        // Commit fixture directly to your database pipeline ledger
        await db.insert(matches).values({  
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          date: matchDay, 
          seasonId: seasonId,
          divisionId: divisionId,
        });
      }
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/matches");
  }

  // =========================================================================
  // CORE OPERATIONAL ACTION CREATIONS
  // =========================================================================
  async function createTeamAction(formData: FormData) {
    "use server";
    const name = formData.get("teamName") as string;
    const divisionId = formData.get("divisionId") ? Number(formData.get("divisionId")) : null;
    if (!name || name.trim() === "" || !divisionId) return;

    await db.insert(teams).values({ name: name.trim(), divisionId, points: 0 });
    revalidatePath("/admin/dashboard");
  }

  async function createPlayerAction(formData: FormData) {
    "use server";
    const name = formData.get("playerName") as string;
    const teamId = formData.get("teamId") ? Number(formData.get("teamId")) : null;
    if (!name || name.trim() === "") return;

    await db.insert(players).values({ name: name.trim(), teamId });
    revalidatePath("/admin/dashboard");
  }

  async function createMatchAction(formData: FormData) {
    "use server";
    const homeTeamId = formData.get("homeTeamId") ? Number(formData.get("homeTeamId")) : null;
    const awayTeamId = formData.get("awayTeamId") ? Number(formData.get("awayTeamId")) : null;
    const matchDateStr = formData.get("matchDate") as string;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || !matchDateStr) return;

    await db.insert(matches).values({
      homeTeamId: homeTeamId, // 🧠 Changed from homeTeam.id to just homeTeamId
      awayTeamId: awayTeamId,
      date: new Date(),
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/matches");
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-10 antialiased text-slate-200">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-slate-800 pb-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">LEAGUE OPERATIONS CENTRAL</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Workspace</span>
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Direct database insertion pipelines for teams, players, and match fixtures.</p>
        </div>

        {/* INJECTED: AUTO GENERATE SCHEDULING ACTION TRIGGER BAR */}
        <form action={generateRoundRobinAction} className="bg-slate-900/40 p-2 rounded-2xl border border-slate-800 flex items-center gap-2 w-full lg:w-auto shadow-xl">
          <select 
            name="divisionId" 
            required 
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-[10px] uppercase text-slate-300 outline-none min-w-[200px] hover:border-slate-700 transition-colors"
          >
            <option value="">Choose Target Division...</option>
            {allDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button 
            type="submit" 
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white/10" /> Auto-Generate Fixtures
          </button>
        </form>
      </header>

      {/* SUMMARY BADGES SECTION */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Divisions Live", value: divisionCount.value, icon: Trophy, color: "text-amber-400 bg-amber-950/30 border-amber-900/40" },
          { label: "Registered Squads", value: teamCount.value, icon: Shield, color: "text-indigo-400 bg-indigo-950/30 border-indigo-900/40" },
          { label: "Active Competitors", value: playerCount.value, icon: Users, color: "text-purple-400 bg-purple-950/30 border-purple-900/40" },
          { label: "Match Records", value: matchCount.value, icon: Calendar, color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/40" },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl group hover:border-slate-700 transition-all">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">{card.label}</span>
                <span className="text-2xl font-black text-white tabular-nums">{card.value}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 ${card.color}`}>
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
          );
        })}
      </section>

      {/* THREE-COLUMN CREATION FORMS MATRIX PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL A: TEAM SQUAD FACTORY */}
        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl flex flex-col justify-between group hover:border-slate-800 transition-all">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Establish Club Squad</h3>
            </div>
            
            <form action={createTeamAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Team Name</label>
                <input
                  type="text"
                  name="teamName"
                  placeholder="e.g. Crucible Club"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">League Division Tier</label>
                <select
                  name="divisionId"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                >
                  <option value="">Select Target Division...</option>
                  {allDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-indigo-900/20">
                <Plus className="w-4 h-4" /> Deploy New Team
              </button>
            </form>
          </div>
        </div>

        {/* PANEL B: PLAYER ROSTER ENROLLMENT */}
        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl flex flex-col justify-between group hover:border-slate-800 transition-all">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Register Competitor</h3>
            </div>
            
            <form action={createPlayerAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Full Player Name</label>
                <input
                  type="text"
                  name="playerName"
                  placeholder="e.g. Mark Selby"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-purple-500 transition-all shadow-inner placeholder:text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Club Assignment</label>
                <select
                  name="teamId"
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-purple-500 transition-all shadow-inner"
                >
                  <option value="">Leave as Free Agent...</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-purple-900/20">
                <Plus className="w-4 h-4" /> Enroll New Player
              </button>
            </form>
          </div>
        </div>

        {/* PANEL C: MANUAL FIXTURE SCHEDULING DISPATCH */}
        <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl flex flex-col justify-between group hover:border-slate-800 transition-all">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Generate Match Fixture</h3>
            </div>
            
            <form action={createMatchAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Home Club Squad</label>
                <select
                  name="homeTeamId"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                >
                  <option value="">Select Home Side...</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Away Club Squad</label>
                <select
                  name="awayTeamId"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                >
                  <option value="">Select Away Side...</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Scheduled Event Date</label>
                <input
                  type="date"
                  name="matchDate"
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-emerald-500 transition-all shadow-inner"
                />
              </div>

              <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
                <Plus className="w-4 h-4" /> Open Match Fixture
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}