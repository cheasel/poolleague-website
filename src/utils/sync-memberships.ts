import { db } from "@/src/db";
import { teamMemberships, players, teams, seasons } from "@/src/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";

export async function syncMemberships() {
  try {
    const [membershipCount] = await db.select({ count: count() }).from(teamMemberships);
    if (membershipCount && membershipCount.count > 0) {
      return; // Already populated
    }

    console.log("🔄 Starting automatic self-healing team memberships migration...");

    // Fetch active/latest season
    const activeSeasons = await db.select().from(seasons).where(eq(seasons.isActive, true)).limit(1);
    let targetSeason = activeSeasons[0];
    if (!targetSeason) {
      const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1);
      targetSeason = allSeasons[0];
    }

    if (!targetSeason) {
      console.warn("⚠️ No season exists in the database. Cannot migrate player memberships.");
      return;
    }

    // Fetch all players with a teamId assigned
    const playersToMigrate = await db
      .select()
      .from(players)
      .where(sql`${players.teamId} IS NOT NULL`);

    if (playersToMigrate.length === 0) {
      console.log("ℹ️ No player team assignments to migrate.");
      return;
    }

    // Fetch all teams to map divisionId
    const allTeams = await db.select().from(teams);
    const teamDivisionMap = new Map(allTeams.map(t => [t.id, t.divisionId]));

    console.log(`🔄 Migrating ${playersToMigrate.length} players to Season: "${targetSeason.name}"...`);

    const insertValues = playersToMigrate.map(p => ({
      playerId: p.id,
      teamId: p.teamId,
      seasonId: targetSeason.id,
      divisionId: p.teamId ? (teamDivisionMap.get(p.teamId) || null) : null,
      isCaptain: false,
    }));

    await db.insert(teamMemberships).values(insertValues);
    console.log("✅ Team memberships successfully migrated.");
  } catch (error) {
    console.error("❌ Failed to run auto-healing team memberships migration:", error);
  }
}
