import { db } from "@/src/db";
import { matches, teams, divisions } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Calendar, ArrowUpDown, CalendarDays, CheckCircle2, Trophy, Clock } from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    division?: string;
    sort?: string;
  }>;
}

export default async function PublicMatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;
  const currentSort = params.sort || "date_desc"; // Default view: Newest or upcoming matches first

  // 1. Fetch Divisions for the public selection ribbon tabs
  const allDivisions = await db.select().from(divisions).orderBy(asc(divisions.tier));
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  const homeTeamsAlias = alias(teams, "homeTeamsAlias");
  const awayTeamsAlias = alias(teams, "awayTeamsAlias");

  // 2. Determine SQL sorting strategy array block
  const getOrderByExpression = () => {
    switch (currentSort) {
      case "date_asc":
        return [asc(matches.matchDate), asc(matches.id)];
      case "status":
        return [asc(matches.status), desc(matches.matchDate)];
      case "date_desc":
      default:
        return [desc(matches.matchDate), desc(matches.id)];
    }
  };

  // 3. Query match rows mapped to current public filter/sorting frameworks
  const publicMatches = activeDivId
    ? await db
        .select({
          id: matches.id,
          matchDate: matches.matchDate,
          status: matches.status,
          homeTeamName: homeTeamsAlias.name,
          awayTeamName: awayTeamsAlias.name,
          homeTeamScoreTotal: matches.homeTeamScoreTotal,
          awayTeamScoreTotal: matches.awayTeamScoreTotal,
          divisionName: divisions.name,
        })
        .from(matches)
        .leftJoin(homeTeamsAlias, eq(matches.homeTeamId, homeTeamsAlias.id))
        .leftJoin(awayTeamsAlias, eq(matches.awayTeamId, awayTeamsAlias.id))
        .leftJoin(divisions, eq(homeTeamsAlias.divisionId, divisions.id))
        .where(eq(homeTeamsAlias.divisionId, activeDivId))
        .orderBy(...getOrderByExpression())
    : [];

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-8">
      {/* PAGE HEADER */}
      <header>
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Fixtures & Results</h1>
        <p className="text-slate-500 font-medium text-xs">Stay up to date with historical match scores, weekly calendars, and schedules.</p>
      </header>

      {/* DIVISION NAVIGATION RIBBON */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {allDivisions.map((div) => (
          <Link
            key={div.id}
            href={`/matches?division=${div.id}&sort=${currentSort}`}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
              activeDivId === div.id
                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200"
                : "bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600"
            }`}
          >
            {div.name}
          </Link>
        ))}
      </div>

      {/* SORT ORDER CONTROLS */}
      <div className="flex items-center gap-3 px-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5" /> Filter Calendar:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "date_desc", label: "Latest Scores First", icon: CalendarDays },
            { key: "date_asc", label: "Schedule: Chronological", icon: Calendar },
            { key: "status", label: "By Match Status", icon: CheckCircle2 },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = currentSort === opt.key;
            return (
              <Link
                key={opt.key}
                href={`/matches?division=${activeDivId}&sort=${opt.key}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* PUBLIC SCHEDULE TIMELINE LEDGER */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {publicMatches.map((match) => {
            const isCompleted = match.status === "completed";
            const isLive = match.status === "live";

            return (
              <div 
                key={match.id} 
                className="p-6 md:px-8 flex flex-col md:flex-row justify-between md:items-center gap-6 hover:bg-slate-50/40 transition-colors group"
              >
                {/* Left Side: Date / Metadata Details */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className={`p-3.5 rounded-2xl border transition-colors ${
                    isCompleted 
                      ? "bg-slate-100 border-slate-200 text-slate-400 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600" 
                      : "bg-emerald-50 border-emerald-100 text-emerald-600 animate-pulse"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block tracking-wider uppercase">
                      {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "TBD"}
                    </span>
                    <span className="text-[9px] font-bold text-indigo-500 tracking-tight uppercase block">
                      {match.divisionName}
                    </span>
                  </div>
                </div>

                {/* Central Focus: Widescreen Scoreboard Differential Frame */}
                <div className="flex flex-1 items-center justify-center md:justify-center gap-4 font-black text-slate-900 uppercase text-sm tracking-tight">
                  <span className="flex-1 text-right truncate max-w-[200px] md:max-w-[250px]">
                    {match.homeTeamName || "Home Club"}
                  </span>
                  
                  <span className={`px-4 py-1.5 text-xs rounded-xl border tabular-nums tracking-widest font-black shadow-inner min-w-[75px] text-center ${
                    isCompleted ? 'bg-slate-900 text-indigo-400 border-slate-900' :
                    isLive ? 'bg-amber-500 text-white border-amber-500' :
                             'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {isCompleted ? `${match.homeTeamScoreTotal} - ${match.awayTeamScoreTotal}` : "VS"}
                  </span>
                  
                  <span className="flex-1 text-left truncate max-w-[200px] md:max-w-[250px]">
                    {match.awayTeamName || "Away Club"}
                  </span>
                </div>

                {/* Right Side: Quick Highlights / Status Callout */}
                <div className="md:w-[120px] text-right shrink-0 hidden md:block">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                    isCompleted ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-blue-50 border-blue-100 text-blue-600"
                  }`}>
                    {isCompleted ? "Final Score" : "Scheduled"}
                  </span>
                </div>

              </div>
            );
          })}

          {publicMatches.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic text-xs">
              No tournament fixtures found for this division tier loop.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}