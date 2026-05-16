import { db } from "@/src/db";
import { divisions, seasons } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Layers } from "lucide-react";

export default async function EditDivisionPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const divId = Number(id);

  const [division] = await db.select().from(divisions).where(eq(divisions.id, divId));
  const allSeasons = await db.select().from(seasons).orderBy(asc(seasons.name));

  if (!division) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Division not found.</div>;
  }

  async function updateDivision(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const seasonId = Number(formData.get("seasonId"));
    const tier = Number(formData.get("tier"));

    await db.update(divisions)
      .set({ name, seasonId, tier })
      .where(eq(divisions.id, divId));

    revalidatePath("/admin/divisions");
    revalidatePath("/standings");
    redirect("/admin/divisions");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <Link href="/admin/divisions" className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Divisions
        </Link>
        <div className="bg-indigo-100 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          Editing Division ID: {divId}
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200">
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-slate-900 p-4 rounded-2xl">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Update Division</h1>
        </div>

        <form action={updateDivision} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Division Name</label>
            <input 
              name="name" 
              defaultValue={division.name} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Assigned Season</label>
            <select 
              name="seasonId" 
              defaultValue={division.seasonId || ""} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 appearance-none"
            >
              {allSeasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Tier Rank Order</label>
            <select 
              name="tier" 
              defaultValue={division.tier} 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 appearance-none"
            >
              <option value="1">1st (Top Tier)</option>
              <option value="2">2nd Tier</option>
              <option value="3">3rd Tier</option>
              <option value="4">4th Tier</option>
            </select>
          </div>

          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95">
            <Save className="w-4 h-4" /> Save Division Changes
          </button>
        </form>
      </div>
    </div>
  );
}