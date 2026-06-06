import { db } from "@/src/db";
import { venues, teams } from "@/src/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import CreateVenueForm from "./CreateVenueForm";
import VenuesList from "./venues-list";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  // 1. Fetch all venues sorted alphabetically, loading their team relations
  const allVenues = await db.query.venues.findMany({
    with: {
      teams: true,
    },
    orderBy: asc(venues.name),
  });

  // --- SERVER ACTION: CREATE VENUE ---
  async function createVenue(prevState: { error?: string; success?: boolean } | null, formData: FormData) {
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
        return { error: `"${name}" matches an existing arena signature configuration.` };
      }

      await db.insert(venues).values({
        name,
        address: address || null, 
        isActive,
      });
  
    } catch {
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

  // --- SERVER ACTION: TOGGLE ACTIVE STATUS ---
  async function toggleVenueStatus(formData: FormData) {
    "use server";
    const venueId = Number(formData.get("venueId"));
    const currentActive = formData.get("currentActive") === "true";
    
    await db
      .update(venues)
      .set({ isActive: !currentActive })
      .where(eq(venues.id, venueId));

    revalidatePath("/admin/venues");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24 px-4 text-slate-100 antialiased">
      
      {/* Header Matrix */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter italic">
            Arena <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-white">Venues</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
            Manage physical host club destinations and match environments
          </p>
        </div>
      </header>

      {/* Workspace Core Frame Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* COLUMN 1: INTERACTIVE FORM FOR SUBMISSIONS */}
        <CreateVenueForm createVenueAction={createVenue} />

        {/* COLUMN 2 & 3: DIRECTORY LIST WITH SEARCH & TOGGLES */}
        <VenuesList 
          initialVenues={allVenues} 
          deleteVenueAction={deleteVenue} 
          toggleVenueAction={toggleVenueStatus} 
        />

      </div>
    </div>
  );
}