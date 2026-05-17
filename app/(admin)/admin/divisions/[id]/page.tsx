import { db } from "@/src/db";
import { divisions, teams, players } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Shield, Users, Plus, Trash2, LayoutDashboard } from "lucide-react";

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
    <div className="space-y-10 max-w-5xl mx-auto pb-16 px-4">
      
      {/* HEADER UTILS LINK BACKWARD */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/admin/divisions" 
          className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tiers Master Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest tabular-nums">
          Tier Rank: Level {division.tier || 1}
        </div>
      </header>

      {/* METADATA OVERVIEW JUMBOTRON SECTION CARD */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
            <Shield className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">{division.name}</h2>
            <p className="text-slate-500 font-medium text-xs mt-0.5">Manage squad rosters, add new clubs, or drop this league division tier framework.</p>
          </div>
        </div>

        {/* Conditional Destruction Delete Button */}
        {divisionTeams.length === 0 ? (
          <form action={deleteDivisionBracket}>
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-100 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm">
              <Trash2 className="w-4 h-4" /> Drop Division
            </button>
          </form>
        ) : (
          <div className="bg-slate-50 text-slate-400 border border-slate-200/60 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider max-w-[180px] text-center select-none">
            Locked: Evict All Squads to Drop Tier
          </div>
        )}
      </section>

      {/* GRID MATRIX COLUMN splits */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN PANEL: SQUAD ROSTER LEDGER REGISTRY (md:col-span-7) */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Registered Club Squads ({divisionTeams.length})</h3>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {divisionTeams.map((team) => (
              <div key={team.id} className="p-5 flex items-center justify-between hover:bg-slate-50/40 transition-colors group">
                <div className="font-black uppercase tracking-tight text-slate-800 text-sm">
                  {team.name}
                </div>
                
                <Link
                  href={`/admin/teams/${team.id}`} // Forward link directly into the deeper individual team roster profile managers
                  className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest transition-all hover:text-indigo-800"
                >
                  Roster Profile <LayoutDashboard className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}

            {divisionTeams.length === 0 && (
              <div className="p-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                No squad clubs registered inside this division bracket ledger yet.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN PANEL: CREATE QUICK TEAM SQUAD FORM (md:col-span-5) */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Plus className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Add New Team Club</h3>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <form action={createTeamSquad} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 block">Club Title Designation</label>
                <input
                  type="text"
                  name="teamName"
                  placeholder="E.g., RACK EM UP CUE CLUB..."
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-xs uppercase placeholder:text-slate-300 tracking-wide"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] p-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
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