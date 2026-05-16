import { db } from "@/src/db";
import { seasons } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Trophy } from "lucide-react";

export default async function EditSeasonPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const seasonId = Number(id);

  const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId));

  if (!season) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Season not found.</div>;
  }

  async function updateSeason(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const isActive = formData.get("isActive") === "true";

    await db.update(seasons)
      .set({ name, isActive })
      .where(eq(seasons.id, seasonId));

    revalidatePath("/admin/seasons");
    revalidatePath("/standings");
    redirect("/admin/seasons");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <Link href="/admin/seasons" className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Seasons
        </Link>
        <div className="bg-amber-100 text-amber-800 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          Editing Season ID: {seasonId}
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-slate-900 p-4 rounded-2xl">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Update Season</h1>
        </div>

        <form action={updateSeason} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Season Name</label>
            <input 
              name="name" 
              defaultValue={season.name} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Status</label>
            <select 
              name="isActive" 
              defaultValue={season.isActive ? "true" : "false"}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 appearance-none"
            >
              <option value="true">Active (Accepting Matches)</option>
              <option value="false">Archived / Completed</option>
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95">
            <Save className="w-4 h-4" /> Save Season Changes
          </button>
        </form>
      </div>
    </div>
  );
}