import { db } from "@/src/db";
import { players, matchGames, matches, teams, divisions, seasons } from "@/src/db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PlayerProfileClient from "./player-profile-client";

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const playerId = Number(id);

  // 1. Fetch fundamental profile tracking data
  const [player] = await db
    .select({
      id: players.id,
      name: players.name,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(eq(players.id, playerId));

  if (!player) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Player profile sheet unavailable.</div>;
  }

  // 2. Fetch distinct season listing for filtering configuration parameters
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.name));

  // 3. Chain relational logs tracking frame results matched with division tiers
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  const rawGames = await db
    .select({
      id: matchGames.id,
      gameType: matchGames.gameType,
      player1Id: matchGames.player1Id,
      player1PartnerId: matchGames.player1PartnerId,
      player2Id: matchGames.player2Id,
      player2PartnerId: matchGames.player2PartnerId,
      player1Score: matchGames.player1Score,
      player2Score: matchGames.player2Score,
      matchId: matchGames.matchId,
      matchDate: matches.matchDate,
      homeTeamName: homeTeams.name,
      awayTeamName: awayTeams.name,
      seasonId: divisions.seasonId,
      seasonName: seasons.name,
      divisionName: divisions.name,
    })
    .from(matchGames)
    .leftJoin(matches, eq(matchGames.matchId, matches.id))
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .leftJoin(divisions, eq(homeTeams.divisionId, divisions.id))
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .where(
      or(
        eq(matchGames.player1Id, playerId),
        eq(matchGames.player1PartnerId, playerId),
        eq(matchGames.player2Id, playerId),
        eq(matchGames.player2PartnerId, playerId)
      )
    )
    .orderBy(desc(matches.matchDate), desc(matchGames.gameOrder));

  // 4. Gather list of names across entire system to map match IDs cleanly
  const globalPlayersList = await db.select().from(players);
  const playerMapRecord: Record<number, string> = {};
  globalPlayersList.forEach(p => {
    playerMapRecord[p.id] = p.name;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <Link href="/players" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Analytics Leaderboard
          </Link>
        </header>
  
        {/* Fixed: Changed activeSeasons to allSeasons */}
        <PlayerProfileClient
          playerId={playerId}
          playerName={player.name}
          teamName={player.teamName || "Unassigned Agent"}
          games={rawGames as any} 
          seasons={allSeasons}
          playerMap={playerMapRecord}
        />
      </div>
    </div>
  );
}