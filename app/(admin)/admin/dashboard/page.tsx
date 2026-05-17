import { db } from "@/src/db";
import { divisions, teams, players, matches } from "@/src/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ShieldAlert, Plus, Users, Shield, Calendar, ArrowRight, Trophy, Zap } from "lucide-react";

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
  // SERVER ACTIONS FOR IMMEDIATE DATA CREATION
  // =========================================================================
  
  // A. Action: Create a New Team Squad
  async function createTeamAction(formData: FormData) {
    "use server";
    const name = formData.get("teamName") as string;
    const divisionId = formData.get("divisionId") ? Number(formData.get("divisionId")) : null;

    if (!name || name.trim() === "" || !divisionId) return;

    await db.insert(teams).values({
      name: name.trim(),
      divisionId,
      points: 0, // Starts fresh at the bottom of the ladder
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/teams");
    revalidatePath("/standings");
  }

  // B. Action: Register a New Player Profile
  async function createPlayerAction(formData: FormData) {
    "use server";
    const name = formData.get("playerName") as string;
    const teamId = formData.get("teamId") ? Number(formData.get("teamId")) : null;

    if (!name || name.trim() === "") return;

    await db.insert(players).values({
      name: name.trim(),
      teamId, // Can be null if registering an unassigned free agent
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/players");
  }

  // C. Action: Schedule a New Match Fixture
  async function createMatchAction(formData: FormData) {
    "use server";
    const homeTeamId = formData.get("homeTeamId") ? Number(formData.get("homeTeamId")) : null;
    const awayTeamId = formData.get("awayTeamId") ? Number(formData.get("awayTeamId")) : null;
    const matchDateStr = formData.get("matchDate") as string;

    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || !matchDateStr) return;

    await db.insert(matches).values({
      homeTeamId,
      awayTeamId,
      matchDate: new Date(matchDateStr),
      status: "scheduled",
      homeTeamScoreTotal: 0,
      awayTeamScoreTotal: 0,
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/matches");
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-10 antialiased text-slate-800">
      
      {/* 1. MANAGEMENT JUMBOTRON HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">LEAGUE OPERATIONS CENTRAL</span>
          <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic">
            Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-indigo-600">Workspace</span>
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Direct database insertion pipelines for teams, players, and match fixtures.</p>
        </div>

        <Link 
          href="/admin/matches" 
          className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-2xl transition-all shadow-xl"
        >
          Open Scorecard Manager <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* 2. SUMMARY METRICS COMPONENT TABS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Divisions Live", value: divisionCount.value, icon: Trophy, color: "text-amber-500 bg-amber-50" },
          { label: "Registered Squads", value: teamCount.value, icon: Shield, color: "text-blue-500 bg-blue-50" },
          { label: "Active Competitors", value: playerCount.value, icon: Users, color: "text-purple-500 bg-purple-50" },
          { label: "Match Records", value: matchCount.value, icon: Calendar, color: "text-emerald-500 bg-emerald-50" },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">{card.label}</span>
                <span className="text-2xl font-black text-slate-950 tabular-nums">{card.value}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. CORE MANAGEMENT CREATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL A: TEAM CREATION FACTORY */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Shield className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Establish Club Squad</h3>
            </div>
            
            <form action={createTeamAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Team Name</label>
                <input
                  type="text"
                  name="teamName"
                  placeholder="e.g. Crucible Club"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">League Division Tier</label>
                <select
                  name="divisionId"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Target Division...</option>
                  {allDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-4 rounded-xl transition-all shadow-md shadow-blue-100">
                <Plus className="w-4 h-4" /> Deploy New Team
              </button>
            </form>
          </div>
        </div>

        {/* PANEL B: PLAYER ROSTER ENROLLMENT */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Users className="w-4 h-4 text-purple-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Register Competitor</h3>
            </div>
            
            <form action={createPlayerAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Full Player Name</label>
                <input
                  type="text"
                  name="playerName"
                  placeholder="e.g. Mark Selby"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Club Assignment</label>
                <select
                  name="teamId"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Leave as Free Agent...</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-4 rounded-xl transition-all shadow-md shadow-purple-100">
                <Plus className="w-4 h-4" /> Enroll New Player
              </button>
            </form>
          </div>
        </div>

        {/* PANEL C: FIXTURE SCHEDULING DISPATCH */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Generate Match Fixture</h3>
            </div>
            
            <form action={createMatchAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Home Club Squad</label>
                <select
                  name="homeTeamId"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Home Side...</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Away Club Squad</label>
                <select
                  name="awayTeamId"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Away Side...</option>
                  {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Scheduled Event Date</label>
                <input
                  type="date"
                  name="matchDate"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs text-slate-800 uppercase outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button type="submit" className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] py-3.5 px-4 rounded-xl transition-all shadow-md shadow-emerald-100">
                <Plus className="w-4 h-4" /> Open Match Fixture
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}