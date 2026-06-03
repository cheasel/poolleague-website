'use client';

import { useState, useTransition } from "react";
import { MapPin, Store, ToggleLeft, Edit2, ShieldCheck, ShieldAlert, Search, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import DeleteVenueButton from "./DeleteVenueButton";

interface Team {
  id: number;
  name: string;
  logoUrl: string | null;
}

interface Venue {
  id: number;
  name: string;
  address: string | null;
  isActive: boolean | null;
  teams: Team[];
}

interface VenuesListProps {
  initialVenues: Venue[];
  deleteVenueAction: (formData: FormData) => Promise<void>;
  toggleVenueAction: (formData: FormData) => Promise<void>;
}

export default function VenuesList({ 
  initialVenues, 
  deleteVenueAction, 
  toggleVenueAction 
}: VenuesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = (venueId: number, currentActive: boolean) => {
    setUpdatingId(venueId);
    const formData = new FormData();
    formData.append("venueId", venueId.toString());
    formData.append("currentActive", currentActive.toString());

    startTransition(async () => {
      try {
        await toggleVenueAction(formData);
      } catch (err) {
        console.error("Failed to toggle venue status: ", err);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const filteredVenues = initialVenues.filter((v) => {
    const nameMatch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const addressMatch = (v.address || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || addressMatch;
  });

  const getTeamInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="lg:col-span-2 space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search by arena name or address..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100 placeholder:text-slate-500 text-xs transition-all"
        />
      </div>

      <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 ml-1">
        Registered Live Locations ({filteredVenues.length} of {initialVenues.length} displayed)
      </div>

      {filteredVenues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVenues.map((venue) => {
            const teamCount = venue.teams.length;
            const isFull = teamCount >= 2;
            const isUpdating = updatingId === venue.id && isPending;

            return (
              <div 
                key={venue.id} 
                className={`bg-slate-900/40 backdrop-blur-md border hover:border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between group transition-all relative overflow-hidden ${
                  venue.isActive ? 'border-slate-800 hover:border-indigo-500/20' : 'border-slate-900 opacity-75'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Store avatar container with capacity indicators */}
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-xl bg-slate-950 border flex items-center justify-center transition-colors shrink-0 shadow-inner ${
                        venue.isActive ? 'border-slate-800 text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/20' : 'border-slate-900 text-slate-600'
                      }`}>
                        <Store className="w-4 h-4" />
                      </div>
                      
                      {/* Mini capacity dot */}
                      <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center border border-slate-950 shadow-md ${
                        isFull 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : teamCount === 1 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {teamCount}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/admin/venues/${venue.id}`}
                        className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-500 hover:text-slate-100 transition-all shadow-sm"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Link>
                      <DeleteVenueButton venueId={venue.id} deleteAction={deleteVenueAction} />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">
                        {venue.name}
                      </h3>
                      
                      {/* Capacity Pill tag */}
                      <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        isFull 
                          ? 'bg-rose-950/40 text-rose-400 border-rose-900/30' 
                          : teamCount === 1
                          ? 'bg-amber-950/30 text-amber-500 border-amber-900/30'
                          : 'bg-slate-950 text-slate-600 border-slate-800'
                      }`}>
                        {teamCount}/2 Teams
                      </span>
                    </div>
                    
                    {venue.address ? (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-indigo-400 font-medium mt-1.5 truncate transition-colors group/link"
                      >
                        <MapPin className="w-3 h-3 text-slate-600 shrink-0 group-hover/link:text-indigo-400" />
                        <span className="underline decoration-dotted decoration-slate-500 truncate">{venue.address}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover/link:opacity-100 transition-all shrink-0" />
                      </a>
                    ) : (
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-600 italic font-medium mt-1.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                        No Address Provided
                      </p>
                    )}
                  </div>

                  {/* Render Assigned Roster Teams list */}
                  {teamCount > 0 && (
                    <div className="space-y-1.5 pt-1.5">
                      <div className="text-[8px] font-black uppercase tracking-wider text-slate-600 ml-0.5">Franchise Tenants:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {venue.teams.map((t) => (
                          <div 
                            key={t.id} 
                            className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md max-w-full text-slate-400 font-bold"
                          >
                            {t.logoUrl ? (
                              <div className="w-3 h-3 relative rounded overflow-hidden shrink-0">
                                <Image src={t.logoUrl} alt="" fill className="object-contain" unoptimized />
                              </div>
                            ) : (
                              <div className="w-3 h-3 rounded bg-indigo-950 flex items-center justify-center font-black text-[6px] text-indigo-400 shrink-0">
                                {getTeamInitials(t.name)}
                              </div>
                            )}
                            <span className="text-[9px] truncate tracking-tight">{t.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Status Toggle Action Button */}
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleToggleActive(venue.id, !!venue.isActive)}
                  className={`w-full mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-950/20 transition-all rounded px-1.5 py-1 -mx-1.5 ${
                    isUpdating ? 'animate-pulse' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <ToggleLeft className={`w-3.5 h-3.5 transition-colors ${venue.isActive ? 'text-indigo-400' : 'text-slate-600'}`} /> Operational State
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {isUpdating && (
                      <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                    )}
                    {venue.isActive ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/10 font-mono text-[9px] shadow-sm">
                        <ShieldCheck className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 bg-rose-500/5 px-2.5 py-1 rounded border border-rose-500/10 font-mono text-[9px] shadow-sm">
                        <ShieldAlert className="w-3 h-3" /> Suspended
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-xs font-bold text-slate-600 uppercase border border-dashed border-slate-800 rounded-[2rem] bg-slate-950/10">
          No matching host location records found.
        </div>
      )}
    </div>
  );
}
