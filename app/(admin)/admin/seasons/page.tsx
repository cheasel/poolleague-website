import { db } from "@/src/db";
import { seasons, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import DeleteButton from "@/components/delete-button";
import { Trophy, Layers, Plus, CalendarDays } from "lucide-react";

export default async function AdminSeasonsPage() {
  // 1. Fetch data
  const allSeasons = await db.select().from(seasons).orderBy(asc(seasons.name));
  const allDivisions = await db.select().from(divisions);

  // --- SERVER ACTIONS ---
  async function addSeason(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    if (!name) return;

    await db.insert(seasons).values({ name });
    revalidatePath("/admin/seasons");
  }

  async function deleteSeason(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    await db.delete(seasons).where(eq(seasons.id, id));
    revalidatePath("/admin/seasons");
    revalidatePath("/admin/divisions"); // Revalidate related pages
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Season Management</h1>
        <p className="text-slate-500 font-medium">Define league timelines and organize divisions.</p>
      </header>

      {/* Add Season Form */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
        <form action={addSeason} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">New Season Name</label>
            <input 
              name="name" 
              placeholder="e.g. Summer 2026 Championship" 
              required 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
            />
          </div>
          <button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Start Season
          </button>
        </form>
      </div>

      {/* Seasons List with Nested Divisions */}
      <div className="grid grid-cols-1 gap-6">
        {allSeasons.map((season) => {
          const associatedDivs = allDivisions.filter(d => d.seasonId === season.id);
          
          return (
            <div key={season.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-6">
                  <div className="bg-amber-100 p-4 rounded-2xl">
                    <Trophy className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                      {season.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <CalendarDays className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Created: {season.startDate ? new Date(season.startDate).toLocaleDateString() : 'Active Session'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Divisions</span>
                    <span className="text-lg font-black text-indigo-600 leading-none">{associatedDivs.length}</span>
                  </div>
                  <DeleteButton id={season.id} action={deleteSeason} label="Season" />
                </div>
              </div>

              {/* Nested Division List */}
              <div className="bg-slate-50/50 px-8 py-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contained Divisions</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {associatedDivs.map((div) => (
                    <div 
                      key={div.id} 
                      className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm group hover:border-indigo-300 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <span className="font-bold text-slate-700 uppercase text-xs tracking-tight">
                        {div.name}
                      </span>
                    </div>
                  ))}

                  {associatedDivs.length === 0 && (
                    <p className="text-xs font-bold text-slate-300 uppercase italic tracking-widest py-2">
                      No divisions assigned to this season yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {allSeasons.length === 0 && (
          <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem]">
            <p className="text-slate-300 font-black uppercase tracking-widest italic text-lg">No seasons found.</p>
          </div>
        )}
      </div>
    </div>
  );
}