import { db } from "@/src/db";
import { players, matchGames, teams } from "@/src/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PublicStatsPage() {
  // Fetch unified aggregate statistics for all players in the league
  const playerLeaderboard = await db
    .select({
      id: players.id,
      name: players.name,
      teamName: teams.name,
      // 🎯 FIXED: Counts UNIQUE match IDs. Max 1 appearance per match night (18 max per season)
      appearances: sql<number>`count(distinct ${matchGames.matchId})`,
      
      // Tracks raw frame volume metrics
      framesPlayed: sql<number>`count(${matchGames.id})`,
      
      // Calculates frame wins by looking at whether the player was on side 1 or side 2 and won
      framesWon: sql<number>`
        count(
          case 
            when (${players.id} = ${matchGames.player1Id} or ${players.id} = ${matchGames.player1PartnerId}) 
                 and ${matchGames.player1Score} > ${matchGames.player2Score} then 1
            when (${players.id} = ${matchGames.player2Id} or ${players.id} = ${matchGames.player2PartnerId}) 
                 and ${matchGames.player2Score} > ${matchGames.player1Score} then 1
            else null
          end
        )
      `,
    })
    .from(players)
    // Left join teams to display the squad name next to the player
    .leftJoin(teams, eq(players.teamId, teams.id))
    // Left join matchGames checking all 4 potential player/partner slots (Singles & Doubles)
    .leftJoin(
      matchGames,
      sql`${players.id} = ${matchGames.player1Id} 
          or ${players.id} = ${matchGames.player1PartnerId} 
          or ${players.id} = ${matchGames.player2Id} 
          or ${players.id} = ${matchGames.player2PartnerId}`
    )
    .groupBy(players.id, players.name, teams.name)
    // Sort the leaderboard by most frames won descending
    .orderBy(desc(sql`frames_won`));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <header className="border-b border-slate-200 pb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">
          League Performance Matrices
        </span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Statistics</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-0.5">
          Official player standings tracking match appearances, frames won, and seasonal efficiency metrics.
        </p>
      </header>

      {/* Statistics Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6 text-center w-16">Rank</th>
                <th className="py-4 px-6">Player Details</th>
                <th className="py-4 px-6">Squad</th>
                <th className="py-4 px-6 text-center">Appearances</th>
                <th className="py-4 px-6 text-center">Frames Played</th>
                <th className="py-4 px-6 text-center">Frames Won</th>
                <th className="py-4 px-6 text-center">Win Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {playerLeaderboard.map((player, index) => {
                // Calculate percentages cleanly avoiding division-by-zero layout breaks
                const winRatio = player.framesPlayed > 0 
                  ? Math.round((player.framesWon / player.framesPlayed) * 100) 
                  : 0;

                return (
                  <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 text-center font-mono font-black text-slate-400 text-sm">
                      {index + 1}
                    </td>
                    <td className="py-4 px-6 font-black text-slate-950 text-sm uppercase tracking-tight">
                      {player.name}
                    </td>
                    <td className="py-4 px-6 uppercase text-slate-500 tracking-tight">
                      {player.teamName || "Free Agent"}
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-slate-950 tabular-nums">
                      {player.appearances} <span className="text-[10px] text-slate-300 font-normal">/ 18</span>
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-slate-600 tabular-nums">
                      {player.framesPlayed}
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-emerald-600 tabular-nums text-sm font-black">
                      {player.framesWon}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block font-mono font-black px-2 py-0.5 rounded ${
                        winRatio >= 60 ? "bg-emerald-50 text-emerald-600" : winRatio >= 40 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      }`}>
                        {winRatio}%
                      </span>
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