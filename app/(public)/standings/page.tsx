import { db } from "@/src/db";
import { teams } from "@/src/db/schema";
import { desc, sql } from "drizzle-orm";

export default async function StandingsPage() {
  // Sort by Points, then Frame Difference (setsWon - setsLost)
  const allTeams = await db
    .select()
    .from(teams)
    .orderBy(
      desc(teams.points), 
      desc(sql`${teams.setsWon} - ${teams.setsLost}`), 
      desc(teams.setsWon)
    );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">League Standings</h1>
          <p className="text-slate-500 font-medium">Official 2026 Season Rankings</p>
        </header>
        
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Pos</th>
                <th className="px-8 py-6">Team Name</th>
                <th className="px-8 py-6 text-center">FW</th>
                <th className="px-8 py-6 text-center">FL</th>
                <th className="px-8 py-6 text-center bg-slate-800">Diff</th>
                <th className="px-8 py-6 text-right bg-indigo-600">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allTeams.map((team, idx) => {
                const diff = team.setsWon - team.setsLost;
                return (
                  <tr key={team.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6 font-mono text-slate-300 font-black text-lg italic">
                      {idx + 1}
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {team.name}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center font-bold text-slate-600">
                      {team.setsWon}
                    </td>
                    <td className="px-8 py-6 text-center font-bold text-slate-400">
                      {team.setsLost}
                    </td>
                    <td className={`px-8 py-6 text-center font-black tabular-nums bg-slate-50/50 ${
                      diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="px-8 py-6 text-right font-black text-white bg-indigo-600/90 tabular-nums">
                      {team.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {allTeams.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">
              No teams registered in the league yet.
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-900 rounded-full"></span> FW: Frames Won</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-400 rounded-full"></span> FL: Frames Lost</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Diff: Frame Difference</div>
        </div>
      </div>
    </div>
  );
}