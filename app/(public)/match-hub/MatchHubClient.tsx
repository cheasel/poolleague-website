'use client';

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Trophy, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  History,
  LayoutList
} from "lucide-react";

interface MatchRow {
  id: number;
  date: Date | null;
  status: string | null;
  weekNumber: number;
  divisionId: number | null;
  homeTeamId: number | null;
  homeTeamName: string;
  homeTeamLogo: string | null;
  awayTeamId: number | null;
  awayTeamName: string;
  awayTeamLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

interface DropdownItem {
  id: number;
  name: string;
}

interface StandingRow {
  id: number;
  name: string;
  logoUrl: string | null;
  overallPlayed: number;
  overallWins: number;
  overallDraws: number;
  overallLosses: number;
  overallFramesWon: number;
  overallFramesLost: number;
  frameDifference: number;
  overallPoints: number;
  form: ('W' | 'L' | 'D')[];
  home: { played: number; wins: number; draws: number; losses: number; fw: number; fl: number; };
  away: { played: number; wins: number; draws: number; losses: number; fw: number; fl: number; };
}

interface MatchHubClientProps {
  seasons: DropdownItem[];
  divisions: Array<{ id: number; name: string; tier: number }>;
  matches: MatchRow[];
  standingsMap: Record<number, StandingRow[]>;
  selectedSeasonId: number;
}

export default function MatchHubClient({
  seasons,
  divisions,
  matches,
  standingsMap,
  selectedSeasonId
}: MatchHubClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Division Tab State: 'all' or specific divisionId
  const [selectedDivisionTab, setSelectedDivisionTab] = useState<string>("all");

  // 2. Format dates to YYYY-MM-DD
  const getLocalDateKey = (dateVal: Date | null) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 3. Extract unique match dates in chronological order
  const uniqueDates = useMemo(() => {
    const datesSet = new Set<string>();
    matches.forEach(m => {
      const key = getLocalDateKey(m.date);
      if (key) datesSet.add(key);
    });
    return Array.from(datesSet).sort();
  }, [matches]);

  // 4. Default initial date (Today if exists, or closest upcoming, or last past)
  const getLocalTodayDateKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalTodayDateKey(), []);

  const initialDate = useMemo(() => {
    if (uniqueDates.length === 0) return "";
    if (uniqueDates.includes(todayStr)) return todayStr;
    const upcoming = uniqueDates.find(d => d >= todayStr);
    if (upcoming) return upcoming;
    return uniqueDates[uniqueDates.length - 1]; // last past date
  }, [uniqueDates, todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    } else {
      setSelectedDate("");
    }
  }, [initialDate]);

  // 5. Scroll timeline date card into view upon initialization
  useEffect(() => {
    if (selectedDate && scrollRef.current) {
      const activeCard = scrollRef.current.querySelector(`[data-date="${selectedDate}"]`);
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDate]);

  // Reset division tab when season changes
  useEffect(() => {
    setSelectedDivisionTab("all");
  }, [selectedSeasonId]);

  // 6. Timeline scrolling actions
  const scrollTimeline = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // 7. Calculate match counts per date
  const dateMetadata = useMemo(() => {
    const meta: Record<string, { pending: number; completed: number; dayOfWeek: string; dayAndMonth: string; isToday: boolean }> = {};
    
    uniqueDates.forEach(dateStr => {
      const dateObj = new Date(`${dateStr}T12:00:00Z`); // mid-day to prevent timezone shift
      const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
      const dayAndMonth = dateObj.toLocaleDateString("en-US", { day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase();
      
      const dayMatches = matches.filter(m => getLocalDateKey(m.date) === dateStr);
      const pending = dayMatches.filter(m => m.status !== 'completed').length;
      const completed = dayMatches.filter(m => m.status === 'completed').length;

      meta[dateStr] = {
        pending,
        completed,
        dayOfWeek,
        dayAndMonth,
        isToday: dateStr === todayStr
      };
    });

    return meta;
  }, [uniqueDates, matches, todayStr]);

  // 8. Filters matches for list display
  const filteredMatches = useMemo(() => {
    if (!selectedDate) return [];
    
    let list = matches.filter(m => getLocalDateKey(m.date) === selectedDate);
    
    if (selectedDivisionTab !== "all") {
      const divId = Number(selectedDivisionTab);
      list = list.filter(m => m.divisionId === divId);
    }
    
    return list;
  }, [matches, selectedDate, selectedDivisionTab]);

  // 9. Format Matches list grouped by division
  const matchesGroupedByDivision = useMemo(() => {
    const groups: Record<number, MatchRow[]> = {};
    filteredMatches.forEach(m => {
      if (m.divisionId) {
        if (!groups[m.divisionId]) groups[m.divisionId] = [];
        groups[m.divisionId].push(m);
      }
    });
    return groups;
  }, [filteredMatches]);

  const handleSeasonChange = (seasonId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (seasonId) {
      params.set('seasonId', seasonId);
    } else {
      params.delete('seasonId');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeSeasonName = seasons.find(s => s.id === selectedSeasonId)?.name || "Season";

  return (
    <div className="space-y-8">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* HERO DASHBOARD BRANDING HEADER */}
      <div className="relative overflow-hidden bg-slate-950/60 border-b border-slate-900/60 z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">Match Hub Dashboard</span>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
              Match <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Arena</span>
            </h1>
            <p className="text-slate-400 font-medium text-xs max-w-xl">
              Track live matchdays, filter schedules by division, and monitor standings tables dynamically.
            </p>
          </div>

          {/* Season Dropdown Selector */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 min-w-[240px]">
            <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
              <Trophy className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">Season Filter</span>
              <select
                value={selectedSeasonId}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="bg-transparent border-0 font-black text-xs text-white uppercase tracking-wider outline-none w-full cursor-pointer mt-0.5"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-950 text-slate-200">{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-8 relative z-10">

        {/* TIMELINE SECTION CONTAINER */}
        <section className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-800/80 relative">
          
          <div className="flex items-center gap-3">
            {/* Scroll Left Button */}
            <button
              onClick={() => scrollTimeline('left')}
              className="w-10 h-10 shrink-0 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shadow-md select-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Scrollable Timeline Row */}
            <div 
              ref={scrollRef}
              className="flex-1 flex gap-4 overflow-x-auto py-2 px-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {uniqueDates.map(dateStr => {
                const meta = dateMetadata[dateStr];
                const isSelected = selectedDate === dateStr;

                const cardClass = isSelected
                  ? "bg-emerald-500 text-slate-950 scale-[1.02] shadow-lg shadow-emerald-500/10"
                  : "bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850";

                const circle1Class = isSelected
                  ? "bg-emerald-600/30 text-emerald-950 font-black"
                  : "bg-slate-800 text-slate-400 font-bold";

                const circle2Class = isSelected
                  ? "bg-slate-950 text-slate-200 font-black"
                  : "bg-slate-950 text-slate-400 font-bold";

                return (
                  <div
                    key={dateStr}
                    data-date={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-w-[130px] rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none ${cardClass}`}
                  >
                    <div className="text-center">
                      <span className="block text-[10px] font-black tracking-widest leading-none">
                        {meta.isToday ? "TODAY" : meta.dayOfWeek}
                      </span>
                      <span className="block text-xs font-black tracking-tight mt-1 leading-none">
                        {meta.dayAndMonth}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {/* Left Circle: Pending Matches Count */}
                      <span 
                        title="Pending Matches" 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shadow-inner ${circle1Class}`}
                      >
                        {meta.pending}
                      </span>
                      
                      {/* Right Circle: Completed Matches Count */}
                      <span 
                        title="Completed Matches" 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shadow-inner ${circle2Class}`}
                      >
                        {meta.completed}
                      </span>
                    </div>
                  </div>
                );
              })}

              {uniqueDates.length === 0 && (
                <div className="py-6 text-center text-xs font-bold text-slate-500 w-full uppercase tracking-widest italic">
                  No match dates available for this season.
                </div>
              )}
            </div>

            {/* Scroll Right Button */}
            <button
              onClick={() => scrollTimeline('right')}
              className="w-10 h-10 shrink-0 rounded-full bg-slate-950 hover:bg-slate-800 border border-slate-850 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shadow-md select-none"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* DIVISION TAB SELECTOR */}
        <section className="border-b border-slate-900 pb-1">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setSelectedDivisionTab("all")}
              className={`px-6 py-3 font-black text-xs uppercase tracking-wider transition-all select-none border-b-2 cursor-pointer ${
                selectedDivisionTab === "all"
                  ? 'border-white text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              All Divisions
            </button>
            {divisions.map(div => (
              <button
                key={div.id}
                onClick={() => setSelectedDivisionTab(String(div.id))}
                className={`px-6 py-3 font-black text-xs uppercase tracking-wider transition-all select-none border-b-2 cursor-pointer ${
                  selectedDivisionTab === String(div.id)
                    ? 'border-white text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {div.name}
              </button>
            ))}
          </div>
        </section>

        {/* TWO SECTION ROW: MATCHES & STANDINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: MATCHES DISPLAY (7 COLUMNS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <CalendarDays className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="font-black text-white uppercase text-xs tracking-tight">Matches on Schedule</h3>
            </div>

            {filteredMatches.length === 0 ? (
              <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl p-16 text-center shadow-inner">
                <span className="inline-flex p-3 bg-slate-950 border border-slate-850 text-slate-500 rounded-2xl mb-3 shadow-inner">
                  <Activity className="w-6 h-6" />
                </span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">No fixtures scheduled</p>
                <p className="text-[10px] text-slate-500 mt-1">There are no matches scheduled for the selected filters on this date.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedDivisionTab === "all" ? (
                  // All Divisions Selected: Group matches by division
                  divisions.map(div => {
                    const divMatches = matchesGroupedByDivision[div.id] || [];
                    if (divMatches.length === 0) return null;

                    return (
                      <div key={div.id} className="space-y-3">
                        <span className="inline-flex items-center bg-indigo-950/20 border border-indigo-900/30 text-[9px] text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                          {div.name}
                        </span>
                        <div className="divide-y divide-slate-800/60 border border-slate-900 bg-slate-900/30 rounded-2xl overflow-hidden shadow-md">
                          {divMatches.map(m => (
                            <MatchCard key={m.id} match={m} />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Specific Division Selected
                  <div className="divide-y divide-slate-800/60 border border-slate-900 bg-slate-900/30 rounded-2xl overflow-hidden shadow-md">
                    {filteredMatches.map(m => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: STANDINGS DISPLAY (5 COLUMNS) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <Trophy className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="font-black text-white uppercase text-xs tracking-tight">League Leaderboards</h3>
            </div>

            <div className="space-y-8">
              {selectedDivisionTab === "all" ? (
                // Render Standings for All Divisions
                divisions.map(div => {
                  const divStandings = standingsMap[div.id] || [];
                  return (
                    <div key={div.id} className="space-y-3">
                      <span className="inline-flex items-center bg-indigo-950/20 border border-indigo-900/30 text-[9px] text-indigo-400 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                        {div.name} Standings
                      </span>
                      <div className="bg-slate-900/40 border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
                        <StandingsTable standings={divStandings} />
                      </div>
                    </div>
                  );
                })
              ) : (
                // Render Standings for Specific Division
                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl shadow-xl overflow-hidden">
                  <StandingsTable standings={standingsMap[Number(selectedDivisionTab)] || []} />
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// Sub-Component: Match Card
function MatchCard({ match }: { match: MatchRow }) {
  const isCompleted = match.status === 'completed';

  return (
    <Link 
      href={`/matches/${match.id}`}
      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-all group cursor-pointer"
    >
      <div className="flex-1 flex items-center justify-between sm:justify-center gap-4 max-w-lg mx-auto w-full">
        
        {/* Home Team */}
        <div className="text-right flex-1 min-w-0 flex items-center justify-end gap-2.5">
          <span className="font-black text-slate-200 uppercase tracking-tight text-[12px] sm:text-[13px] truncate group-hover:text-indigo-400 transition-colors">
            {match.homeTeamName}
          </span>
          {match.homeTeamLogo ? (
            <div className="w-5.5 h-5.5 rounded bg-slate-950 border border-slate-850 p-0.5 flex items-center justify-center shrink-0">
              <Image src={match.homeTeamLogo} alt={match.homeTeamName} width={22} height={22} className="object-contain" />
            </div>
          ) : (
            <div className="w-5.5 h-5.5 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[8px] text-indigo-400 shrink-0">
              {match.homeTeamName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Score or VS Badge */}
        <div className="shrink-0 px-1">
          {isCompleted ? (
            <div className="bg-slate-950 text-indigo-400 border border-slate-850 font-mono text-[11px] font-black px-3 py-1 rounded-xl shadow-inner tracking-wider">
              {match.homeScore} - {match.awayScore}
            </div>
          ) : (
            <div className="bg-slate-950 text-slate-500 border border-slate-850 rounded-xl px-3.5 py-1 font-bold text-[9px] uppercase tracking-widest shadow-inner">
              VS
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="text-left flex-1 min-w-0 flex items-center gap-2.5">
          {match.awayTeamLogo ? (
            <div className="w-5.5 h-5.5 rounded bg-slate-950 border border-slate-850 p-0.5 flex items-center justify-center shrink-0">
              <Image src={match.awayTeamLogo} alt={match.awayTeamName} width={22} height={22} className="object-contain" />
            </div>
          ) : (
            <div className="w-5.5 h-5.5 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[8px] text-indigo-400 shrink-0">
              {match.awayTeamName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-black text-slate-200 uppercase tracking-tight text-[12px] sm:text-[13px] truncate group-hover:text-indigo-400 transition-colors">
            {match.awayTeamName}
          </span>
        </div>

      </div>
    </Link>
  );
}

// Sub-Component: Standings Table
function StandingsTable({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0) {
    return (
      <div className="p-8 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        No standings records.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-900/60 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-850">
            <th className="px-3 py-2 text-center w-8">Pos</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-2 py-2 text-center">P</th>
            <th className="px-2 py-2 text-center text-emerald-400">W</th>
            <th className="px-2 py-2 text-center text-slate-500">D</th>
            <th className="px-2 py-2 text-center text-rose-400">L</th>
            <th className="px-3 py-2 text-center bg-indigo-950/20 text-indigo-400 font-black border-l border-slate-850">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40 font-medium text-slate-350">
          {standings.map((row, index) => {
            return (
              <tr key={row.id} className="hover:bg-slate-900/20 transition-all group">
                <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-500">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5 font-black text-white uppercase text-[11.5px] truncate max-w-[150px] group-hover:text-indigo-400 transition-colors">
                  <div className="flex items-center gap-1.5">
                    {row.logoUrl ? (
                      <div className="w-4.5 h-4.5 rounded bg-slate-950 border border-slate-900 p-0.5 flex items-center justify-center shrink-0">
                        <Image src={row.logoUrl} alt={row.name} width={18} height={18} className="object-contain" />
                      </div>
                    ) : (
                      <div className="w-4.5 h-4.5 rounded bg-indigo-950/40 border border-indigo-900/20 flex items-center justify-center font-black text-[7px] text-indigo-400 shrink-0">
                        {row.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <Link href={`/teams/${row.id}`} prefetch={false} className="truncate">{row.name}</Link>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center font-mono">{row.overallPlayed}</td>
                <td className="px-2 py-2.5 text-center font-bold text-emerald-400/90 font-mono">{row.overallWins}</td>
                <td className="px-2 py-2.5 text-center text-slate-500 font-mono">{row.overallDraws}</td>
                <td className="px-2 py-2.5 text-center text-rose-400/80 font-mono">{row.overallLosses}</td>
                <td className="px-3 py-2.5 text-center bg-indigo-950/10 text-indigo-400 font-black font-mono border-l border-slate-850">
                  {row.overallPoints}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
