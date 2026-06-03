import { db } from "@/src/db";
import { divisions, teams, seasons, teamRegistrations } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Plus, FolderTree } from "lucide-react";
import DivisionsList from "./divisions-list";
import SeasonSelector from "@/components/SeasonSelector";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

export default async function AdminDivisionsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  // 1. Fetch active season to default to if no seasonId query param is active
  const [activeSeason] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true))
    .limit(1);

  // Fallback to the latest season if no active season is flagged
  const [latestSeason] = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.startDate))
    .limit(1);

  const defaultSeasonId = activeSeason?.id || latestSeason?.id || null;
  const selectedSeasonId = resolvedParams.seasonId ? Number(resolvedParams.seasonId) : defaultSeasonId;

  // 2. Fetch all divisions ranked by tier level with their season split and team relation metrics via registrations
  const allDivisionsRaw = await db.query.divisions.findMany({
    where: selectedSeasonId ? eq(divisions.seasonId, selectedSeasonId) : undefined,
    with: {
      season: true,
      teamRegistrations: {
        with: {
          team: true,
        }
      },
    },
    orderBy: asc(divisions.tier),
  });

  const allDivisions = allDivisionsRaw.map((d) => ({
    id: d.id,
    name: d.name,
    tier: d.tier,
    seasonId: d.seasonId,
    season: d.season,
    teams: d.teamRegistrations
      .map((r) => r.team)
      .filter((t): t is NonNullable<typeof t> => t !== null),
  }));

  // 3. Fetch all seasons for the Creation Dropdown selection options
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));

  // =========================================================================
  // SERVER ACTION: CREATE DIVISION
  // =========================================================================
  async function createDivisionAction(formData: FormData) {
    "use server";
    const name = formData.get("divisionName") as string;
    const tierStr = formData.get("tierLevel") as string;
    const seasonIdVal = formData.get("seasonId");
    const seasonId = seasonIdVal ? Number(seasonIdVal) : null;

    if (!name || name.trim() === "" || !tierStr) return;

    await db.insert(divisions).values({
      name: name.trim(),
      tier: Number(tierStr),
      seasonId: seasonId || null,
    });

    revalidatePath("/admin/divisions");
    revalidatePath("/admin");
  }

  // =========================================================================
  // SERVER ACTION: SECURE DELETE DIVISION WITH RELATIONAL GUARDS
  // =========================================================================
  async function deleteDivisionAction(formData: FormData) {
    "use server";
    const divisionIdStr = formData.get("divisionId") as string;
    if (!divisionIdStr) return;

    const divisionId = Number(divisionIdStr);

    // 🛡️ GUARD: Verify if any teams are actively registered to this division tier
    const assignedTeams = await db
      .select()
      .from(teamRegistrations)
      .where(eq(teamRegistrations.divisionId, divisionId));

    if (assignedTeams.length > 0) {
      console.warn(`⚠️ Aborted deletion: Division ID ${divisionId} contains active team relations.`);
      return;
    }

    await db.delete(divisions).where(eq(divisions.id, divisionId));

    revalidatePath("/admin/divisions");
    revalidatePath("/admin");
    revalidatePath("/players");
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto text-slate-200">
      
      {/* HEADER ROW */}
      <header className="border-b border-slate-900 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">
            Infrastructure Engine
          </span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            Division <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Tiers</span>
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Configure competitive matrix bounds, tier rankings, and modify structural assets instantly.
          </p>
        </div>
        <div className="shrink-0">
          <SeasonSelector seasons={allSeasons} selectedSeasonId={selectedSeasonId} />
        </div>
      </header>

      {/* CORE GRID CONTROLLER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: ACTIVE DIVISIONS LIST */}
        <DivisionsList 
          initialDivisions={allDivisions as any} 
          deleteDivisionAction={deleteDivisionAction} 
        />

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
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-slate-100 outline-none focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-500"
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
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-100 outline-none focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-500"
              />
            </div>
 
            {/* SEASON SELECTOR DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 ml-1">Assigned Season split</label>
              <div className="relative">
                <select
                  name="seasonId"
                  defaultValue={selectedSeasonId || ""}
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 text-xs appearance-none pr-10 cursor-pointer"
                >
                  <option value="">No Season Link (Unassigned)</option>
                  {allSeasons.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">
                      {s.name} {s.isActive ? "— [ Active ]" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Launch Division Layer
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}