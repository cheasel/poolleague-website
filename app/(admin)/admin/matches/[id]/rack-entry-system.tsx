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
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex justify-between items-center shadow-2xl border-b-4 border-indigo-500">
        <div className="text-center flex-1">
          <div className="text-7xl font-black tabular-nums">{homeScore}</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Home Total</div>
        </div>
        <div className="px-6 text-slate-700 font-black italic text-2xl">VS</div>
        <div className="text-center flex-1">
          <div className="text-7xl font-black tabular-nums">{awayScore}</div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Away Total</div>
        </div>
      </div>

      <div className="space-y-4">
        {racks.map((rack, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:border-indigo-300 transition-all group">
            <div className="flex items-center gap-3">
              <span className="text-slate-300 font-black text-sm">#{idx + 1}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${rack.type === 'double' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {rack.type}
              </span>
            </div>
            
            {/* Home Side */}
            <div className="flex-1 space-y-2 w-full">
              <select 
                required
                value={rack.homePlayer1Id} 
                onChange={(e) => updateRack(idx, 'homePlayer1Id', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Home Player</option>
                {homePlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  required
                  value={rack.homePlayer2Id} 
                  onChange={(e) => updateRack(idx, 'homePlayer2Id', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Home Partner</option>
                  {homePlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            {/* Win Toggles */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
              <button 
                type="button" 
                onClick={() => updateRack(idx, 'winner', 'home')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${rack.winner === 'home' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-400'}`}
              >HOME WIN</button>
              <button 
                type="button" 
                onClick={() => updateRack(idx, 'winner', 'away')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${rack.winner === 'away' ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-400'}`}
              >AWAY WIN</button>
            </div>

            {/* Away Side */}
            <div className="flex-1 space-y-2 w-full">
              <select 
                required
                value={rack.awayPlayer1Id} 
                onChange={(e) => updateRack(idx, 'awayPlayer1Id', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Away Player</option>
                {awayPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  required
                  value={rack.awayPlayer2Id} 
                  onChange={(e) => updateRack(idx, 'awayPlayer2Id', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Away Partner</option>
                  {awayPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <button 
              type="button" 
              onClick={() => removeRack(idx)}
              className="text-slate-300 hover:text-red-500 transition-colors p-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          type="button" 
          onClick={() => addRack('single')}
          className="py-4 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 font-bold hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all uppercase text-[10px] tracking-widest"
        >
          + Add Singles Frame
        </button>
        <button 
          type="button" 
          onClick={() => addRack('double')}
          className="py-4 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 font-bold hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all uppercase text-[10px] tracking-widest"
        >
          + Add Doubles Frame
        </button>
      </div>

      <button 
        type="submit" 
        disabled={racks.length === 0 || racks.some((r) => r.winner === null)}
        className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xl shadow-indigo-200 transition-all active:scale-[0.98]"
      >
        Submit Final Match Report
      </button>
    </form>
  );
}