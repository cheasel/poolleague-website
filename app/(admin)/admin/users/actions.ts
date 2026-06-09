"use server";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/src/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUserRoleAction(targetUserId: string, newRole: "admin" | "captain" | "viewer") {
  // 1. Authenticate the active user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated: Please log in to perform this action.");

  // 2. Authorize: Check if the calling user has the admin role in the profiles table
  const [callerProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));

  if (!callerProfile || callerProfile.role !== "admin") {
    throw new Error("Unauthorized: Only administrators can modify user roles.");
  }

  // 3. Update the target user's role in the database
  await db
    .update(profiles)
    .set({ role: newRole })
    .where(eq(profiles.id, targetUserId));

  // 4. Revalidate cache
  revalidatePath("/admin/users");
  
  return { success: true };
}
