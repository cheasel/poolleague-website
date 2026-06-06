import { db } from "@/src/db";
import { matches, teams, seasons, divisions, teamRegistrations } from "@/src/db/schema";
import { eq, asc, desc, inArray, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import MatchDashboard, { MatchWithRelations } from "./MatchDashboard";
import { updateSeasonEndDate } from "@/src/utils/season-utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    sort?: "asc" | "desc";
    seasonId?: string;
    divisionId?: string;
  }>;
}

export default async function AdminMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sortParam = params.sort === "asc" ? "asc" : "desc";
  const sortOrder = sortParam === "asc" ? asc(matches.date) : desc(matches.date);

  // Fetch reference metadata from DB concurrently to optimize dashboard loading times
  const [allSeasons, allDivisions, rawTeams] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.startDate)),
    db.select().from(divisions).orderBy(asc(divisions.name)),
    db
      .select({
        id: teams.id,
        name: teams.name,
        divisionId: teamRegistrations.divisionId,
        homeVenueId: teams.homeVenueId,
      })
      .from(teamRegistrations)
      .innerJoin(teams, eq(teamRegistrations.teamId, teams.id))
  ]);

  // Determine active filtering parameters (URL-driven)
  const latestSeasonId = allSeasons[0]?.id?.toString() || "all";
  const seasonIdParam = params.seasonId || latestSeasonId;
  const divisionIdParam = params.divisionId || "all";

  // Construct optimized query conditions to filter matches on the database layer
  const conditions = [];
  if (seasonIdParam !== "all") {
    conditions.push(eq(matches.seasonId, Number(seasonIdParam)));
  }
  if (divisionIdParam !== "all") {
    conditions.push(eq(matches.divisionId, Number(divisionIdParam)));
  }

  // Fetch only the filtered matches from DB
  const allMatches = await db.query.matches.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      homeTeam: {
        with: {
          venue: true
        }
      },
      awayTeam: true,
      division: {
        with: {
          season: true
        }
      }
    },
    orderBy: sortOrder,
  });

  async function addMatchAction(formData: FormData) {
    "use server";
    const seasonId = Number(formData.get("seasonId"));
    const divisionId = Number(formData.get("divisionId"));
    const weekNumber = Number(formData.get("weekNumber") || 1);
    const matchDateStr = formData.get("matchDate") as string;

    const homeTeamIds = formData.getAll("homeTeamId").map(Number);
    const awayTeamIds = formData.getAll("awayTeamId").map(Number);

    if (!seasonId || !divisionId || !matchDateStr || homeTeamIds.length === 0 || awayTeamIds.length === 0) {
      return;
    }

    const matchDate = new Date(`${matchDateStr}T20:00:00`);

    // 1. Fetch existing matches for this division and week to check duplicates on the database level
    const existingMatches = await db.query.matches.findMany({
      where: (m, { and, eq }) => and(
        eq(m.divisionId, divisionId),
        eq(m.weekNumber, weekNumber)
      )
    });

    // Enforce Rule 1: Fetch venues of all involved teams to verify they are assigned
    const involvedTeamIds = Array.from(new Set([...homeTeamIds, ...awayTeamIds]));
    const teamVenues = await db
      .select({ id: teams.id, homeVenueId: teams.homeVenueId })
      .from(teams)
      .where(inArray(teams.id, involvedTeamIds));
    const teamVenueMap = new Map(teamVenues.map(t => [t.id, t.homeVenueId]));

    const insertValues = [];
    const seenMatchups = new Set<string>();

    for (let i = 0; i < homeTeamIds.length; i++) {
      const homeTeamId = homeTeamIds[i];
      const awayTeamId = awayTeamIds[i];

      if (!homeTeamId || !awayTeamId) continue;

      // Rule 1: Both teams must have a home venue assigned
      const homeVenue = teamVenueMap.get(homeTeamId);
      const awayVenue = teamVenueMap.get(awayTeamId);
      if (!homeVenue || !awayVenue) continue;

      // Rule 1: Same team can't play each other
      if (homeTeamId === awayTeamId) continue;

      // Rule 2a: Deduplicate within the current batch (order-independent matchup check)
      const matchupKey = [homeTeamId, awayTeamId].sort((a, b) => a - b).join('-');
      if (seenMatchups.has(matchupKey)) continue;
      seenMatchups.add(matchupKey);

      // Rule 2b: Check duplicates against existing database records for the same division/week (order-independent)
      const isDuplicate = existingMatches.some(em => {
        const emHome = em.homeTeamId;
        const emAway = em.awayTeamId;
        return (
          (emHome === homeTeamId && emAway === awayTeamId) ||
          (emHome === awayTeamId && emAway === homeTeamId)
        );
      });

      if (isDuplicate) continue;

      insertValues.push({
        seasonId,
        divisionId,
        homeTeamId,
        awayTeamId,
        weekNumber,
        date: matchDate,
        status: "scheduled" as const,
        homeScore: 0,
        awayScore: 0,
      });
    }

    if (insertValues.length > 0) {
      await db.insert(matches).values(insertValues);
      await updateSeasonEndDate(seasonId);
    }

    revalidatePath("/admin/matches");
  }

  async function clearDivisionScheduleAction(divisionId: number) {
    "use server";

    // 1. Verify if there are completed matches in this division
    const completedMatches = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.divisionId, divisionId),
          eq(matches.status, "completed")
        )
      )
      .limit(1);

    if (completedMatches.length > 0) {
      throw new Error("Cannot clear schedule: This division already has completed matches.");
    }

    // 2. Delete matches (cascade deletes games)
    const [sampleMatch] = await db
      .select({ seasonId: matches.seasonId })
      .from(matches)
      .where(eq(matches.divisionId, divisionId))
      .limit(1);

    await db.delete(matches).where(eq(matches.divisionId, divisionId));

    if (sampleMatch?.seasonId) {
      await updateSeasonEndDate(sampleMatch.seasonId);
    }

    revalidatePath("/admin/matches");
  }

  return (
    <MatchDashboard
      sortParam={sortParam}
      allMatches={allMatches as unknown as MatchWithRelations[]}
      rawTeams={rawTeams}
      addMatchAction={addMatchAction}
      clearDivisionScheduleAction={clearDivisionScheduleAction}
      seasons={allSeasons}
      divisions={allDivisions}
      selectedSeasonId={seasonIdParam}
      selectedDivisionId={divisionIdParam}
    />
  );
}