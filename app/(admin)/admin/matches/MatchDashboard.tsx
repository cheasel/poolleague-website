'use client';

import { useState, useTransition } from 'react';
import { Calendar, CheckSquare, Plus, Search, Eye, MapPin, Shield, Filter } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AddMatchForm from './add-match-form';

interface SeasonRow {
  id: number;
  name: string;
}

interface DivisionRow {
  id: number;
  name: string;
  seasonId: number | null;
}

interface VenueRow {
  id: number;
  name: string;
}

interface TeamWithVenue {
  id: number;
  name: string;
  logoUrl: string | null;
  venue: VenueRow | null;
}

interface MatchWithRelations {
  id: number;
  date: Date | null;
  status: string | null;
  weekNumber: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  seasonId: number | null;
  divisionId: number | null;
  homeTeam: TeamWithVenue | null;
  awayTeam: { id: number; name: string; logoUrl: string | null } | null;
  division: { id: number; name: string; season: SeasonRow | null } | null;
}

interface TeamRow {
  id: number;
  name: string;
  divisionId: number | null;
  homeVenueId: number | null;
}

interface MatchDashboardProps {
  activeMatchId: number | null;
  sortParam: 'asc' | 'desc';
  allMatches: MatchWithRelations[];
  rawTeams: TeamRow[];
  availableHomePlayers: any[];
  availableAwayPlayers: any[];
  currentMatchGames: any[];
  addFrameAction: (formData: FormData) => Promise<void>;
  addMatchAction: (formData: FormData) => Promise<void>;
  clearDivisionScheduleAction: (divisionId: number) => Promise<void>;
  seasons: SeasonRow[];
  divisions: DivisionRow[];
}

export default function MatchDashboard({
  allMatches,
  rawTeams,
  sortParam,
  seasons,
  divisions,
  addMatchAction,
  clearDivisionScheduleAction
}: MatchDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'fixtures' | 'results'>('fixtures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasons[0]?.id.toString() || "all");
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setSelectedDivisionId("all");
  };

  const filteredDivisionsList = divisions.filter(
    (d) => selectedSeasonId === "all" || d.seasonId?.toString() === selectedSeasonId
  );

  const divisionMatches = allMatches.filter(
    (m) => m.divisionId?.toString() === selectedDivisionId
  );
  const hasMatches = divisionMatches.length > 0;
  const hasCompleted = divisionMatches.some((m) => m.status === 'completed');

  const handleClearSchedule = () => {
    if (selectedDivisionId === "all") return;
    const confirmClear = window.confirm(
      "Are you sure you want to clear all matches for this division? This action will permanently delete all scheduled fixtures and cannot be undone."
    );
    if (!confirmClear) return;

    startTransition(async () => {
      try {
        await clearDivisionScheduleAction(Number(selectedDivisionId));
      } catch (err: any) {
        alert(err.message || "Failed to clear schedule");
      }
    });
  };

  // Filter matches based on search, active view tab, and selected season/division
  const filteredMatches = allMatches.filter((match) => {
    const homeName = match.homeTeam?.name || 'Unknown Team';
    const awayName = match.awayTeam?.name || 'Unknown Team';
    
    const matchesSearch = 
      homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedSeasonId !== "all" && match.seasonId?.toString() !== selectedSeasonId) return false;
    if (selectedDivisionId !== "all" && match.divisionId?.toString() !== selectedDivisionId) return false;

    if (activeTab === 'fixtures') {
      return match.status !== 'completed'; // Upcoming or live
    } else {
      return match.status === 'completed'; // Historical scoreboards
    }
  });

  const toggleSort = () => {
    const nextSort = sortParam === 'desc' ? 'asc' : 'desc';
    router.push(`/admin/matches?sort=${nextSort}`);
  };

  const getTeamInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getFallbackColorClass = (name: string) => {
    const colors = [
      "from-pink-500/20 to-rose-600/10 border-pink-500/20 text-pink-400",
      "from-purple-500/20 to-indigo-600/10 border-purple-500/20 text-purple-400",
      "from-blue-500/20 to-cyan-600/10 border-blue-500/20 text-blue-400",
      "from-emerald-500/20 to-teal-600/10 border-emerald-500/20 text-emerald-400",
      "from-amber-500/20 to-orange-600/10 border-amber-500/20 text-amber-400",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER AREA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900/60 pb-5">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white italic">
              League Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Control</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Schedule future matches or update historic scoreboard parameters.
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleSort}
              className="px-3 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px] uppercase font-black tracking-wider rounded-xl hover:text-white transition-all cursor-pointer"
            >
              Date Sort: {sortParam.toUpperCase()}
            </button>
            <button
              onClick={() => setIsAddOpen(!isAddOpen)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" /> {isAddOpen ? 'Close Form' : 'Add Match'}
            </button>
            <Link
              href={selectedDivisionId !== "all" ? `/admin/matches/generator?divisionId=${selectedDivisionId}` : "/admin/matches/generator"}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/40"
            >
              <Plus className="w-4 h-4" /> Match Generator
            </Link>
          </div>
        </div>

        {isAddOpen && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-250">
            <AddMatchForm 
              teams={rawTeams} 
              seasons={seasons} 
              divisions={divisions} 
              action={async (formData) => {
                await addMatchAction(formData);
                setIsAddOpen(false);
              }} 
            />
          </div>
        )}

        {/* CONTROLS BAR CONTAINER WITH DROPDOWN FILTERS */}
        <div className="space-y-4 bg-slate-900/40 border border-slate-900 p-4 rounded-3xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl w-full md:w-auto border border-slate-900/60">
              <button
                onClick={() => setActiveTab('fixtures')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'fixtures'
                    ? 'bg-slate-900 text-indigo-400 border border-slate-800/80 shadow-inner'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Upcoming Fixtures
              </button>
              
              <button
                onClick={() => setActiveTab('results')}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'results'
                    ? 'bg-slate-900 text-indigo-400 border border-slate-800/80 shadow-inner'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Past Results
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
              <input
                type="text"
                placeholder="Search team matchups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-850 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500 placeholder-slate-700 transition-all"
              />
            </div>
          </div>

          {/* Division and Season selector dropdowns */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-900/60">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedSeasonId}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl focus:border-indigo-500 outline-none font-bold text-white text-[11px] appearance-none cursor-pointer"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id.toString()} className="bg-slate-950 text-slate-200">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <select
                value={selectedDivisionId}
                onChange={(e) => setSelectedDivisionId(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-xl focus:border-indigo-500 outline-none font-bold text-white text-[11px] appearance-none cursor-pointer"
              >
                <option value="all">Filter By Division: All Divisions</option>
                {filteredDivisionsList.map((d) => (
                  <option key={d.id} value={d.id.toString()} className="bg-slate-950 text-slate-200">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedDivisionId !== "all" && hasMatches && (
              <div className="flex items-center shrink-0">
                <button
                  type="button"
                  disabled={hasCompleted || isPending}
                  onClick={handleClearSchedule}
                  className={`w-full sm:w-auto px-4 py-2.5 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    hasCompleted
                      ? "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                      : "bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/60 text-red-400 hover:text-red-300"
                  }`}
                  title={hasCompleted ? "Cannot clear schedule: Completed games exist" : "Clear all matches for this division"}
                >
                  {isPending ? "Clearing..." : "Clear Schedule"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* DATABASE MATCHES RENDER ENGINE */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
          {filteredMatches.length === 0 ? (
            <div className="p-20 text-center text-slate-500 text-xs font-bold uppercase tracking-[0.2em] italic border border-dashed border-slate-900 m-4 rounded-[2rem] bg-slate-950/10">
              No match profiles found inside the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-900/60">
              {filteredMatches.map((match) => {
                const homeTeamName = match.homeTeam?.name || 'Unknown Team';
                const awayTeamName = match.awayTeam?.name || 'Unknown Team';
                const matchFormattedDate = match.date ? new Date(match.date).toLocaleDateString() : 'TBD Date';

                const homeInitials = getFallbackColorClass(homeTeamName);
                const awayInitials = getFallbackColorClass(awayTeamName);

                const divisionName = match.division?.name || '';
                const venueName = match.homeTeam?.venue?.name || '';

                return (
                  <div 
                    key={match.id} 
                    className="p-5 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors group border-l-2 border-l-transparent hover:border-l-indigo-500/20"
                  >
                    <div className="flex items-center gap-5">
                      {/* Week number badge */}
                      <div className="bg-slate-950 border border-slate-900 px-3 py-2 rounded-xl text-center font-mono shrink-0 shadow-inner">
                        <span className="text-[8px] text-slate-500 uppercase font-black block tracking-widest">Week</span>
                        <span className="text-sm font-black text-white tracking-tight">{match.weekNumber}</span>
                      </div>
                      
                      {/* Match Details */}
                      <div>
                        {/* Branded Team Matchup Names */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-black uppercase tracking-tight text-white">
                          
                          {/* Home Team logo/name */}
                          <div className="flex items-center gap-2">
                            {match.homeTeam?.logoUrl ? (
                              <div className="w-5 h-5 relative rounded bg-slate-950 border border-slate-900 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                                <Image src={match.homeTeam.logoUrl} alt="" fill className="object-contain" unoptimized />
                              </div>
                            ) : (
                              <div className={`w-5 h-5 rounded border bg-gradient-to-br flex items-center justify-center font-black text-[7px] shrink-0 ${homeInitials}`}>
                                {getTeamInitials(homeTeamName)}
                              </div>
                            )}
                            <span className="group-hover:text-indigo-400 transition-colors">{homeTeamName}</span>
                          </div>

                          <span className="text-slate-600 font-medium lowercase font-sans text-[11px]">vs</span>

                          {/* Away Team logo/name */}
                          <div className="flex items-center gap-2">
                            {match.awayTeam?.logoUrl ? (
                              <div className="w-5 h-5 relative rounded bg-slate-950 border border-slate-900 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                                <Image src={match.awayTeam.logoUrl} alt="" fill className="object-contain" unoptimized />
                              </div>
                            ) : (
                              <div className={`w-5 h-5 rounded border bg-gradient-to-br flex items-center justify-center font-black text-[7px] shrink-0 ${awayInitials}`}>
                                {getTeamInitials(awayTeamName)}
                              </div>
                            )}
                            <span className="group-hover:text-indigo-400 transition-colors">{awayTeamName}</span>
                          </div>
                        </div>

                        {/* Location Details Subline */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500 font-mono">
                          <span>{matchFormattedDate}</span>
                          {divisionName && (
                            <>
                              <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                              <span className="text-indigo-400 bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-900/20">{divisionName}</span>
                            </>
                          )}
                          {venueName && (
                            <>
                              <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-600" />
                                {venueName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational controls status & scorecard actions */}
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t border-slate-900/60 md:border-0 pt-4 md:pt-0">
                      {match.status === 'completed' || match.status === 'live' ? (
                        <div className={`font-mono font-black border text-xs px-3.5 py-1.5 rounded-xl tracking-widest shadow-inner flex items-center gap-2 ${
                          match.status === 'live' 
                            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' 
                            : 'bg-slate-950 text-indigo-400 border-slate-850'
                        }`}>
                          {match.homeScore ?? 0} - {match.awayScore ?? 0}
                          {match.status === 'live' && (
                            <span className="text-[7px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-md animate-pulse font-sans font-black uppercase tracking-widest">Live</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] bg-slate-950 border border-slate-850 text-slate-500 px-3 py-1.5 rounded-xl font-black uppercase tracking-wider">
                          {match.status}
                        </span>
                      )}

                      <Link
                        href={`/admin/matches/${match.id}`}
                        className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-300 hover:text-white transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Scorecard Control
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}