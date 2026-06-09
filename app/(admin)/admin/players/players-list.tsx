'use client';

import { useState, useTransition, useEffect } from "react";
import { Trash2, Pencil, Search, Check, Loader2, Eye } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Player {
  id: number;
  name: string;
  imageUrl: string | null;
  teamId: number | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  prevTeamName?: string | null;
  prevTeamId?: number | null;
}

interface Team {
  id: number;
  name: string;
}

interface PlayersListProps {
  initialPlayers: Player[];
  teams: Team[];
  seasons: { id: number; name: string }[];
  selectedSeasonId?: number;
  deletePlayerAction: (formData: FormData) => Promise<void>;
  changePlayerTeamAction: (formData: FormData) => Promise<void>;
  bulkAssignPlayersAction: (formData: FormData) => Promise<void>;
  isReadOnly?: boolean;
}

export default function PlayersList({ 
  initialPlayers, 
  teams, 
  seasons,
  selectedSeasonId,
  deletePlayerAction, 
  changePlayerTeamAction,
  bulkAssignPlayersAction,
  isReadOnly = false
}: PlayersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Bulk operation states
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [bulkTeamId, setBulkTeamId] = useState("");
  const [isBulkPending, startBulkTransition] = useTransition();

  // Reset checkboxes when filters change
  useEffect(() => {
    setSelectedPlayerIds([]);
  }, [searchQuery, teamFilter, selectedSeasonId]);

  const handleSeasonChange = (seasonIdVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (seasonIdVal) {
      params.set('seasonId', seasonIdVal);
    } else {
      params.delete('seasonId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleTeamChange = async (playerId: number, teamIdVal: string) => {
    setUpdatingId(playerId);
    setSuccessId(null);
    
    const formData = new FormData();
    formData.append("playerId", playerId.toString());
    if (teamIdVal) {
      formData.append("teamId", teamIdVal);
    }
    if (selectedSeasonId) {
      formData.append("seasonId", selectedSeasonId.toString());
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

  // Bulk assignment logic
  const handleBulkAssign = async () => {
    if (selectedPlayerIds.length === 0) return;

    const formData = new FormData();
    formData.append("playerIds", selectedPlayerIds.join(","));
    if (bulkTeamId) {
      formData.append("teamId", bulkTeamId);
    }
    if (selectedSeasonId) {
      formData.append("seasonId", selectedSeasonId.toString());
    }

    startBulkTransition(async () => {
      try {
        await bulkAssignPlayersAction(formData);
        setSelectedPlayerIds([]);
        setBulkTeamId("");
      } catch (err) {
        console.error("Failed bulk assigning players: ", err);
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

  const allFilteredSelected = filteredPlayers.length > 0 && filteredPlayers.every(p => selectedPlayerIds.includes(p.id));

  const handleSelectAllToggle = () => {
    if (allFilteredSelected) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(filteredPlayers.map(p => p.id));
    }
  };

  const handleSelectToggle = (playerId: number) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

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
            className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100 placeholder:text-slate-700 text-xs transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap hidden sm:inline">Season:</label>
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="w-full sm:w-44 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100 text-xs appearance-none cursor-pointer"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap hidden sm:inline">Filter By Squad:</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full sm:w-56 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-100 text-xs appearance-none cursor-pointer"
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
      </div>

      {/* Bulk Action Bar */}
      {!isReadOnly && selectedPlayerIds.length > 0 && (
        <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-[2rem] p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-md animate-bounce">
              {selectedPlayerIds.length}
            </span>
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
              Players Selected for Bulk Assignment
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto font-sans">
            <select
              value={bulkTeamId}
              onChange={(e) => setBulkTeamId(e.target.value)}
              className="w-full sm:w-56 p-3 bg-slate-950 border border-indigo-950/60 focus:border-indigo-500 rounded-xl outline-none font-bold text-white text-xs cursor-pointer"
            >
              <option value="">Release Selected (Free Agent)</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id.toString()}>
                  {team.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={isBulkPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isBulkPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                </>
              ) : (
                "Assign Selected"
              )}
            </button>
            <button
              onClick={() => setSelectedPlayerIds([])}
              className="bg-slate-950 border border-slate-800 text-slate-400 hover:text-white px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Players List Container */}
      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-900 shadow-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/60 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {!isReadOnly && filteredPlayers.length > 0 && (
              <input 
                type="checkbox"
                checked={allFilteredSelected}
                onChange={handleSelectAllToggle}
                className="w-4.5 h-4.5 text-indigo-600 bg-slate-950 border-slate-850 rounded focus:ring-0 accent-indigo-600 cursor-pointer"
              />
            )}
            <h2 className="font-black text-white uppercase tracking-tight text-sm">Registered Competitors</h2>
          </div>
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
                  {/* Row Selection Checkbox */}
                  {!isReadOnly && (
                    <input 
                      type="checkbox"
                      checked={selectedPlayerIds.includes(player.id)}
                      onChange={() => handleSelectToggle(player.id)}
                      className="w-4.5 h-4.5 text-indigo-600 bg-slate-950 border-slate-850 rounded focus:ring-0 accent-indigo-600 cursor-pointer shrink-0"
                    />
                  )}

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
                    
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {/* Display Team Affiliation from Last Season */}
                      {player.prevTeamName && (
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-900 shadow-sm" title="Previous Season Team">
                          Prev Season: {player.prevTeamName}
                        </span>
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
                      disabled={isReadOnly || (isPending && updatingId === player.id)}
                      onChange={(e) => handleTeamChange(player.id, e.target.value)}
                      className={`p-2 bg-slate-950 border rounded-xl outline-none font-bold text-[10px] uppercase appearance-none pr-7 cursor-pointer transition-all ${
                        isFreeAgent 
                          ? 'border-amber-900/20 text-amber-500/80 focus:border-amber-500/50 hover:bg-slate-900/50' 
                          : 'border-slate-800 text-slate-400 focus:border-indigo-500 hover:bg-slate-900/50'
                      } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Release (Free Agent)</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Visual Indicator of inline action state */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-slate-500 font-sans">▼</div>

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
                      title={isReadOnly ? "View Details" : "Edit Player"}
                    >
                      {isReadOnly ? <Eye className="w-4 h-4 text-indigo-400" /> : <Pencil className="w-4 h-4" />}
                    </Link>

                    {!isReadOnly && (
                      <form action={deletePlayerAction} onSubmit={(e) => {
                        if (!confirm("Are you sure you want to delete this player?")) {
                          e.preventDefault();
                        }
                      }}>
                        <input type="hidden" name="id" value={player.id} />
                        <button className="p-2 text-slate-800 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-950/40 border border-transparent hover:border-slate-800 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    )}
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
