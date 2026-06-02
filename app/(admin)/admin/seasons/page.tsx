import { db } from "@/src/db";
import { seasons, divisions, teamRegistrations, teamMemberships, matches } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { History, Plus, Calendar, Trash2, ToggleLeft,Edit2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  // 1. Fetch all seasons, sorting the newest ones to the top
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));

  // =========================================================================
  // SERVER ACTION: INITIALIZE A NEW SEASON WITH TIMELINE GUARDS
  // =========================================================================
  async function createSeasonAction(formData: FormData) {
    "use server";
    const name = formData.get("seasonName") as string;
    const startStr = formData.get("startDate") as string;
    const endStr = formData.get("endDate") as string;
    const clonePrevious = formData.get("clonePrevious") === "true";

    if (!name || name.trim() === "" || !startStr) return;

    const startDate = new Date(startStr);
    let endDate: Date | null = null;
    if (endStr && endStr.trim() !== "") {
      endDate = new Date(endStr);
      // 🛡️ GUARD: Ensure chronological timeline integrity
      if (endDate <= startDate) {
        console.warn("⚠️ Aborted creation: Closing Standings Date must occur after the Opening Fixture Date.");
        return;
      }
    }

    await db.transaction(async (tx) => {
      // 1. Fetch latest season before inserting new one
      const [latestSeason] = await tx
        .select()
        .from(seasons)
        .orderBy(desc(seasons.startDate), desc(seasons.id))
        .limit(1);

      // 2. Insert new season
      const [newSeason] = await tx
        .insert(seasons)
        .values({
          name: name.trim(),
          startDate,
          endDate,
          isActive: false,
        })
        .returning();

      // 3. Clone if requested
      if (clonePrevious && latestSeason && newSeason) {
        // Fetch divisions from latest season
        const oldDivisions = await tx
          .select()
          .from(divisions)
          .where(eq(divisions.seasonId, latestSeason.id));

        for (const oldDiv of oldDivisions) {
          // Insert matching division for new season
          const [newDiv] = await tx
            .insert(divisions)
            .values({
              name: oldDiv.name,
              tier: oldDiv.tier,
              seasonId: newSeason.id,
            })
            .returning();

          if (newDiv) {
            // Fetch team registrations from old division
            const oldRegs = await tx
              .select()
              .from(teamRegistrations)
              .where(eq(teamRegistrations.divisionId, oldDiv.id));

            if (oldRegs.length > 0) {
              await tx.insert(teamRegistrations).values(
                oldRegs.map((reg) => ({
                  teamId: reg.teamId,
                  seasonId: newSeason.id,
                  divisionId: newDiv.id,
                }))
              );
            }
          }
        }
      }
    });

    revalidatePath("/admin/seasons");
    revalidatePath("/admin");
  }

  // =========================================================================
  // SERVER ACTION: TOGGLE ACTIVE STATUS
  // =========================================================================
  async function activateSeasonAction(formData: FormData) {
    "use server";
    const seasonIdStr = formData.get("seasonId") as string;
    if (!seasonIdStr) return;
    const seasonId = Number(seasonIdStr);

    await db.update(seasons).set({ isActive: false });
    await db.update(seasons).set({ isActive: true }).where(eq(seasons.id, seasonId));

    revalidatePath("/admin/seasons");
    revalidatePath("/admin");
  }

  // =========================================================================
  // SERVER ACTION: DELETE A SEASON
  // =========================================================================
  async function deleteSeasonAction(formData: FormData) {
    "use server";
    const seasonIdStr = formData.get("seasonId") as string;
    if (!seasonIdStr) return;
    const seasonId = Number(seasonIdStr);

    await db.transaction(async (tx) => {
      await tx.delete(teamMemberships).where(eq(teamMemberships.seasonId, seasonId));
      await tx.delete(teamRegistrations).where(eq(teamRegistrations.seasonId, seasonId));
      await tx.delete(matches).where(eq(matches.seasonId, seasonId));
      await tx.delete(divisions).where(eq(divisions.seasonId, seasonId));
      await tx.delete(seasons).where(eq(seasons.id, seasonId));
    });

    revalidatePath("/admin/seasons");
    revalidatePath("/admin");
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto text-slate-200">
      
      {/* HEADER ROW */}
      <header className="border-b border-slate-900 pb-8">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">
          Infrastructure Engine
        </span>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
          Season <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-500">Ledger</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-1">
          Establish operational timelines, toggle active competitive splits, and manage historical ledgers.
        </p>
      </header>

      {/* CORE GRID ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: SEASONS LIST */}
        <div className="lg:col-span-7 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block px-1">
            Historical & Current Timelines ({allSeasons.length})
          </span>

          {allSeasons.map((season) => (
            <div 
              key={season.id} 
              className="flex items-center justify-between p-5 bg-zinc-900/40 backdrop-blur-md border border-zinc-850 rounded-2xl hover:border-zinc-800 transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 transition-colors shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">
                      {season.name}
                    </h3>
                    {season.isActive && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest animate-pulse">
                        Live
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mt-0.5">
                    {season.startDate ? new Date(season.startDate).toLocaleDateString() : "TBD"} — {season.endDate ? new Date(season.endDate).toLocaleDateString() : "TBD"}
                  </span>
                </div>
              </div>

              {/* 🎯 SEASON EDIT LINK BUTTON */}
              <Link
                href={`/admin/seasons/${season.id}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white transition-all shadow-sm shrink-0"
              >
                <Edit2 className="w-3 h-3 text-indigo-400" />
                <span>Edit Timeline</span>
              </Link>
            </div>
          ))}

          {allSeasons.length === 0 && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl py-12 text-center text-slate-700 font-black text-xs uppercase tracking-[0.2em] italic">
              No tournament seasons declared inside the system yet.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INITIALIZE SEASON FACTORY */}
        <div className="lg:col-span-5 bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl sticky top-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-6">
            <History className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Initialize New Season</h3>
          </div>

          <form action={createSeasonAction} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Season Identifier Name</label>
              <input
                type="text"
                name="seasonName"
                placeholder="e.g. Winter Split 2026"
                required
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-rose-500 transition-all shadow-inner placeholder:text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Opening Fixture Launch Date</label>
              <input
                type="date"
                name="startDate"
                required
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-rose-500 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Closing Standings Lock Date (Optional)</label>
              <input
                type="date"
                name="endDate"
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-rose-500 transition-all shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Clone Divisions & Teams</label>
              <div className="relative">
                <select
                  name="clonePrevious"
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl outline-none font-bold text-white text-xs appearance-none pr-10 cursor-pointer"
                >
                  <option value="true">Clone divisions & teams from latest season</option>
                  <option value="false">Start fresh (Empty Season)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-rose-900/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Launch Season Block
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}