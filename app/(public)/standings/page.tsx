import { db } from "@/src/db";
import { teams, matches } from "@/src/db/schema";
import { desc, sql, eq, or, and, count } from "drizzle-orm";

export default async function StandingsPage() {
  // 1. Fetch teams with a subquery or join to count completed matches
  // For simplicity and accuracy, we'll fetch teams and calculate MP based on completed matches
  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      points: teams.points,
      setsWon: teams.setsWon,
      setsLost: teams.setsLost,
      // Subquery to count completed matches where this team was either home or away
      matchPlay: sql<number>`(
        SELECT count(*) 
        FROM ${matches} 
        WHERE ${matches.status} = 'completed' 
        AND (${matches.homeTeamId} = ${teams.id} OR ${matches.awayTeamId} = ${teams.id})
      )`.mapWith(Number),
    })
    .from(teams)
    .orderBy(
      desc(teams.points), 
      desc(sql`${teams.setsWon} - ${teams.setsLost}`), 
      desc(teams.setsWon)
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">League Standings</h1>
            <p className="text-slate-500 font-medium">Official 2026 Season Rankings</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
            Updated: {new Date().toLocaleDateString('en-GB')}
          </div>
        </header>
        
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
                  const diff = team.setsWon - team.setsLost;
                  return (
                    <tr key={team.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-6 text-center font-mono text-slate-300 font-black text-lg italic">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-6">
                        <span className="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {team.name}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-center font-black text-slate-900 bg-slate-50/50">
                        {team.matchPlay}
                      </td>
                      <td className="px-6 py-6 text-center font-bold text-slate-600">
                        {team.setsWon}
                      </td>
                      <td className="px-6 py-6 text-center font-bold text-slate-400">
                        {team.setsLost}
                      </td>
                      <td className={`px-6 py-6 text-center font-black tabular-nums bg-slate-50/50 ${
                        diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-400' : 'text-slate-300'
                      }`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="px-6 py-6 text-right font-black text-white bg-indigo-600 tabular-nums">
                        {team.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {allTeams.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">
              No teams registered in the league yet.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-200 rounded-full"></span> MP: Matches Played</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-900 rounded-full"></span> FW: Frames Won</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-400 rounded-full"></span> FL: Frames Lost</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Diff: Frame Difference</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-indigo-200"></span> PTS: 2 for Win, 1 for Draw</div>
        </div>
      </div>
    </div>
  );
}