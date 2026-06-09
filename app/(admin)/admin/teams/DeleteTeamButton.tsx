"use client";

import { Trash2 } from "lucide-react";

interface DeleteTeamButtonProps {
  teamId: number;
  deleteAction: (formData: FormData) => Promise<void>;
}

export default function DeleteTeamButton({ teamId, deleteAction }: DeleteTeamButtonProps) {
  return (
    <form action={deleteAction} onSubmit={(e) => {
      if (!confirm("Are you sure you want to delete this team? All memberships and registrations will be deleted.")) {
        e.preventDefault();
      }
    }}>
      <input type="hidden" name="id" value={teamId} />
      <button className="p-2 text-slate-800 hover:text-red-500 transition-colors cursor-pointer">
        <Trash2 className="w-5 h-5" />
      </button>
    </form>
  );
}
