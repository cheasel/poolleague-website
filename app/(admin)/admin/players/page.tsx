import { db } from "@/src/db";
import { players, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import DeleteButton from "@/components/delete-button";
import { UserPlus, User, Shield, Pencil, Trash2 } from "lucide-react";

export default async function AdminPlayersPage() {
  // 1. Fetch raw datasets
  const allPlayers = await db.select().from(players).orderBy(asc(players.name));
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const allDivisions = await db.select().from(divisions);

  // Map out lookups for fast in-memory association
  const teamMap = new Map(allTeams.map(t => [t.id, t]));
  const divMap = new Map(allDivisions.map(d => [d.id, d.name]));

  // --- SERVER ACTIONS ---
  async function addPlayer(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;

    if (!name) return;

    await db.insert(players).values({ 
      name, 
      teamId: teamId || null 
    });

    revalidatePath("/admin/players");
    revalidatePath("/players"); // Sync public analytics
  }

  async function deletePlayer(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(players).where(eq(players.id, id));
    
    revalidatePath("/admin/players");
    revalidatePath("/players");
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Registry</h1>
        <p className="text-slate-500 font-medium">Register league competitors and oversee active squad positions.</p>
      </header>

      {/* Registration Card Form */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
        <form action={addPlayer} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Competitor Name</label>
            <input 
              name="name" 
              placeholder="e.g. Ronnie O'Sullivan" 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
            />
          </div>
          
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assign Team Squad (Optional)</label>
            <select 
              name="teamId" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none text-slate-700"
            >
              <option value="">Leave as Free Agent</option>
              {allTeams.map(t => {
                const divName = t.divisionId ? divMap.get(t.divisionId) : "No Bracket";
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} ({divName})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="md:col-span-3">
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
              <UserPlus className="w-4 h-4" /> Register Player
            </button>
          </div>
        </form>
      </div>

      {/* Roster Grid Ledger */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {allPlayers.map((player) => {
            const assignedTeam = player.teamId ? teamMap.get(player.teamId) : null;
            const assignedDivName = assignedTeam?.divisionId ? divMap.get(assignedTeam.divisionId) : null;

            return (
              <div key={player.id} className="p-6 md:px-8 flex justify-between items-center hover:bg-slate-50/60 transition-colors group">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-indigo-50 transition-colors">
                    <User className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-black uppercase tracking-wider">
                      {assignedTeam ? (
                        <>
                          <span className="text-indigo-600">{assignedTeam.name}</span>
                          {assignedDivName && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">{assignedDivName}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-amber-600 italic">Free Agent / Unassigned</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Administration Portals Control Anchor Buttons */}
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/admin/players/${player.id}`}
                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4 stroke-[2.5]" />
                  </Link>

                  <DeleteButton id={player.id} action={deletePlayer} label="Player" />
                </div>
              </div>
            );
          })}

          {allPlayers.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">
              No competitors registered in the system index yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}