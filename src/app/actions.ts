'use server';
import { db } from "@/src/db";
import { matches, teams } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function fetchTitleRaceData(seasonId: number, divisionId: number) {
  // Database logic here runs on the server, so 'fs', 'net', 'tls' are available
  return await db.select().from(matches).where(and(eq(matches.seasonId, seasonId), eq(matches.divisionId, divisionId)));
}