import { db } from "@/src/db";
import { players, matchGames, teams, matches } from "@/src/db/schema";
import { eq, sql, desc, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PublicPlayersPage() {
  // 1. Get the completed match counts for every team dynamically
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

  // Map them to a quick-lookup object { teamId: completedCount }
  const completedMap = teamCompletedCounts.reduce((acc, curr) => {
    acc[curr.teamId] = Number(curr.completedMatches || 0);
    return acc;
  }, {} as Record<number, number>);

  // 2. Define the main frames won SQL logic
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

  // 3. Fetch player stats with unique match night appearance grouping
  const playerLeaderboard = await db
    .select({
      id: players.id,
      name: players.name,
      teamId: players.teamId,
      teamName: teams.name,
      appearances: sql<number>`count(distinct ${matchGames.matchId})`,
      framesPlayed: sql<number>`count(${matchGames.id})`,
      framesWon: framesWonSql,
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
    .groupBy(players.id, players.name, teams.name, players.teamId)
    .orderBy(desc(framesWonSql));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Restoring your clean, original header style */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Player Stats</h1>
        <p className="text-sm text-slate-500">League player performance and appearance trackers.</p>
      </div>

      {/* Restoring your original clean table structure */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 text-center w-12">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-center">Appearances</th>
                <th className="py-3 px-4 text-center">Frames Played</th>
                <th className="py-3 px-4 text-center">Frames Won</th>
                <th className="py-3 px-4 text-center">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {playerLeaderboard.map((player, index) => {
                const winRatio = player.framesPlayed > 0 
                  ? Math.round((player.framesWon / player.framesPlayed) * 100) 
                  : 0;

                // 🎯 FIXED: Dynamic max cap based strictly on their specific team's completed schedules
                const maxPossibleAppearances = player.teamId ? (completedMap[player.teamId] || 0) : 0;

                return (
                  <tr key={player.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {player.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {player.teamName || "Unassigned"}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {player.appearances} 
                      <span className="text-xs text-slate-400 font-normal"> / {maxPossibleAppearances}</span>
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {player.framesPlayed}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums font-semibold text-slate-900">
                      {player.framesWon}
                    </td>
                    <td className="py-3 px-4 text-center font-medium tabular-nums">
                      {winRatio}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}