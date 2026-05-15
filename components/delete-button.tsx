'use client';

import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  id: number;
  action: (formData: FormData) => Promise<void>;
  label: string;
}

export default function DeleteButton({ id, action, label }: DeleteButtonProps) {
  const handleDelete = async (formData: FormData) => {
    const confirmed = window.confirm(`Are you sure you want to delete this ${label}? This action cannot be undone.`);
    if (confirmed) {
      await action(formData);
    }
  };

  return (
    <form action={handleDelete}>
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}