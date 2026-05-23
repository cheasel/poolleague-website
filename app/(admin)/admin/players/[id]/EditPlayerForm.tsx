'use client';

import { useActionState, useState } from "react";
import { Save, User, MapPin, Image as ImageIcon, UploadCloud } from "lucide-react";
import Link from "next/link";

interface TeamOption {
  id: number;
  name: string;
}

interface EditPlayerFormProps {
  player: {
    id: number;
    name: string;
    teamId: number | null;
    imageUrl: string | null;
  };
  teamsList: TeamOption[];
  updatePlayerAction: (prevState: any, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export default function EditPlayerForm({ player, teamsList, updatePlayerAction }: EditPlayerFormProps) {
  const [state, formAction, isPending] = useActionState(updatePlayerAction, { error: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(player.imageUrl);

  // Intercept changes on the file inputs and render localized previews instantly
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] border border-zinc-800/80 p-6 md:p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full pointer-events-none"></div>

      <form action={formAction} className="space-y-6">
        {/* Pass identity configuration pointer */}
        <input type="hidden" name="playerId" value={player.id} />

        {/* ERROR FEEDBACK MODULE */}
        {state?.error && (
          <div className="p-4 bg-rose-950/40 border border-rose-900/40 rounded-xl text-xs font-bold text-rose-400 uppercase tracking-wide">
            ⚠️ {state.error}
          </div>
        )}

        {/* HIGH-TECH MATCHING IMAGE BOX UPLOAD PANEL */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-zinc-500" /> Player Profile Avatar Photo
          </label>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-zinc-950 border border-zinc-850 rounded-2xl">
            <div className="w-24 h-24 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={imagePreview} 
                  alt="Player Avatar Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-zinc-750" />
              )}
            </div>
            
            <div className="flex-1 w-full space-y-2">
              <div className="relative flex items-center justify-center w-full h-24 border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-xl cursor-pointer bg-zinc-900/20 transition-all group">
                <input 
                  type="file" 
                  name="playerImageFile"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="text-center space-y-1 p-2 pointer-events-none">
                  <UploadCloud className="w-5 h-5 text-zinc-500 group-hover:text-indigo-400 mx-auto transition-colors" />
                  <p className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white transition-colors">
                    Upload Roster Photo
                  </p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">PNG, JPG up to 2MB</p>
                </div>
              </div>
              {/* Reference backup identifier link */}
              <input type="hidden" name="existingImageUrl" value={player.imageUrl || ""} />
            </div>
          </div>
        </div>

        {/* Input: Player Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1 flex items-center gap-1.5">
            <User className="w-3 h-3 text-zinc-500" /> Full Registered Name
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={player.name}
            placeholder="e.g., Ronnie O'Sullivan"
            className="w-full p-3.5 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-white text-xs transition-all"
          />
        </div>

        {/* Dropdown Selection: Club Roster Alignment */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 ml-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-indigo-400" /> Assigned Club / Squad Alignment
          </label>
          <div className="relative">
            <select
              name="teamId"
              defaultValue={player.teamId ?? ""}
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-white text-xs appearance-none pr-10 cursor-pointer"
            >
              <option value="">-- Unassigned Free Agent Status --</option>
              {teamsList.map((team) => (
                <option key={team.id} value={team.id} className="text-white bg-zinc-950">
                  {team.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">▼</div>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/60">
          <Link
            href="/admin/players"
            className="px-5 py-3.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-all"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5 stroke-[3]" />
            {isPending ? "Syncing Athlete Node..." : "Commit Player Record"}
          </button>
        </div>
      </form>
    </div>
  );
}