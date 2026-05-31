"use server";

import { db } from "@/src/db";
import { players, teamMemberships, seasons, teamRegistrations } from "@/src/db/schema";
import { supabaseStorage } from "@/src/lib/supabase-storage";
import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";

export async function createPlayerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const teamId = formData.get("teamId") ? Number(formData.get("teamId")) : null;
  const avatarFile = formData.get("avatar") as File;

  let publicAvatarUrl: string | null = null;

  if (avatarFile && avatarFile.size > 0) {
    const fileExtension = avatarFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;

    const { data, error } = await supabaseStorage.storage
      .from("player-avatars")
      .upload(fileName, avatarFile);

    if (!error && data) {
      const { data: linkData } = supabaseStorage.storage
        .from("player-avatars")
        .getPublicUrl(data.path);
        
      publicAvatarUrl = linkData.publicUrl;
    }
  }

  const [insertedPlayer] = await db.insert(players).values({
    name,
    imageUrl: publicAvatarUrl, // Maps cleanly to your players.imageUrl column
  }).returning();

  if (insertedPlayer && teamId) {
    // Look up active season
    const activeSeasons = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
    let targetSeason = activeSeasons[0];
    if (!targetSeason) {
      const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1);
      targetSeason = allSeasons[0];
    }

    if (targetSeason) {
      // Look up division of the team in that season
      const [reg] = await db
        .select()
        .from(teamRegistrations)
        .where(
          and(
            eq(teamRegistrations.teamId, teamId),
            eq(teamRegistrations.seasonId, targetSeason.id)
          )
        );

      await db.insert(teamMemberships).values({
        playerId: insertedPlayer.id,
        teamId,
        seasonId: targetSeason.id,
        divisionId: reg?.divisionId || null,
      });
    }
  }

  revalidatePath("/admin/players");
}