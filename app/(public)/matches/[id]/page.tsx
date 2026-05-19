import { db } from "@/src/db";
import { matches, teams, matchGames, divisions, seasons, players } from "@/src/db/schema";
import { eq, asc, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Calendar, Trophy, Layers, Shield, ArrowLeft, User, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PublicMatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = Number(id);

  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

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
      divisionId: homeTeams.divisionId, // Fixed: point to the aliased team table
      divisionName: divisions.name,
      seasonName: seasons.name,
    })
    .from(matches)
    // First, join the home team so its division_id is available in scope
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    // Now we can safely bridge from the home team to the divisions table
    .leftJoin(divisions, eq(homeTeams.divisionId, divisions.id))
    // Finally, bring in the season configuration
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .where(eq(matches.id, matchId));

  // 2. Fetch all teams in this specific division to compute live leaderboard ranks
  const divisionTeams = matchData.divisionId
    ? await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.divisionId, matchData.divisionId))
        .orderBy(desc(teams.points), desc(sql`${teams.setsWon} - ${teams.setsLost}`), desc(teams.setsWon))
    : [];

  const homeRank = divisionTeams.findIndex(t => t.id === matchData.homeTeamId) + 1;
  const awayRank = divisionTeams.findIndex(t => t.id === matchData.awayTeamId) + 1;
  const homeTeamName = divisionTeams.find(t => t.id === matchData.homeTeamId)?.name || "Home Team";
  const awayTeamName = divisionTeams.find(t => t.id === matchData.awayTeamId)?.name || "Away Team";

  // 3. Fetch individual frame details accompanied by player name maps
  const frames = await db
    .select()
    .from(matchGames)
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameOrder));

  const allPlayersRaw = await db.select().from(players);
  const playerMap = new Map(allPlayersRaw.map(p => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb Context */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-4 h-4" /> Return to Hub
          </Link>

          {/* Dynamic Meta Badges detailing complete league taxonomy */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 text-slate-400 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
              <Trophy className="w-3 h-3 text-amber-400" /> {matchData.seasonName || "Season Context"}
            </div>
            <div className="flex items-center gap-1.5 bg-white text-indigo-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <Layers className="w-3 h-3" /> {matchData.divisionName || "Division Context"}
            </div>
          </div>
        </header>

        {/* Scoreboard Dashboard Hero Jumbotron */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden p-8 md:p-12 relative">
          <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-6 relative z-10">
            
            {/* Home Team Panel */}
            <div className="md:col-span-4 text-center md:text-right space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-400 font-mono text-[10px] font-black uppercase tracking-wider">
                Rank #{homeRank || '?'}
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">
                {homeTeamName}
              </h2>
            </div>

            {/* Vs / Score Segment */}
            <div className="md:col-span-3 text-center py-4 px-6 bg-slate-900 rounded-3xl text-white shadow-xl flex flex-col items-center justify-center min-h-[100px]">
              {matchData.status === 'completed' ? (
                <div className="text-4xl font-black tracking-tighter tabular-nums text-indigo-400">
                  {matchData.homeTeamScoreTotal} <span className="text-slate-600 text-xl font-normal mx-0.5">:</span> {matchData.awayTeamScoreTotal}
                </div>
              ) : (
                <div className="text-xs font-black uppercase tracking-widest text-amber-400 italic animate-pulse">
                  Fixture Pending
                </div>
              )}
              <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-2">
                <Calendar className="w-3 h-3 text-slate-500" /> 
                {matchData.matchDate ? new Date(matchData.matchDate).toLocaleDateString('en-GB') : "TBD"}
              </div>
            </div>

            {/* Away Team Panel */}
            <div className="md:col-span-4 text-center md:text-left space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-400 font-mono text-[10px] font-black uppercase tracking-wider">
                Rank #{awayRank || '?'}
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">
                {awayTeamName}
              </h2>
            </div>

          </div>
        </div>

        {/* Frames Individual Performance Breakdown Sheet */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" /> Individual Frame Statistics Ledger
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {frames.map((frame, index) => {
              const h1 = playerMap.get(frame.player1Id!) || "Vacant Slot";
              const h2 = frame.player1PartnerId ? playerMap.get(frame.player1PartnerId) : null;
              const a1 = playerMap.get(frame.player2Id!) || "Vacant Slot";
              const a2 = frame.player2PartnerId ? playerMap.get(frame.player2PartnerId) : null;

              const homeWon = frame.player1Score! > frame.player2Score!;

              return (
                <div key={frame.id} className="p-6 md:px-8 grid grid-cols-1 md:grid-cols-12 items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Order Index Badge */}
                  <div className="md:col-span-1 text-slate-300 font-mono font-black italic text-sm">
                    F#{index + 1}
                  </div>

                  {/* Home Players */}
                  <div className={`md:col-span-4 space-y-0.5 md:text-right ${homeWon ? 'font-black text-slate-900' : 'text-slate-400 font-medium'}`}>
                    <div className="flex items-center md:justify-end gap-2 text-xs uppercase tracking-tight">
                      <User className="w-3 h-3 text-slate-300 md:hidden" /> {h1}
                    </div>
                    {h2 && (
                      <div className="flex items-center md:justify-end gap-2 text-[10px] opacity-75 uppercase tracking-tight">
                        <User className="w-3 h-3 text-slate-300 md:hidden" /> {h2}
                      </div>
                    )}
                  </div>

                  {/* Frame Status Outcome Box */}
                  <div className="md:col-span-2 text-center py-1.5 px-3 rounded-xl mx-auto w-full md:w-auto font-black text-[10px] uppercase tracking-widest border bg-white shadow-sm">
                    {frame.gameType === 'double' ? (
                      <span className="text-purple-600">Doubles</span>
                    ) : (
                      <span className="text-blue-600">Singles</span>
                    )}
                  </div>

                  {/* Away Players */}
                  <div className={`md:col-span-5 space-y-0.5 ${!homeWon ? 'font-black text-slate-900' : 'text-slate-400 font-medium'}`}>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-tight">
                      <User className="w-3 h-3 text-slate-300" /> {a1}
                    </div>
                    {a2 && (
                      <div className="flex items-center gap-2 text-[10px] opacity-75 uppercase tracking-tight">
                        <User className="w-3 h-3 text-slate-300" /> {a2}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {frames.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                No active framework rows found filled for this fixture match ID sheet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}