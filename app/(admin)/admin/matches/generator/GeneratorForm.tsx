'use client';

import { useState, useEffect } from "react";

interface DivisionWithDate {
  id: number;
  name: string;
  seasonStartDate: string; // YYYY-MM-DD
}

interface GeneratorFormProps {
  divisions: DivisionWithDate[];
  selectedDivId: string;
  action: (formData: FormData) => Promise<void>;
}

export default function GeneratorForm({ divisions, selectedDivId, action }: GeneratorFormProps) {
  const [selectedId, setSelectedId] = useState(selectedDivId);
  const [startDate, setStartDate] = useState("");

  // Update startDate when selected division changes, or when the initial selectedDivId changes
  useEffect(() => {
    if (selectedId) {
      const div = divisions.find(d => d.id.toString() === selectedId);
      if (div && div.seasonStartDate) {
        setStartDate(div.seasonStartDate);
      } else {
        setStartDate("");
      }
    } else {
      setStartDate("");
    }
  }, [selectedId, divisions]);

  return (
    <form action={action} className="space-y-6 pt-4 relative z-10">
      <div className="space-y-2.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">
          Target League Division
        </label>
        <select 
          name="divisionId" 
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase tracking-[0.1em] appearance-none transition-all shadow-inner cursor-pointer"
        >
          <option value="">Select Division to Balance...</option>
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-2">
          Season Opening Date (Week 1)
        </label>
        <input 
          type="date"
          name="startDate"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 outline-none font-bold text-white text-xs uppercase tracking-widest transition-all shadow-inner"
        />
      </div>

      <button 
        type="submit" 
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[10px] p-5 rounded-[1.5rem] transition-all shadow-lg shadow-indigo-900/20 mt-6 active:scale-[0.98] cursor-pointer"
      >
        Execute Matrix Generation
      </button>
    </form>
  );
}
