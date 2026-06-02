import { db } from "@/src/db";
import { teams, matches, seasons, divisions, teamRegistrations } from "@/src/db/schema";
import { eq, sql, desc, and, asc } from "drizzle-orm";
import StandingsClient from "./StandingsClient";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";

const getCachedMatchesForStandings = (seasonId: number | null, divisionId: number | null) => unstable_cache(
  async () => {
    const conditions = [];
    if (seasonId) {
      conditions.push(eq(matches.seasonId, seasonId));
    }
    if (divisionId) {
      conditions.push(eq(matches.divisionId, divisionId));
    }

    return db
      .select({
        id: matches.id,
        date: matches.date,
        status: matches.status,
        weekNumber: matches.weekNumber,
        homeTeamId: matches.homeTeamId,
        homeTeamName: sql<string>`home_teams.name`,
        awayTeamId: matches.awayTeamId,
        awayTeamName: sql<string>`away_teams.name`,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
      .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(matches.weekNumber), asc(matches.date));
  },
  ["standings-matches-list", String(seasonId), String(divisionId)],
  { revalidate: 60, tags: ["matches", "teams"] }
)();


export const revalidate = 60;

const getCachedSeasons = unstable_cache(
  async () => {
    return db.select().from(seasons).orderBy(desc(seasons.startDate));
  },
  ["seasons-list"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedDivisions = unstable_cache(
  async () => {
    return db.select().from(divisions).orderBy(divisions.tier);
  },
  ["divisions-list"],
  { revalidate: 300, tags: ["divisions"] }
);

const getCachedStandingsData = (seasonId: number | null, divisionId: number | null) => unstable_cache(
  async () => {
    // 2. Build target conditions
    const conditions = [eq(matches.status, "completed")];
    if (seasonId) conditions.push(eq(matches.seasonId, seasonId));
    if (divisionId) conditions.push(eq(matches.divisionId, divisionId));

    // 3. Extract completed matches within the filtered scope
    const completedMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        date: matches.date,
      })
      .from(matches)
      .where(and(...conditions))
      .orderBy(desc(matches.date), desc(matches.id));

    // 4. Fetch teams assigned to the selected division scope
    const regConditions = [];
    if (divisionId) {
      regConditions.push(eq(teamRegistrations.divisionId, divisionId));
    }
    if (seasonId) {
      regConditions.push(eq(teamRegistrations.seasonId, seasonId));
    }

    const divisionTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        logoUrl: teams.logoUrl,
      })
      .from(teamRegistrations)
      .innerJoin(teams, eq(teamRegistrations.teamId, teams.id))
      .where(regConditions.length > 0 ? and(...regConditions) : undefined);

    // Initialize form list for each team
    const formMap = divisionTeams.reduce((acc, team) => {
      acc[team.id] = [];
      return acc;
    }, {} as Record<number, ('W' | 'L' | 'D')[]>);

    // 5. Build memory ledger matrix to calculate stats
    const standingsMap = divisionTeams.reduce((acc, team) => {
      acc[team.id] = {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        // Home Performance Tracker
        homePlayed: 0, homeWins: 0, homeDraws: 0, homeLosses: 0, homeFramesWon: 0, homeFramesLost: 0,
        // Away Performance Tracker
        awayPlayed: 0, awayWins: 0, awayDraws: 0, awayLosses: 0, awayFramesWon: 0, awayFramesLost: 0,
      };
      return acc;
    }, {} as Record<number, any>);

    // Loop through match metrics to populate the ledger
    completedMatches.forEach((match) => {
      const home = standingsMap[match.homeTeamId!];
      const away = standingsMap[match.awayTeamId!];

      if (!home || !away) return; // Guard against out-of-scope records

      const hScore = Number(match.homeScore || 0);
      const aScore = Number(match.awayScore || 0);

      // Increment played counters
      home.homePlayed += 1;
      away.awayPlayed += 1;

      // Increment frames counts
      home.homeFramesWon += hScore;
      home.homeFramesLost += aScore;
      away.awayFramesWon += aScore;
      away.awayFramesLost += hScore;

      // Evaluate match points
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

      // Collect form results (up to 5 recent matches)
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

    // 6. Map to clean response nodes & compute final standing points
    const calculatedStandings = Object.values(standingsMap).map((t: any) => {
      // Aggregated Totals
      const overallPlayed = t.homePlayed + t.awayPlayed;
      const overallWins = t.homeWins + t.awayWins;
      const overallDraws = t.homeDraws + t.awayDraws;
      const overallLosses = t.homeLosses + t.awayLosses;
      const overallFramesWon = t.homeFramesWon + t.awayFramesWon;
      const overallFramesLost = t.homeFramesLost + t.awayFramesLost;

      // Points rule formulation: 2 for a Win, 1 for a Draw
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
        form: (formMap[t.id] || []).reverse(), // Oldest-to-newest
        // Specific matrices passed directly down to build Advanced Standings
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
    // Official Sort Precedence: Points Descending -> Frame Difference Descending -> Frames Won Descending
    .sort((a, b) => {
      if (b.overallPoints !== a.overallPoints) return b.overallPoints - a.overallPoints;
      if (b.frameDifference !== a.frameDifference) return b.frameDifference - a.frameDifference;
      return b.overallFramesWon - a.overallFramesWon;
    });

    return calculatedStandings;
  },
  ["standings-data", String(seasonId), String(divisionId)],
  { revalidate: 60, tags: ["standings"] }
)();

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

export default async function PublicStandingsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch dropdown lists from cache sequentially
  const allSeasons = await getCachedSeasons();
  const allDivisions = await getCachedDivisions();

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);

  // Filter divisions to only show the ones belonging to the selected season
  const seasonDivisions = allDivisions.filter(d => d.seasonId === selectedSeasonId);

  let selectedDivisionId = params.divisionId ? Number(params.divisionId) : null;
  if (!selectedDivisionId || !seasonDivisions.some(d => d.id === selectedDivisionId)) {
    selectedDivisionId = seasonDivisions[0]?.id || null;
  }

  const currentDivision = seasonDivisions.find(d => d.id === selectedDivisionId) || seasonDivisions[0];
  const isTopTier = currentDivision ? (currentDivision.tier === Math.min(...seasonDivisions.map(d => d.tier))) : true;

  // 2. Fetch computed standings and matches list from cache sequentially
  const calculatedStandings = await getCachedStandingsData(selectedSeasonId, selectedDivisionId);
  const allMatchesRaw = await getCachedMatchesForStandings(selectedSeasonId, selectedDivisionId);

  const formattedMatches = allMatchesRaw.map((m) => ({
    id: m.id,
    date: m.date ? new Date(m.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "TBD",
    status: m.status || "scheduled",
    weekNumber: m.weekNumber || 1,
    homeTeam: m.homeTeamName || "Home Team",
    awayTeam: m.awayTeamName || "Away Team",
    homeScore: m.homeScore !== null ? Number(m.homeScore) : null,
    awayScore: m.awayScore !== null ? Number(m.awayScore) : null,
  }));

  const completed = formattedMatches.filter((m) => m.status === "completed");
  const upcoming = formattedMatches.filter((m) => m.status !== "completed");

  // Get last 2 matchdays with completed matches
  const completedWeeks = Array.from(new Set(completed.map(m => m.weekNumber))).sort((a, b) => b - a);
  const last2Weeks = completedWeeks.slice(0, 2);
  const resultsByWeek = last2Weeks.map(weekNum => ({
    weekNumber: weekNum,
    matches: completed.filter(m => m.weekNumber === weekNum)
  }));

  // Get next 2 matchdays with upcoming matches
  const upcomingWeeks = Array.from(new Set(upcoming.map(m => m.weekNumber))).sort((a, b) => a - b);
  const next2Weeks = upcomingWeeks.slice(0, 2);
  const fixturesByWeek = next2Weeks.map(weekNum => ({
    weekNumber: weekNum,
    matches: upcoming.filter(m => m.weekNumber === weekNum)
  }));

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">Rankings Matrix</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            League <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Standings</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            Live point tracking tables compiled by wins, location splits, and structural frame differentials.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <Suspense fallback={
          <div className="text-slate-400 text-center py-12 font-bold uppercase tracking-wider text-xs">
            Loading standings...
          </div>
        }>
          <StandingsClient 
            standings={calculatedStandings}
            seasons={allSeasons.map(s => ({ id: s.id, name: s.name }))}
            divisions={seasonDivisions.map(d => ({ id: d.id, name: d.name }))}
            selectedSeasonId={selectedSeasonId || undefined}
            selectedDivisionId={selectedDivisionId || undefined}
            resultsByWeek={resultsByWeek}
            fixturesByWeek={fixturesByWeek}
            isTopTier={isTopTier}
          />
        </Suspense>
      </div>

    </div>
  );
}