import { db } from "@/src/db";
import { players, matchGames, matches, teams } from "@/src/db/schema";
import { eq, desc, asc, or, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Trophy, Calendar, Users, TrendingUp, ArrowLeft, Target } from "lucide-react";

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const playerId = Number(id);

  // 1. Fetch Player and Team data
  const [player] = await db
    .select({
      id: players.id,
      name: players.name,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(eq(players.id, playerId));

  if (!player) {
    return <div className="p-20 text-center font-black uppercase text-slate-400">Player not found.</div>;
  }

  // 2. Fetch all frames this player participated in
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  const playerGames = await db
    .select({
      id: matchGames.id,
      gameType: matchGames.gameType,
      player1Id: matchGames.player1Id,
      player1PartnerId: matchGames.player1PartnerId,
      player2Id: matchGames.player2Id,
      player2PartnerId: matchGames.player2PartnerId,
      player1Score: matchGames.player1Score,
      player2Score: matchGames.player2Score,
      matchId: matchGames.matchId,
      matchDate: matches.matchDate,
      homeTeamName: homeTeams.name,
      awayTeamName: awayTeams.name,
    })
    .from(matchGames)
    .leftJoin(matches, eq(matchGames.matchId, matches.id))
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .where(
      or(
        eq(matchGames.player1Id, playerId),
        eq(matchGames.player1PartnerId, playerId),
        eq(matchGames.player2Id, playerId),
        eq(matchGames.player2PartnerId, playerId)
      )
    )
    .orderBy(desc(matches.matchDate), desc(matchGames.gameOrder));

  // 3. Process History, Form, and Partner Statistics
  let singlesWins = 0;
  let singlesLosses = 0;
  let doublesWins = 0;
  let doublesLosses = 0;
  
  const formArray: ('W' | 'L')[] = [];
  const partnerWinsMap: Record<number, { name: string; wins: number; total: number }> = {};
  const uniqueMatches = new Set<number>();

  // Temporary fetch to map player IDs to names for partner detection
  const allPlayersRaw = await db.select().from(players);
  const playerMap = new Map(allPlayersRaw.map(p => [p.id, p.name]));

  const matchHistory = playerGames.map((game) => {
    if (game.matchId) uniqueMatches.add(game.matchId);

    const isHome = game.player1Id === playerId || game.player1PartnerId === playerId;
    const isWin = isHome 
      ? (game.player1Score! > game.player2Score!) 
      : (game.player2Score! > game.player1Score!);

    const result = isWin ? 'W' : 'L';
    const isDouble = game.gameType === 'double';

    // Track historical metrics
    if (isDouble) {
      if (isWin) doublesWins++; else doublesLosses++;
      
      // Detect doubles partner logic
      const partnerId = isHome 
        ? (game.player1Id === playerId ? game.player1PartnerId : game.player1Id)
        : (game.player2Id === playerId ? game.player2PartnerId : game.player2Id);

      if (partnerId) {
        if (!partnerWinsMap[partnerId]) {
          partnerWinsMap[partnerId] = { name: playerMap.get(partnerId) || "Unknown", wins: 0, total: 0 };
        }
        partnerWinsMap[partnerId].total++;
        if (isWin) partnerWinsMap[partnerId].wins++;
      }
    } else {
      if (isWin) singlesWins++; else singlesLosses++;
    }

    // Capture recent outcome for the form row (limit tracking to last 5 frames dynamically)
    if (formArray.length < 5) {
      formArray.push(result);
    }

    // Determine context string for display
    const opponentString = isHome ? game.awayTeamName : game.homeTeamName;

    return {
      id: game.id,
      date: game.matchDate,
      type: game.gameType,
      result,
      opponent: opponentString,
    };
  });

  // Turn recent outcomes around so they display sequentially chronological (left to right)
  formArray.reverse();

  // Find best doubles partner mathematically
  let bestPartner = "None Recorded";
  let topPartnerWins = -1;
  Object.values(partnerWinsMap).forEach(p => {
    if (p.wins > topPartnerWins) {
      topPartnerWins = p.wins;
      bestPartner = `${p.name} (${p.wins}/${p.total} Wins)`;
    }
  });

  const totalWins = singlesWins + doublesWins;
  const totalPlayed = totalWins + singlesLosses + doublesLosses;
  const overallWinPct = totalPlayed > 0 ? ((totalWins / totalPlayed) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Action Header */}
        <header>
          <Link href="/players" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Analytics Leaderboard
          </Link>
        </header>

        {/* Hero Roster Layout Dashboard Profile Profile */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/10 blur-[100px] rounded-full"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 block mb-2">
                {player.teamName || "Unassigned Agent"}
              </span>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none mb-4">
                {player.name}
              </h1>
              
              {/* Strategic Form Indicator Tracking Panel */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-2">Recent Form:</span>
                {formArray.map((f, idx) => (
                  <span 
                    key={idx} 
                    className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shadow-inner ${
                      f === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {f}
                  </span>
                ))}
                {formArray.length === 0 && <span className="text-xs italic text-slate-500">No matches documented</span>}
              </div>
            </div>

            {/* Crucial Overall Stat Block Circle */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-3xl p-6 text-center w-full md:w-auto min-w-[180px]">
              <div className="text-5xl font-black tracking-tight text-indigo-400 tabular-nums">{overallWinPct}%</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Overall Frame W%</div>
            </div>
          </div>
        </div>

        {/* Metrics Grid Analytics Layout Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-400">
              <Target className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Singles Record</h3>
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">{singlesWins}W - {singlesLosses}L</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Frames Participated: {singlesWins + singlesLosses}</div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-400">
              <Users className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Doubles Record</h3>
            </div>
            <div className="text-2xl font-black text-slate-900 tabular-nums">{doublesWins}W - {doublesLosses}L</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Frames Participated: {doublesWins + doublesLosses}</div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Chemistry Partner</h3>
            </div>
            <div className="text-sm font-black text-slate-900 uppercase truncate tracking-tight">{bestPartner}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">Match Days Attended: {uniqueMatches.size}</div>
          </div>
        </div>

        {/* Historical Detailed Match Breakdown Frame Ledger Log */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:px-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-black text-slate-900 uppercase tracking-tight text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" /> Performance Frame Ledger
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {matchHistory.map((game, idx) => (
              <div key={game.id} className="p-6 md:px-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-6">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                    game.result === 'W' 
                      ? 'bg-green-50 text-green-600 border-green-100' 
                      : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {game.result === 'W' ? 'WON' : 'LOST'}
                  </span>
                  <div>
                    <div className="font-black text-slate-900 uppercase text-sm">
                      vs {game.opponent}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {game.date ? new Date(game.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date Unspecified'}
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider ${
                  game.type === 'double' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {game.type}
                </span>
              </div>
            ))}

            {matchHistory.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                No individual framework activity logs recorded for this player profile.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}