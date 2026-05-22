import { db } from "@/src/db";
import { players, teams } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { User, Plus, Trash2, Pencil, Shield } from "lucide-react";
import Link from 'next/link';

export const dynamic = "force-dynamic";

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
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="border-b border-slate-900 pb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Database Operations</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Registry</span></h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Manage league competitors and their team affiliations.</p>
        </header>

        {/* Add Player Form */}
        <div className="bg-slate-900/40 rounded-[2.5rem] p-8 shadow-2xl border border-slate-900">
          <form action={addPlayer} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-5 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Competitor Name</label>
              <input 
                name="name" 
                placeholder="Enter Player Name..." 
                required 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white placeholder:text-slate-800 transition-all shadow-inner"
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Assign Team</label>
              <select 
                name="teamId" 
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white appearance-none transition-all shadow-inner"
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
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
                <Plus className="w-4 h-4" /> Add Player
              </button>
            </div>
          </form>
        </div>

        {/* Players List */}
        <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-900 shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
            <h2 className="font-black text-white uppercase tracking-tight text-sm">Registered Competitors</h2>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{allPlayers.length} Total Players</span>
          </div>
          
          <div className="divide-y divide-slate-800/60">
            {allPlayers.map((player) => (
              <div key={player.id} className="p-6 md:px-8 flex justify-between items-center hover:bg-slate-900/40 transition-colors group">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 group-hover:border-indigo-500/30 transition-colors shadow-inner">
                    <User className="w-5 h-5 text-slate-700 group-hover:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-3.5 h-3.5 text-slate-700" />
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-900/30 shadow-sm">
                        {player.teamName || "Free Agent"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link 
                    href={`/admin/players/${player.id}`}
                    className="p-2 text-slate-600 hover:text-indigo-400 transition-colors"
                  >
                    <Pencil className="w-5 h-5" />
                  </Link>

                  <form action={deletePlayer}>
                    <input type="hidden" name="id" value={player.id} />
                    <button className="p-2 text-slate-800 hover:text-red-500 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}

            {allPlayers.length === 0 && (
              <div className="p-20 text-center text-slate-800 font-black uppercase tracking-[0.2em] italic text-xs">
                No players registered inside the system ledger.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
