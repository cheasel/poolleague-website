'use client';

import { useState, useTransition } from "react";
import { User, Trash2, Pencil, Shield, Search, Check, Loader2 } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';

interface Player {
  id: number;
  name: string;
  imageUrl: string | null;
  teamId: number | null;
  teamName: string | null;
  teamLogoUrl: string | null;
}

interface Team {
  id: number;
  name: string;
}

interface PlayersListProps {
  initialPlayers: Player[];
  teams: Team[];
  deletePlayerAction: (formData: FormData) => Promise<void>;
  changePlayerTeamAction: (formData: FormData) => Promise<void>;
}

export default function PlayersList({ 
  initialPlayers, 
  teams, 
  deletePlayerAction, 
  changePlayerTeamAction 
}: PlayersListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleTeamChange = async (playerId: number, teamIdVal: string) => {
    setUpdatingId(playerId);
    setSuccessId(null);
    
    const formData = new FormData();
    formData.append("playerId", playerId.toString());
    if (teamIdVal) {
      formData.append("teamId", teamIdVal);
    }

    startTransition(async () => {
      try {
        await changePlayerTeamAction(formData);
        setSuccessId(playerId);
        setTimeout(() => {
          setSuccessId((prev) => (prev === playerId ? null : prev));
        }, 2000);
      } catch (err) {
        console.error("Failed to update player team: ", err);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  // Filter logic
  const filteredPlayers = initialPlayers.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = 
      teamFilter === "all" ||
      (teamFilter === "free-agent" && !player.teamId) ||
      (player.teamId !== null && player.teamId.toString() === teamFilter);
    return matchesSearch && matchesTeam;
  });

  // Initials generator for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Color generator based on player name hash to make fallbacks beautiful and dynamic
  const getFallbackColorClass = (name: string) => {
    const colors = [
      "from-pink-500 to-rose-600 border-pink-500/20 text-pink-200",
      "from-purple-500 to-indigo-600 border-purple-500/20 text-purple-200",
      "from-blue-500 to-cyan-600 border-blue-500/20 text-blue-200",
      "from-emerald-500 to-teal-600 border-emerald-500/20 text-emerald-200",
      "from-amber-500 to-orange-600 border-amber-500/20 text-amber-200",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-slate-900/40 rounded-[2rem] p-6 shadow-xl border border-slate-900 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search competitor registry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-white placeholder:text-slate-700 text-xs transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap hidden sm:inline">Filter By Squad:</label>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full sm:w-56 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-white text-xs appearance-none cursor-pointer"
          >
            <option value="all">Show All Competitors</option>
            <option value="free-agent">Free Agents Only</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id.toString()}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Players List Container */}
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-900 shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center">
          <h2 className="font-black text-white uppercase tracking-tight text-sm">Registered Competitors</h2>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {filteredPlayers.length} of {initialPlayers.length} Listed
          </span>
        </div>
        
        <div className="divide-y divide-slate-800/60">
          {filteredPlayers.map((player) => {
            const isFreeAgent = !player.teamId;
            const fallbackColor = getFallbackColorClass(player.name);
            const isUpdating = updatingId === player.id;
            const isSuccess = successId === player.id;

            return (
              <div 
                key={player.id} 
                className={`p-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-900/40 transition-colors group ${
                  isFreeAgent ? 'border-l-2 border-l-transparent hover:border-l-amber-500/40' : 'border-l-2 border-l-transparent hover:border-l-indigo-500/40'
                }`}
              >
                <div className="flex items-center gap-5">
                  {/* Avatar Container */}
                  <div className={`relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border transition-all ${
                    isFreeAgent 
                      ? 'border-amber-500/20 group-hover:border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                      : 'border-slate-800 group-hover:border-indigo-500/30'
                  }`}>
                    {player.imageUrl ? (
                      <Image
                        src={player.imageUrl}
                        alt={player.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center font-black text-[11px] uppercase tracking-wider ${fallbackColor}`}>
                        {getInitials(player.name)}
                      </div>
                    )}
                  </div>

                  {/* Competitor Metadata */}
                  <div className="space-y-1">
                    <h3 className={`font-black text-white uppercase tracking-tight transition-colors ${
                      isFreeAgent ? 'group-hover:text-amber-400' : 'group-hover:text-indigo-400'
                    }`}>
                      {player.name}
                    </h3>
                    
                    <div className="flex items-center gap-2">
                      {isFreeAgent ? (
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-950/30 px-2.5 py-0.5 rounded-md border border-amber-900/30 shadow-sm animate-pulse">
                          Free Agent
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-indigo-950/20 px-2 py-0.5 rounded-md border border-indigo-900/20 shadow-sm">
                          {player.teamLogoUrl && (
                            <div className="w-3.5 h-3.5 relative rounded-sm overflow-hidden shrink-0">
                              <Image 
                                src={player.teamLogoUrl} 
                                alt="" 
                                fill 
                                className="object-contain" 
                                unoptimized 
                              />
                            </div>
                          )}
                          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                            {player.teamName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls Area */}
                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  {/* Inline Reassignment dropdown */}
                  <div className="flex items-center gap-2 relative">
                    <select
                      value={player.teamId ?? ""}
                      disabled={isPending && isUpdating}
                      onChange={(e) => handleTeamChange(player.id, e.target.value)}
                      className={`p-2 bg-slate-950 border rounded-xl outline-none font-bold text-[10px] uppercase appearance-none pr-7 cursor-pointer transition-all ${
                        isFreeAgent 
                          ? 'border-amber-900/20 text-amber-500/80 focus:border-amber-500/50 hover:bg-slate-900/50' 
                          : 'border-slate-800 text-slate-400 focus:border-indigo-500 hover:bg-slate-900/50'
                      }`}
                    >
                      <option value="">Release (Free Agent)</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Visual Indicator of inline action state */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-500">▼</div>

                    {isUpdating && (
                      <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute -right-6" />
                    )}
                    {isSuccess && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 absolute -right-6 animate-bounce" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link 
                      href={`/admin/players/${player.id}`}
                      className="p-2 text-slate-600 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-950/40 border border-transparent hover:border-slate-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>

                    <form action={deletePlayerAction}>
                      <input type="hidden" name="id" value={player.id} />
                      <button className="p-2 text-slate-800 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-950/40 border border-transparent hover:border-slate-800 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPlayers.length === 0 && (
            <div className="p-20 text-center text-slate-800 font-black uppercase tracking-[0.2em] italic text-xs">
              No matching competitors found in the registry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
