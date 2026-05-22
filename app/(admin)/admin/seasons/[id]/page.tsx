import { db } from "@/src/db";
import { seasons } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSeasonPage({ params }: PageProps) {
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
    <div className="max-w-2xl mx-auto space-y-10 pb-16 px-4 text-slate-200">
      <header className="flex items-center justify-between">
        <Link href="/admin/seasons" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Seasons Registry
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Season Block Entry ID: {seasonId}
        </div>
      </header>

      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl border border-slate-900 relative overflow-hidden group hover:border-slate-800 transition-all">
        <div className="absolute top-0 right-0 w-64 h-full bg-rose-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-5 mb-12 relative z-10">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-rose-500 shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Update <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400">Season</span></h1>
        </div>

        <form action={updateSeason} className="space-y-8 relative z-10">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Season Identifier Title</label>
            <input 
              name="name" 
              defaultValue={season.name} 
              required 
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-white transition-all shadow-inner placeholder:text-slate-800"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Operational Status Context</label>
            <select 
              name="isActive" 
              defaultValue={season.isActive ? "true" : "false"}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-rose-500 outline-none font-bold text-white appearance-none transition-all shadow-inner"
            >
              <option value="true">Active (Accepting Live Results)</option>
              <option value="false">Archived / Historic Split</option>
            </select>
          </div>

          <button className="w-full bg-rose-600 hover:bg-rose-500 text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-rose-900/20 active:scale-95">
            <Save className="w-4 h-4 stroke-[2.5]" /> Commit Season Parameter Changes
          </button>
        </form>
      </div>
    </div>
  );
}