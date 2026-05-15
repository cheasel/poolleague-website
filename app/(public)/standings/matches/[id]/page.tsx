import { db } from "@/db";
import { matches, teams, players, matchGames } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const matchId = Number(params.id);

  // 1. Setup aliases to join team names
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  // 2. Fetch match info with team names
  const [matchData] = await db
    .select({
      id: matches.id,
      date: matches.matchDate,
      homeTeamName: homeTeams.name,
      awayTeamName: awayTeams.name,
      homeScore: matches.homeTeamScoreTotal,
      awayScore: matches.awayTeamScoreTotal,
      status: matches.status,
    })
    .from(matches)
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .where(eq(matches.id, matchId));

  if (!matchData) return <div className="p-10 text-center">Match not found.</div>;

  // 3. Setup aliases for player names in the games
  const p1 = alias(players, "p1");
  const p1p = alias(players, "p1p");
  const p2 = alias(players, "p2");
  const p2p = alias(players, "p2p");

  // 4. Fetch all individual games (racks) for this match
  const games = await db
    .select({
      order: matchGames.gameOrder,
      player1: p1.name,
      player1Partner: p1p.name,
      player2: p2.name,
      player2Partner: p2p.name,
      p1Score: matchGames.player1Score,
      p2Score: matchGames.player2Score,
    })
    .from(matchGames)
    .leftJoin(p1, eq(matchGames.player1Id, p1.id))
    .leftJoin(p1p, eq(matchGames.player1PartnerId, p1p.id))
    .leftJoin(p2, eq(matchGames.player2Id, p2.id))
    .leftJoin(p2p, eq(matchGames.player2PartnerId, p2p.id))
    .where(eq(matchGames.matchId, matchId))
    .orderBy(asc(matchGames.gameOrder));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/standings" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors mb-8 block uppercase tracking-widest">
          ← Back to Standings
        </Link>

        {/* Scoreboard Header */}
        <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2">{matchData.homeTeamName}</h1>
              <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs">Home Team</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-6xl md:text-8xl font-black text-white">{matchData.homeScore ?? 0}</div>
              <div className="text-slate-700 font-black italic text-2xl md:text-4xl">VS</div>
              <div className="text-6xl md:text-8xl font-black text-white">{matchData.awayScore ?? 0}</div>
            </div>

            <div className="text-center md:text-right flex-1">
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2">{matchData.awayTeamName}</h1>
              <span className="text-indigo-400 font-bold tracking-widest uppercase text-xs">Away Team</span>
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-slate-800 flex justify-center">
             <div className="bg-slate-800 px-4 py-2 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest">
                Match Date: {matchData.date?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
             </div>
          </div>
        </div>

        {/* Individual Racks Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <h2 className="font-black text-slate-900 uppercase tracking-tight text-lg">Rack Breakdown</h2>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{games.length} Frames Played</span>
          </div>

          <div className="divide-y divide-slate-50">
            {games.map((game) => (
              <div key={game.order} className="group hover:bg-slate-50 transition-all p-6 md:px-8">
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-1 text-slate-300 font-mono font-bold">#{game.order}</div>
                  
                  {/* Home Player(s) */}
                  <div className="col-span-4 text-right">
                    <div className={`font-black text-sm md:text-base ${game.p1Score! > game.p2Score! ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {game.player1}
                    </div>
                    {game.player1Partner && (
                      <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">{game.player1Partner}</div>
                    )}
                  </div>

                  {/* Winner Indicator */}
                  <div className="col-span-2 flex justify-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-inner ${
                      game.p1Score! > game.p2Score! 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' 
                      : 'bg-slate-100 text-slate-400'
                    }`}>
                      {game.p1Score! > game.p2Score! ? '1' : '0'}
                    </div>
                    <div className="mx-2 self-center text-slate-200 font-black">—</div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all shadow-inner ${
                      game.p2Score! > game.p1Score! 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' 
                      : 'bg-slate-100 text-slate-400'
                    }`}>
                      {game.p2Score! > game.p1Score! ? '1' : '0'}
                    </div>
                  </div>

                  {/* Away Player(s) */}
                  <div className="col-span-4 text-left">
                    <div className={`font-black text-sm md:text-base ${game.p2Score! > game.p1Score! ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {game.player2}
                    </div>
                    {game.player2Partner && (
                      <div className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">{game.player2Partner}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}