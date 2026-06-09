'use client';

import { useState } from "react";
import { FolderTree, Lock, Trash2, Edit2, Search, Users, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Season {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  logoUrl: string | null;
}

interface Division {
  id: number;
  name: string;
  tier: number;
  seasonId: number | null;
  season: Season | null;
  teams: Team[];
}

interface DivisionsListProps {
  initialDivisions: Division[];
  deleteDivisionAction: (formData: FormData) => Promise<void>;
  isReadOnly?: boolean;
}

export default function DivisionsList({ 
  initialDivisions, 
  deleteDivisionAction,
  isReadOnly = false
}: DivisionsListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDivisions = initialDivisions.filter((div) => {
    const nameMatch = div.name.toLowerCase().includes(searchQuery.toLowerCase());
    const seasonMatch = (div.season?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || seasonMatch;
  });

  const getTeamInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className={`${isReadOnly ? "lg:col-span-12" : "lg:col-span-7"} space-y-4`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          placeholder="Search by division or season split..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100 placeholder:text-slate-500 text-xs transition-all"
        />
      </div>

      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block px-1">
        Active Structural Strata ({filteredDivisions.length} of {initialDivisions.length} displayed)
      </span>

      {filteredDivisions.map((division) => {
        const teamCount = division.teams.length;
        const hasTeams = teamCount > 0;

        return (
          <div 
            key={division.id} 
            className="p-5 bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0 shadow-inner">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight truncate group-hover:text-indigo-400 transition-colors">
                    {division.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                    Tier {division.tier} • {division.season?.name || "No Linked Season"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/divisions/${division.id}`}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-500 hover:text-slate-100 transition-all shadow-sm"
                  title={isReadOnly ? "View Details" : "Edit Tier"}
                >
                  {isReadOnly ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <Edit2 className="w-3.5 h-3.5" />}
                </Link>
                
                {/* SAFEGUARD DELETION ACTION BLOCK */}
                {!isReadOnly && (
                  hasTeams ? (
                    <button 
                      type="button"
                      title="Active rosters are assigned. Clear teams first to unlock deletion."
                      className="p-2 bg-slate-950/40 border border-slate-900/60 rounded-lg text-slate-500 cursor-not-allowed flex items-center justify-center"
                      disabled
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <form action={deleteDivisionAction}>
                      <input type="hidden" name="divisionId" value={division.id} />
                      <button 
                        type="submit"
                        onClick={(e) => {
                          if (!confirm("Are you sure you want to delete this division level? This action is permanent.")) {
                            e.preventDefault();
                          }
                        }}
                        className="p-2 bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-400/30 rounded-lg text-slate-500 hover:text-rose-400 transition-all shadow-sm cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )
                )}
              </div>
            </div>

            {/* Division roster details (assigned teams) */}
            <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
                <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                {hasTeams ? (
                  <span className="text-slate-400">{teamCount} {teamCount === 1 ? 'Team' : 'Teams'} Enrolled</span>
                ) : (
                  <span className="text-slate-600 italic">Empty Bracket (0 Teams)</span>
                )}
              </div>

              {hasTeams && (
                <div className="flex flex-wrap gap-1">
                  {division.teams.map((t) => (
                    <div 
                      key={t.id}
                      title={t.name}
                      className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md max-w-[120px] text-slate-400 font-bold"
                    >
                      {t.logoUrl ? (
                        <div className="w-3.5 h-3.5 relative rounded overflow-hidden shrink-0">
                          <Image src={t.logoUrl} alt="" fill className="object-contain" unoptimized />
                        </div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded bg-indigo-950 flex items-center justify-center font-black text-[6px] text-indigo-400 shrink-0">
                          {getTeamInitials(t.name)}
                        </div>
                      )}
                      <span className="text-[8px] truncate tracking-tight">{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {hasTeams && (
                <span className="text-[8px] font-black uppercase tracking-wider text-rose-500/80 bg-rose-950/20 border border-rose-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Roster Active
                </span>
              )}
            </div>
          </div>
        );
      })}

      {filteredDivisions.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl py-12 text-center text-slate-700 font-black text-xs uppercase tracking-[0.2em] italic">
          No division levels match your filters.
        </div>
      )}
    </div>
  );
}
