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
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Season Select */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
          <select name="seasonId" required className="w-full p-2 border border-slate-300 rounded-md bg-white">
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Home Team */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Home Team</label>
          <select name="homeTeamId" required className="w-full p-2 border border-slate-300 rounded-md bg-white">
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Away Team */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Away Team</label>
          <select name="awayTeamId" required className="w-full p-2 border border-slate-300 rounded-md bg-white">
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Match Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
          <input name="matchDate" type="datetime-local" required className="w-full p-2 border border-slate-300 rounded-md" />
        </div>
      </div>
      
      <button type="submit" className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
        Schedule Match
      </button>
    </form>
  );
}