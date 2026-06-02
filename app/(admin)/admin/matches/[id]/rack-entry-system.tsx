'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Explicitly defining the Player interface for type safety
interface Player {
  id: number;
  name: string;
}

// Defining the structure of a Rack/Frame
interface Rack {
  type: 'single' | 'double';
  homePlayer1Id: string;
  homePlayer2Id: string;
  awayPlayer1Id: string;
  awayPlayer2Id: string;
  winner: 'home' | 'away' | null;
}

export default function RackEntrySystem({ 
  homePlayers, 
  awayPlayers, 
  onSave, 
  initialGames = [],
  initialHomeScore = 0,
  initialAwayScore = 0
}: {
  homePlayers: Player[];
  awayPlayers: Player[];
  onSave: (formData: FormData) => Promise<void>;
  initialGames?: any[];
  initialHomeScore?: number;
  initialAwayScore?: number;
}) {
  // Initialize state using the database frames
  const [racks, setRacks] = useState<Rack[]>(() => {
    if (initialGames.length > 0) {
      return initialGames.map((g: any) => ({
        type: g.gameType || (g.player1PartnerId || g.player2PartnerId ? 'double' : 'single'),
        homePlayer1Id: String(g.player1Id || ''),
        homePlayer2Id: String(g.player1PartnerId || ''),
        awayPlayer1Id: String(g.player2Id || ''),
        awayPlayer2Id: String(g.player2PartnerId || ''),
        // Explicitly resolve winner: only set if one side clearly leads; null otherwise forces admin to re-select
        winner: g.player1Score > g.player2Score ? 'home' : g.player2Score > g.player1Score ? 'away' : null
      }));
    }
    return [];
  });

  const calcHomeWins = racks.filter((r) => r.winner === 'home').length;
  const calcAwayWins = racks.filter((r) => r.winner === 'away').length;

  const [reportedHomeScore, setReportedHomeScore] = useState<string>(() => {
    if (initialGames.length > 0) {
      return String(calcHomeWins);
    }
    return String(initialHomeScore || 0);
  });
  const [reportedAwayScore, setReportedAwayScore] = useState<string>(() => {
    if (initialGames.length > 0) {
      return String(calcAwayWins);
    }
    return String(initialAwayScore || 0);
  });

  const addRack = (type: 'single' | 'double') => {
    setRacks([...racks, { 
      type, 
      homePlayer1Id: '', 
      homePlayer2Id: '', 
      awayPlayer1Id: '', 
      awayPlayer2Id: '', 
      winner: null 
    }]);
  };

  const updateRack = (index: number, field: keyof Rack, value: string | 'home' | 'away' | null) => {
    const newRacks = [...racks];
    newRacks[index] = { ...newRacks[index], [field]: value } as Rack;
    setRacks(newRacks);
  };

  const removeRack = (indexToRemove: number) => {
    setRacks(racks.filter((_: Rack, i: number) => i !== indexToRemove));
  };

  // Validation Helpers
  const isRackIncomplete = (rack: Rack) => {
    if (!rack.winner) return true;
    if (!rack.homePlayer1Id || !rack.awayPlayer1Id) return true;
    if (rack.type === 'double' && (!rack.homePlayer2Id || !rack.awayPlayer2Id)) return true;
    return false;
  };

  const hasDuplicateSelection = racks.some((r) => {
    if (r.type !== 'double') return false;
    return (r.homePlayer1Id && r.homePlayer1Id === r.homePlayer2Id) ||
           (r.awayPlayer1Id && r.awayPlayer1Id === r.awayPlayer2Id);
  });

  const hasIncompleteRacks = racks.length === 0 || racks.some(isRackIncomplete);

  const repHome = reportedHomeScore !== '' ? Number(reportedHomeScore) : null;
  const repAway = reportedAwayScore !== '' ? Number(reportedAwayScore) : null;

  const hasScoreMismatch = repHome !== null && repAway !== null && (calcHomeWins !== repHome || calcAwayWins !== repAway);

  return (
    <form action={onSave} className="space-y-6">
      {/* Hidden field for JSON transmission */}
      <input type="hidden" name="racksJson" value={JSON.stringify(racks)} />

      {/* Score Header */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] p-8 text-white flex justify-between items-center shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="text-center flex-1 relative z-10">
          <div className="text-7xl font-black tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{calcHomeWins}</div>
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Home Arena</div>
        </div>
        <div className="px-6 text-slate-800 font-black italic text-2xl relative z-10">VS</div>
        <div className="text-center flex-1 relative z-10">
          <div className="text-7xl font-black tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{calcAwayWins}</div>
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Away Squad</div>
        </div>
      </div>

      {/* Reported Score Cross-Verification */}
      <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reported Final Score Cross-Verification</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block ml-1">Reported Home Score</label>
            <input 
              type="number" 
              min="0"
              placeholder="e.g. 7"
              value={reportedHomeScore}
              onChange={(e) => setReportedHomeScore(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block ml-1">Reported Away Score</label>
            <input 
              type="number" 
              min="0"
              placeholder="e.g. 5"
              value={reportedAwayScore}
              onChange={(e) => setReportedAwayScore(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {racks.map((rack, idx) => {
          const isHomeDup = rack.type === 'double' && rack.homePlayer1Id && rack.homePlayer1Id === rack.homePlayer2Id;
          const isAwayDup = rack.type === 'double' && rack.awayPlayer1Id && rack.awayPlayer1Id === rack.awayPlayer2Id;
          const isConflict = isHomeDup || isAwayDup;

          return (
            <div 
              key={idx} 
              className={`bg-slate-900/40 border rounded-3xl p-5 flex flex-col lg:flex-row items-center gap-6 shadow-xl transition-all group relative ${
                isConflict 
                  ? 'border-rose-900/50 hover:border-rose-900/80 shadow-rose-950/10' 
                  : 'border-slate-900 hover:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-slate-700 font-black font-mono italic text-sm">#{idx + 1}</span>
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest border ${rack.type === 'double' ? 'bg-purple-950/30 text-purple-400 border-purple-900/40' : 'bg-indigo-950/30 text-indigo-400 border-indigo-900/40'}`}>
                  {rack.type}
                </span>
              </div>
              
              {/* Home Side */}
              <div className="flex-1 space-y-2 w-full">
                <select 
                  required
                  value={rack.homePlayer1Id} 
                  onChange={(e) => updateRack(idx, 'homePlayer1Id', e.target.value)}
                  className={`w-full p-3 bg-slate-950 border rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer ${
                    isHomeDup ? 'border-rose-900 text-rose-300' : 'border-slate-800'
                  }`}
                >
                  <option value="">Home Player</option>
                  {homePlayers.map((p) => (
                    <option 
                      key={p.id} 
                      value={String(p.id)}
                      disabled={rack.type === 'double' && String(p.id) === rack.homePlayer2Id}
                    >
                      {p.name}
                    </option>
                  ))}
                </select>
                {rack.type === 'double' && (
                  <select 
                    required
                    value={rack.homePlayer2Id} 
                    onChange={(e) => updateRack(idx, 'homePlayer2Id', e.target.value)}
                    className={`w-full p-3 bg-slate-950 border rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer ${
                      isHomeDup ? 'border-rose-900 text-rose-300' : 'border-slate-800'
                    }`}
                  >
                    <option value="">Home Partner</option>
                    {homePlayers.map((p) => (
                      <option 
                        key={p.id} 
                        value={String(p.id)}
                        disabled={String(p.id) === rack.homePlayer1Id}
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Win Toggles */}
              <div className="flex bg-slate-950 p-1.5 rounded-[1.25rem] shadow-inner border border-slate-900/60">
                <button 
                  type="button" 
                  onClick={() => updateRack(idx, 'winner', 'home')}
                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all cursor-pointer ${rack.winner === 'home' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >HOME WIN</button>
                <button 
                  type="button" 
                  onClick={() => updateRack(idx, 'winner', 'away')}
                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all cursor-pointer ${rack.winner === 'away' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >AWAY WIN</button>
              </div>

              {/* Away Side */}
              <div className="flex-1 space-y-2 w-full">
                <select 
                  required
                  value={rack.awayPlayer1Id} 
                  onChange={(e) => updateRack(idx, 'awayPlayer1Id', e.target.value)}
                  className={`w-full p-3 bg-slate-950 border rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer ${
                    isAwayDup ? 'border-rose-900 text-rose-300' : 'border-slate-800'
                  }`}
                >
                  <option value="">Away Player</option>
                  {awayPlayers.map((p) => (
                    <option 
                      key={p.id} 
                      value={String(p.id)}
                      disabled={rack.type === 'double' && String(p.id) === rack.awayPlayer2Id}
                    >
                      {p.name}
                    </option>
                  ))}
                </select>
                {rack.type === 'double' && (
                  <select 
                    required
                    value={rack.awayPlayer2Id} 
                    onChange={(e) => updateRack(idx, 'awayPlayer2Id', e.target.value)}
                    className={`w-full p-3 bg-slate-950 border rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer ${
                      isAwayDup ? 'border-rose-900 text-rose-300' : 'border-slate-800'
                    }`}
                  >
                    <option value="">Away Partner</option>
                    {awayPlayers.map((p) => (
                      <option 
                        key={p.id} 
                        value={String(p.id)}
                        disabled={String(p.id) === rack.awayPlayer1Id}
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button 
                type="button" 
                onClick={() => removeRack(idx)}
                className="text-slate-700 hover:text-rose-500 transition-colors p-2 outline-none cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          type="button" 
          onClick={() => addRack('single')}
          className="py-5 border-2 border-dashed border-slate-800 rounded-[1.5rem] text-slate-600 font-black hover:bg-indigo-950/20 hover:border-indigo-900/50 hover:text-indigo-400 transition-all uppercase text-[10px] tracking-[0.2em] cursor-pointer animate-in fade-in"
        >
          + Add Singles Frame
        </button>
        <button 
          type="button" 
          onClick={() => addRack('double')}
          className="py-5 border-2 border-dashed border-slate-800 rounded-[1.5rem] text-slate-600 font-black hover:bg-purple-950/20 hover:border-purple-900/50 hover:text-purple-400 transition-all uppercase text-[10px] tracking-[0.2em] cursor-pointer animate-in fade-in"
        >
          + Add Doubles Frame
        </button>
      </div>

      {/* Verification and Warnings Area */}
      {(hasIncompleteRacks || hasScoreMismatch || hasDuplicateSelection) && (
        <div className="bg-slate-900/80 border border-slate-850 rounded-3xl p-5 space-y-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-2">
            Validation Checklist
          </div>
          <div className="space-y-2">
            {hasIncompleteRacks && (
              <div className="flex items-start gap-2.5 text-xs text-rose-400">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Incomplete Scorecard:</span>
                  All added frames must have both players and a winner selected.
                </div>
              </div>
            )}
            {hasDuplicateSelection && (
              <div className="flex items-start gap-2.5 text-xs text-rose-400">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Duplicate Player Selection:</span>
                  The same player cannot be selected as both Player 1 and Partner in the same doubles frame.
                </div>
              </div>
            )}
            {hasScoreMismatch && (
              <div className="flex items-start gap-2.5 text-xs text-amber-400">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Score Mismatch:</span>
                  Calculated frame wins (<span className="text-white font-mono">{calcHomeWins} - {calcAwayWins}</span>) do not match reported final score (<span className="text-white font-mono">{repHome} - {repAway}</span>).
                  <button
                    type="button"
                    onClick={() => {
                      setReportedHomeScore(String(calcHomeWins));
                      setReportedAwayScore(String(calcAwayWins));
                    }}
                    className="mt-2 px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/30 rounded-lg text-[9px] font-black tracking-widest text-amber-300 uppercase transition-all block cursor-pointer"
                  >
                    Sync Reported Score with Frames
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button 
        type="submit" 
        disabled={hasIncompleteRacks || hasScoreMismatch || hasDuplicateSelection}
        className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-indigo-900/20 transition-all active:scale-[0.98] border border-indigo-500/50 cursor-pointer"
      >
        Submit Final Match Report
      </button>
    </form>
  );
}