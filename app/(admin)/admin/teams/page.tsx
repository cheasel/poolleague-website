import { db } from "@/src/db";
import { teams, divisions, seasons } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Trophy, Users, Hash, Plus, Trash2, Pencil } from "lucide-react";
import Link from 'next/link';

export default async function AdminTeamsPage() {
  // 1. Fetch data for the list and the dropdown
  // We join divisions and seasons to show exactly where each team belongs
  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      divisionName: divisions.name,
      seasonName: seasons.name,
    })
    .from(teams)
    .leftJoin(divisions, eq(teams.divisionId, divisions.id))
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(asc(teams.name));

  const allDivisions = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      seasonName: seasons.name,
    })
    .from(divisions)
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(asc(divisions.name));

  // 2. Server Action to add a team
  async function addTeam(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const divisionId = Number(formData.get("divisionId"));

    if (!name || !divisionId) return;

    await db.insert(teams).values({
      name,
      divisionId,
      points: 0,
      setsWon: 0,
      setsLost: 0,
    });

    revalidatePath("/admin/teams");
    revalidatePath("/standings");
  }

  // 3. Server Action to delete a team
  async function deleteTeam(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(teams).where(eq(teams.id, id));
    revalidatePath("/admin/teams");
    revalidatePath("/standings");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Team Management</h1>
          <p className="text-slate-500 font-medium">Register new teams and assign them to active divisions.</p>
        </header>

        {/* Add Team Form */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 mb-10">
          <form action={addTeam} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Team Name</label>
              <input 
                name="name" 
                placeholder="Enter Team Name..." 
                required 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assign Division</label>
              <select 
                name="divisionId" 
                required 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 appearance-none"
              >
                <option value="">Select Division</option>
                {allDivisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name} ({div.seasonName})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95">
                <Plus className="w-4 h-4" /> Register Team
              </button>
            </div>
          </form>
        </div>

        {/* Teams List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-black text-slate-900 uppercase tracking-tight">Active Rosters</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{allTeams.length} Total Teams</span>
          </div>
          
          <div className="divide-y divide-slate-50">
            {allTeams.map((team) => (
              <div key={team.id} className="p-6 md:px-8 flex justify-between items-center hover:bg-slate-50/80 transition-colors group">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white transition-colors">
                    <Users className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">{team.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{team.seasonName}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{team.divisionName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* NEW EDIT BUTTON */}
                  <Link 
                    href={`/admin/teams/${team.id}`}
                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </Link>

                  <form action={deleteTeam}>
                    <input type="hidden" name="id" value={team.id} />
                    <button className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {allTeams.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                No teams registered. Start by adding one above.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}