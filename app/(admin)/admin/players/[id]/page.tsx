import { db } from "@/src/db";
import { players, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, UserCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPlayerPage({ params }: PageProps) {
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
    <div className="max-w-2xl mx-auto space-y-10 pb-16 px-4 text-slate-200">
      <header className="flex items-center justify-between">
        <Link href="/admin/players" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Competitor Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Entry ID: {playerId}
        </div>
      </header>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-900 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-5 mb-12 relative z-10">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-indigo-400 shadow-inner">
            <UserCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Update <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Competitor</span></h1>
        </div>

        <form action={updatePlayer} className="space-y-8 relative z-10">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Full Player Name</label>
            <input 
              name="name" 
              defaultValue={player.name} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white transition-all shadow-inner placeholder:text-slate-800"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Avatar Profile Image URL</label>
            <input 
              name="imageUrl" 
              defaultValue={player.imageUrl || ""} 
              placeholder="https://example.com/photo.png"
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white transition-all shadow-inner placeholder:text-slate-800"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Team Assignment</label>
            <select 
              name="teamId" 
              defaultValue={player.teamId || ""} 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white appearance-none transition-all shadow-inner"
            >
              <option value="">No Team (Free Agent)</option>
              {allTeams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.divisionId ? divMap.get(t.divisionId) : "No Bracket"})
                </option>
              ))}
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
            <Save className="w-4 h-4 stroke-[2.5]" /> Save Competitor Profile
          </button>
        </form>
      </div>
    </div>
  );
}