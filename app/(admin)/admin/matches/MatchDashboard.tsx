'use client';

import { useState } from 'react';
import { Calendar, CheckSquare, Plus, Search, Eye } from 'lucide-react';
import Link from 'next/link';

// Placeholder mock types mapping symmetrically to your postgres schema strings
interface AdminMatchRow {
  id: number;
  date: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  weekNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
}

export default function AdminMatchesPage() {
  // 🎯 STEP 1: Introduce split tab routing state
  const [activeTab, setActiveTab] = useState<'fixtures' | 'results'>('fixtures');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample mockup container matching the exact database schemas
  const [allMatches] = useState<AdminMatchRow[]>([
    { id: 101, date: '2026-05-28', status: 'scheduled', weekNumber: 5, homeTeamName: 'Breakers Click', awayTeamName: 'Chalk Wizards', homeScore: null, awayScore: null },
    { id: 102, date: '2026-05-28', status: 'live', weekNumber: 5, homeTeamName: 'Pocket Rockets', awayTeamName: 'Cue Masters', homeScore: 3, awayScore: 2 },
    { id: 100, date: '2026-05-14', status: 'completed', weekNumber: 4, homeTeamName: 'Chalk Wizards', awayTeamName: 'Pocket Rockets', homeScore: 7, awayScore: 5 },
  ]);

  // 🎯 STEP 2: Handle data filtering pipelines surgically
  const filteredMatches = allMatches.filter((match) => {
    const matchesSearch = 
      match.homeTeamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.awayTeamName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'fixtures') {
      return match.status !== 'completed'; // Scheduled or live matches
    } else {
      return match.status === 'completed'; // Score entries
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* TOP LEVEL HEADER MANAGEMENT ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white italic">
              League Match <span className="text-indigo-400">Control</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Schedule future matches or update historic scoreboard parameters.
            </p>
          </div>
          
          <Link
            href="/admin/matches/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-950/40"
          >
            <Plus className="w-4 h-4" /> Schedule New Match
          </Link>
        </div>

        {/* 🎯 SPLIT TABS SWITCHER PANEL AND SEARCH FILTER MATRIX */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 border border-slate-900 p-2 rounded-2xl">
          
          {/* Tabs Group */}
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

          {/* Quick Search Utility input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
            <input
              type="text"
              placeholder="Search team arrays..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 border border-slate-900 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-slate-800 placeholder-slate-600"
            />
          </div>
        </div>

        {/* DATA LEDGER GRID */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
          {filteredMatches.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-bold uppercase tracking-wider border border-dashed border-slate-900 m-4 rounded-xl">
              No target match matrices found matching criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-900">
              {filteredMatches.map((match) => (
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
                        <span className="truncate max-w-[140px] sm:max-w-xs">{match.homeTeamName}</span>
                        <span className="text-slate-600 font-medium lowercase font-sans text-xs">vs</span>
                        <span className="truncate max-w-[140px] sm:max-w-xs">{match.awayTeamName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">{match.date}</span>
                    </div>
                  </div>

                  {/* Right side alignment: status indicators and action paths */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-900/50 sm:border-0 pt-3 sm:pt-0">
                    {/* Scores display row condition */}
                    {match.status === 'completed' || match.status === 'live' ? (
                      <div className="bg-slate-950 font-mono font-black border border-slate-900 text-indigo-400 text-xs px-3 py-1 rounded-lg tracking-widest shadow-inner">
                        {match.homeScore} - {match.awayScore}
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
                      href={`/admin/matches/${match.id}`}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-slate-800 hover:text-white transition-all flex items-center gap-1.5 shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" /> Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}