'use server';

import { db } from "@/src/db";
import { matches } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function fetchTitleRaceData(seasonId: number, divisionId: number) {
  // Database logic runs on the server.
  return await db
    .select()
    .from(matches)
    .where(and(eq(matches.seasonId, seasonId), eq(matches.divisionId, divisionId)));
}