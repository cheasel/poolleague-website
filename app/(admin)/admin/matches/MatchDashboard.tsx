"use client";

import React, { useTransition } from "react";
import { Plus, ArrowUpDown, AlertCircle } from "lucide-react";

interface Player {
  id: number;
  name: string;
  teamId: number | null;
}

interface MatchDashboardProps {
  activeMatchId: number | null;
  sortParam: "asc" | "desc";
  allMatches: any[];
  rawTeams: any[];
  availableHomePlayers: Player[];
  availableAwayPlayers: Player[];
  currentMatchGames: any[];
  allPlayersRaw: Player[];
  addFrameAction: (formData: FormData) => Promise<void>;
  finalizeMatchAction: (formData: FormData) => Promise<void>;
}

export default function MatchDashboard({
  activeMatchId,
  sortParam,
  allMatches,
  rawTeams,
  availableHomePlayers,
  availableAwayPlayers,
  currentMatchGames,
  allPlayersRaw,
  addFrameAction,
  finalizeMatchAction,
}: MatchDashboardProps) {
  const [isPending, startTransition] = useTransition();

  const getTeamName = (id: number | null) => rawTeams.find((t) => t.id === id)?.name || "Unknown Squad";

  const getPlayerDisplay = (id1: number | null, id2: number | null) => {
    const p1 = allPlayersRaw.find((p) => p.id === id1)?.name;
    const p2 = allPlayersRaw.find((p) => p.id === id2)?.name;
    if (p1 && p2) return `${p1} & ${p2}`;
    return p1 || "Vacant Slot";
  };

  const activeMatch = allMatches.find((m) => m.id === activeMatchId);
  const nextSortParam = sortParam === "asc" ? "desc" : "asc";

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <header className="border-b border-slate-200/60 pb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">Live Match Logistics</span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Scorecard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Dispatch</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* TIMELINE LEDGER */}
        <div className="lg:col-span-5 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Scheduled Fixtures Ledger</span>
            <a 
              href={`/admin/matches?sort=${nextSortParam}${activeMatchId ? `&selectedMatch=${activeMatchId}` : ""}`}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" /> Date: {sortParam === "asc" ? "Oldest" : "Newest"}
            </a>
          </div>
          
          {allMatches.map((m) => {
            const isSelected = m.id === activeMatchId;
            return (
              <a
                key={m.id}
                href={`/admin/matches?selectedMatch=${m.id}&sort=${sortParam}`}
                className={`block p-4 rounded-2xl border transition-all ${
                  isSelected ? "bg-slate-950 border-slate-950 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500">
                    {m.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {m.date ? new Date(m.date).toLocaleDateString() : "TBD"}
                  </span>
                </div>
                <div className="flex justify-between items-center font-black text-xs uppercase tracking-tight">
                  <span>{getTeamName(m.homeTeamId)}</span>
                  <span className="font-mono px-2 bg-slate-100 text-slate-950 rounded">
                    {m.homeScore ?? 0} : {m.awayScore ?? 0}
                  </span>
                  <span>{getTeamName(m.awayTeamId)}</span>
                </div>
              </a>
            );
          })}
        </div>

        {/* INTERACTIVE SCORECARD SHEET */}
        <div className="lg:col-span-7">
          {activeMatch ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900">
                    {getTeamName(activeMatch.homeTeamId)} <span className="text-slate-300 font-mono">vs</span> {getTeamName(activeMatch.awayTeamId)}
                  </h2>
                </div>
                {activeMatch.status !== "completed" && finalizeMatchAction && (
                    /* ✅ UPGRADED: Explicit onSubmit mapping using useTransition to guarantee delivery */
                    <form 
                        onSubmit={(e) => {
                        e.preventDefault();
                        if (confirm("Are you sure you want to lock this match? This will finalize standings and distribute league points!")) {
                            const formData = new FormData(e.currentTarget);
                            startTransition(async () => {
                            await finalizeMatchAction(formData);
                            });
                        }
                        }}
                    >
                        <input type="hidden" name="matchId" value={activeMatch.id} />
                        <button 
                        type="submit" 
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-[9px] uppercase tracking-widest py-2 px-4 rounded-xl transition-all cursor-pointer"
                        >
                        {isPending ? "Locking Scores..." : "Lock Final Scores"}
                        </button>
                    </form>
                )}
              </div>

              {/* Played Frames History */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block px-1">Played Frame History</span>
                {currentMatchGames.map((game) => (
                  <div key={game.id} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400 font-mono">F{game.gameOrder}</span>
                    <div className="flex-1 px-4 grid grid-cols-3 items-center text-center">
                      <span className="text-left font-black text-slate-950">{getPlayerDisplay(game.player1Id, game.player1PartnerId)}</span>
                      <span className="font-mono bg-white border border-slate-200 px-2 rounded font-black">
                        {game.player1Score} — {game.player2Score}
                      </span>
                      <span className="text-right font-black text-slate-950">{getPlayerDisplay(game.player2Id, game.player2PartnerId)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Input Form */}
              {activeMatch.status !== "completed" ? (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Append Scoreboard Frame</h3>
                  </div>

                  <form action={(fd) => startTransition(async () => { await addFrameAction(fd); })} className="space-y-4 group">
                    <input type="hidden" name="matchId" value={activeMatch.id} />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase cursor-pointer has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/30">
                        <input type="radio" name="gameType" value="single" defaultChecked className="peer accent-indigo-600" />
                        Singles Frame
                      </label>
                      <label className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase cursor-pointer has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50/30">
                        <input type="radio" name="gameType" value="double" id="doublesTrigger" className="peer accent-indigo-600" />
                        Doubles Frame
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* HOME SIDE */}
                      <div className="space-y-3 border-r border-slate-200 pr-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block">Home Team Side</span>
                        <select 
                          name="player1Id" 
                          id="homePlayerSelect" 
                          required 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase"
                          onChange={(e) => {
                            const partner = document.getElementById("homePartnerSelect") as HTMLSelectElement;
                            if (e.target.value && e.target.value === partner?.value) {
                              alert("A player cannot be partnered with themselves!");
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Select Home Player...</option>
                          {availableHomePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        
                        <div className="transition-all duration-300 opacity-0 max-h-0 overflow-hidden group-has-[#doublesTrigger:checked]:opacity-100 group-has-[#doublesTrigger:checked]:max-h-24">
                          <select 
                            name="player1PartnerId" 
                            id="homePartnerSelect" 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase"
                            onChange={(e) => {
                              const primary = document.getElementById("homePlayerSelect") as HTMLSelectElement;
                              if (e.target.value && e.target.value === primary?.value) {
                                alert("A player cannot be partnered with themselves!");
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Select Home Partner...</option>
                            {availableHomePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <input type="number" name="player1Score" placeholder="0" min="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center font-mono font-black" />
                        </div>
                      </div>

                      {/* AWAY SIDE */}
                      <div className="space-y-3 pl-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 block">Away Team Side</span>
                        <select 
                          name="player2Id" 
                          id="awayPlayerSelect" 
                          required 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase"
                          onChange={(e) => {
                            const partner = document.getElementById("awayPartnerSelect") as HTMLSelectElement;
                            if (e.target.value && e.target.value === partner?.value) {
                              alert("A player cannot be partnered with themselves!");
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">Select Away Player...</option>
                          {availableAwayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        
                        <div className="transition-all duration-300 opacity-0 max-h-0 overflow-hidden group-has-[#doublesTrigger:checked]:opacity-100 group-has-[#doublesTrigger:checked]:max-h-24">
                          <select 
                            name="player2PartnerId" 
                            id="awayPartnerSelect" 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs uppercase"
                            onChange={(e) => {
                              const primary = document.getElementById("awayPlayerSelect") as HTMLSelectElement;
                              if (e.target.value && e.target.value === primary?.value) {
                                alert("A player cannot be partnered with themselves!");
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Select Away Partner...</option>
                            {availableAwayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <input type="number" name="player2Score" placeholder="0" min="0" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center font-mono font-black" />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={isPending} className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] py-3.5 rounded-xl disabled:opacity-50">
                      {isPending ? "Submitting Frame..." : "Submit Frame Result"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-bold uppercase">
                  This match has been locked and authorized. Final league standings points have been distributed.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-400 font-bold text-xs uppercase border-dashed">
              <AlertCircle className="w-6 h-6 text-slate-300 mb-2 stroke-[1.5]" />
              Select a scheduled fixture to open its interactive verification scorecard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}