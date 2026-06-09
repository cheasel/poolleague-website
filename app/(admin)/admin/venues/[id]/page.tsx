import { db } from "@/src/db";
import { venues, teams } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Store, MapPin, ToggleLeft, Shield } from "lucide-react";
import { assertWritePrivilege, getIsReadOnly } from "@/src/utils/auth-guards";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditVenuePage({ params }: PageProps) {
  const { id } = await params;
  const venueId = Number(id);
  const isReadOnly = await getIsReadOnly();

  // Fetch exact venue entry and registered home teams in parallel
  const [venueResult, localHomeTeams] = await Promise.all([
    db.select().from(venues).where(eq(venues.id, venueId)),
    db
      .select()
      .from(teams)
      .where(eq(teams.homeVenueId, venueId))
      .orderBy(asc(teams.name))
  ]);

  const venue = venueResult[0];

  if (!venue) {
    return <div className="p-20 text-center font-black text-slate-500 uppercase">Arena Node Missing.</div>;
  }

  // --- MUTATION SERVER ACTION ---
  async function updateVenue(formData: FormData) {
    "use server";
    await assertWritePrivilege();
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const isActive = formData.get("isActive") === "true";

    await db.update(venues)
      .set({
        name,
        address: address || null,
        isActive,
      })
      .where(eq(venues.id, venueId));

    revalidatePath("/admin/venues");
    redirect("/admin/venues");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-24 px-4 text-slate-100 antialiased">
      
      {/* Dynamic Upper Control Header */}
      <header className="flex items-center justify-between">
        <Link href="/admin/venues" className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors">
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" /> Back to Arenas Directory
        </Link>
        <div className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner">
          Infrastructure Index: <span className="text-indigo-400 font-mono">#{venueId}</span>
        </div>
      </header>

      {/* CORE CONFIG CARD CONTAINER */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-800 via-indigo-600 to-indigo-500"></div>

        <div className="p-6 md:p-10">
          <div className="flex items-center gap-4.5 pb-6 mb-8 border-b border-slate-800/60">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-100 uppercase tracking-tighter italic leading-none">Modify Location</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Configure operational arena deployment parameters</p>
            </div>
          </div>

          <form action={updateVenue} className="space-y-6">
            {/* Schema Field: name */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Host Venue / Club Title</label>
              <input 
                type="text" 
                name="name" 
                defaultValue={venue.name} 
                required 
                disabled={isReadOnly}
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl outline-none font-bold text-slate-100 text-sm focus:border-indigo-500/80 transition-all placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed" 
              />
            </div>

            {/* Schema Field: address */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 ml-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Address Coordinates</label>
              </div>
              <input 
                type="text" 
                name="address" 
                defaultValue={venue.address || ""} 
                placeholder="e.g., Suite B, 7th Pocket Avenue"
                disabled={isReadOnly}
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl outline-none font-bold text-slate-100 text-sm focus:border-indigo-500/80 transition-all placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed" 
              />
            </div>

            {/* Schema Field: isActive */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 ml-1">
                <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Scheduler Availability Status</label>
              </div>
              <div className="relative">
                <select 
                  name="isActive" 
                  defaultValue={venue.isActive ? "true" : "false"}
                  disabled={isReadOnly}
                  className="w-full p-4 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 appearance-none text-sm pr-10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="true">Operational / Active / Accepting Matches</option>
                  <option value="false">Deactivated / Offline / Block New Bookings</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
              </div>
            </div>

            {!isReadOnly && (
              <div className="pt-4 flex justify-end">
                <button type="submit" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2.5 transition-all cursor-pointer">
                  <Save className="w-4 h-4 stroke-[2.5]" /> Commit Location Data
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* READ-ONLY REVERSE REFERENCE HOOK GRID (Home Franchise List) */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-slate-800 shadow-2xl p-6 md:p-10 overflow-hidden">
        <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-indigo-400" /> Local Home Franchises
        </h2>
        <p className="text-[11px] text-slate-500 font-medium mb-6">Teams that use this specific establishment hub as their default home venue.</p>

        {localHomeTeams.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {localHomeTeams.map(team => (
              <div key={team.id} className="p-4 bg-slate-950 border border-slate-800/60 rounded-xl flex items-center justify-between shadow-inner">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">{team.name}</span>
                <span className="text-[9px] font-black text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded tracking-wider uppercase">
                  Home Base
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-xs font-bold text-slate-600 uppercase border border-dashed border-slate-800 rounded-xl bg-slate-950/10">
            No active club entities are using this base camp for home defense currently.
          </div>
        )}
      </div>

    </div>
  );
}