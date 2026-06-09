'use client';

import { useActionState, useState } from "react";
import { Save, Shield, MapPin, Image as ImageIcon, UploadCloud } from "lucide-react";
import Link from "next/link";

interface VenueOption {
  id: number;
  name: string;
  currentTeamsCount: number;
}

interface EditTeamFormProps {
  team: {
    id: number;
    name: string;
    homeVenueId: number | null;
    logoUrl: string | null;
  };
  venuesList: VenueOption[];
  updateTeamAction: (prevState: { error?: string; success?: boolean } | null, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  isReadOnly?: boolean;
}

export default function EditTeamForm({ team, venuesList, updateTeamAction, isReadOnly = false }: EditTeamFormProps) {
  const [state, formAction, isPending] = useActionState(updateTeamAction, { error: "" });
  const [logoPreview, setLogoPreview] = useState<string | null>(team.logoUrl);

  // Optional: If you are handling direct client-side file changes for a preview
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-slate-800/80 p-6 md:p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full pointer-events-none"></div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="teamId" value={team.id} />

        {/* ERROR FEEDBACK */}
        {state?.error && (
          <div className="p-4 bg-rose-950/40 border border-rose-900/40 rounded-xl text-xs font-bold text-rose-400 uppercase tracking-wide">
            ⚠️ {state.error}
          </div>
        )}

        {/* TEAM LOGO / IMAGE ADD BOX RESTORED */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1 flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-slate-505 text-slate-500" /> Team Emblem / Insignia Crest
          </label>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="w-24 h-24 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={logoPreview} 
                  alt="Team Logo Preview" 
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-600" />
              )}
            </div>
            
            <div className="flex-1 w-full space-y-2">
              {!isReadOnly ? (
                <div className="relative flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer bg-slate-900/20 transition-all group">
                  <input 
                      type="file" 
                      name="logoFile" // 🎯 Must match formData.get("logoFile") exactly!
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="text-center space-y-1 p-2 pointer-events-none">
                    <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 mx-auto transition-colors" />
                    <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-100 transition-colors">
                      Upload New Crest Image
                    </p>
                    <p className="text-[9px] text-slate-600 font-bold uppercase">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-24 border border-slate-800 rounded-xl bg-slate-950/30 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  Emblem Editing Disabled
                </div>
              )}
              {/* Fallback hidden input to pass existing URL if file isn't updated */}
              <input type="hidden" name="existingLogoUrl" value={team.logoUrl || ""} />
            </div>
          </div>
        </div>

        {/* Input: Team Identity Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-slate-500" /> Identity Roster Name
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={team.name}
            disabled={isReadOnly}
            placeholder="e.g., Spitfire Shooters"
            className="w-full p-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* VENUE SELECTION DROPDOWN */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-indigo-400" /> Assigned Home Deployment Venue
          </label>
          <div className="relative">
            <select
              name="homeVenueId"
              defaultValue={team.homeVenueId ?? ""}
              disabled={isReadOnly}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-100 text-xs appearance-none pr-10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">-- No Home Venue Assigned --</option>
              {venuesList.map((venue) => {
                const isCurrentHome = team.homeVenueId === venue.id;
                const allocationCount = venue.currentTeamsCount;
                const isFull = allocationCount >= 2 && !isCurrentHome;

                return (
                  <option 
                    key={venue.id} 
                    value={venue.id}
                    disabled={isFull}
                    className={isFull ? "text-slate-600 bg-slate-950" : "text-slate-100 bg-slate-950"}
                  >
                    {venue.name} ({allocationCount}/2 Slots Filled) {isFull ? " [MAX CAPACITY]" : ""}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
          </div>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider ml-1">
            Structural Rule: System blocks allocation above 2 clubs per base node environment.
          </p>
        </div>

        {/* Control Button Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60">
          <Link
            href="/admin/teams"
            className="px-5 py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all"
          >
            {isReadOnly ? "Back to Squads" : "Abort Modifications"}
          </Link>
          
          {!isReadOnly && (
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-md active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5 stroke-[3]" />
              {isPending ? "Syncing Roster..." : "Commit Team Records"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}