import { db } from "@/src/db";
import { players, teams, divisions, matchGames } from "@/src/db/schema";
import { eq, asc, desc, or, and } from "drizzle-orm";
import Link from "next/link";
import { Trophy, Users, Search, ArrowUpDown, Award, Flame, Percent } from "lucide-react";

// Strict Promise-based searchParams schema for Next.js 15 compiler compliance
interface PageProps {
  searchParams: Promise<{
    division?: string;
    sort?: string;
    search?: string;
  }>;
}

export default async function PublicPlayersPage({ searchParams }: PageProps) {
  // 1. Await page parameter boundaries
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;
  const currentSort = params.sort || "win_rate_desc";
  const searchQuery = params.search?.trim().toLowerCase() || "";

  // 2. Fetch all divisions for the filtering layout header ribbon
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  // 3. Query base players list mapped to their active club squads
  const rawPlayersList = activeDivId
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

  // 4. Fetch all played match games to compile frame metrics on the server side
  const completedFrames = await db.select().from(matchGames);

  // 5. Compute real-time statistics matrices per player
  const computedLeaderboard = rawPlayersList
    .map((player) => {
      let framesPlayed = 0;
      let framesWon = 0;

      completedFrames.forEach((frame) => {
        const isHomePlayer = frame.player1Id === player.id || frame.player1PartnerId === player.id;
        const isAwayPlayer = frame.player2Id === player.id || frame.player2PartnerId === player.id;

        // Skip unplayed frame slots
        if ((frame.player1Score ?? 0) === 0 && (frame.player2Score ?? 0) === 0) return;

        if (isHomePlayer) {
          framesPlayed++;
          if ((frame.player1Score ?? 0) > (frame.player2Score ?? 0)) framesWon++;
        } else if (isAwayPlayer) {
          framesPlayed++;
          if ((frame.player2Score ?? 0) > (frame.player1Score ?? 0)) framesWon++;
        }
      });

      const winRate = framesPlayed > 0 ? (framesWon / framesPlayed) * 100 : 0;

      return {
        ...player,
        framesPlayed,
        framesWon,
        winRate,
      };
    })
    // Apply client-side text search indexing filters
    .filter((player) => player.name.toLowerCase().includes(searchQuery));

  // 6. Execute sorting strategy alignments
  const sortedLeaderboard = [...computedLeaderboard].sort((a, b) => {
    switch (currentSort) {
      case "frames_won_desc":
        return b.framesWon - a.framesWon;
      case "frames_played_desc":
        return b.framesPlayed - a.framesPlayed;
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "win_rate_desc":
    default:
      return b.winRate - a.winRate || b.framesWon - a.framesWon;
    }
  });

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* HEADER SECTION */}
      <header>
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Player Rankings</h1>
        <p className="text-slate-500 font-medium text-xs">Official individual performance statistics, leaderboard rankings, and frame win rates.</p>
      </header>

      {/* FILTERS TOOLBAR WRAPPER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-50 border border-slate-200 p-4 rounded-3xl">
        {/* Division Selection Ribbon Tabs */}
        <div className="lg:col-span-6 flex gap-1.5 overflow-x-auto scrollbar-none py-1">
          {allDivisions.map((div) => (
            <Link
              key={div.id}
              href={`/players?division=${div.id}&sort=${currentSort}&search=${searchQuery}`}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeDivId === div.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
              }`}
            >
              {div.name}
            </Link>
          ))}
        </div>

        {/* Live Search bar UI form redirection (native HTML pass via forms query params) */}
        <form method="GET" action="/players" className="lg:col-span-3 relative">
          <input type="hidden" name="division" value={activeDivId || ""} />
          <input type="hidden" name="sort" value={currentSort} />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            placeholder="Search player name..."
            defaultValue={params.search || ""}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase placeholder:text-slate-300 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </form>

        {/* Sorting Controller Triggers */}
        <div className="lg:col-span-3 flex justify-end gap-1">
          {[
            { key: "win_rate_desc", label: "%", icon: Percent, tip: "Win Percentage" },
            { key: "frames_won_desc", label: "Wins", icon: Trophy, tip: "Frames Won" },
            { key: "name_asc", label: "A-Z", icon: ArrowUpDown, tip: "Name Alphabetical" },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = currentSort === opt.key;
            return (
              <Link
                key={opt.key}
                href={`/players?division=${activeDivId}&sort=${opt.key}&search=${searchQuery}`}
                title={opt.tip}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{opt.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* LEADERBOARD TABLE MATRIX GRID */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="py-4 px-6 w-16 text-center">Rank</th>
                <th className="py-4 px-6">Player / Club</th>
                <th className="py-4 px-4 text-center w-28">Played</th>
                <th className="py-4 px-4 text-center w-28">Won</th>
                <th className="py-4 px-6 text-center w-36 bg-slate-50/40">Win Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-xs uppercase tracking-tight">
              {sortedLeaderboard.map((player, index) => {
                const isTopThree = index < 3 && player.framesPlayed > 0;
                
                return (
                  <tr key={player.id} className="hover:bg-slate-50/30 transition-colors group">
                    {/* Leaderboard Rank Identifier */}
                    <td className="py-5 px-6 text-center">
                      {isTopThree ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-[11px] ${
                          index === 0 ? "bg-amber-100 text-amber-700 border border-amber-200" :
                          index === 1 ? "bg-slate-100 text-slate-600 border border-slate-200" :
                                        "bg-orange-100 text-orange-700 border border-orange-200"
                        }`}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-black text-[11px] tabular-nums">{index + 1}</span>
                      )}
                    </td>

                    {/* Core Identity Cells */}
                    <td className="py-5 px-6">
                      <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-sm normal-case">
                        {player.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-slate-300" /> {player.teamName || "Free Agent Teamless"}
                      </div>
                    </td>

                    {/* Frames Statistics Blocks */}
                    <td className="py-5 px-4 text-center font-bold text-slate-500 tabular-nums">{player.framesPlayed}</td>
                    <td className="py-5 px-4 text-center font-black text-slate-800 tabular-nums">{player.framesWon}</td>
                    
                    {/* Aggregated Win Percentage Meter Column */}
                    <td className="py-5 px-6 text-center bg-slate-50/20 group-hover:bg-indigo-50/20 transition-colors">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-black text-slate-900 text-sm tabular-nums min-w-[45px] text-right">
                          {player.winRate.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block border border-slate-200/50">
                          <div 
                            className={`h-full rounded-full ${
                              player.winRate >= 65 ? "bg-emerald-500" :
                              player.winRate >= 45 ? "bg-indigo-500" :
                                                     "bg-slate-400"
                            }`} 
                            style={{ width: `${player.winRate}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedLeaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase tracking-widest italic">
                    No active roster players matched your selection criteria frameworks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}