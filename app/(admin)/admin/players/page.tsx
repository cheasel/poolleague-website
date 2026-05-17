import { db } from "@/src/db";
import { players, teams } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { User, Plus, Trash2, Pencil, Shield } from "lucide-react";
import Link from 'next/link';

export default async function AdminPlayersPage() {
  // 1. Fetch data for the list
  const allPlayers = await db
    .select({
      id: players.id,
      name: players.name,
      teamName: teams.name,
      teamId: players.teamId,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .orderBy(asc(players.name));

  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));

  // 2. Server Action to add a player
  async function addPlayer(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;

    if (!name) return;

    await db.insert(players).values({
      name,
      teamId: teamId || null,
    });

    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  // 3. Server Action to delete a player
  async function deletePlayer(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(players).where(eq(players.id, id));
    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Registry</h1>
          <p className="text-slate-500 font-medium">Manage league competitors and their team affiliations.</p>
        </header>

        {/* Add Player Form */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 mb-10">
          <form action={addPlayer} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Competitor Name</label>
              <input 
                name="name" 
                placeholder="Enter Player Name..." 
                required 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assign Team</label>
              <select 
                name="teamId" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 appearance-none"
              >
                <option value="">Free Agent (No Team)</option>
                {allTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95">
                <Plus className="w-4 h-4" /> Add Player
              </button>
            </div>
          </form>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-black text-slate-900 uppercase tracking-tight">Registered Competitors</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{allPlayers.length} Total Players</span>
          </div>
          
          <div className="divide-y divide-slate-50">
            {allPlayers.map((player) => (
              <div key={player.id} className="p-6 md:px-8 flex justify-between items-center hover:bg-slate-50/80 transition-colors group">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-white transition-colors">
                    <User className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                        {player.teamName || "Free Agent"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link 
                    href={`/admin/players/${player.id}`}
                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="w-5 h-5" />
                  </Link>

                  <form action={deletePlayer}>
                    <input type="hidden" name="id" value={player.id} />
                    <button className="p-2 text-slate-200 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {allPlayers.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                No players registered.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
