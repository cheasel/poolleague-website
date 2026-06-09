import { createClient } from "@/src/utils/supabase/server";
import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { eq } from "drizzle-orm";

/**
 * Asserts that the currently logged-in user is authenticated and is NOT a viewer.
 * Throws an Error if unauthorized.
 * Returns the user's profile database record.
 */
export async function assertWritePrivilege() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthenticated: Please log in to perform this action.");
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));

  if (!profile || profile.role === "viewer") {
    throw new Error("Unauthorized: Viewers cannot modify data.");
  }

  return profile;
}

/**
 * Resolves whether the current logged-in user is in a read-only role (e.g. viewer).
 * If the user is not logged in, they are considered read-only by default.
 */
export async function getIsReadOnly() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id));

    return !profile || profile.role === "viewer";
  } catch (error) {
    console.error("Error checking read-only status:", error);
    return true; // Default to safe read-only fallback
  }
}
