import { db } from "@/src/db";
import { teams, matches } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";


interface TitleRaceProps {
  divisionId: number;
  seasonId: number;
}

async function getTitleRaceStandings(divisionId: number, seasonId: number) {
  // 1. Fetch all completed match records for the target season and division
  const [completedMatches, divisionTeams] = await Promise.all([
    db
      .select({
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(
        and(
          eq(matches.status, "completed"),
          eq(matches.seasonId, seasonId),
          eq(matches.divisionId, divisionId)
        )
      ),
    db
      .select()
      .from(teams)
      .where(eq(teams.divisionId, divisionId))
  ]);

  // 3. Build an aggregation ledger
  const standingsMap = divisionTeams.reduce((acc, team) => {
    acc[team.id] = {
      id: team.id,
      name: team.name,
      matchPlay: 0,
      wins: 0,
      draws: 0,
    };
    return acc;
  }, {} as Record<number, { id: number; name: string; matchPlay: number; wins: number; draws: number }>);

  // 4. Calculate Match Play and points criteria symmetrically
  completedMatches.forEach((match) => {
    const home = standingsMap[match.homeTeamId!];
    const away = standingsMap[match.awayTeamId!];

    if (!home || !away) return;

    home.matchPlay += 1;
    away.matchPlay += 1;

    const hScore = Number(match.homeScore || 0);
    const aScore = Number(match.awayScore || 0);

    if (hScore > aScore) {
      home.wins += 1;
    } else if (hScore < aScore) {
      away.wins += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
    }
  });

  // 5. Compute authentic league points (Win = 2, Draw = 1)
  return Object.values(standingsMap)
    .map((t) => ({
      id: t.id,
      name: t.name,
      matchPlay: t.matchPlay,
      points: (t.wins * 2) + (t.draws * 1),
    }))
    .sort((a, b) => b.points - a.points);
}

const getCachedTitleRaceStandings = (divisionId: number, seasonId: number) => unstable_cache(
  async () => getTitleRaceStandings(divisionId, seasonId),
  ["title-race-standings", String(divisionId), String(seasonId)],
  { revalidate: 60, tags: ["matches", "teams"] }
)();

export default async function TitleRace({ divisionId, seasonId }: TitleRaceProps) {
  const standings = await getCachedTitleRaceStandings(divisionId, seasonId);

  return (
    // 🎯 CHANGED: Replaced white container configurations with translucent dark container panel
    <div className="bg-slate-900/40 rounded-3xl border border-slate-900 shadow-xl overflow-hidden w-full">
      {/* Header Context */}
      {/* 🎯 CHANGED: Converted header element backgrounds and updated text metrics */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/20">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-0.5">Live Apex</span>
        <h2 className="text-lg font-black text-white uppercase tracking-tighter italic">
          Title <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Race</span>
        </h2>
      </div>

      {/* 4-Column Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {/* 🎯 CHANGED: Adjusted header text contrast and horizontal border color settings */}
            <tr className="bg-slate-950/40 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800/60">
              <th className="px-4 py-3 text-center w-12">Rank</th>
              <th className="px-4 py-3">Team Name</th>
              <th className="px-4 py-3 text-center w-16">MP</th>
              <th className="px-5 py-3 text-center w-20 bg-indigo-950/30 text-indigo-400 font-black">Points</th>
            </tr>
          </thead>
          {/* 🎯 CHANGED: Swapped text color properties for light typography values across row nodes */}
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {standings.slice(0, 5).map((team, index) => (
              // 🎯 CHANGED: Set hover highlight rules for the dark arena schema
              <tr key={team.id} className="hover:bg-slate-900/40 transition-colors group">
                <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-600">
                  {index + 1}
                </td>
                {/* 🎯 CHANGED: Boosted team name clarity to pure text-slate-100 */}
                <td className="px-4 py-3.5 font-black text-slate-100 uppercase tracking-tight text-[12px] truncate max-w-[140px]">
                  {team.name}
                </td>
                <td className="px-4 py-3.5 text-center font-mono tabular-nums text-slate-400">
                  {team.matchPlay}
                </td>
                {/* 🎯 CHANGED: Upgraded points container to high-visibility glassmorphic indigo badge state */}
                <td className="px-5 py-3.5 text-center bg-indigo-950/20 text-indigo-400 font-mono font-black text-sm group-hover:bg-indigo-900/30 transition-colors border-l border-slate-900">
                  {team.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}