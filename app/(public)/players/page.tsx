import { db } from "@/src/db";
import { players, matchGames, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";

export default async function PlayerLeaderboardPage({ searchParams }: { searchParams: { division?: string } }) {
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;

  // 1. Fetch all divisions for the navigation filter tabs
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  
  // Default to the highest tier division if none is explicitly chosen in the URL
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  // 2. Fetch all players mapped to the selected division
  const allPlayers = activeDivId
    ? await db
        .select({
          id: players.id,
          name: players.name,
          teamName: teams.name,
          divisionId: teams.divisionId,
        })
        .from(players)
        .leftJoin(teams, eq(players.teamId, teams.id))
        .where(eq(teams.divisionId, activeDivId))
    : [];

  // Fetch all games globally for calculation
  const allGames = await db.select().from(matchGames);

  // 3. Process analytics metrics for the selected players
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
      teamName: player.teamName || "Free Agent",
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

  // Sort by highest overall frame win rate percentage
  const sortedPlayers = playerStats.sort((a, b) => Number(b.totalPct) - Number(a.totalPct));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Analytics</h1>
          <p className="text-slate-500 font-medium">Categorized performance breakdown sorted by Frame Win Percentage.</p>

          {/* Division Tabs Switcher Navigation */}
          <div className="flex gap-2 mt-8 overflow-x-auto pb-2">
            {allDivisions.map((div) => (
              <Link
                key={div.id}
                href={`/players?division=${div.id}`}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeDivId === div.id 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' 
                    : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {div.name}
              </Link>
            ))}
          </div>
        </header>

        {/* Analytics Display Sheet Panel */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] md:text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-500 uppercase tracking-[0.2em] font-black border-b border-slate-800">
                  <th className="px-4 py-4" colSpan={3}>Identity & Attendance</th>
                  <th className="px-4 py-4 text-center border-x border-slate-800 bg-slate-800/50" colSpan={4}>Singles</th>
                  <th className="px-4 py-4 text-center border-r border-slate-800 bg-slate-800/30" colSpan={4}>Doubles</th>
                  <th className="px-4 py-4 text-center bg-indigo-950 text-indigo-400" colSpan={4}>Overall Totals</th>
                </tr>
                <tr className="bg-slate-900 text-white uppercase tracking-widest font-black border-b border-slate-800">
                  <th className="px-4 py-6 sticky left-0 bg-slate-900 z-10">Player</th>
                  <th className="px-4 py-6 text-slate-400">Team</th>
                  <th className="px-4 py-6 text-center bg-amber-500 text-slate-900 ring-inset ring-1 ring-amber-400">Match Play (MP)</th>
                  {/* Singles Columns */}
                  <th className="px-4 py-6 text-center bg-slate-800/50">Play</th>
                  <th className="px-4 py-6 text-center bg-slate-800/50">Win</th>
                  <th className="px-4 py-6 text-center bg-slate-800/50">Lost</th>
                  <th className="px-4 py-6 text-center bg-slate-800/50 text-indigo-400">W%</th>
                  {/* Doubles Columns */}
                  <th className="px-4 py-6 text-center bg-slate-800/30">Play</th>
                  <th className="px-4 py-6 text-center bg-slate-800/30">Win</th>
                  <th className="px-4 py-6 text-center bg-slate-800/30">Lost</th>
                  <th className="px-4 py-6 text-center bg-slate-800/30 text-indigo-400">W%</th>
                  {/* Total Metrics Columns */}
                  <th className="px-4 py-6 text-center bg-indigo-900/20">Play</th>
                  <th className="px-4 py-6 text-center bg-indigo-900/20">Win</th>
                  <th className="px-4 py-6 text-center bg-indigo-900/20">Lost</th>
                  <th className="px-4 py-6 text-center bg-indigo-600 text-white">Total W%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-5 font-black text-slate-900 uppercase whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10">
                      <Link href={`/players/${p.id}`} className="hover:text-indigo-600 transition-colors block">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-5 text-slate-500 font-bold uppercase tracking-tight whitespace-nowrap">
                      {p.teamName}
                    </td>
                    <td className="px-4 py-5 text-center font-black text-slate-900 bg-amber-50 border-x border-amber-100 italic text-sm">
                      {p.matchPlay}
                    </td>
                    
                    {/* Singles Body Display cells */}
                    <td className="px-4 py-5 text-center font-medium bg-slate-50/30">{p.singlePlay}</td>
                    <td className="px-4 py-5 text-center font-bold text-green-600 bg-slate-50/30">{p.singleWin}</td>
                    <td className="px-4 py-5 text-center font-bold text-red-400 bg-slate-50/30">{p.singleLost}</td>
                    <td className="px-4 py-5 text-center font-black text-indigo-600 bg-slate-50/30 italic">{p.singlePct}%</td>

                    {/* Doubles Body Display cells */}
                    <td className="px-4 py-5 text-center font-medium">{p.doublePlay}</td>
                    <td className="px-4 py-5 text-center font-bold text-green-600">{p.doubleWin}</td>
                    <td className="px-4 py-5 text-center font-bold text-red-400">{p.doubleLost}</td>
                    <td className="px-4 py-5 text-center font-black text-indigo-600 italic">{p.doublePct}%</td>

                    {/* Overall Totals Body cells */}
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

            {sortedPlayers.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic bg-white">
                No active players found registered to this specific division category.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}