import { db } from "@/src/db";
import { matches, teams, matchGames, divisions, seasons, players } from "@/src/db/schema";
import { eq, asc, desc, sql, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Calendar, Trophy, Layers, Shield, ArrowLeft, User, HelpCircle } from "lucide-react";

export const revalidate = 60;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const getCachedMatchPageData = unstable_cache(
  async (matchId: number) => {
    const homeTeams = alias(teams, "homeTeams");

    // 1. Fetch complete Match Details with Season and Division hierarchy data
    const [matchData] = await db
      .select({
        id: matches.id,
        matchDate: matches.date,
        status: matches.status,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeTeamScoreTotal: matches.homeScore,
        awayTeamScoreTotal: matches.awayScore,
        divisionId: homeTeams.divisionId,
        divisionName: divisions.name,
        seasonName: seasons.name,
      })
      .from(matches)
      .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
      .leftJoin(divisions, eq(homeTeams.divisionId, divisions.id))
      .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
      .where(eq(matches.id, matchId));

    if (!matchData) return null;

    // 2. Fetch all teams in this specific division to compute live leaderboard ranks
    const divisionTeams = matchData.divisionId
      ? await db
          .select({ id: teams.id, name: teams.name })
          .from(teams)
          .where(eq(teams.divisionId, matchData.divisionId))
          .orderBy(desc(teams.points), desc(sql`${teams.setsWon} - ${teams.setsLost}`), desc(teams.setsWon))
      : [];

    // 3. Fetch individual frame details
    const frames = await db
      .select()
      .from(matchGames)
      .where(eq(matchGames.matchId, matchId))
      .orderBy(asc(matchGames.gameOrder));

    // Collect relevant player IDs
    const playerIds = [...new Set([
      ...frames.map(f => f.player1Id),
      ...frames.map(f => f.player1PartnerId),
      ...frames.map(f => f.player2Id),
      ...frames.map(f => f.player2PartnerId),
    ].filter((id): id is number => id !== null))];

    const relevantPlayers = playerIds.length > 0
      ? await db.select().from(players).where(inArray(players.id, playerIds))
      : [];

    return {
      matchData,
      divisionTeams,
      frames,
      relevantPlayers
    };
  },
  ["match-detail-page"],
  { revalidate: 60, tags: ["matches", "teams", "divisions", "seasons", "matchGames", "players"] }
);

export default async function PublicMatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = Number(id);

  const pageData = await getCachedMatchPageData(matchId);

  if (!pageData || !pageData.matchData) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Match details unavailable.</div>;
  }

  const { matchData, divisionTeams, frames, relevantPlayers } = pageData;

  const homeRankIdx = divisionTeams.findIndex(t => t.id === matchData.homeTeamId);
  const awayRankIdx = divisionTeams.findIndex(t => t.id === matchData.awayTeamId);
  const homeRank = homeRankIdx !== -1 ? homeRankIdx + 1 : null;
  const awayRank = awayRankIdx !== -1 ? awayRankIdx + 1 : null;
  const homeTeamName = divisionTeams.find(t => t.id === matchData.homeTeamId)?.name || "Home Team";
  const awayTeamName = divisionTeams.find(t => t.id === matchData.awayTeamId)?.name || "Away Team";

  const playerMap = new Map(relevantPlayers.map(p => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-8 relative z-10 space-y-6">
          <Link href="/matches" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-all">
            <ArrowLeft className="w-4 h-4" /> Return to Fixtures
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">Match Analytics Frame</span>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                Competitive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Timeline</span>
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900/80 text-slate-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
                <Trophy className="w-3 h-3 text-amber-500" /> {matchData.seasonName || "Season Context"}
              </div>
              <div className="flex items-center gap-1.5 bg-indigo-950/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-indigo-900/30 shadow-sm">
                <Layers className="w-3 h-3" /> {matchData.divisionName || "Division Context"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Scoreboard Dashboard Hero Jumbotron */}
        <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-900 shadow-2xl overflow-hidden p-8 md:p-12 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-6 relative z-10">
            
            {/* Home Team Panel */}
            <div className="md:col-span-4 text-center md:text-right space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-500 font-mono text-[10px] font-black uppercase tracking-wider">
                Rank #{homeRank ?? '?'}
              </span>
              <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight truncate">
                {homeTeamName}
              </h2>
            </div>

            {/* Vs / Score Segment */}
            <div className="md:col-span-3 text-center py-6 px-4 bg-slate-950 border border-slate-800 rounded-[2rem] text-white shadow-2xl flex flex-col items-center justify-center min-h-[120px]">
              {matchData.status === 'completed' ? (
                <div className="text-5xl font-black tracking-tighter tabular-nums text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">
                  {matchData.homeTeamScoreTotal} <span className="text-slate-700 text-2xl font-normal mx-0.5">:</span> {matchData.awayTeamScoreTotal}
                </div>
              ) : (
                <div className="text-xs font-black uppercase tracking-widest text-amber-500 italic animate-pulse">
                  Fixture Pending
                </div>
              )}
              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-black tracking-widest uppercase mt-3">
                <Calendar className="w-3 h-3 text-slate-600" /> 
                {matchData.matchDate ? new Date(matchData.matchDate).toLocaleDateString('en-GB') : "TBD"}
              </div>
            </div>

            {/* Away Team Panel */}
            <div className="md:col-span-4 text-center md:text-left space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-500 font-mono text-[10px] font-black uppercase tracking-wider">
                Rank #{awayRank ?? '?'}
              </span>
              <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight truncate">
                {awayTeamName}
              </h2>
            </div>

          </div>
        </div>

        {/* Frames Individual Performance Breakdown Sheet */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="px-8 py-6 bg-slate-900/60 border-b border-slate-800">
            <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" /> Individual Frame Statistics Ledger
            </h3>
          </div>

          <div className="divide-y divide-slate-800/60">
            {frames.map((frame, index) => {
              const h1 = playerMap.get(frame.player1Id!) || "Vacant Slot";
              const h2 = frame.player1PartnerId ? playerMap.get(frame.player1PartnerId) : null;
              const a1 = playerMap.get(frame.player2Id!) || "Vacant Slot";
              const a2 = frame.player2PartnerId ? playerMap.get(frame.player2PartnerId) : null;

              const homeWon = frame.player1Score! > frame.player2Score!;

              return (
                <div key={frame.id} className="p-6 md:px-8 grid grid-cols-1 md:grid-cols-12 items-center gap-4 hover:bg-slate-900/40 transition-colors group">
                  
                  {/* Order Index Badge */}
                  <div className="md:col-span-1 text-slate-700 font-mono font-black italic text-sm">
                    F#{index + 1}
                  </div>

                  {/* Home Players */}
                  <div className={`md:col-span-4 space-y-0.5 md:text-right ${homeWon ? 'font-black text-white' : 'text-slate-500 font-medium'}`}>
                    <div className="flex items-center md:justify-end gap-2 text-xs uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                      <User className="w-3 h-3 text-slate-700 md:hidden" /> {h1}
                    </div>
                    {h2 && (
                      <div className="flex items-center md:justify-end gap-2 text-[10px] opacity-75 uppercase tracking-tight">
                        <User className="w-3 h-3 text-slate-700 md:hidden" /> {h2}
                      </div>
                    )}
                  </div>

                  {/* Frame Status Outcome Box */}
                  <div className="md:col-span-2 text-center py-2 px-3 rounded-xl mx-auto w-full md:w-auto font-black text-[9px] uppercase tracking-widest border border-slate-800 bg-slate-950 shadow-inner">
                    {frame.gameType === 'double' ? (
                      <span className="text-purple-400">Doubles</span>
                    ) : (
                      <span className="text-indigo-400">Singles</span>
                    )}
                  </div>

                  {/* Away Players */}
                  <div className={`md:col-span-5 space-y-0.5 ${!homeWon ? 'font-black text-white' : 'text-slate-500 font-medium'}`}>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                      <User className="w-3 h-3 text-slate-700" /> {a1}
                    </div>
                    {a2 && (
                      <div className="flex items-center gap-2 text-[10px] opacity-75 uppercase tracking-tight">
                        <User className="w-3 h-3 text-slate-700" /> {a2}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {frames.length === 0 && (
              <div className="p-20 text-center text-slate-700 font-black uppercase tracking-[0.2em] italic text-xs">
                No active framework rows found filled for this fixture match ID sheet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}