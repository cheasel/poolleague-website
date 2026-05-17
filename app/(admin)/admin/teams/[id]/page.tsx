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
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <Link href="/admin/teams" className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Teams
        </Link>
        <div className="bg-indigo-100 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          Editing Team ID: {teamId}
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-slate-900 p-4 rounded-2xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Update Team</h1>
        </div>

        <form action={updateTeam} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Team Name</label>
            <input 
              name="name" 
              defaultValue={team.name} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Current Division</label>
            <select 
              name="divisionId" 
              defaultValue={team.divisionId || ""} 
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

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-100 active:scale-95">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}