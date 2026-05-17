import { db } from "@/src/db";
import { players, teams, divisions, matchGames, matches } from "@/src/db/schema";
import { eq, asc, desc, or, and } from "drizzle-orm";
import Link from "next/link";
import { Trophy, Users, Search, ArrowUpDown, Award, Percent, Activity, Star, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    division?: string;
    sort?: string;
    search?: string;
    minApps?: string;
  }>;
}

export default async function PublicPlayersPage({ searchParams }: PageProps) {
  // 1. Await page parameter boundaries
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;
  const currentSort = params.sort || "win_rate_desc";
  const searchQuery = params.search?.trim().toLowerCase() || "";
  const minAppsFilter = params.minApps || "all";

  // 2. Fetch structural contexts
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  const rawPlayersList = activeDivId
    ? await db
        .select({
          id: players.id,
          name: players.name,
          teamId: players.teamId,
          teamName: teams.name,
          divisionId: teams.divisionId,
        })
        .from(players)
        .leftJoin(teams, eq(players.teamId, teams.id))
        .where(eq(teams.divisionId, activeDivId))
    : [];

  const completedFrames = await db.select().from(matchGames);
  const completedMatches = await db.select().from(matches).where(eq(matches.status, "completed"));

  // 3. Compute detailed statistics matrices per player
  const computedLeaderboard = rawPlayersList
    .map((player) => {
      let framesPlayed = 0;
      let framesWon = 0;

      completedFrames.forEach((frame) => {
        const isHomePlayer = frame.player1Id === player.id || frame.player1PartnerId === player.id;
        const isAwayPlayer = frame.player2Id === player.id || frame.player2PartnerId === player.id;

        if ((frame.player1Score ?? 0) === 0 && (frame.player2Score ?? 0) === 0) return;

        if (isHomePlayer) {
          framesPlayed++;
          if ((frame.player1Score ?? 0) > (frame.player2Score ?? 0)) framesWon++;
        } else if (isAwayPlayer) {
          framesPlayed++;
          if ((frame.player2Score ?? 0) > (frame.player1Score ?? 0)) framesWon++;
        }
      });

      let totalTeamFramesScheduled = 0;
      if (player.teamId) {
        completedMatches.forEach((match) => {
          if (match.homeTeamId === player.teamId || match.awayTeamId === player.teamId) {
            const matchFrameCount = completedFrames.filter(f => f.matchId === match.id).length;
            totalTeamFramesScheduled += matchFrameCount;
          }
        });
      }

      const winRate = framesPlayed > 0 ? (framesWon / framesPlayed) * 100 : 0;
      const appearanceRate = totalTeamFramesScheduled > 0 ? (framesPlayed / totalTeamFramesScheduled) * 100 : 0;

      return {
        ...player,
        framesPlayed,
        framesWon,
        winRate,
        appearanceRate,
      };
    })
    .filter((player) => player.name.toLowerCase().includes(searchQuery))
    .filter((player) => (minAppsFilter === "regular" ? player.appearanceRate >= 50 : true));

  // 4. Sorting Strategy
  const sortedLeaderboard = [...computedLeaderboard].sort((a, b) => {
    switch (currentSort) {
      case "frames_won_desc":
        return b.framesWon - a.framesWon;
      case "apps_desc":
        return b.appearanceRate - a.appearanceRate || b.framesPlayed - a.framesPlayed;
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "win_rate_desc":
      default:
        return b.winRate - a.winRate || b.framesWon - a.framesWon;
    }
  });

  // Highlight Leaders Calculations
  const absoluteTopPlayer = [...computedLeaderboard].sort((a, b) => b.winRate - a.winRate)[0];
  const totalLeagueFrames = completedFrames.filter(f => (f.player1Score ?? 0) > 0 || (f.player2Score ?? 0) > 0).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-10 antialiased text-slate-800">
      
      {/* 1. HERO TITLE & LEAGUE METRICS HEADLINE */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">CUE SPORT ANALYTICS</span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter italic">
            Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Rankings</span>
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Real-time frame win ratios, roster depth attendance ledger tracking, and performance data sheets.</p>
        </div>
        
        {/* Total frames running ticker block */}
        <div className="bg-slate-950 border border-slate-900 text-slate-400 font-bold px-4 py-2 rounded-2xl text-[10px] uppercase tracking-widest tabular-nums flex items-center gap-2 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Frames Handled: <span className="text-white font-black">{totalLeagueFrames} Total</span>
        </div>
      </header>

      {/* 2. GLASMOPHIC VISUAL PERFORMANCE HIGHLIGHT CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden group border border-indigo-950">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full transition-transform group-hover:scale-125" />
          <Award className="w-5 h-5 text-indigo-400 mb-3 stroke-[2.5]" />
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300/70 block">Division MVP Standard</span>
          <h3 className="text-xl font-black truncate mt-1 tracking-tight">{absoluteTopPlayer?.framesPlayed > 0 ? absoluteTopPlayer.name : "Awaiting Data"}</h3>
          <p className="text-xs text-indigo-200/60 mt-0.5 font-medium">{absoluteTopPlayer?.winRate.toFixed(1)}% Active Win Ratio</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Roster Registrations</span>
            <h4 className="text-3xl font-black text-slate-950 tracking-tight tabular-nums">{computedLeaderboard.length}</h4>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Active Competitors</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-inner">
            <Users className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Regulars Density</span>
            <h4 className="text-3xl font-black text-slate-950 tracking-tight tabular-nums">
              {computedLeaderboard.filter(p => p.appearanceRate >= 50).length}
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Players with ≥50% Apps</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 transition-colors shadow-inner">
            <Zap className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </section>

      {/* 3. MODERN UNIFIED FILTERS TOOLBAR WRAPPER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
        
        {/* Left Side: Division Navigation Ribbon Tabs */}
        <div className="lg:col-span-5 flex gap-1 overflow-x-auto scrollbar-none py-1 border-b sm:border-b-0 pb-3 sm:pb-0 border-slate-100">
          {allDivisions.map((div) => (
            <Link
              key={div.id}
              href={`/players?division=${div.id}&sort=${currentSort}&search=${searchQuery}&minApps=${minAppsFilter}`}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeDivId === div.id
                  ? "bg-slate-950 text-white border-slate-950 shadow-md font-bold"
                  : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {div.name}
            </Link>
          ))}
        </div>

        {/* Center-Left: Core Appearance Constraint Toggle */}
        <div className="lg:col-span-2 flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40 gap-1 w-full">
          <Link
            href={`/players?division=${activeDivId}&sort=${currentSort}&search=${searchQuery}&minApps=all`}
            className={`flex-1 text-center py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              minAppsFilter === "all" ? "bg-white text-slate-950 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            All
          </Link>
          <Link
            href={`/players?division=${activeDivId}&sort=${currentSort}&search=${searchQuery}&minApps=regular`}
            className={`flex-1 text-center py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
              minAppsFilter === "regular" ? "bg-white text-indigo-600 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Star className={`w-3 h-3 ${minAppsFilter === "regular" ? "fill-indigo-500 stroke-indigo-500" : ""}`} /> Regulars
          </Link>
        </div>

        {/* ADJUSTED: Center-Right: Form Native Text Search Bar Input (Allocated 3 full columns) */}
        <form method="GET" action="/players" className="lg:col-span-3 relative w-full">
          <input type="hidden" name="division" value={activeDivId || ""} />
          <input type="hidden" name="sort" value={currentSort} />
          <input type="hidden" name="minApps" value={minAppsFilter} />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            name="search"
            placeholder="Filter player metrics..."
            defaultValue={params.search || ""}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl font-bold text-xs uppercase placeholder:text-slate-400 text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all shadow-inner"
          />
        </form>

        {/* ADJUSTED: Right Side: Primary Metric Sorting Toggles (Allocated 2 full columns with min-widths) */}
        <div className="lg:col-span-2 flex items-center justify-end gap-1 w-full min-w-[180px]">
          {[
            { key: "win_rate_desc", label: " Ratio", icon: Percent, tip: "Win Percentage Sort" },
            { key: "apps_desc", label: "Apps", icon: Activity, tip: "Attendance Frequency Sort" },
            { key: "frames_won_desc", label: "Wins", icon: Trophy, tip: "Total Frames Won Sort" },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = currentSort === opt.key;
            return (
              <Link
                key={opt.key}
                href={`/players?division=${activeDivId}&sort=${opt.key}&search=${searchQuery}&minApps=${minAppsFilter}`}
                title={opt.tip}
                className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{opt.label}</span>
              </Link>
            );
          })}
        </div>

      </div>

      {/* 4. PREMIUM LEADERBOARD MATRIX SCROLLBOARD CARD */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 select-none">
                <th className="py-5 px-6 w-20 text-center">Rank</th>
                <th className="py-5 px-6">Roster Identity / Squad Branch</th>
                <th className="py-5 px-4 text-center w-28">Frames Played</th>
                <th className="py-5 px-4 text-center w-24">Frames Won</th>
                <th className="py-5 px-6 text-center w-36">Attendance Rate</th>
                <th className="py-5 px-8 text-center w-40 bg-slate-50/30">Frame Win Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-xs uppercase tracking-tight">
              {sortedLeaderboard.map((player, index) => {
                const isTopThree = index < 3 && player.framesPlayed > 0;
                
                return (
                  <tr key={player.id} className="hover:bg-slate-50/40 transition-colors group">
                    {/* Position Ranking Marker Block */}
                    <td className="py-4.5 px-6 text-center">
                      {isTopThree ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-xl font-black text-[11px] shadow-sm border ${
                          index === 0 ? "bg-amber-50 text-amber-700 border-amber-200/60" :
                          index === 1 ? "bg-slate-100 text-slate-600 border-slate-200/50" :
                                        "bg-orange-50 text-orange-700 border-orange-200/60"
                        }`}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-black text-[11px] tabular-nums">{index + 1}</span>
                      )}
                    </td>

                    {/* Roster Information Identity cells */}
                    <td className="py-4.5 px-6">
                      <div className="font-black text-slate-950 group-hover:text-indigo-600 transition-colors text-sm normal-case tracking-tight">
                        {player.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5 tracking-wide">
                        <Users className="w-3.5 h-3.5 text-slate-300" /> {player.teamName || "Teamless Free Agent"}
                      </div>
                    </td>

                    {/* Numeric Statistics Parameters */}
                    <td className="py-4.5 px-4 text-center font-bold text-slate-400 tabular-nums">{player.framesPlayed}</td>
                    <td className="py-4.5 px-4 text-center font-black text-slate-900 tabular-nums">{player.framesWon}</td>
                    
                    {/* Linear Attendance Attendance meter percentage block */}
                    <td className="py-4.5 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black tabular-nums border tracking-wider ${
                        player.appearanceRate >= 75 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        player.appearanceRate >= 45 ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                       "bg-slate-50 text-slate-400 border-slate-200/40"
                      }`}>
                        {player.appearanceRate.toFixed(0)}% APPS
                      </span>
                    </td>

                    {/* Specialized Performance Radial Analytics Meter bar */}
                    <td className="py-4.5 px-8 text-center bg-slate-50/10 group-hover:bg-indigo-50/10 transition-colors">
                      <div className="flex items-center justify-end gap-3 max-w-[120px] mx-auto">
                        <span className="font-black text-slate-950 text-sm tabular-nums min-w-[50px] text-right tracking-tighter">
                          {player.winRate.toFixed(1)}%
                        </span>
                        <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block border border-slate-200/40 shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              player.winRate >= 70 ? "bg-emerald-500" :
                              player.winRate >= 45 ? "bg-indigo-600" :
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
                  <td colSpan={6} className="py-28 text-center text-slate-300 font-black uppercase tracking-widest italic bg-slate-50/20">
                    No individual player profiles matched your lookup parameter matrices.
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