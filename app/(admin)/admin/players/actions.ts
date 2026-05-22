"use server";

import { db } from "@/src/db";
import { players } from "@/src/db/schema";
import { supabaseStorage } from "@/src/lib/supabase-storage";
import { revalidatePath } from "next/cache";

export async function createPlayerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const teamId = Number(formData.get("teamId"));
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

  await db.insert(players).values({
    name,
    teamId: teamId || null,
    imageUrl: publicAvatarUrl, // Maps cleanly to your players.imageUrl column
  });

  revalidatePath("/admin/players");
}