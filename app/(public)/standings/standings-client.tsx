'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Trophy, ArrowUpRight } from "lucide-react";

interface StandingsRow {
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  framesFor: number;
  framesAgainst: number;
  frameDifference: number;
  points: number;
}

interface StandingsClientProps {
  initialRows: StandingsRow[];
}

export default function StandingsClient({ initialRows }: StandingsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Reactively filter standings rows based on search parameters
  const filteredRows = useMemo(() => {
    if (!searchQuery) return initialRows;
    return initialRows.filter(row => 
      row.teamName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [initialRows, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Live Club Search Input Utility */}
      <div className="bg-white rounded-[2rem] p-4 px-6 border border-slate-200 shadow-sm flex items-center gap-4 max-w-md">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search club standings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent font-bold text-slate-900 text-xs outline-none placeholder:text-slate-400 uppercase tracking-wider"
        />
      </div>

      {/* Leaderboard Table Grid */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-400 font-black uppercase tracking-widest border-b border-slate-800 selection:bg-transparent">
                <th className="p-5 pl-8 text-center w-16">Rank</th>
                <th className="p-5 sticky left-0 bg-slate-900 z-10 min-w-[200px]">Club Name</th>
                <th className="p-5 text-center">Played</th>
                <th className="p-5 text-center text-green-400">W</th>
                <th className="p-5 text-center text-slate-400">D</th>
                <th className="p-5 text-center text-rose-400">L</th>
                <th className="p-5 text-center text-slate-500">Frames (F/A)</th>
                <th className="p-5 text-center">Diff</th>
                <th className="p-5 text-center bg-indigo-950 text-indigo-400 pr-8 w-24">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold uppercase tracking-tight text-slate-700">
              {filteredRows.map((row, index) => {
                const isTopThree = index < 3;
                
                return (
                  <tr key={row.teamId} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Rank Position Column */}
                    <td className="p-5 pl-8 text-center font-black text-sm tabular-nums text-slate-400 group-hover:text-slate-900 transition-colors">
                      {isTopThree ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] border ${
                          index === 0 ? "bg-amber-50 text-amber-600 border-amber-200" :
                          index === 1 ? "bg-slate-100 text-slate-600 border-slate-200" :
                                         "bg-amber-900/5 text-amber-800 border-amber-900/10"
                        }`}>
                          {index + 1}
                        </span>
                      ) : (
                        index + 1
                      )}
                    </td>

                    {/* Team Name Linked Row Core Target */}
                    <td className="p-5 font-black text-slate-900 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50/80 border-r border-slate-100/80 z-10">
                      <Link 
                        href={`/teams/${row.teamId}`}
                        className="hover:text-indigo-600 transition-colors inline-flex items-center gap-2 group/link"
                      >
                        <span>{row.teamName}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover/link:text-indigo-500 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-all" />
                      </Link>
                    </td>

                    {/* Aggregated Record Matrix Fields */}
                    <td className="p-5 text-center font-medium text-slate-500 tabular-nums">{row.played}</td>
                    <td className="p-5 text-center font-black text-green-600 bg-green-50/10 tabular-nums">{row.won}</td>
                    <td className="p-5 text-center font-medium text-slate-400 bg-slate-50/20 tabular-nums">{row.drawn}</td>
                    <td className="p-5 text-center font-medium text-rose-500 bg-rose-50/10 tabular-nums">{row.lost}</td>
                    <td className="p-5 text-center font-medium text-slate-400 tracking-wider tabular-nums">
                      {row.framesFor}<span className="text-slate-300 mx-0.5">/</span>{row.framesAgainst}
                    </td>
                    <td className={`p-5 text-center font-black tabular-nums ${
                      row.frameDifference > 0 ? "text-green-600" : row.frameDifference < 0 ? "text-rose-500" : "text-slate-400"
                    }`}>
                      {row.frameDifference > 0 ? `+${row.frameDifference}` : row.frameDifference}
                    </td>

                    {/* Total Score Points Block Column */}
                    <td className="p-5 text-center font-black italic text-sm bg-indigo-50/30 text-indigo-600 tabular-nums pr-8 shadow-inner">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="p-16 text-center text-xs font-bold text-slate-400 italic uppercase tracking-wider">
            No teams match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}