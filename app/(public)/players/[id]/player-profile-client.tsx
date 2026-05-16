'use client';

import { useState, useMemo } from "react";
import { Trophy, Calendar, Users, TrendingUp, User } from "lucide-react";

interface GameLog {
    id: number;
    gameType: "single" | "double" | string; // Adjusted to capture both strict types and fallback strings
    player1Id: number | null;
    player1PartnerId: number | null;
    player2Id: number | null;
    player2PartnerId: number | null;
    player1Score: number | null;
    player2Score: number | null;
    matchId: number | null;
    matchDate: Date | string | null; // Drizzle timestamp can return as a Date object or string string
    homeTeamName: string | null;
    awayTeamName: string | null;
    seasonId: number | null;
    seasonName: string | null;
    divisionName: string | null;
  }

interface PlayerProfileClientProps {
  playerId: number;
  playerName: string;
  teamName: string;
  games: GameLog[];
  seasons: { id: number; name: string }[];
  playerMap: Record<number, string>;
}

export default function PlayerProfileClient({ 
  playerId, 
  playerName, 
  teamName, 
  games, 
  seasons, 
  playerMap 
}: PlayerProfileClientProps) {
  
  // Default to the first season or null if no seasons exist
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | string>(seasons[0]?.id || "all");

  // 1. Filter games dynamically by chosen season
  const filteredGames = useMemo(() => {
    if (selectedSeasonId === "all") return games;
    return games.filter(g => g.seasonId === Number(selectedSeasonId));
  }, [games, selectedSeasonId]);

  // 2. Process Statistics based on filtered data
  const stats = useMemo(() => {
    let singlesWins = 0;
    let singlesLosses = 0;
    let doublesWins = 0;
    let doublesLosses = 0;
    
    const formArray: ('W' | 'L')[] = [];
    const uniqueMatches = new Set<number>();
    const partnerWinsMap: Record<number, { name: string; wins: number; total: number }> = {};

    filteredGames.forEach((game) => {
      if (game.matchId) uniqueMatches.add(game.matchId);

      const isHome = game.player1Id === playerId || game.player1PartnerId === playerId;
      const isWin = isHome 
        ? (game.player1Score! > game.player2Score!) 
        : (game.player2Score! > game.player1Score!);

      const result = isWin ? 'W' : 'L';
      const isDouble = game.gameType === 'double';

      if (isDouble) {
        if (isWin) doublesWins++; else doublesLosses++;
        
        const partnerId = isHome 
          ? (game.player1Id === playerId ? game.player1PartnerId : game.player1Id)
          : (game.player2Id === playerId ? game.player2PartnerId : game.player2Id);

        if (partnerId) {
          if (!partnerWinsMap[partnerId]) {
            partnerWinsMap[partnerId] = { name: playerMap[partnerId] || "Unknown", wins: 0, total: 0 };
          }
          partnerWinsMap[partnerId].total++;
          if (isWin) partnerWinsMap[partnerId].wins++;
        }
      } else {
        if (isWin) singlesWins++; else singlesLosses++;
      }

      if (formArray.length < 5) {
        formArray.push(result);
      }
    });

    formArray.reverse();

    let bestPartner = "None Recorded";
    let topPartnerWins = -1;
    Object.values(partnerWinsMap).forEach(p => {
      if (p.wins > topPartnerWins) {
        topPartnerWins = p.wins;
        bestPartner = `${p.name} (${p.wins}/${p.total} W)`;
      }
    });

    const totalWins = singlesWins + doublesWins;
    const totalPlayed = totalWins + singlesLosses + doublesLosses;
    const winPct = totalPlayed > 0 ? ((totalWins / totalPlayed) * 100).toFixed(1) : "0.0";

    return {
      singlesWins,
      singlesLosses,
      doublesWins,
      doublesLosses,
      formArray,
      bestPartner,
      matchCount: uniqueMatches.size,
      winPct
    };
  }, [filteredGames, playerId, playerMap]);

  return (
    <div className="space-y-8">
      
      {/* Hero Display Board Layout */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/10 blur-[100px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
                {teamName}
              </span>
              
              {/* Season Selection Dropdown Menu */}
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Seasons Combined</option>
                {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none mb-4">
              {playerName}
            </h1>
            
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-2">Recent Form:</span>
              {stats.formArray.map((f, idx) => (
                <span 
                  key={idx} 
                  className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shadow-inner ${
                    f === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {f}
                </span>
              ))}
              {stats.formArray.length === 0 && <span className="text-xs italic text-slate-500">No records parsed</span>}
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-3xl p-6 text-center w-full md:w-auto min-w-[180px]">
            <div className="text-5xl font-black tracking-tight text-indigo-400 tabular-nums">{stats.winPct}%</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Frame Win Rate</div>
          </div>
        </div>
      </div>

      {/* Metric Breakdown Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Singles</h3>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.singlesWins}W - {stats.singlesLosses}L</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Played: {stats.singlesWins + stats.singlesLosses}</div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <Users className="w-4 h-4 text-purple-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Doubles</h3>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">{stats.doublesWins}W - {stats.doublesLosses}L</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Played: {stats.doublesWins + stats.doublesLosses}</div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-400">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest">Chemistry Partner</h3>
          </div>
          <div className="text-sm font-black text-slate-900 uppercase truncate tracking-tight">{stats.bestPartner}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase mt-2">Total Matches Played: {stats.matchCount}</div>
        </div>
      </div>

      {/* Frame Ledger Log Sheet */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:px-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-black text-slate-900 uppercase tracking-tight text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" /> 
                {filteredGames.length > 0 && filteredGames[0].divisionName ? (
                    <span>{filteredGames[0].divisionName} Records</span>
                ) : (
                    <span>Division Performance Ledger</span>
                )}
            </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredGames.map((game) => {
            const isHome = game.player1Id === playerId || game.player1PartnerId === playerId;
            const isWin = isHome ? (game.player1Score! > game.player2Score!) : (game.player2Score! > game.player1Score!);
            
            // Extract exact Opponent Names instead of just team descriptors
            let opponentNames: string[] = [];
            if (isHome) {
              if (game.player2Id) opponentNames.push(playerMap[game.player2Id] || "Unknown");
              if (game.player2PartnerId) opponentNames.push(playerMap[game.player2PartnerId] || "Unknown");
            } else {
              if (game.player1Id) opponentNames.push(playerMap[game.player1Id] || "Unknown");
              if (game.player1PartnerId) opponentNames.push(playerMap[game.player1PartnerId] || "Unknown");
            }

            const opponentDisplayString = opponentNames.join(" & ");
            const oppTeamContext = isHome ? game.awayTeamName : game.homeTeamName;

            return (
              <div key={game.id} className="p-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-6">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-xl border tabular-nums min-w-[60px] text-center ${
                    isWin ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {isWin ? 'WIN' : 'LOSS'}
                  </span>
                  <div>
                    <div className="font-black text-slate-900 uppercase text-sm flex items-center gap-1.5 flex-wrap">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>vs {opponentDisplayString || "Vacant Competitor"}</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {oppTeamContext} • {game.matchDate ? new Date(game.matchDate).toLocaleDateString('en-GB') : "TBD"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{game.seasonName}</span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider ${
                    game.gameType === 'double' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {game.gameType}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredGames.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic bg-white">
              No performance logs match the selected season timeframe.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}