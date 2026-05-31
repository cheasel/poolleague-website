import { db } from "@/src/db";
import { teamRegistrations, teams, divisions } from "@/src/db/schema";
import { count, eq, sql } from "drizzle-orm";

export async function syncTeamRegistrations() {
  try {
    const [registrationCount] = await db.select({ count: count() }).from(teamRegistrations);
    if (registrationCount && registrationCount.count > 0) {
      return; // Already populated
    }

    console.log("🔄 Starting automatic self-healing team division registrations migration...");

    // Fetch all teams with divisionId assigned
    const teamsToMigrate = await db
      .select()
      .from(teams)
      .where(sql`${teams.divisionId} IS NOT NULL`);

    if (teamsToMigrate.length === 0) {
      console.log("ℹ️ No team division assignments to migrate.");
      return;
    }

    // Fetch all divisions to map seasonId
    const allDivisions = await db.select().from(divisions);
    const divisionSeasonMap = new Map(allDivisions.map(d => [d.id, d.seasonId]));

    console.log(`🔄 Migrating ${teamsToMigrate.length} teams to teamRegistrations...`);

    const insertValues = teamsToMigrate.map(t => {
      const seasonId = t.divisionId ? divisionSeasonMap.get(t.divisionId) : null;
      return {
        teamId: t.id,
        divisionId: t.divisionId,
        seasonId: seasonId || null,
      };
    }).filter(v => v.seasonId !== null); // Only migrate if we can resolve the season

    if (insertValues.length > 0) {
      await db.insert(teamRegistrations).values(insertValues as any);
      console.log("✅ Team division registrations successfully migrated.");
    } else {
      console.log("ℹ️ No team division assignments could be matched to seasons.");
    }
  } catch (error) {
    console.error("❌ Failed to run auto-healing team division registrations migration:", error);
  }
}
