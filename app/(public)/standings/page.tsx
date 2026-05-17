import { db } from "@/src/db";
import { teams, divisions, matches, seasons } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import Link from "next/link";
import StandingsClient from "./standings-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    division?: string;
    sort?: string;
  }>;
}

export default async function StandingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;

  // 1. Fetch Divisions for structural navigation tabs
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  // 2. Fetch Teams belonging to the active division tier
  const activeTeams = activeDivId
    ? await db.select().from(teams).where(eq(teams.divisionId, activeDivId))
    : [];

  // 3. Fetch all completed matches to aggregate current metrics live
  const allCompletedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "completed"));

  // 4. In-Memory Processing Matrix for Standings Rows
  const standingsRows = activeTeams.map((team) => {
    let played = 0;
    let won = 0;
    let lost = 0;
    let drawn = 0;
    let framesFor = 0;
    let framesAgainst = 0;

    allCompletedMatches.forEach((match) => {
      const isHome = match.homeTeamId === team.id;
      const isAway = match.awayTeamId === team.id;

      if (!isHome && !isAway) return;

      played++;
      const homeScore = Number(match.homeTeamScoreTotal || 0);
      const awayScore = Number(match.awayTeamScoreTotal || 0);

      if (isHome) {
        framesFor += homeScore;
        framesAgainst += awayScore;
        if (homeScore > awayScore) won++;
        else if (homeScore < awayScore) lost++;
        else drawn++;
      } else {
        framesFor += awayScore;
        framesAgainst += homeScore;
        if (awayScore > homeScore) won++;
        else if (awayScore < homeScore) lost++;
        else drawn++;
      }
    });

    // Compute standard league point weights (3 for Win, 1 for Draw)
    const points = (won * 2) + (drawn * 1);
    const frameDifference = framesFor - framesAgainst;

    return {
      teamId: team.id,
      teamName: team.name,
      played,
      won,
      lost,
      drawn,
      framesFor,
      framesAgainst,
      frameDifference,
      points,
    };
  });

  // Sort logically: highest points first, followed by frame difference tie-breakers
  const sortedStandings = standingsRows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.frameDifference - a.frameDifference;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 block mb-1">League Tables</span>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Official Standings</h1>
            <p className="text-slate-500 text-xs font-medium mt-1">Real-time ranking matrices evaluated by frame differentials and point weights.</p>
          </div>

          {/* Bracket Division Selector Tabs Ribbon */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {allDivisions.map((div) => (
              <Link
                key={div.id}
                href={`/standings?division=${div.id}`}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeDivId === div.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                    : "bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {div.name}
              </Link>
            ))}
          </div>
        </header>

        {activeDivId && sortedStandings.length > 0 ? (
          <StandingsClient initialRows={sortedStandings} />
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-20 text-center font-black uppercase tracking-widest text-slate-300 italic shadow-sm">
            No active clubs rostered in this division tier bracket yet.
          </div>
        )}
      </div>
    </div>
  );
}