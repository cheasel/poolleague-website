import { db } from "@/src/db";
import { seasons } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import DeleteButton from "@/components/delete-button";

export default async function AdminSeasonsPage() {
  const allSeasons = await db.select().from(seasons).orderBy(asc(seasons.startDate));

  async function addSeason(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    await db.insert(seasons).values({ name });
    revalidatePath("/admin/seasons");
  }

  async function deleteSeason(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(seasons).where(eq(seasons.id, id));
    revalidatePath("/admin/seasons");
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Seasons</h1>
      </header>

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <form action={addSeason} className="flex gap-4">
          <input name="name" placeholder="Season Name..." required className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold" />
          <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Add Season</button>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        {allSeasons.map(s => (
          <div key={s.id} className="p-6 flex justify-between items-center border-b last:border-0 hover:bg-slate-50">
            <div>
              <span className="font-black text-slate-900 uppercase">{s.name}</span>
            </div>
            <DeleteButton id={s.id} action={deleteSeason} label="Season" />
          </div>
        ))}
      </div>
    </div>
  );
}