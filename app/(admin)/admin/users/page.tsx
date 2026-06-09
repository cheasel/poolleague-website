import { db } from "@/src/db";
import { profiles } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import { createClient } from "@/src/utils/supabase/server";
import { redirect } from "next/navigation";
import UsersList from "./users-list";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // 1. Authenticate user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Authorize: Check if the logged-in user is an administrator
  const [callerProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id));

  if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "superadmin")) {
    redirect("/admin");
  }

  // 3. Fetch all user profiles sorted by email
  const allUsers = await db
    .select()
    .from(profiles)
    .orderBy(asc(profiles.email));

  return (
    <UsersList 
      users={allUsers} 
      currentUserId={user.id} 
      callerRole={callerProfile.role}
    />
  );
}
