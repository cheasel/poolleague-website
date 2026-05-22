'use client';

import { useRef } from 'react';

interface Props {
  teams: { id: number; name: string }[];
  seasons: { id: number; name: string }[];
  action: (formData: FormData) => Promise<void>;
}

export default function AddMatchForm({ teams, seasons, action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2rem] border border-slate-900 shadow-2xl mb-12 relative overflow-hidden group hover:border-slate-800 transition-all"
    >
      <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Season Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Season Block</label>
          <select 
            name="seasonId" 
            required 
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs uppercase text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
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