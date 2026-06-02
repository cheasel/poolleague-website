'use client';

import { useState, useTransition } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface Team {
  id: number;
  name: string;
}

interface AddPlayerFormProps {
  teams: Team[];
  seasonId: number | null;
  addPlayerAction: (formData: FormData) => Promise<void>;
}

export default function AddPlayerForm({ teams, seasonId, addPlayerAction }: AddPlayerFormProps) {
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formData = new FormData();
    formData.append("name", name);
    formData.append("teamId", teamId);
    if (seasonId) {
      formData.append("seasonId", seasonId.toString());
    }

    startTransition(async () => {
      try {
        await addPlayerAction(formData);
        setName(""); // Clear ONLY the competitor name input!
      } catch (err) {
        console.error("Failed adding competitor:", err);
      }
    });
  };

  return (
    <div className="bg-slate-900/40 rounded-[2.5rem] p-8 shadow-2xl border border-slate-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end relative z-10">
        <div className="md:col-span-5 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Competitor Name(s)</label>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            placeholder="Enter Name (or names separated by commas)..." 
            required 
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-100 placeholder:text-slate-855 transition-all shadow-inner text-xs font-sans"
          />
        </div>

        <div className="md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Assign Team</label>
          <div className="relative">
            <select 
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isPending}
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-100 appearance-none transition-all shadow-inner cursor-pointer text-xs uppercase"
            >
              <option value="">Free Agent (No Team)</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id.toString()}>
                  {team.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-500 font-sans">▼</div>
          </div>
        </div>

        <div className="md:col-span-3">
          <button 
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" /> Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Player
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}