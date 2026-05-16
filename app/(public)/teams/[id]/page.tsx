import { db } from "@/src/db";
import { teams, players, matches, divisions, seasons } from "@/src/db/schema";
import { eq, or, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TeamProfileClient from "./team-profile-client";

export default async function PublicTeamProfilePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const teamId = Number(id);

  // 1. Fetch targeted team identity core properties
  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      divisionName: divisions.name,
      seasonName: seasons.name,
    })
    .from(teams)
    .leftJoin(divisions, eq(teams.divisionId, divisions.id))
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .where(eq(teams.id, teamId));

  if (!team) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Team profile unavailable.</div>;
  }

  // 2. Fetch team roster containing competitor avatar image url strings
  const roster = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
    })
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.name));

  // 3. Chain aliased tables to aggregate full schedule fixtures lists
  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  const teamMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: homeTeamsAlias.name,
      awayTeamName: awayTeamsAlias.name,
      // FIXED HERE: Mapping exact schema column identifiers
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
    })
    .from(matches)
    .leftJoin(homeTeamsAlias, eq(matches.homeTeamId, homeTeamsAlias.id))
    .leftJoin(awayTeamsAlias, eq(matches.awayTeamId, awayTeamsAlias.id))
    .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
    .orderBy(desc(matches.matchDate));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <Link href="/standings" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to League Standings
          </Link>
        </header>

        {/* Hand verified data structures directly to client module layout */}
        <TeamProfileClient 
          teamId={teamId}
          teamName={team.name}
          divisionName={team.divisionName || "Unassigned Division"}
          seasonName={team.seasonName || "Active Season"}
          roster={roster}
          matches={teamMatches as any}
        />
      </div>
    </div>
  );
}