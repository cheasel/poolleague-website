'use client';

import { useRef } from 'react';

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
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Player Name</label>
          <input 
            name="name" 
            required 
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            placeholder="e.g. Mark Selby"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Team</label>
          <select name="teamId" className="w-full p-2 border border-slate-300 rounded-md outline-none text-slate-900 bg-white">
            <option value="">Free Agent</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Handicap</label>
          <input 
            name="handicap" 
            type="number" 
            defaultValue="0"
            className="w-full p-2 border border-slate-300 rounded-md outline-none text-slate-900"
          />
        </div>
      </div>
      
      <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
        Save Player
      </button>
    </form>
  );
}