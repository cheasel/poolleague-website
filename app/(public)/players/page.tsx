import { db } from "@/src/db";
import { players, matchGames } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";

export default async function PlayerLeaderboardPage() {
  // 1. Fetch data
  const allPlayers = await db.select().from(players);
  const allGames = await db.select().from(matchGames);

  // 2. Calculate Stats
  const playerStats = allPlayers.map((player) => {
    const stats = {
      name: player.name,
      id: player.id,
      singles: { played: 0, win: 0, lose: 0 },
      doubles: { played: 0, win: 0, lose: 0 },
    };

    // Use a Set to track unique match IDs for Appearances
    const uniqueMatches = new Set<number>();

    allGames.forEach((game) => {
      const isHome = game.player1Id === player.id || game.player1PartnerId === player.id;
      const isAway = game.player2Id === player.id || game.player2PartnerId === player.id;
      
      if (!isHome && !isAway) return;

      // If they were in the game, add the matchId to our set
      if (game.matchId) uniqueMatches.add(game.matchId);

      const isDouble = game.player1PartnerId !== null || game.player2PartnerId !== null;
      const playerWon = isHome ? (game.player1Score! > game.player2Score!) : (game.player2Score! > game.player1Score!);
      
      const category = isDouble ? 'doubles' : 'singles';

      stats[category].played++;
      if (playerWon) stats[category].win++;
      else stats[category].lose++;
    });

    const totalPlayed = stats.singles.played + stats.doubles.played;
    const totalWin = stats.singles.win + stats.doubles.win;

    return {
      ...stats,
      appearances: uniqueMatches.size, // Unique Match Days attended
      total: {
        played: totalPlayed,
        win: totalWin,
        lose: stats.singles.lose + stats.doubles.lose,
        winPct: totalPlayed > 0 ? ((totalWin / totalPlayed) * 100).toFixed(1) : "0.0"
      },
      singlesWinPct: stats.singles.played > 0 ? ((stats.singles.win / stats.singles.played) * 100).toFixed(1) : "0.0",
      doublesWinPct: stats.doubles.played > 0 ? ((stats.doubles.win / stats.doubles.played) * 100).toFixed(1) : "0.0",
    };
  });

  const sortedPlayers = playerStats.sort((a, b) => Number(b.total.winPct) - Number(a.total.winPct));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Analytics</h1>
          <p className="text-slate-500 font-medium">Tracking Appearances vs Frame Performance</p>
        </header>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-6 py-6 border-b border-slate-800">Player</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-center text-indigo-400">Apps</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-center bg-slate-800/50">Singles (P/W/L)</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-center bg-slate-800/50">S Win%</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-center">Doubles (P/W/L)</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-center">D Win%</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-center bg-indigo-900">Total Play</th>
                  <th className="px-6 py-6 border-b border-slate-800 text-right bg-indigo-900">Total Win%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                    </td>
                    
                    {/* Appearances */}
                    <td className="px-6 py-5 text-center">
                      <span className="font-black text-indigo-600 text-lg">{p.appearances}</span>
                    </td>

                    {/* Singles */}
                    <td className="px-6 py-5 text-center font-medium text-slate-400 text-sm bg-slate-50/30">
                      {p.singles.played} <span className="mx-1 opacity-30">|</span> 
                      <span className="text-green-600">{p.singles.win}</span> <span className="mx-1 opacity-30">|</span> 
                      <span className="text-red-400">{p.singles.lose}</span>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-slate-700 bg-slate-50/30">{p.singlesWinPct}%</td>

                    {/* Doubles */}
                    <td className="px-6 py-5 text-center font-medium text-slate-400 text-sm">
                      {p.doubles.played} <span className="mx-1 opacity-30">|</span> 
                      <span className="text-green-600">{p.doubles.win}</span> <span className="mx-1 opacity-30">|</span> 
                      <span className="text-red-400">{p.doubles.lose}</span>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-slate-700">{p.doublesWinPct}%</td>

                    {/* Totals */}
                    <td className="px-6 py-5 text-center font-black text-slate-900 bg-indigo-50/20">{p.total.played}</td>
                    <td className="px-6 py-5 text-right bg-indigo-50/20">
                      <span className="inline-block px-4 py-1 rounded-full bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-200">
                        {p.total.winPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}