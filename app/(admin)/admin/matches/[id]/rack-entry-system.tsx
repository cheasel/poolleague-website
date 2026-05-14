'use client';

import { useState } from 'react';

interface Player {
  id: number;
  name: string;
}

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
  onSave 
}: { 
  homePlayers: Player[], 
  awayPlayers: Player[], 
  onSave: (formData: FormData) => Promise<void> 
}) {
  const [racks, setRacks] = useState<Rack[]>([]);

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
    newRacks[index] = { ...newRacks[index], [field]: value };
    setRacks(newRacks);
  };

  const homeScore = racks.filter(r => r.winner === 'home').length;
  const awayScore = racks.filter(r => r.winner === 'away').length;

  return (
    <form action={onSave} className="space-y-8">
      {/* Visual Score Summary */}
      <div className="flex justify-center items-center gap-12 py-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="text-center">
          <div className="text-5xl font-black text-slate-900">{homeScore}</div>
          <input type="hidden" name="homeTotalScore" value={homeScore} />
        </div>
        <div className="text-slate-300 font-bold">TOTAL SCORE</div>
        <div className="text-center">
          <div className="text-5xl font-black text-slate-900">{awayScore}</div>
          <input type="hidden" name="awayTotalScore" value={awayScore} />
        </div>
      </div>

      {/* Rack List */}
      <div className="space-y-4">
        {racks.map((rack, idx) => (
          <div key={idx} className="p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-white shadow-sm">
            <div className="md:col-span-1 font-mono font-bold text-slate-400">#{idx + 1}</div>
            
            {/* Home Player(s) */}
            <div className="md:col-span-4 space-y-2">
              <select 
                required
                className="w-full p-2 text-sm border rounded-lg bg-white"
                onChange={(e) => updateRack(idx, 'homePlayer1Id', e.target.value)}
              >
                <option value="">Select Player</option>
                {homePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  required
                  className="w-full p-2 text-sm border rounded-lg bg-white"
                  onChange={(e) => updateRack(idx, 'homePlayer2Id', e.target.value)}
                >
                  <option value="">Select Partner</option>
                  {homePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div className="md:col-span-2 flex justify-center gap-2">
              <button 
                type="button"
                onClick={() => updateRack(idx, 'winner', 'home')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${rack.winner === 'home' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                HOME WIN
              </button>
              <button 
                type="button"
                onClick={() => updateRack(idx, 'winner', 'away')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${rack.winner === 'away' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}
              >
                AWAY WIN
              </button>
            </div>

            {/* Away Player(s) */}
            <div className="md:col-span-4 space-y-2">
              <select 
                required
                className="w-full p-2 text-sm border rounded-lg bg-white"
                onChange={(e) => updateRack(idx, 'awayPlayer1Id', e.target.value)}
              >
                <option value="">Select Player</option>
                {awayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {rack.type === 'double' && (
                <select 
                  required
                  className="w-full p-2 text-sm border rounded-lg bg-white"
                  onChange={(e) => updateRack(idx, 'awayPlayer2Id', e.target.value)}
                >
                  <option value="">Select Partner</option>
                  {awayPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div className="md:col-span-1 flex justify-end">
              <button 
                type="button" 
                onClick={() => setRacks(racks.filter((_, i) => i !== idx))}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-100">
        <button 
          type="button" 
          onClick={() => addRack('single')}
          className="flex-1 py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all"
        >
          + Add Singles Frame
        </button>
        <button 
          type="button" 
          onClick={() => addRack('double')}
          className="flex-1 py-3 px-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-purple-400 hover:text-purple-600 transition-all"
        >
          + Add Doubles Frame
        </button>
      </div>

      <button 
        type="submit" 
        disabled={racks.length === 0 || racks.some(r => r.winner === null)}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100"
      >
        Save Match Result ({homeScore} - {awayScore})
      </button>
    </form>
  );
}