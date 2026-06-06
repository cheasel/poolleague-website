import { db } from "@/src/db";
import { seasons, divisions, matches, teams, teamRegistrations } from "@/src/db/schema";
import { eq, sql, desc, and, asc } from "drizzle-orm";
import MatchHubClient from "./MatchHubClient";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

interface TeamLedger {
  id: number;
  name: string;
  logoUrl: string | null;
  homePlayed: number; homeWins: number; homeDraws: number; homeLosses: number; homeFramesWon: number; homeFramesLost: number;
  awayPlayed: number; awayWins: number; awayDraws: number; awayLosses: number; awayFramesWon: number; awayFramesLost: number;
}

interface StandingItem {
  id: number;
  name: string;
  logoUrl: string | null;
  overallPlayed: number;
  overallWins: number;
  overallDraws: number;
  overallLosses: number;
  overallFramesWon: number;
  overallFramesLost: number;
  frameDifference: number;
  overallPoints: number;
  form: ('W' | 'L' | 'D')[];
  home: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    fw: number;
    fl: number;
  };
  away: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    fw: number;
    fl: number;
  };
}

const getCachedSeasons = unstable_cache(
  async () => {
    return db.select().from(seasons).orderBy(desc(seasons.startDate));
  },
  ["seasons-list"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedDivisionsForSeason = unstable_cache(
  async (seasonId: number) => {
    return db
      .select()
      .from(divisions)
      .where(eq(divisions.seasonId, seasonId))
      .orderBy(divisions.tier);
  },
  ["divisions-season-list"],
  { revalidate: 300, tags: ["divisions"] }
);

const getCachedMatchesForSeason = unstable_cache(
  async (seasonId: number) => {
    return db
      .select({
        id: matches.id,
        date: matches.date,
        status: matches.status,
        weekNumber: matches.weekNumber,
        divisionId: matches.divisionId,
        homeTeamId: matches.homeTeamId,
        homeTeamName: sql<string>`home_teams.name`,
        homeTeamLogo: sql<string | null>`home_teams.logo_url`,
        awayTeamId: matches.awayTeamId,
        awayTeamName: sql<string>`away_teams.name`,
        awayTeamLogo: sql<string | null>`away_teams.logo_url`,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
      .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
      .where(eq(matches.seasonId, seasonId))
      .orderBy(asc(matches.date), asc(matches.id));
  },
  ["matches-season-list"],
  { revalidate: 60, tags: ["matches", "teams"] }
);

const getCachedStandingsForSeason = unstable_cache(
  async (seasonId: number) => {
    // 1. Fetch completed matches in this season
    const completedMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        date: matches.date,
        divisionId: matches.divisionId,
      })
      .from(matches)
      .where(and(eq(matches.seasonId, seasonId), eq(matches.status, "completed")))
      .orderBy(desc(matches.date), desc(matches.id));

    // 2. Fetch all team registrations and team info in this season
    const registrations = await db
      .select({
        teamId: teamRegistrations.teamId,
        teamName: teams.name,
        teamLogo: teams.logoUrl,
        divisionId: teamRegistrations.divisionId,
      })
      .from(teamRegistrations)
      .innerJoin(teams, eq(teamRegistrations.teamId, teams.id))
      .where(eq(teamRegistrations.seasonId, seasonId));

    // Get all divisions in this season
    const divs = await db
      .select()
      .from(divisions)
      .where(eq(divisions.seasonId, seasonId))
      .orderBy(divisions.tier);

    const standingsMap: Record<number, StandingItem[]> = {};

    for (const div of divs) {
      const divisionTeams = registrations.filter(r => r.divisionId === div.id);
      const divMatches = completedMatches.filter(m => m.divisionId === div.id);

      // Initialize form list for each team
      const formMap = divisionTeams.reduce((acc, r) => {
        acc[r.teamId as number] = [];
        return acc;
      }, {} as Record<number, ('W' | 'L' | 'D')[]>);

      // Initialize ledger matrix to calculate stats
      const ledgerMap = divisionTeams.reduce((acc, r) => {
        acc[r.teamId as number] = {
          id: r.teamId as number,
          name: r.teamName,
          logoUrl: r.teamLogo,
          homePlayed: 0, homeWins: 0, homeDraws: 0, homeLosses: 0, homeFramesWon: 0, homeFramesLost: 0,
          awayPlayed: 0, awayWins: 0, awayDraws: 0, awayLosses: 0, awayFramesWon: 0, awayFramesLost: 0,
        };
        return acc;
      }, {} as Record<number, TeamLedger>);

      // Loop through match metrics to populate ledger
      divMatches.forEach((match) => {
        const home = ledgerMap[match.homeTeamId!];
        const away = ledgerMap[match.awayTeamId!];

        if (!home || !away) return; // Guard against out-of-scope records

        const hScore = Number(match.homeScore || 0);
        const aScore = Number(match.awayScore || 0);

        home.homePlayed += 1;
        away.awayPlayed += 1;

        home.homeFramesWon += hScore;
        home.homeFramesLost += aScore;
        away.awayFramesWon += aScore;
        away.awayFramesLost += hScore;

        if (hScore > aScore) {
          home.homeWins += 1;
          away.awayLosses += 1;
        } else if (hScore < aScore) {
          away.awayWins += 1;
          home.homeLosses += 1;
        } else {
          home.homeDraws += 1;
          away.awayDraws += 1;
        }

        const homeId = match.homeTeamId!;
        const awayId = match.awayTeamId!;
        if (formMap[homeId] && formMap[homeId].length < 5) {
          if (hScore > aScore) formMap[homeId].push('W');
          else if (hScore < aScore) formMap[homeId].push('L');
          else formMap[homeId].push('D');
        }
        if (formMap[awayId] && formMap[awayId].length < 5) {
          if (aScore > hScore) formMap[awayId].push('W');
          else if (aScore < hScore) formMap[awayId].push('L');
          else formMap[awayId].push('D');
        }
      });

      // Map to clean response nodes & sort
      const calculatedStandings = Object.values(ledgerMap).map((t: TeamLedger) => {
        const overallPlayed = t.homePlayed + t.awayPlayed;
        const overallWins = t.homeWins + t.awayWins;
        const overallDraws = t.homeDraws + t.awayDraws;
        const overallLosses = t.homeLosses + t.awayLosses;
        const overallFramesWon = t.homeFramesWon + t.awayFramesWon;
        const overallFramesLost = t.homeFramesLost + t.awayFramesLost;
        const overallPoints = (overallWins * 2) + (overallDraws * 1);
        const frameDifference = overallFramesWon - overallFramesLost;

        return {
          id: t.id,
          name: t.name,
          logoUrl: t.logoUrl,
          overallPlayed,
          overallWins,
          overallDraws,
          overallLosses,
          overallFramesWon,
          overallFramesLost,
          frameDifference,
          overallPoints,
          form: (formMap[t.id] || []).reverse(),
          home: {
            played: t.homePlayed,
            wins: t.homeWins,
            draws: t.homeDraws,
            losses: t.homeLosses,
            fw: t.homeFramesWon,
            fl: t.homeFramesLost,
          },
          away: {
            played: t.awayPlayed,
            wins: t.awayWins,
            draws: t.awayDraws,
            losses: t.awayLosses,
            fw: t.awayFramesWon,
            fl: t.awayFramesLost,
          }
        };
      })
      .sort((a, b) => {
        if (b.overallPoints !== a.overallPoints) return b.overallPoints - a.overallPoints;
        if (b.frameDifference !== a.frameDifference) return b.frameDifference - a.frameDifference;
        return b.overallFramesWon - a.overallFramesWon;
      });

      standingsMap[div.id] = calculatedStandings;
    }

    return standingsMap;
  },
  ["standings-season-map"],
  { revalidate: 60, tags: ["standings", "matches", "teams"] }
);

export default async function MatchHubPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch seasons
  const allSeasons = await getCachedSeasons();
  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);

  if (!selectedSeasonId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-bold uppercase tracking-wider text-xs">
        No seasons configured in the system.
      </div>
    );
  }

  // 2. Fetch season-specific data
  const seasonDivisions = await getCachedDivisionsForSeason(selectedSeasonId);
  const allMatches = await getCachedMatchesForSeason(selectedSeasonId);
  const standingsMap = await getCachedStandingsForSeason(selectedSeasonId);

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100 relative">
      <Suspense fallback={
        <div className="text-slate-400 text-center py-20 font-bold uppercase tracking-wider text-xs">
          Loading Match Hub...
        </div>
      }>
        <MatchHubClient 
          seasons={allSeasons.map(s => ({ id: s.id, name: s.name }))}
          divisions={seasonDivisions.map(d => ({ id: d.id, name: d.name, tier: d.tier }))}
          matches={allMatches}
          standingsMap={standingsMap}
          selectedSeasonId={selectedSeasonId}
        />
      </Suspense>
    </div>
  );
}
