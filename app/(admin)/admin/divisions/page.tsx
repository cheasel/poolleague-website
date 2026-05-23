import { db } from "@/src/db";
import { divisions, teams } from "@/src/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Trophy, Plus, FolderTree, Shield, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";

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

          {allDivisions.map((division) => (
            <div 
              key={division.id} 
              className="flex items-center justify-between p-5 bg-zinc-900/40 backdrop-blur-md border border-zinc-850 rounded-2xl hover:border-zinc-800 transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 transition-colors shrink-0">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">
                    {division.name}
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mt-0.5">
                    Tier {division.tier} • {division.seasonId || "No Linked Season"}
                  </span>
                </div>
              </div>

              {/* 🎯 EDIT LINK BUTTON */}
              <Link
                href={`/admin/divisions/${division.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all shadow-sm shrink-0"
              >
                <Edit2 className="w-3 h-3 text-indigo-400" />
                <span>Configure Tier</span>
              </Link>
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