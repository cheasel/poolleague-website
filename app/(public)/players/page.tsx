import { db } from "@/src/db";
import { players, matchGames } from "@/src/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function PlayerLeaderboardPage() {
  // 1. Fetch data
  const allPlayers = await db.select().from(players);
  const allGames = await db.select().from(matchGames);

  // 2. Calculate Stats
  const playerStats = allPlayers.map((player) => {
    let totalWins = 0;
    let totalLosses = 0;
    const uniqueMatches = new Set<number>();

    allGames.forEach((game) => {
      const isHome = game.player1Id === player.id || game.player1PartnerId === player.id;
      const isAway = game.player2Id === player.id || game.player2PartnerId === player.id;
      
      if (!isHome && !isAway) return;

      // Track unique match appearances
      if (game.matchId) uniqueMatches.add(game.matchId);

      const playerWon = isHome 
        ? (game.player1Score! > game.player2Score!) 
        : (game.player2Score! > game.player1Score!);
      
      if (playerWon) totalWins++;
      else totalLosses++;
    });

    const totalPlayed = totalWins + totalLosses;
    const winPercentage = totalPlayed > 0 
      ? ((totalWins / totalPlayed) * 100).toFixed(1) 
      : "0.0";

    return {
      id: player.id,
      name: player.name,
      appearances: uniqueMatches.size,
      totalWins,
      totalLosses,
      totalPlayed,
      winPercentage,
    };
  });

  // Sort by Win Percentage (highest first)
  const sortedPlayers = playerStats.sort((a, b) => Number(b.winPercentage) - Number(a.winPercentage));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Analytics</h1>
          <p className="text-slate-500 font-medium">Performance tracking across all match frames.</p>
        </header>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Player</th>
                  <th className="px-8 py-6 text-center">Apps</th>
                  <th className="px-8 py-6 text-center bg-slate-800/50">Total Play</th>
                  <th className="px-8 py-6 text-center text-green-400">Wins</th>
                  <th className="px-8 py-6 text-center text-red-400">Losses</th>
                  <th className="px-8 py-6 text-right bg-indigo-600">Win %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                        {p.name}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-slate-400 italic">
                      {p.appearances}
                    </td>
                    <td className="px-8 py-5 text-center font-black text-slate-900 bg-slate-50/50 tabular-nums">
                      {p.totalPlayed}
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-green-600 tabular-nums">
                      {p.totalWins}
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-red-400 tabular-nums">
                      {p.totalLosses}
                    </td>
                    <td className="px-8 py-5 text-right bg-indigo-50/30">
                      <span className="inline-block px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-100 tabular-nums">
                        {p.winPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedPlayers.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">
              No player statistics recorded yet.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">
          <div className="flex items-center gap-2">Apps: Match Days Attended</div>
          <div className="flex items-center gap-2">Total Play: Frames Participated</div>
          <div className="flex items-center gap-2">Win %: Ratio of Wins to Total Frames</div>
        </div>
      </div>
    </div>
  );
}