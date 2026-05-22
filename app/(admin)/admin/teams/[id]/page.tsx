import { db } from "@/src/db";
import { teams, divisions, seasons } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTeamPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = Number(id);

  // 1. Fetch the team and all available divisions
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  const allDivisions = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      seasonName: seasons.name,
    })
    .from(divisions)
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(asc(divisions.name));

  if (!team) return <div className="p-20 text-center font-black uppercase text-slate-400">Team not found.</div>;

  // 2. Server Action to update the team
  async function updateTeam(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const divisionId = Number(formData.get("divisionId"));

    await db.update(teams)
      .set({ name, divisionId })
      .where(eq(teams.id, teamId));

    revalidatePath("/admin/teams");
    revalidatePath("/standings");
    redirect("/admin/teams");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-16 px-4 text-slate-200">
      <header className="flex items-center justify-between">
        <Link href="/admin/teams" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Team Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Entry ID: {teamId}
        </div>
      </header>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-900 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-5 mb-12 relative z-10">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-indigo-400 shadow-inner">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Update <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Club Squad</span></h1>
        </div>

        <form action={updateTeam} className="space-y-8 relative z-10">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Team Designation Name</label>
            <input 
              name="name" 
              defaultValue={team.name} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white transition-all shadow-inner placeholder:text-slate-800"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Assigned Division Bracket</label>
            <select 
              name="divisionId" 
              defaultValue={team.divisionId || ""} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white appearance-none transition-all shadow-inner"
            >
              <option value="">Select Division Bracket...</option>
              {allDivisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name} ({div.seasonName})
                </option>
              ))}
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
            <Save className="w-4 h-4 stroke-[2.5]" /> Commit Squad Parameters
          </button>
        </form>
      </div>
    </div>
  );
}