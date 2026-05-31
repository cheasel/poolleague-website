'use client';

import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';

interface DeleteSeasonButtonProps {
  action: () => Promise<void>;
}

export default function DeleteSeasonButton({ action }: DeleteSeasonButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this season?\n\nThis will permanently delete all associated divisions, teams registrations, matchweeks, fixtures, results, and player memberships. This action cannot be undone."
    );
    if (confirmed) {
      startTransition(async () => {
        try {
          await action();
        } catch (err) {
          console.error("Failed to delete season:", err);
          alert("Failed to delete season. Please check server logs.");
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="w-full bg-zinc-950 hover:bg-red-950/20 border border-zinc-900 hover:border-red-900/40 text-slate-500 hover:text-red-400 p-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {isPending ? "Deleting Season..." : "Delete Season splitting"}
    </button>
  );
}
