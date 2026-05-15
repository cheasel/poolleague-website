import { db } from "@/src/db";
import { teams, divisions } from "@/src/db/schema";
import { revalidatePath } from "next/cache";

export default async function AdminTeamsPage() {
  const allTeams = await db.select().from(teams);
  const allDivs = await db.select().from(divisions);

  async function addTeam(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const divisionId = Number(formData.get("divisionId"));
    await db.insert(teams).values({ name, divisionId });
    revalidatePath("/admin/teams");
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black uppercase italic mb-8">Add Team</h1>
      <form action={addTeam} className="space-y-4 mb-10 bg-slate-50 p-6 rounded-2xl">
        <input name="name" placeholder="Team Name" required className="w-full p-3 border rounded-xl" />
        <select name="divisionId" required className="w-full p-3 border rounded-xl">
          <option value="">Assign to Division</option>
          {allDivs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase text-xs">Register Team</button>
      </form>
      <div className="grid gap-2">
        {allTeams.map(t => (
          <div key={t.id} className="p-4 bg-white border rounded-xl font-bold uppercase">{t.name}</div>
        ))}
      </div>
    </div>
  );
}