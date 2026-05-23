import { db } from "@/src/db";
import { venues, teams } from "@/src/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { MapPin, Store, ToggleLeft, Edit2, ShieldCheck, ShieldAlert } from "lucide-react";
import DeleteVenueButton from "./DeleteVenueButton";
import CreateVenueForm from "./CreateVenueForm";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  // 1. Fetch all venues sorted alphabetically
  const allVenues = await db.select().from(venues).orderBy(asc(venues.name));

  // --- SERVER ACTION WITH STATE ARGS ---
  async function createVenue(prevState: any, formData: FormData) {
    "use server";
    
    const rawName = formData.get("name") as string;
    const name = rawName ? rawName.trim() : "";
    const address = formData.get("address") as string;
    const isActive = formData.get("isActive") === "true"; 

    if (!name) {
      return { error: "Venue name cannot be left blank." };
    }

    try {
      // 🔍 Case-Insensitive verification search
      const [existingName] = await db
        .select()
        .from(venues)
        .where(sql`lower(${venues.name}) = lower(${name})`)
        .limit(1);

      if (existingName) {
        // Return structured state payload back to the client UI component frame
        return { error: `"${name}" matches an existing arena signature configuration.` };
      }

      await db.insert(venues).values({
        name,
        address: address || null, 
        isActive,
      });
  
    } catch (err) {
      return { error: "Database rejected transaction execution parameter constraints." };
    }

    revalidatePath("/admin/venues");
    return { success: true };
  }

  // --- SERVER ACTION: DELETE VENUE ---
  async function deleteVenue(formData: FormData) {
    "use server";
    const idVal = formData.get("venueId");
    if (!idVal) return;
    const venueId = Number(idVal);

    await db.update(teams)
      .set({ homeVenueId: null })
      .where(eq(teams.homeVenueId, venueId));

    await db.delete(venues).where(eq(venues.id, venueId));

    revalidatePath("/admin/venues");
    revalidatePath("/admin/teams");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4 text-zinc-200 antialiased">
      
      {/* Header Matrix */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            Arena <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-white">Venues</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">
            Manage physical host club destinations and match environments
          </p>
        </div>
      </header>

      {/* Workspace Core Frame Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* COLUMN 1: INTERACTIVE FORM FOR SUBMISSIONS */}
        <CreateVenueForm createVenueAction={createVenue} />

        {/* COLUMN 2 & 3: DIRECTORY GRID */}
        <div className="lg:col-span-2 space-y-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">
            Registered Live Locations ({allVenues.length})
          </div>

          {allVenues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allVenues.map((venue) => (
                <div 
                  key={venue.id} 
                  className="bg-zinc-900/30 backdrop-blur-md border border-zinc-850 hover:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between group transition-all relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 transition-colors shrink-0 shadow-inner">
                        <Store className="w-4 h-4" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/admin/venues/${venue.id}`}
                          className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-all shadow-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Link>
                        <DeleteVenueButton venueId={venue.id} deleteAction={deleteVenue} />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">
                        {venue.name}
                      </h3>
                      
                      <p className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium mt-1 truncate">
                        <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
                        {venue.address || "No Address Provided"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-850/60 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <span className="flex items-center gap-1 text-zinc-500">
                      <ToggleLeft className="w-3.5 h-3.5 text-zinc-600" /> Operational State
                    </span>
                    {venue.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/10 font-mono text-[9px]">
                        <ShieldCheck className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 bg-rose-500/5 px-2.5 py-1 rounded border border-rose-500/10 font-mono text-[9px]">
                        <ShieldAlert className="w-3 h-3" /> Suspended
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-xs font-bold text-zinc-600 uppercase border border-dashed border-zinc-800 rounded-[2rem] bg-zinc-950/10">
              No host venue records configured in database registry core.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}