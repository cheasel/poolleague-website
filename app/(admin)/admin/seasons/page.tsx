import { db } from "@/src/db";
import { seasons } from "@/src/db/schema";
import { revalidatePath } from "next/cache";

export default async function AdminSeasonsPage() {
  const allSeasons = await db.select().from(seasons);

  async function addSeason(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    await db.insert(seasons).values({ name });
    revalidatePath("/admin/seasons");
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black uppercase italic mb-8">Manage Seasons</h1>
      <form action={addSeason} className="flex gap-4 mb-10">
        <input name="name" placeholder="Season Name (e.g. Winter 2026)" required className="flex-1 p-3 border rounded-xl" />
        <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs">Add Season</button>
      </form>
      <div className="space-y-2">
        {allSeasons.map(s => (
          <div key={s.id} className="p-4 bg-white border rounded-xl flex justify-between font-bold">
            {s.name} <span className="text-indigo-500 text-[10px] uppercase">ID: {s.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}