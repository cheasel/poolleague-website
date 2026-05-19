import { db } from "@/src/db";
import { players, matchGames, teams, matches } from "@/src/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import PlayerStatsClient from "./PlayerStatsClient";

export const dynamic = "force-dynamic";

export default async function PublicPlayersPage() {
  // 1. Calculate how many matches EACH team has actually completed so far (Unchanged Logic)
  const teamCompletedCounts = await db
    .select({
      teamId: teams.id,
      completedMatches: sql<number>`
        count(
          case 
            when ${matches.status} = 'completed' then 1 
            else null 
          end
        )
      `
    })
    .from(teams)
    .leftJoin(
      matches,
      sql`${teams.id} = ${matches.homeTeamId} or ${teams.id} = ${matches.awayTeamId}`
    )
    .groupBy(teams.id);

  const completedMap = teamCompletedCounts.reduce((acc, curr) => {
    acc[curr.teamId] = Number(curr.completedMatches || 0);
    return acc;
  }, {} as Record<number, number>);

  // 2. Fetch all raw stats broken down into your grid components (Unchanged Logic)
  const framesWonSql = sql<number>`
    count(
      case 
        when (${players.id} = ${matchGames.player1Id} or ${players.id} = ${matchGames.player1PartnerId}) 
             and ${matchGames.player1Score} > ${matchGames.player2Score} then 1
        when (${players.id} = ${matchGames.player2Id} or ${players.id} = ${matchGames.player2PartnerId}) 
             and ${matchGames.player2Score} > ${matchGames.player1Score} then 1
        else null
      end
    )
  `;

  const rawLeaderboard = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
      teamId: players.teamId,
      teamName: teams.name,
      matchPlay: sql<number>`count(distinct ${matchGames.matchId})`,
      singlePlay: sql<number>`count(case when ${matchGames.gameType} = 'single' then 1 else null end)`,
      singleWin: sql<number>`
        count(
          case 
            when ${matchGames.gameType} = 'single' 
                 and ((${players.id} = ${matchGames.player1Id} and ${matchGames.player1Score} > ${matchGames.player2Score}) or 
                      (${players.id} = ${matchGames.player2Id} and ${matchGames.player2Score} > ${matchGames.player1Score})) then 1 
            else null 
          end
        )
      `,
      doublePlay: sql<number>`count(case when ${matchGames.gameType} = 'double' then 1 else null end)`,
      doubleWin: sql<number>`
        count(
          case 
            when ${matchGames.gameType} = 'double' 
                 and ((${players.id} = ${matchGames.player1Id} or ${players.id} = ${matchGames.player1PartnerId}) and ${matchGames.player1Score} > ${matchGames.player2Score} or 
                      (${players.id} = ${matchGames.player2Id} or ${players.id} = ${matchGames.player2PartnerId}) and ${matchGames.player2Score} > ${matchGames.player1Score}) then 1 
            else null 
          end
        )
      `,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .leftJoin(
      matchGames,
      sql`${players.id} = ${matchGames.player1Id} 
          or ${players.id} = ${matchGames.player1PartnerId} 
          or ${players.id} = ${matchGames.player2Id} 
          or ${players.id} = ${matchGames.player2PartnerId}`
    )
    .groupBy(players.id, players.name, teams.name, players.teamId, players.imageUrl)
    .orderBy(desc(framesWonSql));

  // 3. Format the data & Filter out players who haven't played any frames yet
  const initialPlayers = rawLeaderboard
    .map((p) => {
      const singleLost = Math.max(0, p.singlePlay - p.singleWin);
      const doubleLost = Math.max(0, p.doublePlay - p.doubleWin);
      
      const totalPlay = p.singlePlay + p.doublePlay;
      const totalWin = p.singleWin + p.doubleWin;
      const totalLost = singleLost + doubleLost;

      const singlePct = p.singlePlay > 0 ? ((p.singleWin / p.singlePlay) * 100).toFixed(0) : "0";
      const doublePct = p.doublePlay > 0 ? ((p.doubleWin / p.doublePlay) * 100).toFixed(0) : "0";
      const totalPct = totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(0) : "0";

      const totalTeamMatches = p.teamId ? (completedMap[p.teamId] || 0) : 0;

      return {
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        teamName: p.teamName || "Unassigned",
        matchPlay: p.matchPlay, 
        maxTeamMatches: totalTeamMatches,
        singlePlay: p.singlePlay,
        singleWin: p.singleWin,
        singleLost,
        singlePct,
        doublePlay: p.doublePlay,
        doubleWin: p.doubleWin,
        doubleLost,
        doublePct,
        totalPlay,
        totalWin,
        totalLost,
        totalPct,
      };
    })
    // 🎯 FILTER: Only show players with at least 1 frame played
    .filter(player => player.totalPlay > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">Seasonal Analytics</span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Leaderboard</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-1">
          Live statistics tracking framing efficiency, singles performance, and overall win ratios.
        </p>
      </div>

      <PlayerStatsClient initialPlayers={initialPlayers} divisions={[]} activeDivId={1} />
    </div>
  );
}