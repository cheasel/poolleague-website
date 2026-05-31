import { db } from "../src/db";
import { seasons, divisions, teams, players, matches } from "../src/db/schema";
import { sql, eq, count, and, desc } from "drizzle-orm";

async function run() {
  console.log("Running dashboard database query diagnostics inside workspace...");
  try {
    console.log("Testing teams without players query...");
    const [teamsWithoutPlayers] = await db
      .select({ count: count() })
      .from(teams)
      .where(
        sql`NOT EXISTS (
          SELECT 1 FROM team_memberships 
          WHERE team_memberships.team_id = ${teams.id}
        )`
      );
    console.log("Teams without players:", teamsWithoutPlayers);

    console.log("Testing double-booked venues query with CAST...");
    try {
      const doubleBookedResult = await db.execute(sql`
        SELECT COUNT(DISTINCT m1.id) as count
        FROM matches m1
        JOIN matches m2 ON m1.date::date = m2.date::date AND m1.id < m2.id
        JOIN teams t1 ON m1.home_team_id = t1.id
        JOIN teams t2 ON m2.home_team_id = t2.id
        WHERE t1.home_venue_id = t2.home_venue_id 
          AND m1.status = 'scheduled' 
          AND m2.status = 'scheduled'
          AND m1.date IS NOT NULL
          AND m2.date IS NOT NULL
      `);
      console.log("Double booked result (CAST):", doubleBookedResult);
    } catch (err: any) {
      console.error("❌ Double-booked query with CAST failed:", err.message);
    }

    console.log("Testing double-booked venues query with date()...");
    try {
      const doubleBookedResultLegacy = await db.execute(sql`
        SELECT COUNT(DISTINCT m1.id) as count
        FROM matches m1
        JOIN matches m2 ON date(m1.date) = date(m2.date) AND m1.id < m2.id
        JOIN teams t1 ON m1.home_team_id = t1.id
        JOIN teams t2 ON m2.home_team_id = t2.id
        WHERE t1.home_venue_id = t2.home_venue_id 
          AND m1.status = 'scheduled' 
          AND m2.status = 'scheduled'
          AND m1.date IS NOT NULL
          AND m2.date IS NOT NULL
      `);
      console.log("Double booked result (date()):", doubleBookedResultLegacy);
    } catch (err: any) {
      console.error("❌ Double-booked query with date() failed:", err.message);
    }

  } catch (err: any) {
    console.error("❌ Diagnostic query failed with error:", err.message);
  }
}

run().then(() => process.exit(0));
