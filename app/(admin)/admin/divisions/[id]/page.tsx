import { db } from "@/src/db";
import { divisions, seasons, teams, teamRegistrations } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, FolderTree, Calendar, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditDivisionPage({ params }: PageProps) {
  const { id } = await params;
  const divisionId = Number(id);

  // 1. Fetch the target division data
  const [division] = await db.select().from(divisions).where(eq(divisions.id, divisionId));

  if (!division) {
    return <div className="p-20 text-center font-black text-zinc-500 uppercase">Division not found.</div>;
  }

  // 2. Fetch all seasons for the Season Selector
  const allSeasons = await db.select().from(seasons).orderBy(asc(seasons.name));

  // 3. Fetch teams assigned to THIS division currently via registrations
  const divisionTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      logoUrl: teams.logoUrl,
    })
    .from(teamRegistrations)
    .innerJoin(teams, eq(teamRegistrations.teamId, teams.id))
    .where(eq(teamRegistrations.divisionId, divisionId))
    .orderBy(asc(teams.name));

  // --- MUTATION: UPDATE DIVISION SETTINGS ---
  async function updateDivision(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const tier = Number(formData.get("tier"));
    const seasonIdVal = formData.get("seasonId");
    const seasonId = seasonIdVal ? Number(seasonIdVal) : null;

    await db.update(divisions)
      .set({ 
        name, 
        tier, 
        seasonId: seasonId || null 
      })
      .where(eq(divisions.id, divisionId));

    revalidatePath("/admin/divisions");
    revalidatePath("/standings");
    redirect("/admin/divisions");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-24 px-4 text-slate-100">
      
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between">
        <Link href="/admin/divisions" className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" /> Back to Division Tiers
        </Link>
        <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Tier Matrix ID: <span className="text-indigo-400 font-mono">#{divisionId}</span>
        </div>
      </header>

      {/* BLOCK A: CORE DIVISION CONFIGURATION */}
      <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="h-1.5 w-full bg-gradient-to-r from-zinc-800 via-indigo-600 to-indigo-500"></div>

        <div className="p-6 md:p-10">
          <div className="flex items-center gap-4.5 pb-6 mb-8 border-b border-zinc-800/60">
            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Configure Bracket</h1>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1.5">Mange structure properties and calendar season ties</p>
            </div>
          </div>

          <form action={updateDivision} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Division Bracket Name</label>
              <input 
                type="text" 
                name="name" 
                defaultValue={division.name} 
                required 
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl outline-none font-bold text-white text-sm" 
              />
            </div>

            {/* Tier Level Input */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Rank Ranking Tier (1 = Premier, 2 = Secondary)</label>
              <input 
                type="number" 
                name="tier" 
                defaultValue={division.tier} 
                required 
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl outline-none font-bold text-white text-sm" 
              />
            </div>

            {/* SEASON SELECTOR DROPDOWN */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 ml-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assigned Season Timeline</label>
              </div>
              <div className="relative">
                <select 
                  name="seasonId" 
                  defaultValue={division.seasonId || ""}
                  className="w-full p-4 bg-zinc-950 border border-zinc-800/80 focus:border-indigo-500 rounded-xl outline-none font-bold text-white appearance-none text-sm pr-10 cursor-pointer"
                >
                  <option value="">No Active Season Link</option>
                  {allSeasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isActive ? "— [ CURRENT ACTIVE ]" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2.5 transition-all">
                <Save className="w-4 h-4 stroke-[2.5]" /> Commit Bracket Settings
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* READ-ONLY SQUAD ROSTER SECTION */}
      <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800/80 shadow-2xl overflow-hidden p-6 md:p-10">
        <div className="mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" /> Division Membership Pool
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium mt-1">Clubs currently registered within this ranking tier framework.</p>
        </div>

        {/* Active Teams Display Container */}
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 mb-3">
            Currently Docked Squads ({divisionTeams.length})
          </div>
          
          {divisionTeams.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {divisionTeams.map(t => (
                <div key={t.id} className="p-4 bg-zinc-950 border border-zinc-800/60 rounded-xl flex items-center justify-between shadow-inner">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">{t.name}</span>
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded">
                    Ranked
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xs font-bold text-zinc-600 uppercase border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              No clubs assigned to this division tier yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}