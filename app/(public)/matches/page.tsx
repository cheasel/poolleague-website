import { db } from "@/src/db";
import { matches, teams } from "@/src/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";

export default async function PublicMatchesPage() {
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  const allMatches = await db
    .select({
      id: matches.id,
      date: matches.matchDate,
      homeTeam: homeTeams.name,
      awayTeam: awayTeams.name,
      homeScore: matches.homeTeamScoreTotal,
      awayScore: matches.awayTeamScoreTotal,
      status: matches.status,
    })
    .from(matches)
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .orderBy(desc(matches.matchDate)); // Show newest/upcoming first

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Match Center</h1>
            <p className="text-slate-500 font-medium">Schedule and historical results.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {allMatches.map((m) => (
            <Link 
              href={`/matches/${m.id}`} 
              key={m.id}
              className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-50 transition-all group"
            >
              <div className="flex flex-col md:flex-row items-center gap-8 flex-1">
                {/* Date */}
                <div className="text-center md:text-left">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {m.date ? new Date(m.date).getFullYear() : '2026'}
                  </div>
                  <div className="text-lg font-black text-slate-900 leading-none">
                    {m.date ? new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "TBD"}
                  </div>
                </div>

                {/* Matchup */}
                <div className="flex items-center gap-4">
                  <span className={`text-xl font-black uppercase ${m.status === 'completed' && (m.homeScore! > m.awayScore!) ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {m.homeTeam}
                  </span>
                  
                  <div className={`px-4 py-1.5 rounded-full font-black text-sm tabular-nums transition-colors ${
                    m.status === 'completed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {m.status === 'completed' ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
                  </div>

                  <span className={`text-xl font-black uppercase ${m.status === 'completed' && (m.awayScore! > m.homeScore!) ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {m.awayTeam}
                  </span>
                </div>
              </div>

              {/* Status Tag */}
              <div className="mt-4 md:mt-0 flex items-center gap-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                  m.status === 'completed' 
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {m.status}
                </span>
                <div className="text-slate-300 group-hover:text-indigo-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </div>
            </Link>
          ))}

          {allMatches.length === 0 && (
            <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem]">
              <p className="text-slate-300 font-black uppercase tracking-widest">No matches scheduled yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}