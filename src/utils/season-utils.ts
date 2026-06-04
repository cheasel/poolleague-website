import { db } from "@/src/db";
import { seasons, matches } from "@/src/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Updates a season's endDate to the date of the last scheduled match in that season.
 * @param seasonId The ID of the season to update
 * @param tx Optional Drizzle transaction client
 */
export async function updateSeasonEndDate(seasonId: number, tx?: any) {
  const client = tx || db;

  // 1. Fetch the maximum match date for this season
  const [maxMatch] = await client
    .select({ maxDate: sql<Date | null>`max(${matches.date})` })
    .from(matches)
    .where(eq(matches.seasonId, seasonId));

  // 2. Set the season's end date to match the last match's date
  const newEndDate = maxMatch?.maxDate ? new Date(maxMatch.maxDate) : null;

  await client
    .update(seasons)
    .set({ endDate: newEndDate })
    .where(eq(seasons.id, seasonId));
}
