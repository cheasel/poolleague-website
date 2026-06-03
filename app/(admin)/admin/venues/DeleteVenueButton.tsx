'use client';

import { Trash2 } from "lucide-react";

interface DeleteVenueButtonProps {
  venueId: number;
  deleteAction: (formData: FormData) => Promise<void>; 
}

export default function DeleteVenueButton({ venueId, deleteAction }: DeleteVenueButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("Warning: Purging this venue node drops its linked address history on rosters. Continue?")) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteAction} onSubmit={handleSubmit}>
      <input type="hidden" name="venueId" value={venueId} />
      <button 
        type="submit"
        className="p-2 bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-400/30 rounded-lg text-slate-500 hover:text-rose-400 transition-all shadow-sm cursor-pointer"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </form>
  );
}