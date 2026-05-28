import { db } from "../src/db";
import { sql } from "drizzle-orm";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  console.log("Checking Supabase auth users...");
  try {
    const result = await db.execute(sql`
      SELECT id, email, created_at, last_sign_in_at 
      FROM auth.users
    `);
    console.log("Auth Users:", result);

    const profilesResult = await db.execute(sql`
      SELECT id, email, role, created_at
      FROM public.profiles
    `);
    console.log("Public Profiles:", profilesResult);
  } catch (err: any) {
    console.error("❌ Failed to query auth users:", err.message);
  }
}

run().then(() => process.exit(0));
