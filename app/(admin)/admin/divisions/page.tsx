import { db } from "@/src/db";
import { divisions, teams } from "@/src/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Trophy, Plus, FolderTree, Shield, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDivisionsPage() {
  // 1. Fetch all divisions ranked by tier level
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));

  // 2. Fetch team allocations grouped by division to compile team counts on the server
  const divisionStats = await Promise.all(
    allDivisions.map(async (div) => {
      const [teamCounter] = await db
        .select({ value: count() })
        .from(teams)
        .where(eq(teams.divisionId, div.id));

      return {
        ...div,
        teamCount: teamCounter?.value || 0,
      };
    })
  );

  // =========================================================================
  // SERVER ACTION: CREATE DIVISION
  // =========================================================================
  async function createDivisionAction(formData: FormData) {
    "use server";
    const name = formData.get("divisionName") as string;
    const tierStr = formData.get("tierLevel") as string;

    if (!name || name.trim() === "" || !tierStr) return;

    await db.insert(divisions).values({
      name: name.trim(),
      tier: Number(tierStr),
    });

    revalidatePath("/admin/divisions");
    revalidatePath("/admin/dashboard");
  }

  // =========================================================================
  // SERVER ACTION: SECURE DELETE DIVISION WITH RELATIONAL GUARDS
  // =========================================================================
  async function deleteDivisionAction(formData: FormData) {
    "use server";
    const divisionIdStr = formData.get("divisionId") as string;
    if (!divisionIdStr) return;

    const divisionId = Number(divisionIdStr);

    // 🛡️ GUARD: Verify if any teams are actively bound to this division tier
    const assignedTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.divisionId, divisionId));

    if (assignedTeams.length > 0) {
      // In a production app, you can pass this back via an error state. 
      // For now, we cleanly abort the transaction to safeguard data integrity.
      console.warn(`⚠️ Aborted deletion: Division ID ${divisionId} contains active team relations.`);
      return;
    }

    // Safely delete if the division is empty
    await db.delete(divisions).where(eq(divisions.id, divisionId));

    revalidatePath("/admin/divisions");
    revalidatePath("/admin/dashboard");
    revalidatePath("/players");
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto text-slate-200">
      
      {/* HEADER ROW */}
      <header className="border-b border-slate-900 pb-8">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">
          Infrastructure Engine
        </span>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
          Division <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Tiers</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-1">
          Configure competitive matrix bounds, tier rankings, and modify structural assets instantly.
        </p>
      </header>

      {/* CORE GRID CONTROLLER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: ACTIVE DIVISIONS LIST */}
        <div className="lg:col-span-7 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block px-1">
            Active Structural Strata ({divisionStats.length})
          </span>

          {divisionStats.map((div) => (
            <div 
              key={div.id} 
              className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl shadow-xl flex items-center justify-between group hover:border-slate-800 transition-all"
            >
              <div className="flex items-center gap-5">
                <div className="w-11 h-11 rounded-xl bg-slate-950 text-white flex items-center justify-center text-xs font-black tracking-tight border border-slate-800 shadow-inner group-hover:border-indigo-500/30 transition-colors">
                  T{div.tier}
                </div>
                <div>
                  <h3 className="font-black text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors">
                    {div.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    <Shield className="w-3 h-3 text-slate-700" /> {div.teamCount} Squads Allocated
                  </p>
                </div>
              </div>

              {/* INJECTED: SECURE DELETE INLINE FORM CONTAINER */}
              <form action={deleteDivisionAction} className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <input type="hidden" name="divisionId" value={div.id} />
                <button
                  type="submit"
                  title={`Drop ${div.name}`}
                  className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 text-slate-600 hover:text-rose-500 hover:border-rose-900/40 transition-all outline-none"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </div>
          ))}

          {divisionStats.length === 0 && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl py-12 text-center text-slate-700 font-black text-xs uppercase tracking-[0.2em] italic">
              No division levels mapped inside the schema yet.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: QUICK GENERATION FACTORY */}
        <div className="lg:col-span-5 bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl sticky top-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
            <FolderTree className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Initialize New Tier</h3>
          </div>

          <form action={createDivisionAction} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Division Designation</label>
              <input
                type="text"
                name="divisionName"
                placeholder="e.g. Championship Division"
                required
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Tier Priority Level Weight</label>
              <input
                type="number"
                name="tierLevel"
                placeholder="e.g. 1"
                min="1"
                required
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-indigo-900/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Launch Division Layer
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}