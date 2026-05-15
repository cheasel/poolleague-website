import { db } from "@/src/db";
import { teams, divisions, matches } from "@/src/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import Link from "next/link";

export default async function StandingsPage({ searchParams }: { searchParams: { division?: string } }) {
  const params = await searchParams;
  const selectedDivId = params.division ? Number(params.division) : null;

  // 1. Fetch all divisions for the filter tabs
  const allDivisions = await db.select().from(divisions).orderBy(desc(divisions.name));
  
  // Default to the first division if none selected
  const activeDivId = selectedDivId || allDivisions[0]?.id;

  // 2. Fetch teams for the selected division
  const allTeams = activeDivId 
    ? await db
        .select({
          id: teams.id,
          name: teams.name,
          points: teams.points,
          setsWon: teams.setsWon,
          setsLost: teams.setsLost,
          matchPlay: sql<number>`(
            SELECT count(*) 
            FROM ${matches} 
            WHERE ${matches.status} = 'completed' 
            AND (${matches.homeTeamId} = ${teams.id} OR ${matches.awayTeamId} = ${teams.id})
          )`.mapWith(Number),
        })
        .from(teams)
        .where(eq(teams.divisionId, activeDivId))
        .orderBy(desc(teams.points), desc(sql`${teams.setsWon} - ${teams.setsLost}`), desc(teams.setsWon))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">League Standings</h1>
          
          {/* Division Filter Tabs */}
          <div className="flex gap-2 mt-8 overflow-x-auto pb-2">
            {allDivisions.map((div) => (
              <Link
                key={div.id}
                href={`/standings?division=${div.id}`}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  activeDivId === div.id 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' 
                    : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {div.name}
              </Link>
            ))}
          </div>
        </header>
        
        {/* Table remains largely the same but reflects the 'activeDivId' teams */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em]">
                  <th className="px-6 py-6 text-center">Pos</th>
                  <th className="px-6 py-6">Team Name</th>
                  <th className="px-6 py-6 text-center bg-slate-800/50">MP</th>
                  <th className="px-6 py-6 text-center">FW</th>
                  <th className="px-6 py-6 text-center">FL</th>
                  <th className="px-6 py-6 text-center bg-slate-800">Diff</th>
                  <th className="px-6 py-6 text-right bg-indigo-600">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTeams.map((team, idx) => {
                  const diff = (team.setsWon || 0) - (team.setsLost || 0);
                  return (
                    <tr key={team.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-6 text-center font-mono text-slate-300 font-black text-lg italic">{idx + 1}</td>
                      <td className="px-6 py-6 font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {team.name}
                      </td>
                      <td className="px-6 py-6 text-center font-black text-slate-900 bg-slate-50/50">{team.matchPlay}</td>
                      <td className="px-6 py-6 text-center font-bold text-slate-600">{team.setsWon}</td>
                      <td className="px-6 py-6 text-center font-bold text-slate-400">{team.setsLost}</td>
                      <td className={`px-6 py-6 text-center font-black tabular-nums bg-slate-50/50 ${diff > 0 ? 'text-green-600' : 'text-red-400'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="px-6 py-6 text-right font-black text-white bg-indigo-600 tabular-nums">{team.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}