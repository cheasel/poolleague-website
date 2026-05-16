import { db } from "@/src/db";
import { players, matchGames, teams, divisions } from "@/src/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import PlayerStatsClient from "./player-stats-client";

export default async function PlayerLeaderboardPage({ searchParams }: { searchParams: { division?: string } }) {
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;

  // 1. Fetch Divisions for tabs navigation
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  // 2. Fetch Players belonging to active division
  const allPlayers = activeDivId
    ? await db
        .select({
          id: players.id,
          name: players.name,
          teamName: teams.name,
        })
        .from(players)
        .leftJoin(teams, eq(players.teamId, teams.id))
        .where(eq(teams.divisionId, activeDivId))
    : [];

  const allGames = await db.select().from(matchGames);

  // 3. Process statistical rows
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

  // Sort overall by highest win rate percentage initially
  const sortedPlayers = playerStats.sort((a, b) => Number(b.totalPct) - Number(a.totalPct));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Analytics</h1>
          <p className="text-slate-500 font-medium">Categorized performance breakdown by match and framework frames.</p>

          {/* Division switcher navigation tabs remain server-driven */}
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

        {/* Hand statistics data arrays down straight to interactive client script view */}
        {activeDivId && (
          <PlayerStatsClient 
            initialPlayers={sortedPlayers} 
            divisions={allDivisions} 
            activeDivId={activeDivId} 
          />
        )}
      </div>
    </div>
  );
}