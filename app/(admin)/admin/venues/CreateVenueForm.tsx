'use client';

import { useActionState } from "react";
import { Plus } from "lucide-react";

interface CreateVenueFormProps {
  // Pass the server action from the server component wrapper
  createVenueAction: (prevState: any, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export default function CreateVenueForm({ createVenueAction }: CreateVenueFormProps) {
  // Hook to handle server-side validation responses cleanly
  const [state, formAction, isPending] = useActionState(createVenueAction, { error: "" });

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800/80 p-6 md:p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full pointer-events-none"></div>
      
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-100 mb-1 flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-indigo-400 stroke-[3]" /> Establish Venue Node
      </h2>
      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-6">Initialize a new match deployment hub</p>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Club Venue Name</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="e.g., Rack & Cue Arena" 
            className={`w-full p-3.5 bg-zinc-950 border ${state?.error ? 'border-rose-500/50 focus:border-rose-500' : 'border-zinc-800 focus:border-indigo-500'} rounded-xl outline-none font-bold text-slate-100 text-xs transition-all`}
          />
          
          {/* 🎯 INLINE DUPLICATE NOTICE LINKED DIRECTLY TO DATABASE STATE */}
          {state?.error && (
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wide px-1 mt-1.5 animate-pulse">
              ⚠️ {state.error}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Street Address Locator</label>
          <input 
            type="text" 
            name="address" 
            placeholder="e.g., 42 Breakaway Blvd, Tier 1" 
            className="w-full p-3.5 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 text-xs transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1">Initial Node State</label>
          <div className="relative">
            <select 
              name="isActive" 
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 text-xs appearance-none pr-10 cursor-pointer"
            >
              <option value="true">Active Arena (Open for Matches)</option>
              <option value="false">Inactive Arena (Closed / Locked)</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white p-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md shadow-indigo-900/10 active:scale-[0.98] mt-2"
        >
          {isPending ? "Processing Registration..." : "Register Venue Entity"}
        </button>
      </form>
    </div>
  );
}