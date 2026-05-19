'use client';

import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, Users, Trophy, CalendarDays, ArrowRight, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

interface MatchRow {
  id: number;
  date: string;
  status: string;
  weekNumber: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface DropdownItem {
  id: number;
  name: string;
}

interface MatchPageClientProps {
  upcomingFixtures: MatchRow[];
  completedResults: MatchRow[];
  seasons: DropdownItem[];
  divisions: DropdownItem[];
  selectedSeasonId?: number;
  selectedDivisionId?: number;
  sortDirection: "asc" | "desc";
}

export default function MatchPageClient({
  upcomingFixtures,
  completedResults,
  seasons,
  divisions,
  selectedSeasonId,
  selectedDivisionId,
  sortDirection
}: MatchPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'fixtures' | 'results'>('results');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeasonId, selectedDivisionId, sortDirection, activeTab]);

  const handleParamChange = (key: 'seasonId' | 'divisionId' | 'sort', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeDataset = useMemo(() => {
    return activeTab === 'fixtures' ? upcomingFixtures : completedResults;
  }, [activeTab, upcomingFixtures, completedResults]);

  const totalPages = Math.ceil(activeDataset.length / itemsPerPage) || 1;
  const paginatedMatches = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return activeDataset.slice(offset, offset + itemsPerPage);
  }, [activeDataset, currentPage]);

  return (
    <div className="space-y-6">
      
      {/* SELECTION FILTERS CONTROL BAR */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Season Select */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => handleParamChange('seasonId', e.target.value)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Division Select */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedDivisionId || ""}
              onChange={(e) => handleParamChange('divisionId', e.target.value)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 🎯 Chronological Order Select */}
          <div className="min-w-[150px] w-full sm:w-auto">
            <select
              value={sortDirection}
              onChange={(e) => handleParamChange('sort', e.target.value)}
              className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 transition-colors outline-none cursor-pointer"
            >
              <option value="asc">Date: Oldest First</option>
              <option value="desc">Date: Newest First</option>
            </select>
          </div>

        </div>

        {/* INTERACTIVE NAVIGATION TABS SWITCH STRIP */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center w-full md:w-auto border border-slate-200/40">
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              activeTab === 'results' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Results ({completedResults.length})
          </button>
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              activeTab === 'fixtures' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Fixtures ({upcomingFixtures.length})
          </button>
        </div>
      </div>

      {/* CORE TIMELINE CONTENT FRAME */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedMatches.length === 0 ? (
          <div className="p-16 text-center">
            <span className="inline-flex p-4 rounded-2xl bg-slate-50 text-slate-400 mb-3 border border-slate-100">
              <Calendar className="w-6 h-6" />
            </span>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">No Matches Configured</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">There are no matches currently scheduled inside this division criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedMatches.map((match) => (
              <div 
                key={match.id} 
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors group"
              >
                
                {/* Meta Details Node */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl min-w-[70px]">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Week</span>
                    <span className="font-mono text-xs font-black text-slate-800">{match.weekNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-tight">{match.date}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600/80 mt-0.5 block">
                      {match.status === 'completed' ? 'Official Result' : 'Scheduled Frame'}
                    </span>
                  </div>
                </div>

                {/* Scoreboard/Matchup Center Node */}
                <div className="flex-1 flex items-center justify-between sm:justify-center gap-6 max-w-lg mx-auto w-full">
                  
                  <div className="text-right flex-1 min-w-0">
                    <span className="font-black text-slate-900 uppercase tracking-tight text-[13px] block truncate group-hover:text-indigo-600 transition-colors">
                      {match.homeTeam}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 px-2">
                    {match.status === 'completed' ? (
                      <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl text-white font-mono text-sm font-black shadow-inner">
                        <span className="w-5 text-center">{match.homeScore}</span>
                        <span className="text-slate-600 text-[10px] font-sans">-</span>
                        <span className="w-5 text-center">{match.awayScore}</span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 text-slate-400 border border-slate-200/80 rounded-xl px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                        VS <ArrowRight className="w-3 h-3 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>

                  <div className="text-left flex-1 min-w-0">
                    <span className="font-black text-slate-900 uppercase tracking-tight text-[13px] block truncate group-hover:text-indigo-600 transition-colors">
                      {match.awayTeam}
                    </span>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER PAGINATION NAVIGATION STRIP */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 select-none">
          
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => setCurrentPage(pageNumber)}
              className={`w-9 h-9 rounded-xl font-mono text-xs font-black transition-all ${
                currentPage === pageNumber
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      )}

    </div>
  );
}