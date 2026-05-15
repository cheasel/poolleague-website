import { db } from "@/src/db";
import { players, matchGames } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export default async function PlayerLeaderboardPage() {
  // 1. Fetch data
  const allPlayers = await db.select().from(players);
  const allGames = await db.select().from(matchGames);

  // 2. Calculate Complex Stats
  const playerStats = allPlayers.map((player) => {
    const stats = {
      single: { play: 0, win: 0, lost: 0 },
      double: { play: 0, win: 0, lost: 0 },
    };
    
    const uniqueMatches = new Set<number>();

    allGames.forEach((game) => {
      const isHome = game.player1Id === player.id || game.player1PartnerId === player.id;
      const isAway = game.player2Id === player.id || game.player2PartnerId === player.id;
      
      if (!isHome && !isAway) return;

      if (game.matchId) uniqueMatches.add(game.matchId);

      const isDouble = game.gameType === 'double';
      const playerWon = isHome 
        ? (game.player1Score! > game.player2Score!) 
        : (game.player2Score! > game.player1Score!);
      
      const cat = isDouble ? 'double' : 'single';

      stats[cat].play++;
      if (playerWon) stats[cat].win++;
      else stats[cat].lost++;
    });

    const totalPlay = stats.single.play + stats.double.play;
    const totalWin = stats.single.win + stats.double.win;
    const totalLost = stats.single.lost + stats.double.lost;

    const calcPct = (w: number, p: number) => p > 0 ? ((w / p) * 100).toFixed(1) : "0.0";

    return {
      id: player.id,
      name: player.name,
      matchPlay: uniqueMatches.size,
      singlePlay: stats.single.play,
      singleWin: stats.single.win,
      singleLost: stats.single.lost,
      singlePct: calcPct(stats.single.win, stats.single.play),
      doublePlay: stats.double.play,
      doubleWin: stats.double.win,
      doubleLost: stats.double.lost,
      doublePct: calcPct(stats.double.win, stats.double.play),
      totalPlay,
      totalWin,
      totalLost,
      totalPct: calcPct(totalWin, totalPlay),
    };
  });

  const sortedPlayers = playerStats.sort((a, b) => Number(b.totalPct) - Number(a.totalPct));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Analytics</h1>
          <p className="text-slate-500 font-medium">Categorized performance breakdown by Match and Frame.</p>
        </header>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] md:text-xs">
              <thead>
                {/* Header Grouping Row */}
                <tr className="bg-slate-900 text-slate-500 uppercase tracking-[0.2em] font-black border-b border-slate-800">
                  <th className="px-4 py-4" colSpan={2}>Attendance</th>
                  <th className="px-4 py-4 text-center border-x border-slate-800 bg-slate-800/50" colSpan={4}>Singles</th>
                  <th className="px-4 py-4 text-center border-r border-slate-800 bg-slate-800/30" colSpan={4}>Doubles</th>
                  <th className="px-4 py-4 text-center bg-indigo-950 text-indigo-400" colSpan={4}>Overall Totals</th>
                </tr>
                <tr className="bg-slate-900 text-white uppercase tracking-widest font-black border-b border-slate-800">
                  <th className="px-4 py-6">Player</th>
                  <th className="px-4 py-6 text-center bg-amber-500 text-slate-900 ring-inset ring-1 ring-amber-400">Match Play (MP)</th>
                  {/* Singles */}
                  <th className="px-4 py-6 text-center bg-slate-800/50">Play</th>
                  <th className="px-4 py-6 text-center bg-slate-800/50">Win</th>
                  <th className="px-4 py-6 text-center bg-slate-800/50">Lost</th>
                  <th className="px-4 py-6 text-center bg-slate-800/50 text-indigo-400">W%</th>
                  {/* Doubles */}
                  <th className="px-4 py-6 text-center bg-slate-800/30">Play</th>
                  <th className="px-4 py-6 text-center bg-slate-800/30">Win</th>
                  <th className="px-4 py-6 text-center bg-slate-800/30">Lost</th>
                  <th className="px-4 py-6 text-center bg-slate-800/30 text-indigo-400">W%</th>
                  {/* Totals */}
                  <th className="px-4 py-6 text-center bg-indigo-900/20">Play</th>
                  <th className="px-4 py-6 text-center bg-indigo-900/20">Win</th>
                  <th className="px-4 py-6 text-center bg-indigo-900/20">Lost</th>
                  <th className="px-4 py-6 text-center bg-indigo-600 text-white">Total W%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-5 font-black text-slate-900 uppercase whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100">
                      {p.name}
                    </td>
                    
                    {/* Highlighted Match Play Column */}
                    <td className="px-4 py-5 text-center font-black text-slate-900 bg-amber-50 border-x border-amber-100 italic text-sm">
                      {p.matchPlay}
                    </td>
                    
                    {/* Singles Body */}
                    <td className="px-4 py-5 text-center font-medium bg-slate-50/30">{p.singlePlay}</td>
                    <td className="px-4 py-5 text-center font-bold text-green-600 bg-slate-50/30">{p.singleWin}</td>
                    <td className="px-4 py-5 text-center font-bold text-red-400 bg-slate-50/30">{p.singleLost}</td>
                    <td className="px-4 py-5 text-center font-black text-indigo-600 bg-slate-50/30 italic">{p.singlePct}%</td>

                    {/* Doubles Body */}
                    <td className="px-4 py-5 text-center font-medium">{p.doublePlay}</td>
                    <td className="px-4 py-5 text-center font-bold text-green-600">{p.doubleWin}</td>
                    <td className="px-4 py-5 text-center font-bold text-red-400">{p.doubleLost}</td>
                    <td className="px-4 py-5 text-center font-black text-indigo-600 italic">{p.doublePct}%</td>

                    {/* Totals Body */}
                    <td className="px-4 py-5 text-center font-black text-slate-900 bg-indigo-50/20">{p.totalPlay}</td>
                    <td className="px-4 py-5 text-center font-black text-green-600 bg-indigo-50/20">{p.totalWin}</td>
                    <td className="px-4 py-5 text-center font-black text-red-400 bg-indigo-50/20">{p.totalLost}</td>
                    <td className="px-4 py-5 text-center bg-indigo-600 text-white font-black italic shadow-inner">
                      {p.totalPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 flex gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-500 rounded"></span> 
            MP: Unique Match Days Attended
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-indigo-600 rounded"></span> 
            Total W%: Win ratio across all frames
          </div>
        </div>
      </div>
    </div>
  );
}