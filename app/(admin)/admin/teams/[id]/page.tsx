import { db } from "@/src/db";
import { teams, venues } from "@/src/db/schema";
import { eq, and, ne, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// 🎯 Fixed import path exactly as requested
import { supabaseAdmin } from "@/src/lib/supabase-storage"; 
import EditTeamForm from "./EditTeamForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTeamPage({ params }: PageProps) {
  const resolvedParams = await params;
  const teamId = Number(resolvedParams.id);

  // 1. Fetch current team record context
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    redirect("/admin/teams");
  }

  // 2. Fetch all venues along with their current total allocated team counts
  const allVenuesRaw = await db.select().from(venues);
  
  const venueCounts = await db
    .select({
      homeVenueId: teams.homeVenueId,
      value: count(),
    })
    .from(teams)
    .groupBy(teams.homeVenueId);

  const venueCountsMap = venueCounts.reduce((acc, v) => {
    if (v.homeVenueId) acc[v.homeVenueId] = v.value;
    return acc;
  }, {} as Record<number, number>);

  const venuesWithCounts = allVenuesRaw.map((venue) => ({
    id: venue.id,
    name: venue.name,
    currentTeamsCount: venueCountsMap[venue.id] || 0,
  }));

  // --- SERVER ACTION: PERSIST TEAM CHANGES & PURGE OLD ASSET ---
  async function updateTeam(prevState: any, formData: FormData) {
    "use server";

    const targetTeamId = Number(formData.get("teamId"));
    const updatedName = (formData.get("name") as string)?.trim();
    const venueIdInput = formData.get("homeVenueId");
    const targetVenueId = venueIdInput ? Number(venueIdInput) : null;

    // 🔍 Force check: extraction from multipart stream
    const logoFile = formData.get("logoFile") as File | null;
    let finalLogoUrl = formData.get("existingLogoUrl") as string | null;

    if (!updatedName) {
      return { error: "Roster name cannot be left blank." };
    }

    try {
      // 🎯 BACKEND STRUCTURAL CAPACITY CONSTRAINT CHECK
      if (targetVenueId) {
        const [tenantCount] = await db
          .select({ value: count() })
          .from(teams)
          .where(
            and(
              eq(teams.homeVenueId, targetVenueId),
              ne(teams.id, targetTeamId)
            )
          );

        if (tenantCount && tenantCount.value >= 2) {
          return { error: "Allocation Rejected: Selected Arena has already fulfilled its maximum limit of 2 home teams." };
        }
      }

      // 💾 STREAM UPLOAD & CLEANUP PIPELINE
      if (logoFile && logoFile.size > 0 && logoFile.name !== "undefined") {
        const bucketName = "team-logos"; 

        // 🗑️ PURGE OLD TEAM LOGO FROM STORAGE BUCKET
        if (finalLogoUrl && finalLogoUrl.includes(bucketName)) {
          try {
            const pathParts = finalLogoUrl.split(`${bucketName}/`);
            if (pathParts.length > 1) {
              const oldFilePath = pathParts[1];
              console.log(`🗑️ Removing old logo: "${oldFilePath}"`);
              await supabaseAdmin.storage.from(bucketName).remove([oldFilePath]);
            }
          } catch (cleanupErr) {
            console.error("⚠️ Failed to delete old logo:", cleanupErr);
          }
        }
        
        // Transform file streams into node data blocks
        const arrayBuffer = await logoFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        
        const fileExtension = logoFile.name.split('.').pop() || 'png';
        const filePath = `logos/team_${targetTeamId}_${Date.now()}.${fileExtension}`;

        console.log(`🚀 Uploading new logo to path: "${filePath}"`);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: logoFile.type,
            upsert: true,
          });

        if (uploadError) {
          console.error("❌ Supabase storage upload failed:", uploadError);
          return { error: `Bucket Upload Blocked: ${uploadError.message}` };
        }

        // Generate clean public address URL
        const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
        finalLogoUrl = urlData.publicUrl;
      }

      // 3. Persist modifications to database
      await db
        .update(teams)
        .set({
          name: updatedName,
          logoUrl: finalLogoUrl,
          homeVenueId: targetVenueId,
        })
        .where(eq(teams.id, targetTeamId));

      console.log("💾 Database updated cleanly.");

    } catch (err) {
      console.error("Unhandled Exception: ", err);
      return { error: "Transaction processing failed." };
    }

    revalidatePath("/admin/teams");
    revalidatePath(`/admin/teams/${targetTeamId}`);
    redirect("/admin/teams");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 px-4 text-zinc-200 antialiased">
      <header className="border-b border-zinc-800/60 pb-6">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
          Modify Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Configuration</span>
        </h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">
          Adjust home ground hub assignment locations and club profile options
        </p>
      </header>

      <EditTeamForm 
        team={team} 
        venuesList={venuesWithCounts} 
        updateTeamAction={updateTeam} 
      />
    </div>
  );
}