import { db } from "@/src/db";
import { divisions, seasons } from "@/src/db/schema";
import { revalidatePath } from "next/cache";

export default async function AdminDivisionsPage() {
  const allDivisions = await db.select().from(divisions);
  const allSeasons = await db.select().from(seasons);

  async function addDivision(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const seasonId = Number(formData.get("seasonId"));
    await db.insert(divisions).values({ name, seasonId });
    revalidatePath("/admin/divisions");
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black uppercase italic mb-8">Manage Divisions</h1>
      <form action={addDivision} className="space-y-4 mb-10 bg-slate-50 p-6 rounded-2xl">
        <input name="name" placeholder="Division Name (e.g. Premier)" required className="w-full p-3 border rounded-xl" />
        <select name="seasonId" required className="w-full p-3 border rounded-xl">
          <option value="">Assign to Season</option>
          {allSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase text-xs">Create Division</button>
      </form>
      <div className="grid gap-2">
        {allDivisions.map(d => (
          <div key={d.id} className="p-4 bg-white border rounded-xl font-bold">{d.name}</div>
        ))}
      </div>
    </div>
  );
}