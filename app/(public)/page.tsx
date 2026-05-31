import TitleRace from "@/components/TitleRace";
import { db } from "@/src/db";
import { seasons, divisions, matches, teams, matchGames, players } from "@/src/db/schema";
import { desc, eq, and, sql, asc } from "drizzle-orm";
import { Trophy, CalendarDays, ArrowRight, Zap, Star, Flame, Award, Medal, Crown, TrendingUp, Target, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import Image from "next/image";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import { Table, TableRow, TableCell } from "@/components/Table";

export const revalidate = 60;


async function getRecentResults(seasonId: number, divisionId: number) {
  const rawMatches = await db
    .select({
      id: matches.id,
      date: matches.date,
      homeTeamName: sql<string>`home_teams.name`,
      awayTeamName: sql<string>`away_teams.name`,
      homeTeamLogo: sql<string | null>`home_teams.logo_url`,
      awayTeamLogo: sql<string | null>`away_teams.logo_url`,
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
const getCachedTopPlayerStats = unstable_cache(
  async (seasonId: number, divisionId: number, limit: number = 5) => {
    const result = await db.execute(sql`
      WITH player_wins AS (
        SELECT 
          mg.player1_id AS player_id,
          1 AS is_win
        FROM match_games mg
        JOIN matches m ON mg.match_id = m.id
        WHERE m.status = 'completed'
          AND m.season_id = ${seasonId}
          AND m.division_id = ${divisionId}
          AND mg.player1_score > mg.player2_score
          AND mg.player1_id IS NOT NULL

        UNION ALL

        SELECT 
          mg.player2_id AS player_id,
          1 AS is_win
        FROM match_games mg
        JOIN matches m ON mg.match_id = m.id
        WHERE m.status = 'completed'
          AND m.season_id = ${seasonId}
          AND m.division_id = ${divisionId}
          AND mg.player2_score > mg.player1_score
          AND mg.player2_id IS NOT NULL

        UNION ALL

        SELECT
          mg.player1_partner_id AS player_id,
          1 AS is_win
        FROM match_games mg
        JOIN matches m ON mg.match_id = m.id
        WHERE m.status = 'completed'
          AND m.season_id = ${seasonId}
          AND m.division_id = ${divisionId}
          AND mg.player1_score > mg.player2_score
          AND mg.player1_partner_id IS NOT NULL

        UNION ALL

        SELECT
          mg.player2_partner_id AS player_id,
          1 AS is_win
        FROM match_games mg
        JOIN matches m ON mg.match_id = m.id
        WHERE m.status = 'completed'
          AND m.season_id = ${seasonId}
          AND m.division_id = ${divisionId}
          AND mg.player2_score > mg.player1_score
          AND mg.player2_partner_id IS NOT NULL
      )
      SELECT 
        pw.player_id AS id,
        p.name AS name,
        p.image_url AS image,
        COALESCE(t.name, 'Independent') AS team,
        t.logo_url AS "teamLogo",
        CAST(COUNT(pw.is_win) AS INTEGER) AS wins
      FROM player_wins pw
      JOIN players p ON pw.player_id = p.id
      LEFT JOIN teams t ON p.team_id = t.id
      GROUP BY pw.player_id, p.name, p.image_url, t.name, t.logo_url
      ORDER BY wins DESC
      LIMIT ${limit}
    `);

    return result.map(r => ({
      name: String(r.name),
      team: String(r.team),
      teamLogo: r.teamLogo ? String(r.teamLogo) : null,
      wins: Number(r.wins),
      image: r.image ? String(r.image) : null,
    }));
  },
  ["top-player-stats"],
  { revalidate: 300, tags: ["players", "matchGames", "matches"] }
);

const getCachedSeasons = unstable_cache(
  async () => db.select().from(seasons).orderBy(desc(seasons.startDate)).limit(1),
  ["homepage-current-seasons"],
  { revalidate: 300, tags: ["seasons"] }
);

const getCachedDivisions = unstable_cache(
  async (seasonId: number) => db.select().from(divisions).where(eq(divisions.seasonId, seasonId)).orderBy(divisions.tier),
  ["homepage-divisions-list"],
  { revalidate: 300, tags: ["divisions"] }
);

const getCachedRecentResults = unstable_cache(
  async (seasonId: number, divisionId: number) => getRecentResults(seasonId, divisionId),
  ["homepage-recent-results"],
  { revalidate: 60, tags: ["matches", "teams"] }
);

const getCachedTopFormStreaks = unstable_cache(
  async (seasonId: number, divisionId: number) => getTopFormStreaks(seasonId, divisionId),
  ["homepage-top-form-streaks"],
  { revalidate: 60, tags: ["matches", "teams"] }
);


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

  // 4. Fetch metrics for the selected division sequentially (cached)
  const recentResults = await getCachedRecentResults(activeSeasonId, selectedDivisionId);
  const sortedStreaks = await getCachedTopFormStreaks(activeSeasonId, selectedDivisionId);
  const topPlayers = await getCachedTopPlayerStats(activeSeasonId, selectedDivisionId, 5);

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
          <Badge variant="indigo">
            <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" /> Stats Spotlight Dashboard
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter italic leading-[0.9] max-w-3xl">
            Lanna Pool Club <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 drop-shadow-sm">
              League Arena
            </span>
          </h1>

          <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-xl leading-relaxed">
            Lanna Pool Club is a friendly community pool league organized by local bars in Chiang Mai, Thailand. 
            Open to all players, whether competitive or just playing for fun. Track standings, scores, and player statistics!
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
          <Card variant="indigo">
            <div className="space-y-4">
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
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs w-full">
                <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Frame Record</span>
                <span className="font-mono font-black text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded-lg text-[10px]">
                  {mvpPlayer.wins} Frame Wins
                </span>
              </div>
            )}
          </Card>

          {/* Card 2: Team on Fire (Streak Spotlight) */}
          <Card variant="orange">
            <div className="space-y-4">
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
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs w-full">
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
          </Card>

          {/* Card 3: League Status */}
          <Card variant="pink">
            <div className="space-y-4">
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

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs w-full">
              <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Status Indicator</span>
              <span className="font-bold text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live / Active
              </span>
            </div>
          </Card>

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
                <Table headers={["Rank", "Player Name", "Squad Club", "Frame Wins"]}>
                  {topPlayers.map((player, index) => (
                    <TableRow key={player.name}>
                      <TableCell rank={index + 1} />
                      <TableCell className="font-black text-white text-[12.5px] uppercase tracking-tight group-hover/row:text-indigo-400 transition-colors">
                        {player.name}
                      </TableCell>
                      <TableCell className="text-slate-400 uppercase text-[11px] font-bold tracking-tight">
                        <div className="flex items-center gap-2">
                          {player.teamLogo ? (
                            <div className="w-5 h-5 rounded bg-slate-950 border border-slate-900 p-0.5 flex items-center justify-center relative shrink-0">
                              <Image
                                src={player.teamLogo}
                                alt={player.team}
                                width={20}
                                height={20}
                                className="object-contain max-w-full max-h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[8px] text-indigo-400 shrink-0">
                              {player.team.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span>{player.team}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-black bg-slate-950 border border-slate-850 text-indigo-400 px-2 py-0.5 rounded-lg text-[11px] tabular-nums shadow-inner">
                          {player.wins} W
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
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
                        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                          <span className="font-black text-slate-200 uppercase tracking-tight text-xs truncate group-hover/match:text-indigo-400 transition-colors">
                            {match.homeTeamName}
                          </span>
                          {match.homeTeamLogo ? (
                            <div className="w-5 h-5 rounded bg-slate-950 border border-slate-850 p-0.5 flex items-center justify-center shrink-0">
                              <Image
                                src={match.homeTeamLogo}
                                alt={match.homeTeamName}
                                width={20}
                                height={20}
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[8px] text-indigo-400 shrink-0">
                              {match.homeTeamName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-950 text-indigo-400 border border-slate-850 font-mono font-black text-xs px-2 py-1 rounded-lg shrink-0 shadow-inner">
                          {match.homeScore} - {match.awayScore}
                        </div>
                        <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                          {match.awayTeamLogo ? (
                            <div className="w-5 h-5 rounded bg-slate-950 border border-slate-850 p-0.5 flex items-center justify-center shrink-0">
                              <Image
                                src={match.awayTeamLogo}
                                alt={match.awayTeamName}
                                width={20}
                                height={20}
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[8px] text-indigo-400 shrink-0">
                              {match.awayTeamName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-black text-slate-200 uppercase tracking-tight text-xs truncate group-hover/match:text-indigo-400 transition-colors">
                            {match.awayTeamName}
                          </span>
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