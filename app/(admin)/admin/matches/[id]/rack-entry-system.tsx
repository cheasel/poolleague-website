'use client';

import { useState } from 'react';

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
  initialGames = [] 
}: {
  homePlayers: Player[];
  awayPlayers: Player[];
  onSave: (formData: FormData) => Promise<void>;
  initialGames?: any[];
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
        winner: g.player1Score > g.player2Score ? 'home' : 'away'
      }));
    }
    return [];
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

  // Fixed the implicitly 'any' error by defining types in the filter parameters
  const removeRack = (indexToRemove: number) => {
    setRacks(racks.filter((_: Rack, i: number) => i !== indexToRemove));
  };

  const homeScore = racks.filter((r: Rack) => r.winner === 'home').length;
  const awayScore = racks.filter((r: Rack) => r.winner === 'away').length;

  return (
    <form action={onSave} className="space-y-6">
      {/* Hidden field for JSON transmission */}
      <input type="hidden" name="racksJson" value={JSON.stringify(racks)} />

      {/* Score Header */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] p-8 text-white flex justify-between items-center shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="text-center flex-1 relative z-10">
          <div className="text-7xl font-black tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{homeScore}</div>
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Home Arena</div>
        </div>
        <div className="px-6 text-slate-800 font-black italic text-2xl relative z-10">VS</div>
        <div className="text-center flex-1 relative z-10">
          <div className="text-7xl font-black tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{awayScore}</div>
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Away Squad</div>
        </div>
      </div>

      <div className="space-y-4">
        {racks.map((rack, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 flex flex-col lg:flex-row items-center gap-6 shadow-xl hover:border-slate-800 transition-all group relative">
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
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
              >
                <option value="">Home Player</option>
                {homePlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  required
                  value={rack.homePlayer2Id} 
                  onChange={(e) => updateRack(idx, 'homePlayer2Id', e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                >
                  <option value="">Home Partner</option>
                  {homePlayers.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              )}
            </div>

            {/* Win Toggles */}
            <div className="flex bg-slate-950 p-1.5 rounded-[1.25rem] shadow-inner border border-slate-900/60">
              <button 
                type="button" 
                onClick={() => updateRack(idx, 'winner', 'home')}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all ${rack.winner === 'home' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
              >HOME WIN</button>
              <button 
                type="button" 
                onClick={() => updateRack(idx, 'winner', 'away')}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all ${rack.winner === 'away' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
              >AWAY WIN</button>
            </div>

            {/* Away Side */}
            <div className="flex-1 space-y-2 w-full">
              <select 
                required
                value={rack.awayPlayer1Id} 
                onChange={(e) => updateRack(idx, 'awayPlayer1Id', e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
              >
                <option value="">Away Player</option>
                {awayPlayers.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  required
                  value={rack.awayPlayer2Id} 
                  onChange={(e) => updateRack(idx, 'awayPlayer2Id', e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                >
                  <option value="">Away Partner</option>
                  {awayPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <button 
              type="button" 
              onClick={() => removeRack(idx)}
              className="text-slate-700 hover:text-rose-500 transition-colors p-2 outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          type="button" 
          onClick={() => addRack('single')}
          className="py-5 border-2 border-dashed border-slate-800 rounded-[1.5rem] text-slate-600 font-black hover:bg-indigo-950/20 hover:border-indigo-900/50 hover:text-indigo-400 transition-all uppercase text-[10px] tracking-[0.2em]"
        >
          + Add Singles Frame
        </button>
        <button 
          type="button" 
          onClick={() => addRack('double')}
          className="py-5 border-2 border-dashed border-slate-800 rounded-[1.5rem] text-slate-600 font-black hover:bg-purple-950/20 hover:border-purple-900/50 hover:text-purple-400 transition-all uppercase text-[10px] tracking-[0.2em]"
        >
          + Add Doubles Frame
        </button>
      </div>

      <button 
        type="submit" 
        disabled={racks.length === 0 || racks.some((r) => r.winner === null)}
        className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-500 disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-indigo-900/20 transition-all active:scale-[0.98] border border-indigo-500/50"
      >
        Submit Final Match Report
      </button>
    </form>
  );
}