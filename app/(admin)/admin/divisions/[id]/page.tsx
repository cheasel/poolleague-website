import { db } from "@/src/db";
import { divisions, teams, players } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Shield, Users, Plus, Trash2, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

// FIXED: Define strict Promise-based PageProps structure to clear Next.js 15 compilation constraints
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminDivisionDetailPage({ params }: PageProps) {
  // 1. Await the params Promise container before extracting variables
  const { id } = await params;
  const divisionId = Number(id);

  // 2. Fetch target division row metadata parameters
  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId));

  if (!division) {
    return (
      <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 italic text-xs">
        Target league division division bracket not found.
      </div>
    );
  }

  // 3. Fetch all team squads registered within this specific tier bracket
  const divisionTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.divisionId, divisionId))
    .orderBy(asc(teams.name));

  // --- SERVER ACTIONS FOR IN-LINE MANAGEMENT DATA MUTATIONS ---
  async function createTeamSquad(formData: FormData) {
    "use server";
    const teamName = formData.get("teamName") as string;
    if (!teamName || teamName.trim() === "") return;

    await db.insert(teams).values({
      name: teamName,
      divisionId: divisionId,
      points: 0,
    });

    revalidatePath(`/admin/divisions/${divisionId}`);
    revalidatePath("/standings");
    revalidatePath("/");
  }

  async function deleteDivisionBracket() {
    "use server";
    
    // Safety check: Don't allow dropping a division if teams are still assigned to it
    if (divisionTeams.length > 0) return;

    await db.delete(divisions).where(eq(divisions.id, divisionId));
    
    revalidatePath("/admin/divisions");
    revalidatePath("/standings");
    revalidatePath("/");
    redirect("/admin/divisions");
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16 px-4 text-slate-200">
      
      {/* HEADER UTILS LINK BACKWARD */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/admin/divisions" 
          className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tiers Master Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest tabular-nums shadow-inner">
          Tier Rank: Level {division.tier || 1}
        </div>
      </header>

      {/* METADATA OVERVIEW JUMBOTRON SECTION CARD */}
      <section className="bg-slate-900/40 backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
            <Shield className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">{division.name}</h2>
            <p className="text-slate-500 font-medium text-xs mt-2">Manage squad rosters, add new clubs, or drop this league division tier framework.</p>
          </div>
        </div>

        {/* Conditional Destruction Delete Button */}
        <div className="relative z-10">
          {divisionTeams.length === 0 ? (
            <form action={deleteDivisionBracket}>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-rose-950/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-900/40 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg">
                <Trash2 className="w-4 h-4" /> Drop Division
              </button>
            </form>
          ) : (
            <div className="bg-slate-950 text-slate-600 border border-slate-900 px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest max-w-[200px] text-center select-none shadow-inner">
              Locked: Evict All Squads to Drop Tier
            </div>
          )}
        </div>
      </section>

      {/* GRID MATRIX COLUMN splits */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN PANEL: SQUAD ROSTER LEDGER REGISTRY (md:col-span-7) */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black uppercase tracking-tight text-white">Registered Club Squads ({divisionTeams.length})</h3>
          </div>

          <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-900 shadow-2xl overflow-hidden divide-y divide-slate-800/60">
            {divisionTeams.map((team) => (
              <div key={team.id} className="p-6 px-8 flex items-center justify-between hover:bg-slate-900/40 transition-colors group">
                <div className="font-black uppercase tracking-tight text-white text-base group-hover:text-indigo-400 transition-colors">
                  {team.name}
                </div>
                
                <Link
                  href={`/admin/teams/${team.id}`} 
                  className="inline-flex items-center gap-2 opacity-0 group-hover:opacity-100 text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-all hover:text-indigo-300"
                >
                  Roster Profile <LayoutDashboard className="w-4 h-4" />
                </Link>
              </div>
            ))}

            {divisionTeams.length === 0 && (
              <div className="p-20 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 italic">
                No squad clubs registered inside this division bracket ledger yet.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN PANEL: CREATE QUICK TEAM SQUAD FORM (md:col-span-5) */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black uppercase tracking-tight text-white">Add New Team Club</h3>
          </div>

          <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-900 shadow-2xl space-y-4 group hover:border-slate-800 transition-all">
            <form action={createTeamSquad} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1 block">Club Title Designation</label>
                <input
                  type="text"
                  name="teamName"
                  placeholder="E.g., RACK EM UP CUE CLUB..."
                  required
                  className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase placeholder:text-slate-800 tracking-wide transition-all shadow-inner"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] p-4 rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Register Squad
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}