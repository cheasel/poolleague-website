"use server";

import { db } from "@/src/db";
import { teams, divisions, teamRegistrations } from "@/src/db/schema";
import { supabaseStorage } from "@/src/lib/supabase-storage";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function createTeamAction(formData: FormData) {
  const name = formData.get("name") as string;
  const divisionId = formData.get("divisionId") ? Number(formData.get("divisionId")) : null;
  const logoFile = formData.get("logo") as File;

  let publicLogoUrl: string | null = null;

  // Verify that an actual file block was selected in the form
  if (logoFile && logoFile.size > 0) {
    // Generate an isolated file name to avoid namespace overwrites
    const fileExtension = logoFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

    // Upload the file directly to your public Supabase bucket
    const { data, error } = await supabaseStorage.storage
      .from("team-logos")
      .upload(fileName, logoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage Error:", error.message);
      throw new Error("Failed to upload team emblem asset.");
    }

    // Capture the static clean delivery link
    const { data: linkData } = supabaseStorage.storage
      .from("team-logos")
      .getPublicUrl(data.path);

    publicLogoUrl = linkData.publicUrl;
  }

  // Insert cleanly using transaction to guarantee registration
  await db.transaction(async (tx) => {
    const [insertedTeam] = await tx.insert(teams).values({
      name,
      logoUrl: publicLogoUrl, // Maps to your schema logoUrl string column
    }).returning();

    if (insertedTeam && divisionId) {
      // Find division season
      const [div] = await tx.select().from(divisions).where(eq(divisions.id, divisionId));
      if (div && div.seasonId) {
        await tx.insert(teamRegistrations).values({
          teamId: insertedTeam.id,
          seasonId: div.seasonId,
          divisionId,
        });
      }
    }
  });

  revalidatePath("/admin/teams");
}