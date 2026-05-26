'use client';

import { useState, useMemo } from "react";
import { Trophy, Calendar, Users, TrendingUp, User } from "lucide-react";
import Image from "next/image";

interface GameLog {
  id: number;
  gameType: "single" | "double" | string;
  player1Id: number | null;
  player1PartnerId: number | null;
  player2Id: number | null;
  player2PartnerId: number | null;
  player1Score: number | null;
  player2Score: number | null;
  matchId: number | null;
  matchDate: Date | string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  seasonId: number | null;
  seasonName: string | null;
  divisionName: string | null;
}

interface PlayerProfileClientProps {
  playerId: number;
  playerName: string;
  imageUrl: string | null; // <-- CAPTURE PHOTO URL
  teamName: string;
  games: GameLog[];
  seasons: { id: number; name: string }[];
  playerMap: Record<number, string>;
}

export default function PlayerProfileClient({ 
  playerId, 
  playerName, 
  imageUrl,
  teamName, 
  games, 
  seasons, 
  playerMap 
}: PlayerProfileClientProps) {
  
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | string>(seasons[0]?.id || "all");

  const filteredGames = useMemo(() => {
    if (selectedSeasonId === "all") return games;
    return games.filter(g => g.seasonId === Number(selectedSeasonId));
  }, [games, selectedSeasonId]);

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
      const isWin = isHome ? (game.player1Score! > game.player2Score!) : (game.player2Score! > game.player1Score!);
      const result = isWin ? 'W' : 'L';

      if (game.gameType === 'double') {
        if (isWin) doublesWins++; else doublesLosses++;
        const partnerId = isHome 
          ? (game.player1Id === playerId ? game.player1PartnerId : game.player1Id)
          : (game.player2Id === playerId ? game.player2PartnerId : game.player2Id);
        if (partnerId) {
          if (!partnerWinsMap[partnerId]) partnerWinsMap[partnerId] = { name: playerMap[partnerId] || "Unknown", wins: 0, total: 0 };
          partnerWinsMap[partnerId].total++;
          if (isWin) partnerWinsMap[partnerId].wins++;
        }
      } else {
        if (isWin) singlesWins++; else singlesLosses++;
      }
      if (formArray.length < 5) formArray.push(result);
    });

    formArray.reverse();
    let bestPartner = "None";
    let topPartnerWins = -1;
    Object.values(partnerWinsMap).forEach(p => {
      if (p.wins > topPartnerWins) {
        topPartnerWins = p.wins;
        bestPartner = `${p.name} (${p.wins}/${p.total} W)`;
      }
    });

    const totalWins = singlesWins + doublesWins;
    const totalPlayed = totalWins + singlesLosses + doublesLosses;
    return { singlesWins, singlesLosses, doublesWins, doublesLosses, formArray, bestPartner, matchCount: uniqueMatches.size, winPct: totalPlayed > 0 ? ((totalWins / totalPlayed) * 100).toFixed(1) : "0.0" };
  }, [filteredGames, playerId, playerMap]);

  return (
    <div className="space-y-8">
      {/* Jumbotron Hero Card Container */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl border border-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/10 blur-[100px] rounded-full"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            
            {/* LARGE HEADER HERO PHOTO */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-indigo-500/30 bg-slate-950 shrink-0 shadow-xl flex items-center justify-center relative">
              {imageUrl && imageUrl.length > 0 ? (
                <Image src={imageUrl} alt={playerName} width={96} height={96} className="w-full h-full object-cover" priority />
              ) : (
                <div className="text-3xl font-black text-slate-700 uppercase">{playerName.charAt(0)}</div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">{teamName}</span>
                <select
                  value={selectedSeasonId}
                  onChange={(e) => setSelectedSeasonId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl outline-none hover:border-slate-700 transition-colors"
                >
                  <option value="all">All Seasons Combined</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">{playerName}</h1>
              <div className="flex items-center gap-2 mt-4">
                {stats.formArray.map((f, idx) => (
                  <span key={idx} className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center ${f === 'W' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>{f}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 backdrop-blur border border-slate-800 rounded-3xl p-6 text-center w-full md:w-auto min-w-[180px] shadow-2xl">
            <div className="text-5xl font-black tracking-tight text-indigo-400 tabular-nums drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">{stats.winPct}%</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">Frame Win Rate</div>
          </div>
        </div>
      </div>

      {/* Cards Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-900 shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-slate-500"><Trophy className="w-4 h-4 text-amber-500" /><h3 className="text-[10px] font-black uppercase tracking-widest">Singles Record</h3></div>
          <div className="text-2xl font-black text-white tabular-nums">{stats.singlesWins}W - {stats.singlesLosses}L</div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-900 shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-slate-500"><Users className="w-4 h-4 text-indigo-400" /><h3 className="text-[10px] font-black uppercase tracking-widest">Doubles Record</h3></div>
          <div className="text-2xl font-black text-white tabular-nums">{stats.doublesWins}W - {stats.doublesLosses}L</div>
        </div>
        <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-900 shadow-xl">
          <div className="flex items-center gap-3 mb-4 text-slate-500"><TrendingUp className="w-4 h-4 text-pink-400" /><h3 className="text-[10px] font-black uppercase tracking-widest">Prime Partner</h3></div>
          <div className="text-sm font-black text-white uppercase truncate tracking-tight">{stats.bestPartner}</div>
        </div>
      </div>

      {/* Ledger */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-6 md:px-8 border-b border-slate-800 bg-slate-900/60">
          <h2 className="font-black text-white uppercase tracking-tight text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" /> 
            {filteredGames.length > 0 && filteredGames[0].divisionName ? (
              <span>{filteredGames[0].divisionName} Records</span>
            ) : (
              <span>Division Performance Ledger</span>
            )}
          </h2>
        </div>

        <div className="divide-y divide-slate-800/60">
          {filteredGames.map((game) => {
            const isHome = game.player1Id === playerId || game.player1PartnerId === playerId;
            const isWin = isHome ? (game.player1Score! > game.player2Score!) : (game.player2Score! > game.player1Score!);
            let opponentNames: string[] = [];
            if (isHome) {
              if (game.player2Id) opponentNames.push(playerMap[game.player2Id] || "Unknown");
              if (game.player2PartnerId) opponentNames.push(playerMap[game.player2PartnerId] || "Unknown");
            } else {
              if (game.player1Id) opponentNames.push(playerMap[game.player1Id] || "Unknown");
              if (game.player1PartnerId) opponentNames.push(playerMap[game.player1PartnerId] || "Unknown");
            }

            return (
              <div key={game.id} className="p-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors group">
                <div className="flex items-center gap-6">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border tabular-nums min-w-[70px] text-center tracking-widest ${isWin ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-900/20' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>{isWin ? 'VICTORY' : 'DEFEAT'}</span>
                  <div>
                    <div className="font-black text-white uppercase text-sm flex items-center gap-1.5 flex-wrap group-hover:text-indigo-400 transition-colors"><User className="w-3.5 h-3.5 text-slate-600" /><span>vs {opponentNames.join(" & ") || "Vacant"}</span></div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{isHome ? game.awayTeamName : game.homeTeamName} • {game.matchDate ? new Date(game.matchDate).toLocaleDateString('en-GB') : "TBD"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{game.seasonName}</span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest border ${game.gameType === 'double' ? 'bg-purple-950/30 text-purple-400 border-purple-900/40' : 'bg-indigo-950/30 text-indigo-400 border-indigo-900/40'}`}>{game.gameType}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}