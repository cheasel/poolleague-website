import { db } from "@/src/db";
import { teams, matches, seasons, divisions, matchGames, teamRegistrations } from "@/src/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import TeamStatsClient from "./TeamStatsClient";
import { calculateTeamStats } from "@/src/utils/stats-calculator";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

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

const getCachedTeamStatsData = unstable_cache(
  async (
    selectedSeasonId: number | null,
    selectedDivisionId: number | null
  ) => {
    const completedMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, "completed"),
          selectedSeasonId ? eq(matches.seasonId, selectedSeasonId) : undefined,
          selectedDivisionId ? eq(matches.divisionId, selectedDivisionId) : undefined
        )
      );

    const completedMatchIds = completedMatches.map((m) => m.id);

    const baseTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        logoUrl: teams.logoUrl,
      })
      .from(teamRegistrations)
      .innerJoin(teams, eq(teamRegistrations.teamId, teams.id))
      .where(
        and(
          selectedSeasonId ? eq(teamRegistrations.seasonId, selectedSeasonId) : undefined,
          selectedDivisionId ? eq(teamRegistrations.divisionId, selectedDivisionId) : undefined
        )
      );

    const gamesPlayed = completedMatchIds.length > 0
      ? await db
          .select({
            matchId: matchGames.matchId,
            gameType: matchGames.gameType,
            player1Score: matchGames.player1Score,
            player2Score: matchGames.player2Score,
          })
          .from(matchGames)
          .where(inArray(matchGames.matchId, completedMatchIds))
      : [];

    return calculateTeamStats(
      baseTeams,
      completedMatches,
      gamesPlayed
    );
  },
  ["teams-stats-data"],
  { revalidate: 60, tags: ["teams", "matches"] }
);

export default async function PublicTeamsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const allSeasons = await getCachedSeasons();
  const allDivisions = await getCachedDivisions();

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || null);

  const calculatedTeams = await getCachedTeamStatsData(selectedSeasonId, selectedDivisionId);

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">Performance Matrix</span>
          <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tighter italic leading-none">
            Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Statistics</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            Compare team performances across singles matches, doubles frames, and overall win-loss ratios.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <Suspense fallback={
          <div className="text-slate-400 text-center py-12 font-bold uppercase tracking-wider text-xs">
            Loading team statistics...
          </div>
        }>
          <TeamStatsClient
            initialTeams={calculatedTeams}
            seasons={allSeasons.map((s) => ({ id: s.id, name: s.name }))}
            divisions={allDivisions.map((d) => ({ id: d.id, name: d.name }))}
            selectedSeasonId={selectedSeasonId || undefined}
            selectedDivisionId={selectedDivisionId || undefined}
          />
        </Suspense>
      </div>
    </div>
  );
}
