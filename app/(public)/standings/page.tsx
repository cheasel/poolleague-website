import { db } from "@/db";
import { teams, matches } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export default async function StandingsPage() {
  // 1. Fetch all teams and completed matches
  const allTeams = await db.select().from(teams);
  const completedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "completed"));

  // 2. Calculate Stats
  const stats = allTeams.map((team) => {
    let played = 0;
    let won = 0;
    let lost = 0;
    let framesFor = 0;
    let framesAgainst = 0;

    completedMatches.forEach((m) => {
      if (m.homeTeamId === team.id) {
        played++;
        framesFor += m.homeTeamScoreTotal || 0;
        framesAgainst += m.awayTeamScoreTotal || 0;
        if ((m.homeTeamScoreTotal || 0) > (m.awayTeamScoreTotal || 0)) won++;
        else lost++;
      } else if (m.awayTeamId === team.id) {
        played++;
        framesFor += m.awayTeamScoreTotal || 0;
        framesAgainst += m.homeTeamScoreTotal || 0;
        if ((m.awayTeamScoreTotal || 0) > (m.homeTeamScoreTotal || 0)) won++;
        else lost++;
      }
    });

    return {
      ...team,
      played,
      won,
      lost,
      framesFor,
      framesAgainst,
      diff: framesFor - framesAgainst,
      points: won * 3, // 3 points for a win
    };
  });

  // 3. Sort by Points, then Frame Difference
  const sortedStats = stats.sort((a, b) => b.points - a.points || b.diff - a.diff);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black mb-8 text-slate-900 uppercase tracking-tight">League Standings</h1>
      
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase">Pos</th>
              <th className="px-6 py-4 text-xs font-bold uppercase">Team</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-center">P</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-center">W</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-center">L</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-center">FD</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-right text-yellow-400">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedStats.map((team, idx) => (
              <tr key={team.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{team.name}</td>
                <td className="px-6 py-4 text-center text-slate-600 font-medium">{team.played}</td>
                <td className="px-6 py-4 text-center text-green-600 font-bold">{team.won}</td>
                <td className="px-6 py-4 text-center text-red-600 font-medium">{team.lost}</td>
                <td className="px-6 py-4 text-center font-mono text-slate-500">
                  {team.diff > 0 ? `+${team.diff}` : team.diff}
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}