import { db } from "@/src/db";
import { players, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, UserCircle2 } from "lucide-react";

export default async function EditPlayerPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const playerId = Number(id);

  const [player] = await db.select().from(players).where(eq(players.id, playerId));
  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const allDivisions = await db.select().from(divisions);

  if (!player) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Player not found.</div>;
  }

  const divMap = new Map(allDivisions.map(d => [d.id, d.name]));

  // --- SERVER ACTION ---
  async function updatePlayer(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const teamIdVal = formData.get("teamId");
    const teamId = teamIdVal ? Number(teamIdVal) : null;

    await db.update(players)
      .set({ 
        name, 
        teamId: teamId || null, 
        imageUrl: imageUrl || null 
      })
      .where(eq(players.id, playerId));

    revalidatePath("/admin/players");
    revalidatePath(`/players/${playerId}`); // Revalidate single public profile sheets
    revalidatePath("/players"); // Revalidate leaderboard metrics rankings matrix
    redirect("/admin/players");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <Link href="/admin/players" className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Registry
        </Link>
        <div className="bg-indigo-100 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          Editing Player ID: {playerId}
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-slate-900 p-4 rounded-2xl">
            <UserCircle2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Update Competitor</h1>
        </div>

        <form action={updatePlayer} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Player Name</label>
            <input 
              name="name" 
              defaultValue={player.name} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Avatar Profile Image URL</label>
            <input 
              name="imageUrl" 
              defaultValue={player.imageUrl || ""} 
              placeholder="https://example.com/photo.png"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Team Assignment</label>
            <select 
              name="teamId" 
              defaultValue={player.teamId || ""} 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 appearance-none text-slate-700"
            >
              <option value="">No Team (Free Agent)</option>
              {allTeams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.divisionId ? divMap.get(t.divisionId) : "No Bracket"})
                </option>
              ))}
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95">
            <Save className="w-4 h-4" /> Save Competitor Profile
          </button>
        </form>
      </div>
    </div>
  );
}