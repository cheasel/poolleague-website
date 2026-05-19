import { db } from "@/src/db";
import { teams, matches, seasons, divisions } from "@/src/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import StandingsClient from "./StandingsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

export default async function PublicStandingsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch dropdown lists
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const allDivisions = await db.select().from(divisions).orderBy(divisions.tier);

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || null);

  // 2. Build target conditions
  const conditions = [eq(matches.status, "completed")];
  if (selectedSeasonId) conditions.push(eq(matches.seasonId, selectedSeasonId));
  if (selectedDivisionId) conditions.push(eq(matches.divisionId, selectedDivisionId));

  // 3. Extract completed matches within the filtered scope
  const completedMatches = await db
    .select({
      id: matches.id,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(and(...conditions));

  // 4. Fetch teams assigned to the selected division scope
  const divisionTeams = selectedDivisionId 
    ? await db.select().from(teams).where(eq(teams.divisionId, selectedDivisionId))
    : await db.select().from(teams);

  // 5. Build memory ledger matrix to calculate stats
  const standingsMap = divisionTeams.reduce((acc, team) => {
    acc[team.id] = {
      id: team.id,
      name: team.name,
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

    // Points rule formulation: 3 for a Win, 1 for a Draw
    const overallPoints = (overallWins * 3) + (overallDraws * 1);
    const frameDifference = overallFramesWon - overallFramesLost;

    return {
      id: t.id,
      name: t.name,
      overallPlayed,
      overallWins,
      overallDraws,
      overallLosses,
      overallFramesWon,
      overallFramesLost,
      frameDifference,
      overallPoints,
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">Rankings Matrix</span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          League <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Standings</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-1">
          Live point tracking tables compiled by wins, locations splits, and structural frame differentials.
        </p>
      </div>

      <StandingsClient 
        standings={calculatedStandings}
        seasons={allSeasons.map(s => ({ id: s.id, name: s.name }))}
        divisions={allDivisions.map(d => ({ id: d.id, name: d.name }))}
        selectedSeasonId={selectedSeasonId || undefined}
        selectedDivisionId={selectedDivisionId || undefined}
      />
    </div>
  );
}