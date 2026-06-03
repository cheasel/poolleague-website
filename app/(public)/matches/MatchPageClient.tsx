'use client';

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
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

  const initialTab = searchParams.get('tab') === 'fixtures' ? 'fixtures' : 'results';
  const [activeTab, setActiveTab] = useState<'fixtures' | 'results'>(initialTab);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const itemsPerPage = 20;

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'fixtures' || tabParam === 'results') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSeasonId, selectedDivisionId, sortDirection, activeTab, selectedTeam]);

  useEffect(() => {
    setSelectedTeam("");
  }, [selectedSeasonId, selectedDivisionId]);

  const handleParamChange = (key: 'seasonId' | 'divisionId' | 'sort', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      if (key === 'seasonId') {
        params.delete('divisionId');
      }
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const uniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    upcomingFixtures.forEach(m => {
      if (m.homeTeam) teamsSet.add(m.homeTeam);
      if (m.awayTeam) teamsSet.add(m.awayTeam);
    });
    completedResults.forEach(m => {
      if (m.homeTeam) teamsSet.add(m.homeTeam);
      if (m.awayTeam) teamsSet.add(m.awayTeam);
    });
    return Array.from(teamsSet).sort((a, b) => a.localeCompare(b));
  }, [upcomingFixtures, completedResults]);

  const filteredUpcoming = useMemo(() => {
    if (!selectedTeam) return upcomingFixtures;
    return upcomingFixtures.filter(m => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam);
  }, [upcomingFixtures, selectedTeam]);

  const filteredCompleted = useMemo(() => {
    if (!selectedTeam) return completedResults;
    return completedResults.filter(m => m.homeTeam === selectedTeam || m.awayTeam === selectedTeam);
  }, [completedResults, selectedTeam]);

  const activeDataset = useMemo(() => {
    return activeTab === 'fixtures' ? filteredUpcoming : filteredCompleted;
  }, [activeTab, filteredUpcoming, filteredCompleted]);

  const totalPages = Math.ceil(activeDataset.length / itemsPerPage) || 1;
  const paginatedMatches = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return activeDataset.slice(offset, offset + itemsPerPage);
  }, [activeDataset, currentPage]);

  return (
    <div className="space-y-6">
      
      {/* SELECTION FILTERS CONTROL BAR */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Season Select */}
          <div className="min-w-[140px] w-full sm:w-auto">
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => handleParamChange('seasonId', e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 transition-colors outline-none cursor-pointer hover:border-slate-700"
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
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 transition-colors outline-none cursor-pointer hover:border-slate-700"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Team Select */}
          <div className="min-w-[160px] w-full sm:w-auto">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 transition-colors outline-none cursor-pointer hover:border-slate-700"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map((teamName) => (
                <option key={teamName} value={teamName}>{teamName}</option>
              ))}
            </select>
          </div>

          {/* 🎯 Chronological Order Select */}
          <div className="min-w-[150px] w-full sm:w-auto">
            <select
              value={sortDirection}
              onChange={(e) => handleParamChange('sort', e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-xs text-slate-200 transition-colors outline-none cursor-pointer hover:border-slate-700"
            >
              <option value="asc">Date: Oldest First</option>
              <option value="desc">Date: Newest First</option>
            </select>
          </div>

        </div>

        {/* INTERACTIVE NAVIGATION TABS SWITCH STRIP */}
        <div className="bg-slate-950 p-1 rounded-xl flex items-center w-full md:w-auto border border-slate-800/60">
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              activeTab === 'results' ? 'bg-slate-900 text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Results ({filteredCompleted.length})
          </button>
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg font-black text-xs uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${
              activeTab === 'fixtures' ? 'bg-slate-900 text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Fixtures ({filteredUpcoming.length})
          </button>
        </div>
      </div>

      {/* CORE TIMELINE CONTENT FRAME */}
      <div className="bg-slate-900/40 border border-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {paginatedMatches.length === 0 ? (
          <div className="p-16 text-center">
            <span className="inline-flex p-4 rounded-2xl bg-slate-950 text-slate-500 mb-3 border border-slate-800">
              <Calendar className="w-6 h-6" />
            </span>
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-tight">No Matches Configured</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">There are no matches currently scheduled inside this division criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {paginatedMatches.map((match) => (
              <Link 
                key={match.id} 
                href={`/matches/${match.id}`}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors group"
              >
                
                {/* Meta Details Node */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl min-w-[70px]">
                    <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider">Week</span>
                    <span className="font-mono text-xs font-black text-slate-200">{match.weekNumber}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block uppercase tracking-tight">{match.date}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400/80 mt-0.5 block">
                      {match.status === 'completed' ? 'Official Result' : 'Scheduled Frame'}
                    </span>
                  </div>
                </div>

                {/* Scoreboard/Matchup Center Node */}
                <div className="flex-1 flex items-center justify-between sm:justify-center gap-6 max-w-lg mx-auto w-full">
                  
                  <div className="text-right flex-1 min-w-0">
                    <span className="font-black text-slate-100 uppercase tracking-tight text-[13px] block truncate group-hover:text-indigo-400 transition-colors">
                      {match.homeTeam}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 px-2">
                    {match.status === 'completed' ? (
                      <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-xl text-indigo-400 font-mono text-sm font-black shadow-inner border border-slate-800">
                        <span className="w-5 text-center">{match.homeScore}</span>
                        <span className="text-slate-600 text-[10px] font-sans">-</span>
                        <span className="w-5 text-center">{match.awayScore}</span>
                      </div>
                    ) : (
                      <div className="bg-slate-950 text-slate-500 border border-slate-800 rounded-xl px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 shadow-inner">
                        VS <ArrowRight className="w-3 h-3 text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    )}
                  </div>

                  <div className="text-left flex-1 min-w-0">
                    <span className="font-black text-slate-100 uppercase tracking-tight text-[13px] block truncate group-hover:text-indigo-400 transition-colors">
                      {match.awayTeam}
                    </span>
                  </div>

                </div>

              </Link>
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
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => setCurrentPage(pageNumber)}
              className={`w-9 h-9 rounded-xl font-mono text-xs font-black transition-all ${
                currentPage === pageNumber
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      )}

    </div>
  );
}