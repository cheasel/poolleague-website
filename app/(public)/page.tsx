import TitleRace from "@/components/TitleRace";
import { db } from "@/src/db";
import { seasons, divisions, matches, teams, matchGames, players } from "@/src/db/schema";
import { desc, eq, and, sql, asc } from "drizzle-orm";
import { Trophy, CalendarDays, ArrowRight, Zap, Star, Flame, Award, Medal, Crown, TrendingUp, Target, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";

export const revalidate = 60;


async function getRecentResults(seasonId: number, divisionId: number) {
  const rawMatches = await db
    .select({
      id: matches.id,
      date: matches.date,
      homeTeamName: sql<string>`home_teams.name`,
      awayTeamName: sql<string>`away_teams.name`,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
    .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
    .where(
      and(
        eq(matches.status, "completed"),
        eq(matches.seasonId, seasonId),
        eq(matches.divisionId, divisionId)
      )
    )
    .orderBy(desc(matches.date))
    .limit(3);

  return rawMatches;
}

async function getTopFormStreaks(seasonId: number, divisionId: number) {
  const allCompleted = await db
    .select({
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeTeamName: sql<string>`home_teams.name`,
      awayTeamName: sql<string>`away_teams.name`,
    })
    .from(matches)
    .leftJoin(sql`teams as home_teams`, eq(matches.homeTeamId, sql`home_teams.id`))
    .leftJoin(sql`teams as away_teams`, eq(matches.awayTeamId, sql`away_teams.id`))
    .where(
      and(
        eq(matches.status, "completed"),
        eq(matches.seasonId, seasonId),
        eq(matches.divisionId, divisionId)
      )
    )
    .orderBy(asc(matches.date));

  const streaks: Record<string, { name: string; current: number }> = {};

  allCompleted.forEach((m) => {
    if (!m.homeTeamId || !m.awayTeamId) return;

    if (!streaks[m.homeTeamId]) streaks[m.homeTeamId] = { name: m.homeTeamName, current: 0 };
    if (!streaks[m.awayTeamId]) streaks[m.awayTeamId] = { name: m.awayTeamName, current: 0 };

    const hScore = m.homeScore ?? 0;
    const aScore = m.awayScore ?? 0;

    if (hScore > aScore) {
      streaks[m.homeTeamId].current += 1;
      streaks[m.awayTeamId].current = 0;
    } else if (aScore > hScore) {
      streaks[m.awayTeamId].current += 1;
      streaks[m.homeTeamId].current = 0;
    } else {
      streaks[m.homeTeamId].current = 0;
      streaks[m.awayTeamId].current = 0;
    }
  });

  return Object.values(streaks).sort((a, b) => b.current - a.current);
}

// 🎯 ADDED: Aggregates game/frame level data inside the active season/division context
async function getTopPlayerStats(seasonId: number, divisionId: number, limit: number = 5) {
  const games = await db.query.matchGames.findMany({
    with: {
      match: true,
      player1: {
        with: {
          team: true,
        },
      },
      player2: {
        with: {
          team: true,
        },
      },
    },
  });

  const filteredGames = games.filter(
    (g) =>
      g.match &&
      g.match.status === "completed" &&
      g.match.seasonId === seasonId &&
      g.match.divisionId === divisionId
  );

  const stats: Record<number, { name: string; team: string; wins: number; image: string | null }> = {};

  filteredGames.forEach((g) => {
    const p1Id = g.player1Id;
    const p2Id = g.player2Id;
    const s1 = g.player1Score ?? 0;
    const s2 = g.player2Score ?? 0;

    if (p1Id && g.player1) {
      if (!stats[p1Id]) {
        stats[p1Id] = {
          name: g.player1.name,
          team: g.player1.team?.name || "Independent",
          wins: 0,
          image: g.player1.imageUrl,
        };
      }
      if (s1 > s2) stats[p1Id].wins += 1;
    }
    if (p2Id && g.player2) {
      if (!stats[p2Id]) {
        stats[p2Id] = {
          name: g.player2.name,
          team: g.player2.team?.name || "Independent",
          wins: 0,
          image: g.player2.imageUrl,
        };
      }
      if (s2 > s1) stats[p2Id].wins += 1;
    }
  });

  return Object.values(stats)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, limit);
}

const getCachedSeasons = unstable_cache(
  async () => db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1),
  ["homepage-current-seasons"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedDivisions = (seasonId: number) => unstable_cache(
  async () => db.select().from(divisions).where(eq(divisions.seasonId, seasonId)).orderBy(divisions.tier),
  ["homepage-divisions-list", String(seasonId)],
  { revalidate: 300, tags: ["divisions"] }
)();

const getCachedRecentResults = (seasonId: number, divisionId: number) => unstable_cache(
  async () => getRecentResults(seasonId, divisionId),
  ["homepage-recent-results", String(seasonId), String(divisionId)],
  { revalidate: 60, tags: ["matches", "teams"] }
)();

const getCachedTopFormStreaks = (seasonId: number, divisionId: number) => unstable_cache(
  async () => getTopFormStreaks(seasonId, divisionId),
  ["homepage-top-form-streaks", String(seasonId), String(divisionId)],
  { revalidate: 60, tags: ["matches", "teams"] }
)();

const getCachedTopPlayerStats = (seasonId: number, divisionId: number, limit: number) => unstable_cache(
  async () => getTopPlayerStats(seasonId, divisionId, limit),
  ["homepage-top-player-stats", String(seasonId), String(divisionId), String(limit)],
  { revalidate: 60, tags: ["matchGames", "players", "teams", "matches"] }
)();

interface PageProps {
  searchParams: Promise<{
    divisionId?: string;
  }>;
}

export default async function PublicHomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Fetch seasons and active season id (cached)
  const currentSeasons = await getCachedSeasons();
  const activeSeasonId = currentSeasons[0]?.id || 1;
  const activeSeasonName = currentSeasons[0]?.name || "Current Season";

  // 2. Fetch all divisions for the active season (cached)
  const allDivisions = await getCachedDivisions(activeSeasonId);

  // 3. Resolve active division id (default to first division of active season)
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || 1);
  const currentDivision = allDivisions.find(d => d.id === selectedDivisionId) || allDivisions[0];

  // 4. Fetch metrics for the selected division in parallel (cached)
  const [recentResults, sortedStreaks, topPlayers] = await Promise.all([
    getCachedRecentResults(activeSeasonId, selectedDivisionId),
    getCachedTopFormStreaks(activeSeasonId, selectedDivisionId),
    getCachedTopPlayerStats(activeSeasonId, selectedDivisionId, 5)
  ]);

  const leader1 = sortedStreaks[0]?.current > 0 ? sortedStreaks[0] : null;
  const mvpPlayer = topPlayers[0] || null;

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100 relative">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* HERO DASHBOARD BRANDING HEADER */}
      <div className="relative overflow-hidden bg-slate-950/60 border-b border-slate-900/60 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-indigo-950/50 border border-indigo-900/60 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm shadow-indigo-950/40">
            <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" /> Stats Spotlight Dashboard
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter italic leading-[0.9] max-w-3xl">
            LEAGUE PERFORMANCE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 drop-shadow-sm">
              ANALYTICS HUBS
            </span>
          </h1>

          <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-xl leading-relaxed">
            Track real-time frame MVPs, active team win streaks, aggregate statistics tables, and verified match results.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link 
              href="/standings" 
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-950/50 hover:-translate-y-0.5"
            >
              <Trophy className="w-3.5 h-3.5" /> View Live Standings
            </Link>
            <Link 
              href="/matches" 
              className="px-5 py-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 shadow-md hover:-translate-y-0.5"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Match Timelines
            </Link>
          </div>
        </div>
      </div>

      {/* DIVISION SWITCHER TABS */}
      <div className="max-w-6xl mx-auto px-4 mt-8 z-20 relative">
        <div className="bg-slate-900/60 backdrop-blur-md p-1 rounded-2xl inline-flex flex-wrap items-center border border-slate-800/80 gap-1">
          {allDivisions.map((div) => {
            const isActive = div.id === selectedDivisionId;
            return (
              <Link
                key={div.id}
                href={`/?divisionId=${div.id}`}
                scroll={false}
                className={`px-5 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all select-none ${
                  isActive
                    ? 'bg-slate-950 text-indigo-400 border border-slate-850 shadow-md font-extrabold'
                    : 'text-slate-500 hover:text-slate-350 border border-transparent'
                }`}
              >
                {div.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* STATS SPOTLIGHT GRID */}
      <div className="max-w-6xl mx-auto px-4 mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

          {/* Card 1: League MVP Spotlight */}
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-2 text-indigo-400">
                <Crown className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                <span className="text-[10px] font-black uppercase tracking-wider">League MVP Spotlight</span>
              </div>
              
              {mvpPlayer ? (
                <div className="flex items-center gap-4 py-2">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-indigo-950/50">
                      {mvpPlayer.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-slate-950 border border-slate-800 p-1 rounded-full text-[10px] shadow">
                      🥇
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-white text-[15px] uppercase tracking-tight truncate">
                      {mvpPlayer.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate mt-0.5">
                      {mvpPlayer.team}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3">No stats compiled yet.</p>
              )}
            </div>

            {mvpPlayer && (
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Frame Record</span>
                <span className="font-mono font-black text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded-lg text-[10px]">
                  {mvpPlayer.wins} Frame Wins
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Team on Fire (Streak Spotlight) */}
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between hover:border-orange-500/40 transition-colors relative overflow-hidden group shadow-[0_0_20px_rgba(249,115,22,0.02)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-2 text-orange-400">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                <span className="text-[10px] font-black uppercase tracking-wider">Team on Fire</span>
              </div>

              {leader1 ? (
                <div className="py-2">
                  <h4 className="font-black text-white text-lg uppercase tracking-tight truncate">
                    {leader1.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-orange-400 mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="font-bold text-xs uppercase tracking-tight">{leader1.current} Match Win Streak</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3">No active streaks detected.</p>
              )}
            </div>

            {leader1 && (
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Recent Form</span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(leader1.current, 5) }).map((_, i) => (
                    <span key={i} className="w-4.5 h-4.5 bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-full flex items-center justify-center font-mono font-black text-[9px] select-none">
                      W
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: League Status */}
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between hover:border-pink-500/40 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all" />
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-2 text-pink-400">
                <Target className="w-4 h-4 text-pink-400" />
                <span className="text-[10px] font-black uppercase tracking-wider">Active Division</span>
              </div>
              
              <div className="py-2 space-y-1">
                <h4 className="font-black text-white text-base uppercase tracking-tight">
                  {currentDivision ? currentDivision.name : "Premier Division"}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight block">
                  {activeSeasonName}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Status Indicator</span>
              <span className="font-bold text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live / Active
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* CORE CONTENT GRID FRAMEWORK */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* PRIMARY CONTENT BLOCK: PLAYER LEADERBOARD */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Top 5 Player Leaderboard Section */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Roster Rankings</span>
                  <h3 className="font-black uppercase tracking-tight text-sm text-white mt-0.5 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-indigo-400 fill-indigo-400/20" /> Top 5 Player Leaderboard
                  </h3>
                </div>
                <Link href="/players" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  All Players <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {topPlayers.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded-2xl">
                  No player statistics compiled for this division yet.
                </p>
              ) : (
                <div className="overflow-hidden border border-slate-900 rounded-2xl bg-slate-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800">
                        <th className="px-5 py-3 w-16 text-center">Rank</th>
                        <th className="px-5 py-3">Player Name</th>
                        <th className="px-5 py-3">Squad Club</th>
                        <th className="px-5 py-3 text-center w-24">Frame Wins</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                      {topPlayers.map((player, index) => (
                        <tr key={player.name} className="hover:bg-slate-900/30 transition-colors group/row">
                          <td className="px-5 py-3 text-center font-mono font-black text-slate-500 text-[11px]">
                            {index === 0 ? (
                              <span className="inline-flex text-amber-400 text-sm">🥇</span>
                            ) : index === 1 ? (
                              <span className="inline-flex text-slate-300 text-sm">🥈</span>
                            ) : index === 2 ? (
                              <span className="inline-flex text-amber-600 text-sm">🥉</span>
                            ) : (
                              index + 1
                            )}
                          </td>
                          <td className="px-5 py-3 font-black text-white text-[12.5px] uppercase tracking-tight group-hover/row:text-indigo-400 transition-colors">
                            {player.name}
                          </td>
                          <td className="px-5 py-3 text-slate-400 uppercase text-[11px] font-bold tracking-tight">
                            {player.team}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="font-mono font-black bg-slate-950 border border-slate-850 text-indigo-400 px-2 py-0.5 rounded-lg text-[11px] tabular-nums shadow-inner">
                              {player.wins} W
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Match Outcomes Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 px-1">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Recent Results</span>
                  <h3 className="font-black uppercase tracking-tight text-sm text-white mt-0.5">Recent Scoreboards</h3>
                </div>
                <Link href="/matches" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  All Matches <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentResults.length === 0 ? (
                <p className="text-xs font-medium text-slate-500 py-8 text-center border border-dashed border-slate-800 rounded-2xl">
                  No completed matches recorded inside the system yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {recentResults.map((match) => (
                    <div 
                      key={match.id} 
                      className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-colors group/match shadow-md"
                    >
                      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center border-b border-slate-850 pb-2 mb-2">
                        Official Result
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 py-2">
                        <div className="flex-1 text-right font-black text-slate-200 uppercase tracking-tight text-xs truncate group-hover/match:text-indigo-400 transition-colors">
                          {match.homeTeamName}
                        </div>
                        <div className="bg-slate-950 text-indigo-400 border border-slate-850 font-mono font-black text-xs px-2 py-1 rounded-lg shrink-0 shadow-inner">
                          {match.homeScore} - {match.awayScore}
                        </div>
                        <div className="flex-1 text-left font-black text-slate-200 uppercase tracking-tight text-xs truncate group-hover/match:text-indigo-400 transition-colors">
                          {match.awayTeamName}
                        </div>
                      </div>

                      <div className="text-center mt-2 pt-2 border-t border-slate-850 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                        {match.date ? new Date(match.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "Completed"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* SIDEBAR BLOCK: TITLE RACE ACTION WIDGET */}
          <div className="w-full bg-slate-900/20 border border-slate-900 rounded-3xl p-1 shadow-lg">
            <Suspense fallback={
              <div className="bg-slate-900/40 rounded-3xl border border-slate-900 shadow-xl overflow-hidden w-full animate-pulse">
                <div className="p-5 border-b border-slate-800/80 bg-slate-900/20 h-[72px]" />
                <div className="p-5 space-y-4">
                  <div className="h-8 bg-slate-950/60 rounded-xl" />
                  <div className="h-8 bg-slate-950/60 rounded-xl" />
                  <div className="h-8 bg-slate-950/60 rounded-xl" />
                  <div className="h-8 bg-slate-950/60 rounded-xl" />
                  <div className="h-8 bg-slate-950/60 rounded-xl" />
                </div>
              </div>
            }>
              <TitleRace 
                divisionId={selectedDivisionId} 
                seasonId={activeSeasonId} 
              />
            </Suspense>
          </div>

        </div>
      </div>

    </div>
  );
}