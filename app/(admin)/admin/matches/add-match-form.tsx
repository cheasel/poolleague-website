'use client';

import { useRef, useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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

  // State to track multiple matchup rows (Home vs Away pairings)
  const [matchups, setMatchups] = useState<Array<{ id: string; homeTeamId: string; awayTeamId: string }>>([
    { id: 'initial-row', homeTeamId: '', awayTeamId: '' }
  ]);

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
      const activeTeams = teams.filter(t => t.divisionId?.toString() === selectedDivisionId);
      setFilteredTeams(activeTeams);
      
      // Auto-populate the initial row with the first two teams of the division
      if (activeTeams.length >= 2) {
        setMatchups([
          { 
            id: 'initial-row', 
            homeTeamId: activeTeams[0].id.toString(), 
            awayTeamId: activeTeams[1].id.toString() 
          }
        ]);
      } else {
        setMatchups([{ id: 'initial-row', homeTeamId: '', awayTeamId: '' }]);
      }
    } else {
      setFilteredTeams([]);
      setMatchups([{ id: 'initial-row', homeTeamId: '', awayTeamId: '' }]);
    }
  }, [selectedDivisionId, teams]);

  const addMatchupRow = () => {
    if (filteredTeams.length >= 2) {
      // Find a default pairing that is not yet selected, or default to first/second
      const nextHome = filteredTeams[0].id.toString();
      const nextAway = filteredTeams[1].id.toString();
      setMatchups([
        ...matchups,
        { id: 'row-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), homeTeamId: nextHome, awayTeamId: nextAway }
      ]);
    }
  };

  const removeMatchupRow = (id: string) => {
    if (matchups.length > 1) {
      setMatchups(matchups.filter(m => m.id !== id));
    }
  };

  const handleHomeChange = (rowId: string, value: string) => {
    setMatchups(prev => prev.map(m => m.id === rowId ? { ...m, homeTeamId: value } : m));
  };

  const handleAwayChange = (rowId: string, value: string) => {
    setMatchups(prev => prev.map(m => m.id === rowId ? { ...m, awayTeamId: value } : m));
  };

  // Validation: Check for duplicate matchups in the current form (Home vs Away regardless of order)
  const hasDuplicateMatchups = () => {
    const keys = matchups
      .filter(m => m.homeTeamId && m.awayTeamId)
      .map(m => [m.homeTeamId, m.awayTeamId].sort((a, b) => a.localeCompare(b)).join('-'));
    return keys.length !== new Set(keys).size;
  };

  const isFormInvalid = hasDuplicateMatchups() || filteredTeams.length < 2;

  return (
    <form 
      ref={formRef}
      action={async (formData) => {
        if (isFormInvalid) return;
        await action(formData);
        formRef.current?.reset();
        // Reset matchups back to a single row
        if (filteredTeams.length >= 2) {
          setMatchups([
            { 
              id: 'reset-row-' + Date.now(), 
              homeTeamId: filteredTeams[0].id.toString(), 
              awayTeamId: filteredTeams[1].id.toString() 
            }
          ]);
        } else {
          setMatchups([{ id: 'reset-row-' + Date.now(), homeTeamId: '', awayTeamId: '' }]);
        }
        // Reset local selected season
        if (seasons[0]) {
          setSelectedSeasonId(seasons[0].id.toString());
        }
      }}
      className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2rem] border border-slate-900 shadow-2xl mb-12 relative overflow-hidden group hover:border-slate-800 transition-all space-y-8"
    >
      <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      {/* SECTION A: SHARED CONFIGURATION VALUES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Season Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Season Block</label>
          <select 
            name="seasonId" 
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
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
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
          >
            {filteredDivisions.length > 0 ? (
              filteredDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
            ) : (
              <option value="">No Divisions</option>
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
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Match Date (8:00 PM)</label>
          <input 
            name="matchDate" 
            type="date" 
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-white uppercase outline-none focus:border-indigo-500 transition-all shadow-inner" 
          />
        </div>
      </div>

      <hr className="border-slate-800/80 relative z-10" />

      {/* SECTION B: DYNAMIC MATCHUPS LIST */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between ml-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Matchups Pool</h3>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Active matches in batch: {matchups.length}</span>
        </div>

        <div className="space-y-4.5">
          {matchups.map((row, index) => {
            // Rule 1: A team cannot play itself. 
            // We filter out the selected Home team from the Away team options (and vice-versa)
            const homeOptions = filteredTeams.filter(t => t.id.toString() !== row.awayTeamId);
            const awayOptions = filteredTeams.filter(t => t.id.toString() !== row.homeTeamId);

            return (
              <div 
                key={row.id} 
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-4 items-center bg-slate-950/40 p-4 border border-slate-900 rounded-2xl transition-colors hover:border-slate-850"
              >
                {/* Home Team */}
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 ml-1.5">Home Club</label>
                  <select 
                    name="homeTeamId" 
                    value={row.homeTeamId}
                    onChange={(e) => handleHomeChange(row.id, e.target.value)}
                    required 
                    className="w-full p-3.5 bg-slate-950 border border-slate-800/85 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
                  >
                    {homeOptions.length > 0 ? (
                      homeOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    ) : (
                      <option value="">No Teams Found</option>
                    )}
                  </select>
                </div>

                {/* VS Divider Text */}
                <div className="text-center font-black uppercase tracking-widest text-slate-700 text-[10px] md:pt-4">
                  vs
                </div>

                {/* Away Team */}
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-600 ml-1.5">Away Club</label>
                  <select 
                    name="awayTeamId" 
                    value={row.awayTeamId}
                    onChange={(e) => handleAwayChange(row.id, e.target.value)}
                    required 
                    className="w-full p-3.5 bg-slate-950 border border-slate-800/85 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
                  >
                    {awayOptions.length > 0 ? (
                      awayOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    ) : (
                      <option value="">No Teams Found</option>
                    )}
                  </select>
                </div>

                {/* Remove Row Button */}
                <div className="flex justify-end md:pt-4">
                  <button
                    type="button"
                    title="Remove matchup row"
                    onClick={() => removeMatchupRow(row.id)}
                    disabled={matchups.length === 1}
                    className="w-11 h-11 rounded-xl bg-slate-950 hover:bg-red-950/20 hover:text-red-400 border border-slate-850 flex items-center justify-center transition-colors text-slate-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Matchup Row Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={addMatchupRow}
            disabled={filteredTeams.length < 2}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add Matchup Row
          </button>
        </div>
      </div>

      {/* VALIDATION ERRORS BANNER */}
      {hasDuplicateMatchups() && (
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex gap-3 text-red-400 relative z-10 shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
            ⚠️ Error: Duplicate matchups detected in this batch. Every pairing must be unique.
          </span>
        </div>
      )}

      <div className="pt-4 relative z-10 flex justify-end">
        <button 
          type="submit" 
          disabled={isFormInvalid}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Execute Batch Insertion
        </button>
      </div>
    </form>
  );
}