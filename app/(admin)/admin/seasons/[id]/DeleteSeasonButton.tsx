'use client';

import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteSeasonButtonProps {
  action: () => Promise<{ success: boolean; error?: string }>;
  seasonName: string;
  isFinished: boolean;
}

export default function DeleteSeasonButton({ action, seasonName, isFinished }: DeleteSeasonButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this season?\n\nThis will permanently delete all associated divisions, teams registrations, matchweeks, fixtures, results, and player memberships. This action cannot be undone."
    );
    if (confirmed) {
      if (isFinished) {
        const typedName = window.prompt(
          `This season is already finished/archived.\n\nTo confirm permanent deletion, please type the exact name of the season: "${seasonName}"`
        );
        if (typedName !== seasonName) {
          alert("Deletion cancelled. Typed name does not match the season name.");
          return;
        }
      }
      startTransition(async () => {
        const result = await action();
        if (result && !result.success) {
          console.error("Failed to delete season:", result.error);
          alert("Failed to delete season: " + result.error);
        } else {
          router.push("/admin/seasons");
          router.refresh();
        }
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="w-full bg-slate-950 hover:bg-rose-950 border border-slate-900 hover:border-rose-400/30 text-slate-500 hover:text-rose-400 p-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {isPending ? "Deleting Season..." : "Delete Season splitting"}
    </button>
  );
}
