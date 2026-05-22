'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';

// Define the interface for the props
interface Props {
  teams: { id: number; name: string }[];
  action: (formData: FormData) => Promise<void>;
}

export default function AddPlayerForm({ teams, action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form 
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset(); // Clears the form after successful add
      }} 
      className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[2rem] border border-slate-900 shadow-2xl relative overflow-hidden group hover:border-slate-800 transition-all mb-12"
    >
      <div className="absolute top-0 right-0 w-64 h-full bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Competitor Identity</label>
          <input 
            name="name" 
            required 
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase placeholder:text-slate-800 transition-all shadow-inner"
            placeholder="e.g. Mark Selby"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Squad Assignment</label>
          <select 
            name="teamId" 
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase appearance-none transition-all shadow-inner"
          >
            <option value="">Free Agent (No Team)</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">Metric Handicap</label>
          <input 
            name="handicap" 
            type="number" 
            defaultValue="0"
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase transition-all shadow-inner"
          />
        </div>
      </div>
      
      <button 
        type="submit" 
        className="mt-8 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2 relative z-10"
      >
        <Plus className="w-4 h-4 stroke-[3]" /> Register Competitor Profile
      </button>
    </form>
  );
}