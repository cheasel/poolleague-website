import { db } from "@/src/db";
import { divisions, seasons, teams } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import DeleteButton from "@/components/delete-button";
import { Layers, Users, Plus, Trophy } from "lucide-react";

export default async function AdminDivisionsPage() {
  // 1. Fetch Seasons for the dropdown
  const allSeasons = await db.select().from(seasons).orderBy(asc(seasons.name));

  // 2. Fetch Divisions and their Teams
  // We fetch divisions first, then we will map them to include their teams
  const divsWithTeams = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      seasonName: seasons.name,
    })
    .from(divisions)
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(asc(divisions.name));

  // Fetch all teams to associate them in memory (more efficient than multiple queries)
  const allTeams = await db.select().from(teams);

  // --- SERVER ACTIONS ---
  async function addDivision(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const seasonId = Number(formData.get("seasonId"));
    const tier = Number(formData.get("tier")); // Grab the tier ranking
  
    if (!name || !seasonId || !tier) return;
  
    await db.insert(divisions).values({ name, seasonId, tier });
    revalidatePath("/admin/divisions");
    revalidatePath("/standings");
  }

  async function deleteDivision(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(divisions).where(eq(divisions.id, id));
    revalidatePath("/admin/divisions");
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Division Management</h1>
        <p className="text-slate-500 font-medium">Create league tiers and monitor team assignments.</p>
      </header>

      {/* Create Division Card */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
      <form action={addDivision} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Division Name</label>
          <input name="name" placeholder="e.g. Premier Tier" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
        </div>
        
        <div className="md:col-span-3 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assign Season</label>
          <select name="seasonId" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none">
            <option value="">Select Season</option>
            {allSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* NEW SELECT BOX FOR TIER LEVEL */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tier Rank</label>
          <select name="tier" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none">
            <option value="1">1st (Top)</option>
            <option value="2">2nd Tier</option>
            <option value="3">3rd Tier</option>
            <option value="4">4th Tier</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
            Create Division
          </button>
        </div>
      </form>
      </div>

      {/* Divisions & Teams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {divsWithTeams.map((div) => {
          const assignedTeams = allTeams.filter(t => t.divisionId === div.id);
          
          return (
            <div key={div.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <Trophy className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{div.seasonName}</span>
                  </div>
                  <h3 className="font-black uppercase tracking-tight text-lg leading-none">{div.name}</h3>
                </div>
                <DeleteButton id={div.id} action={deleteDivision} label="Division" />
              </div>

              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Teams ({assignedTeams.length})
                  </span>
                </div>
                
                <div className="space-y-2">
                  {assignedTeams.map((team) => (
                    <div key={team.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                      <span className="font-bold text-slate-700 uppercase text-xs">{team.name}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                    </div>
                  ))}
                  
                  {assignedTeams.length === 0 && (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No teams assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}