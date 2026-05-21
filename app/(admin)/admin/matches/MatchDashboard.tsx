'use client';

import { useState } from 'react';
import { Calendar, CheckSquare, Plus, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 🎯 FIXED: Type interfaces map directly to your live database schemas
interface MatchRow {
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
}

interface TeamRow {
  id: number;
  name: string;
}

interface MatchDashboardProps {
  activeMatchId: number | null;
  sortParam: 'asc' | 'desc';
  allMatches: MatchRow[];
  rawTeams: TeamRow[];
  availableHomePlayers: any[];
  availableAwayPlayers: any[];
  currentMatchGames: any[];
  allPlayersRaw: any[];
  addFrameAction: (formData: FormData) => Promise<void>;
  finalizeMatchAction: (formData: FormData) => Promise<void>;
}

export default function MatchDashboard({
  allMatches,
  rawTeams,
  sortParam
}: MatchDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'fixtures' | 'results'>('fixtures');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper dictionary to dynamically look up team names by ID
  const teamMap = new Map(rawTeams.map((t) => [t.id, t.name]));

  // 🎯 FIXED: Filtering real database matches based on the selected layout view tab
  const filteredMatches = allMatches.filter((match) => {
    const homeName = teamMap.get(match.homeTeamId ?? -1) || 'Unknown Team';
    const awayName = teamMap.get(match.awayTeamId ?? -1) || 'Unknown Team';
    
    const matchesSearch = 
      homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'fixtures') {
      return match.status !== 'completed'; // Matches awaiting updates or currently live
    } else {
      return match.status === 'completed'; // Historical data reference items
    }
  });

  // Toggle sorting directions using search params
  const toggleSort = () => {
    const nextSort = sortParam === 'desc' ? 'asc' : 'desc';
    router.push(`/admin/matches?sort=${nextSort}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER AREA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white italic">
              League Match <span className="text-indigo-400">Control</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Schedule future matches or update historic scoreboard parameters.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSort}
              className="px-3 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px] uppercase font-black tracking-wider rounded-xl hover:text-white transition-colors"
            >
              Date Sort: {sortParam.toUpperCase()}
            </button>
            <Link
              href="/admin/matches/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/40"
            >
              <Plus className="w-4 h-4" /> Schedule New Match
            </Link>
          </div>
        </div>

        {/* CONTROLS BAR CONTAINER */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 border border-slate-900 p-2 rounded-2xl">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl w-full sm:w-auto border border-slate-900/60">
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'fixtures'
                  ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Upcoming Fixtures
            </button>
            
            <button
              onClick={() => setActiveTab('results')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'results'
                  ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" /> Past Results
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search team records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-slate-800 placeholder-slate-600"
            />
          </div>
        </div>

        {/* DATABASE MATCHES RENDER ENGINE */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          {filteredMatches.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-bold uppercase tracking-wider border border-dashed border-slate-900 m-4 rounded-xl">
              No matches found inside this view tab.
            </div>
          ) : (
            <div className="divide-y divide-slate-900">
              {filteredMatches.map((match) => {
                const homeTeamName = teamMap.get(match.homeTeamId ?? -1) || 'Unknown Team';
                const awayTeamName = teamMap.get(match.awayTeamId ?? -1) || 'Unknown Team';
                const matchFormattedDate = match.date ? new Date(match.date).toLocaleDateString() : 'TBD Date';

                return (
                  <div 
                    key={match.id} 
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/20 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-950 border border-slate-900 px-2.5 py-1.5 rounded-lg text-center font-mono shrink-0">
                        <span className="text-[9px] text-slate-500 uppercase font-black block tracking-tighter">Week</span>
                        <span className="text-xs font-black text-slate-300 tracking-tight">{match.weekNumber}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 text-sm font-black uppercase tracking-tight text-slate-100">
                          <span className="truncate max-w-[140px] sm:max-w-xs">{homeTeamName}</span>
                          <span className="text-slate-600 font-medium lowercase font-sans text-xs">vs</span>
                          <span className="truncate max-w-[140px] sm:max-w-xs">{awayTeamName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">{matchFormattedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-900/50 sm:border-0 pt-3 sm:pt-0">
                      {match.status === 'completed' || match.status === 'live' ? (
                        <div className="bg-slate-950 font-mono font-black border border-slate-900 text-indigo-400 text-xs px-3 py-1 rounded-lg tracking-widest shadow-inner">
                          {match.homeScore ?? 0} - {match.awayScore ?? 0}
                          {match.status === 'live' && (
                            <span className="ml-2 text-[9px] text-emerald-400 bg-emerald-950/50 px-1 rounded animate-pulse font-sans uppercase">Live</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded font-black uppercase tracking-wider">
                          {match.status}
                        </span>
                      )}

                      <Link
                        href={`/admin/matches?selectedMatch=${match.id}`}
                        className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-slate-800 hover:text-white transition-all flex items-center gap-1.5 shadow-md"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" /> Manage
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