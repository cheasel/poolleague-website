'use client';

import { useRef, useState, useEffect } from 'react';

interface Props {
  teams: { id: number; name: string; divisionId: number | null }[];
  seasons: { id: number; name: string }[];
  divisions: { id: number; name: string; seasonId: number | null }[];
  action: (formData: FormData) => Promise<void>;
}

export default function AddMatchForm({ teams, seasons, divisions, action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  
  // Dynamic local state to filter divisions by season
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasons[0]?.id?.toString() || '');
  const [filteredDivisions, setFilteredDivisions] = useState<typeof divisions>([]);
  
  // Dynamic local state to filter teams by division
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [filteredTeams, setFilteredTeams] = useState<typeof teams>([]);

  // 1. Filter divisions when season changes
  useEffect(() => {
    if (selectedSeasonId) {
      const nextDivisions = divisions.filter(d => d.seasonId?.toString() === selectedSeasonId);
      setFilteredDivisions(nextDivisions);
      
      // Auto-select the first division in the filtered list
      if (nextDivisions[0]) {
        setSelectedDivisionId(nextDivisions[0].id.toString());
      } else {
        setSelectedDivisionId('');
      }
    } else {
      setFilteredDivisions([]);
      setSelectedDivisionId('');
    }
  }, [selectedSeasonId, divisions]);

  // 2. Filter teams when division changes
  useEffect(() => {
    if (selectedDivisionId) {
      setFilteredTeams(teams.filter(t => t.divisionId?.toString() === selectedDivisionId));
    } else {
      setFilteredTeams([]);
    }
  }, [selectedDivisionId, teams]);

  return (
    <form 
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
        // Reset local selected season to trigger correct filtered list state
        if (seasons[0]) {
          setSelectedSeasonId(seasons[0].id.toString());
        }
      }}
      className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2rem] border border-slate-900 shadow-2xl mb-12 relative overflow-hidden group hover:border-slate-800 transition-all"
    >
      <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 relative z-10">
        {/* Season Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Season Block</label>
          <select 
            name="seasonId" 
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Division Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">League Division</label>
          <select 
            name="divisionId" 
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
          >
            {filteredDivisions.length > 0 ? (
              filteredDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
            ) : (
              <option value="">No Divisions</option>
            )}
          </select>
        </div>

        {/* Home Team */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Home Club Arena</label>
          <select 
            name="homeTeamId" 
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
          >
            {filteredTeams.length > 0 ? (
              filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
            ) : (
              <option value="">No Teams Found</option>
            )}
          </select>
        </div>

        {/* Away Team */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Away Squad Visit</label>
          <select 
            name="awayTeamId" 
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
          >
            {filteredTeams.length > 0 ? (
              filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
            ) : (
              <option value="">No Teams Found</option>
            )}
          </select>
        </div>

        {/* Week Number */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Week Number</label>
          <input 
            name="weekNumber" 
            type="number" 
            min="1"
            defaultValue="1"
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-indigo-500 transition-all shadow-inner" 
          />
        </div>

        {/* Match Date */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Event Timestamp</label>
          <input 
            name="matchDate" 
            type="datetime-local" 
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-indigo-500 transition-all shadow-inner" 
          />
        </div>
      </div>
      
      <button 
        type="submit" 
        className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2 relative z-10"
      >
        Execute Schedule Insertion
      </button>
    </form>
  );
}