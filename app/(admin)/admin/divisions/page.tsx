import { db } from "@/src/db";
import { divisions, seasons } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import DeleteButton from "@/components/delete-button";

export default async function AdminDivisionsPage() {
  const allDivs = await db.select().from(divisions).orderBy(asc(divisions.name));
  const allSeasons = await db.select().from(seasons);

  async function addDivision(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const seasonId = Number(formData.get("seasonId"));
    await db.insert(divisions).values({ name, seasonId });
    revalidatePath("/admin/divisions");
  }

  async function deleteDivision(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(divisions).where(eq(divisions.id, id));
    revalidatePath("/admin/divisions");
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-slate-900 uppercase italic">Divisions</h1>

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <form action={addDivision} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input name="name" placeholder="Division Name..." required className="p-4 bg-slate-50 border rounded-2xl font-bold" />
          <select name="seasonId" required className="p-4 bg-slate-50 border rounded-2xl font-bold">
            <option value="">Select Season</option>
            {allSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-xs">Create Division</button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        {allDivs.map(d => (
          <div key={d.id} className="p-6 flex justify-between items-center border-b last:border-0 hover:bg-slate-50">
            <span className="font-black text-slate-900 uppercase">{d.name}</span>
            <DeleteButton id={d.id} action={deleteDivision} label="Division" />
          </div>
        ))}
      </div>
    </div>
  );
}