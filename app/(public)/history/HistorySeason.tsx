'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Badge from '@/components/Badge';

interface TeamStanding {
  id: number;
  name: string;
  logoUrl: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  framesWon: number;
  framesLost: number;
  frameDifference: number;
  points: number;
}

interface DivisionHistory {
  id: number;
  name: string;
  tier: number;
  champion: TeamStanding | null;
  runnerUp: TeamStanding | null;
  totalTeams: number;
  completedMatchesCount: number;
}

interface SeasonHistory {
  id: number;
  name: string;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  divisions: DivisionHistory[];
}

interface HistorySeasonProps {
  season: SeasonHistory;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function HistorySeason({ season, defaultOpen = false, children }: HistorySeasonProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const startStr = formatDate(season.startDate);
  const endStr = formatDate(season.endDate);
  const seasonDates = startStr && endStr ? `${startStr} — ${endStr}` : startStr || "";

  return (
    <div className="relative z-10 border border-slate-900 bg-slate-900/10 rounded-3xl overflow-hidden transition-all duration-200 hover:border-slate-800/80 shadow-md">
      {/* Clickable Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-900/20 transition-colors focus:outline-none select-none group cursor-pointer"
      >
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black text-slate-100 uppercase tracking-tight italic flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
            {season.name}
          </h2>
          {seasonDates && (
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {seasonDates}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="slate">Archived</Badge>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 group-hover:text-slate-350 transition-transform duration-300 ${
              isOpen ? 'rotate-185' : ''
            }`}
          />
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-slate-900 p-6 bg-slate-950/40 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
