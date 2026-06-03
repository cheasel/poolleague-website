import { db } from "@/src/db";
import { teams, players, matchGames, matches, divisions, seasons, teamMemberships, teamRegistrations } from "@/src/db/schema";
import { eq, or, and, asc, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TeamProfileClient from "./team-profile-client";
import { calculateRosterStats } from "@/src/utils/stats-calculator";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const getCachedTeamProfile = unstable_cache(
  async (teamId: number) => {
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        logoUrl: teams.logoUrl,
        divisionName: divisions.name,
        seasonName: seasons.name,
        seasonId: seasons.id,
      })
      .from(teams)
      .leftJoin(teamRegistrations, eq(teams.id, teamRegistrations.teamId))
      .leftJoin(divisions, eq(teamRegistrations.divisionId, divisions.id))
      .leftJoin(seasons, eq(teamRegistrations.seasonId, seasons.id))
      .where(eq(teams.id, teamId))
      .orderBy(desc(seasons.startDate));
    return rows[0] || null;
  },
  ["team-profile"],
  { revalidate: 60, tags: ["teams", "divisions", "seasons"] }
);

const getCachedRoster = unstable_cache(
  async (teamId: number, seasonId: number) => {
    return db
      .select({
        id: players.id,
        name: players.name,
        imageUrl: players.imageUrl,
      })
      .from(teamMemberships)
      .leftJoin(players, eq(teamMemberships.playerId, players.id))
      .where(
        and(
          eq(teamMemberships.teamId, teamId),
          eq(teamMemberships.seasonId, seasonId)
        )
      )
      .orderBy(asc(players.name));
  },
  ["team-roster"],
  { revalidate: 60, tags: ["players", "teams", "teamMemberships"] }
);

const getCachedTeamMatches = unstable_cache(
  async (teamId: number) => {
    const homeTeamsAlias = alias(teams, "homeTeamsAlias");
    const awayTeamsAlias = alias(teams, "awayTeamsAlias");

    return db
      .select({
        id: matches.id,
        matchDate: matches.date,
        status: matches.status,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeTeamName: homeTeamsAlias.name,
        awayTeamName: awayTeamsAlias.name,
        homeTeamScoreTotal: matches.homeScore,
        awayTeamScoreTotal: matches.awayScore,
      })
      .from(matches)
      .leftJoin(homeTeamsAlias, eq(matches.homeTeamId, homeTeamsAlias.id))
      .leftJoin(awayTeamsAlias, eq(matches.awayTeamId, awayTeamsAlias.id))
      .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
      .orderBy(desc(matches.date));
  },
  ["team-matches-list"],
  { revalidate: 60, tags: ["matches", "teams"] }
);

const getCachedTeamMatchGames = unstable_cache(
  async (matchIds: number[]) => {
    if (matchIds.length === 0) return [];
    return db
      .select()
      .from(matchGames)
      .where(inArray(matchGames.matchId, matchIds));
  },
  ["team-match-games"],
  { revalidate: 60, tags: ["matchGames"] }
);

export default async function PublicTeamProfilePage({ params }: PageProps) {
  const { id } = await params;
  const teamId = Number(id);

  const team = await getCachedTeamProfile(teamId);

  if (!team) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Team profile unavailable.</div>;
  }

  // Execute caching queries sequentially to prevent client-side deadlock on cache misses
  // Execute caching queries sequentially to prevent client-side deadlock on cache misses
  const rosterRaw = await getCachedRoster(teamId, team.seasonId || 0);
  const teamMatches = await getCachedTeamMatches(teamId);

  const completedTeamMatchIds = teamMatches
    .filter((m) => m.status === "completed")
    .map((m) => m.id);

  const teamGames = await getCachedTeamMatchGames(completedTeamMatchIds);
  const completedTeamMatchIdsSet = new Set(completedTeamMatchIds);

  const roster = rosterRaw
    .filter((p) => p.id !== null && p.name !== null)
    .map((p) => ({
      id: p.id!,
      name: p.name!,
      imageUrl: p.imageUrl,
    }));

  // Calculate live statistics for only the rostered players on this team
  const rosterStats = calculateRosterStats(
    roster,
    teamGames,
    completedTeamMatchIdsSet
  ).sort((a, b) => Number(b.winPercentage) - Number(a.winPercentage));

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-8 relative z-10 space-y-6">
          <Link href="/standings" prefetch={false} className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
            <ArrowLeft className="w-4 h-4" /> Return to Standings
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Squad Analytics Hub</span>
              <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter italic">
                Team <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Profile</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <TeamProfileClient 
          teamId={teamId}
          teamName={team.name}
          logoUrl={team.logoUrl}
          divisionName={team.divisionName || "Unassigned Division"}
          seasonName={team.seasonName || "Active Season"}
          roster={roster}
          rosterStats={rosterStats}
          matches={teamMatches as any}
        />
      </div>
    </div>
  );
}