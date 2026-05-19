import { db } from "@/src/db";
import { teams, players, matchGames, matches, divisions, seasons } from "@/src/db/schema";
import { eq, or, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TeamProfileClient from "./team-profile-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PublicTeamProfilePage({ params }: PageProps) {
  const { id } = await params;
  const teamId = Number(id);

  // 1. Fetch targeted team identity core taxonomy properties
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

  // 2. Fetch team roster
  const roster = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
    })
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.name));

  // 3. Fetch all match games in the league to compute roster stats
  const allGames = await db.select().from(matchGames);

  // Calculate live statistics for only the rostered players on this team
  const rosterStats = roster.map((player) => {
    let singlesPlayed = 0;
    let singlesWins = 0;
    let doublesPlayed = 0;
    let doublesWins = 0;

    allGames.forEach((game) => {
      const isHome = game.player1Id === player.id || game.player1PartnerId === player.id;
      const isAway = game.player2Id === player.id || game.player2PartnerId === player.id;
      
      if (!isHome && !isAway) return;

      const playerWon = isHome 
        ? (Number(game.player1Score || 0) > Number(game.player2Score || 0)) 
        : (Number(game.player2Score || 0) > Number(game.player1Score || 0));
      
      if (game.gameType === 'double') {
        doublesPlayed++;
        if (playerWon) doublesWins++;
      } else {
        singlesPlayed++;
        if (playerWon) singlesWins++;
      }
    });

    const totalPlayed = singlesPlayed + doublesPlayed;
    const totalWins = singlesWins + doublesWins;
    const winPercentage = totalPlayed > 0 ? ((totalWins / totalPlayed) * 100).toFixed(1) : "0.0";

    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      singlesPlayed,
      singlesWins,
      singlesLosses: singlesPlayed - singlesWins,
      doublesPlayed,
      doublesWins,
      doublesLosses: doublesPlayed - doublesWins,
      totalPlayed,
      totalWins,
      winPercentage
    };
  }).sort((a, b) => Number(b.winPercentage) - Number(a.winPercentage));

  // 4. Chain aliased tables to aggregate schedule lists
  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  const teamMatches = await db
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <Link href="/standings" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to League Standings
          </Link>
        </header>

        <TeamProfileClient 
          teamId={teamId}
          teamName={team.name}
          divisionName={team.divisionName || "Unassigned Division"}
          seasonName={team.seasonName || "Active Season"}
          roster={roster}
          rosterStats={rosterStats} // <-- PASS COMPUTED PLAYER STATS
          matches={teamMatches as any}
        />
      </div>
    </div>
  );
}