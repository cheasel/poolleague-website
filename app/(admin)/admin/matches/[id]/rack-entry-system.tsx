'use client';

import { useState } from 'react';

type Rack = {
  type: 'single' | 'double';
  homePlayer1Id: string;
  homePlayer2Id: string;
  awayPlayer1Id: string;
  awayPlayer2Id: string;
  winner: 'home' | 'away' | null;
};

export default function RackEntrySystem({ homePlayers, awayPlayers, onSave, initialGames = [] }: any) {
  // Initialize state from existing database games
  const [racks, setRacks] = useState<Rack[]>(() => {
    if (initialGames.length > 0) {
      return initialGames.map((g: any) => ({
        type: g.player1PartnerId || g.player2PartnerId ? 'double' : 'single',
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
    setRacks([...racks, { type, homePlayer1Id: '', homePlayer2Id: '', awayPlayer1Id: '', awayPlayer2Id: '', winner: null }]);
  };

  const updateRack = (index: number, field: string, value: any) => {
    const newRacks = [...racks];
    newRacks[index] = { ...newRacks[index], [field]: value };
    setRacks(newRacks);
  };

  const homeScore = racks.filter((r: any) => r.winner === 'home').length;
  const awayScore = racks.filter((r: any) => r.winner === 'away').length;

  return (
    <form action={onSave} className="space-y-6">
      {/* JSON storage for server action */}
      <input type="hidden" name="racksJson" value={JSON.stringify(racks)} />

      <div className="flex justify-between items-center p-6 bg-slate-900 text-white rounded-2xl shadow-lg">
        <div className="text-center">
          <span className="text-4xl font-black">{homeScore}</span>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Home</p>
        </div>
        <div className="text-slate-600 font-black italic">VS</div>
        <div className="text-center">
          <span className="text-4xl font-black">{awayScore}</span>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Away</p>
        </div>
      </div>

      <div className="space-y-3">
        {racks.map((rack, idx) => (
          <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center gap-4 hover:border-indigo-200 transition-all">
            <span className="text-slate-300 font-bold text-sm">#{idx + 1}</span>
            
            {/* Home Side */}
            <div className="flex-1 space-y-2 w-full">
              <select 
                value={rack.homePlayer1Id} 
                onChange={(e) => updateRack(idx, 'homePlayer1Id', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-slate-50"
              >
                <option value="">Home Player</option>
                {homePlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  value={rack.homePlayer2Id} 
                  onChange={(e) => updateRack(idx, 'homePlayer2Id', e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                >
                  <option value="">Partner</option>
                  {homePlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            {/* Winner Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                type="button" 
                onClick={() => updateRack(idx, 'winner', 'home')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${rack.winner === 'home' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >HOME</button>
              <button 
                type="button" 
                onClick={() => updateRack(idx, 'winner', 'away')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${rack.winner === 'away' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >AWAY</button>
            </div>

            {/* Away Side */}
            <div className="flex-1 space-y-2 w-full">
              <select 
                value={rack.awayPlayer1Id} 
                onChange={(e) => updateRack(idx, 'awayPlayer1Id', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-slate-50"
              >
                <option value="">Away Player</option>
                {awayPlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  value={rack.awayPlayer2Id} 
                  onChange={(e) => updateRack(idx, 'awayPlayer2Id', e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                >
                  <option value="">Partner</option>
                  {awayPlayers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <button type="button" onClick={() => setRacks(racks.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-2">✕</button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => addRack('single')} className="py-3 border-2 border-dashed rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-50 transition-all">+ Singles</button>
        <button type="button" onClick={() => addRack('double')} className="py-3 border-2 border-dashed rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-50 transition-all">+ Doubles</button>
      </div>

      <button 
        type="submit" 
        disabled={racks.length === 0 || racks.some((r: any) => r.winner === null)}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all"
      >
        Submit Final Match Report
      </button>
    </form>
  );
}