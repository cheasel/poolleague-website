import { db } from "@/src/db";
import { players, teams } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/src/lib/supabase-storage"; 
import EditPlayerForm from "./EditPlayerForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPlayerPage({ params }: PageProps) {
  const resolvedParams = await params;
  const playerId = Number(resolvedParams.id);

  // 1. Fetch current player profile data
  const [player] = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (!player) {
    redirect("/admin/players");
  }

  // 2. Fetch teams list for selection dropdown options
  const activeTeams = await db.select().from(teams);

  // --- SERVER ACTION: PROCESS UPDATE, CLEAN OLD IMAGE, AND UPLOAD ---
  async function updatePlayer(prevState: any, formData: FormData) {
    "use server";

    const targetPlayerId = Number(formData.get("playerId"));
    const updatedName = (formData.get("name") as string)?.trim();
    const teamIdInput = formData.get("teamId");
    const targetTeamId = teamIdInput ? Number(teamIdInput) : null;

    // Capture incoming image assets from the client form data stream
    const playerImageFile = formData.get("playerImageFile") as File | null;
    let finalImageUrl = formData.get("existingImageUrl") as string | null;

    if (!updatedName) {
      return { error: "Registered profile name cannot be left blank." };
    }

    try {
      // 🔍 STEP A: SUPABASE NODE CONNECTION TESTS
      console.log("\n--- Checking Supabase Node Connection ---");
      const { data: buckets, error: testError } = await supabaseAdmin.storage.listBuckets();
      
      if (testError) {
        console.error("❌ Supabase connection failed:", testError.message);
        return { error: `Authentication failed: ${testError.message}` };
      }

      // 💾 STEP B: BINARY STREAM UPLOAD & CLEANUP PIPELINE
      if (playerImageFile && playerImageFile.size > 0 && playerImageFile.name !== "undefined") {
        const bucketName = "player-avatars"; 

        // 🗑️ NEW: PURGE OLD IMAGE FROM SUPABASE IF IT EXISTS
        if (finalImageUrl && finalImageUrl.includes(bucketName)) {
          try {
            // Extract the path after "/player-avatars/"
            // URL: .../public/player-avatars/avatars/player_42_177953.jpg -> Path: avatars/player_42_177953.jpg
            const pathParts = finalImageUrl.split(`${bucketName}/`);
            if (pathParts.length > 1) {
              const oldFilePath = pathParts[1];
              console.log(`🗑️ Cleaning ghost data: Removing old file "${oldFilePath}" from Supabase...`);
              
              const { error: removeError } = await supabaseAdmin.storage
                .from(bucketName)
                .remove([oldFilePath]);

              if (removeError) {
                console.warn("⚠️ Non-blocking removal notice:", removeError.message);
              } else {
                console.log("✅ Successfully deleted old file from storage bucket.");
              }
            }
          } catch (cleanupErr) {
            console.error("⚠️ Failed to parse or delete old image path:", cleanupErr);
          }
        }
        
        // Transform incoming binary representation into standard node data blocks
        const arrayBuffer = await playerImageFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        
        // Extract original file type format and generate a clean target path structure
        const fileExtension = playerImageFile.name.split('.').pop() || 'jpg';
        const filePath = `avatars/player_${targetPlayerId}_${Date.now()}.${fileExtension}`;

        console.log(`🚀 Executing fresh upload to path: "${filePath}"`);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: playerImageFile.type,
            upsert: true,
          });

        if (uploadError) {
          console.error("❌ Supabase storage explicitly rejected stream payload:", uploadError);
          return { error: `Bucket Upload Blocked: ${uploadError.message}` };
        }

        // Fetch public accessibility address link configurations
        const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
        finalImageUrl = urlData.publicUrl;
        console.log("🔗 Generated Public Asset Anchor URL:", finalImageUrl);
      } else {
        console.log("⚠️ No updated target image file provided. Retaining fallback URL asset state.");
      }

      // 3. Sync changes into database schema infrastructure
      await db
        .update(players)
        .set({
          name: updatedName,
          teamId: targetTeamId,
          imageUrl: finalImageUrl, 
        })
        .where(eq(players.id, targetPlayerId));

      console.log("💾 Database synchronization sequence updated cleanly.");

    } catch (err) {
      console.error("Unhandled Mutation Core Exception: ", err);
      return { error: "Database transaction processing error encountered." };
    }

    // Bust client cache layers and return to directory root
    revalidatePath("/admin/players");
    revalidatePath(`/admin/players/${targetPlayerId}`);
    redirect("/admin/players");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24 px-4 text-zinc-200 antialiased">
      <header className="border-b border-zinc-800/60 pb-6">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
          Edit Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Profile</span>
        </h1>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">
          Update registered athlete identification and league alignment metrics
        </p>
      </header>

      <EditPlayerForm 
        player={player} 
        teamsList={activeTeams} 
        updatePlayerAction={updatePlayer} 
      />
    </div>
  );
}