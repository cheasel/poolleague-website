import { db } from "@/src/db";
import { seasons } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { History, Plus, CalendarDays, Trash2, ToggleLeft } from "lucide-react";

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

    if (!name || name.trim() === "" || !startStr || !endStr) return;

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    // 🛡️ GUARD: Ensure chronological timeline integrity
    if (endDate <= startDate) {
      console.warn("⚠️ Aborted creation: Closing Standings Date must occur after the Opening Fixture Date.");
      return;
    }

    await db.insert(seasons).values({
      name: name.trim(),
      startDate,
      endDate,
      isActive: false,
    });

    revalidatePath("/admin/seasons");
    revalidatePath("/admin/dashboard");
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
    revalidatePath("/admin/dashboard");
  }

  // =========================================================================
  // SERVER ACTION: DELETE A SEASON
  // =========================================================================
  async function deleteSeasonAction(formData: FormData) {
    "use server";
    const seasonIdStr = formData.get("seasonId") as string;
    if (!seasonIdStr) return;

    await db.delete(seasons).where(eq(seasons.id, Number(seasonIdStr)));

    revalidatePath("/admin/seasons");
    revalidatePath("/admin/dashboard");
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* HEADER ROW */}
      <header className="border-b border-slate-200/60 pb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">
          Infrastructure Engine
        </span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Season <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-indigo-600">Ledger</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-0.5">
          Establish operational timelines, toggle active competitive splits, and manage historical ledgers.
        </p>
      </header>

      {/* CORE GRID ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: SEASONS LIST */}
        <div className="lg:col-span-7 space-y-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block px-1">
            Historical & Current Timelines ({allSeasons.length})
          </span>

          {allSeasons.map((season) => {
            const currentIsActive = season.isActive === true;
            
            // ⚡ FIXED: Safe parsing fallbacks to eliminate "Date | null" compiler type alerts
            const displayStart = season.startDate ? new Date(season.startDate).toLocaleDateString() : "TBD";
            const displayEnd = season.endDate ? new Date(season.endDate).toLocaleDateString() : "TBD";
            
            return (
              <div 
                key={season.id} 
                className={`bg-white border p-5 rounded-2xl shadow-sm flex items-center justify-between group transition-all ${
                  currentIsActive ? "border-red-500 ring-1 ring-red-500/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                    currentIsActive 
                      ? "bg-red-600 text-white border-red-700" 
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}>
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-950 text-sm tracking-tight">
                        {season.name}
                      </h3>
                      {currentIsActive && (
                        <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                          Live Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 tabular-nums">
                      {displayStart} — {displayEnd}
                    </p>
                  </div>
                </div>

                {/* INLINE ACTION TOGGLES AND FORMS */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {!currentIsActive && (
                    <form action={activateSeasonAction}>
                      <input type="hidden" name="seasonId" value={season.id} />
                      <button
                        type="submit"
                        title="Set Season as Active"
                        className="w-9 h-9 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all outline-none"
                      >
                        <ToggleLeft className="w-5 h-5" />
                      </button>
                    </form>
                  )}

                  <form action={deleteSeasonAction}>
                    <input type="hidden" name="seasonId" value={season.id} />
                    <button
                      type="submit"
                      title={`Drop ${season.name}`}
                      className="w-9 h-9 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center border border-transparent hover:border-red-200/60 transition-all outline-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}

          {allSeasons.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
              No tournament seasons declared inside the system yet.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INITIALIZE SEASON FACTORY */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm sticky top-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
            <History className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Initialize New Season</h3>
          </div>

          <form action={createSeasonAction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Season Identifier Name</label>
              <input
                type="text"
                name="seasonName"
                placeholder="e.g. Winter Split 2026"
                required
                className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs uppercase text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Opening Fixture Launch Date</label>
              <input
                type="date"
                name="startDate"
                required
                className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs text-slate-800 uppercase outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Closing Standings Lock Date</label>
              <input
                type="date"
                name="endDate"
                required
                className="w-full p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl font-bold text-xs text-slate-800 uppercase outline-none focus:bg-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-md shadow-red-100"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Launch Season Block
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}