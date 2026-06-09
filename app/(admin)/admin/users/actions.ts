"use server";

import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/src/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Helper to create an admin client using the private service role key
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment configurations.");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Check if the current logged-in user is an administrator
async function checkAdminAuthorization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated: Please log in to perform this action.");

  const [callerProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));

  if (!callerProfile || callerProfile.role !== "admin") {
    throw new Error("Unauthorized: Only administrators can manage user accounts.");
  }
  return user;
}

export async function updateUserRoleAction(targetUserId: string, newRole: "admin" | "captain" | "viewer") {
  await checkAdminAuthorization();

  // Update target user's role in the database
  await db
    .update(profiles)
    .set({ role: newRole })
    .where(eq(profiles.id, targetUserId));

  revalidatePath("/admin/users");
  return { success: true };
}

export async function createUserAction(
  email: string,
  password: string,
  role: "admin" | "captain" | "viewer"
) {
  await checkAdminAuthorization();

  const adminClient = getAdminClient();

  // 1. Create the user in Supabase Auth via the Admin API
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  const newUser = data.user;
  if (!newUser) {
    throw new Error("Failed to retrieve new user credentials.");
  }

  // 2. Insert user profile defensively (if not already handled by a database trigger)
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, newUser.id));

  if (!existing) {
    await db.insert(profiles).values({
      id: newUser.id,
      email: newUser.email!,
      role: role,
    });
  } else {
    // If trigger already inserted it, ensure the role matches the requested one
    await db
      .update(profiles)
      .set({ role })
      .where(eq(profiles.id, newUser.id));
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUserAction(targetUserId: string) {
  const currentUser = await checkAdminAuthorization();

  if (currentUser.id === targetUserId) {
    throw new Error("For safety, you cannot delete your own active administrator account.");
  }

  const adminClient = getAdminClient();

  // 1. Delete the user from Supabase Auth credentials via the Admin API
  const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (error) {
    throw new Error(error.message);
  }

  // 2. Delete the profile row from the public database table
  await db
    .delete(profiles)
    .where(eq(profiles.id, targetUserId));

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getCurrentUserProfileAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));

  return profile
    ? { email: profile.email, role: profile.role }
    : { email: user.email || "", role: "viewer" as const };
}

export async function changeUserPasswordAction(targetUserId: string, newPassword: string) {
  await checkAdminAuthorization();

  const adminClient = getAdminClient();

  const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
