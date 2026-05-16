import { db } from "@/src/db";
import { matches, teams, divisions, seasons } from "@/src/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Calendar, Trophy, Layers, ChevronRight } from "lucide-react";

export default async function PublicMatchesPage() {
  const homeTeams = alias(teams, "homeTeams");
  const awayTeams = alias(teams, "awayTeams");

  // 1. Fetch all matches with division and season names
  const allMatches = await db
    .select({
      id: matches.id,
      matchDate: matches.matchDate,
      status: matches.status,
      homeTeamScoreTotal: matches.homeTeamScoreTotal,
      awayTeamScoreTotal: matches.awayTeamScoreTotal,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeTeamName: homeTeams.name,
      awayTeamName: awayTeams.name,
      divisionId: homeTeams.divisionId,
      divisionName: divisions.name,
      seasonName: seasons.name,
    })
    .from(matches)
    .leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
    .leftJoin(divisions, eq(homeTeams.divisionId, divisions.id))
    .leftJoin(seasons, eq(divisions.seasonId, seasons.id))
    .orderBy(desc(matches.matchDate), asc(divisions.tier));

  // 2. Fetch all teams to compute their live division ranks
  const allTeamsRanked = await db
    .select({
      id: teams.id,
      divisionId: teams.divisionId,
    })
    .from(teams)
    .orderBy(desc(teams.points), desc(sql`${teams.setsWon} - ${teams.setsLost}`), desc(teams.setsWon));

  // Helper function to find a team's current rank inside its specific division
  const getTeamRank = (teamId: number | null, divisionId: number | null) => {
    if (!teamId || !divisionId) return "?";
    const filteredTeams = allTeamsRanked.filter(t => t.divisionId === divisionId);
    const rankIndex = filteredTeams.findIndex(t => t.id === teamId);
    return rankIndex !== -1 ? rankIndex + 1 : "?";
  };

  // 3. Group matches by Division Name in memory
  const groupedMatches: Record<string, typeof allMatches> = {};
  allMatches.forEach((match) => {
    const key = match.divisionName || "Unassigned Division";
    if (!groupedMatches[key]) {
      groupedMatches[key] = [];
    }
    groupedMatches[key].push(match);
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Match Fixtures</h1>
            <p className="text-slate-500 font-medium">Schedules, live scores, and historic framework results.</p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white border px-4 py-2 rounded-xl shadow-sm">
            Total Matches: {allMatches.length}
          </div>
        </header>

        {/* Render grouped match blocks */}
        {Object.entries(groupedMatches).map(([divisionName, divisionMatches]) => (
          <div key={divisionName} className="space-y-4">
            
            {/* Division Category Sticky Bar Anchor Header */}
            <div className="flex items-center gap-2 px-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                {divisionName} <span className="text-slate-300 font-normal">({divisionMatches[0]?.seasonName})</span>
              </h2>
            </div>

            {/* Match Cards List */}
            <div className="grid grid-cols-1 gap-4">
              {divisionMatches.map((match) => {
                const homeRank = getTeamRank(match.homeTeamId, match.divisionId);
                const awayRank = getTeamRank(match.awayTeamId, match.divisionId);

                return (
                  <Link 
                    href={`/matches/${match.id}`} 
                    key={match.id}
                    className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-6 flex flex-col md:flex-row justify-between items-center gap-6 group"
                  >
                    {/* Left Hand: Date Marker */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-indigo-50 transition-colors">
                        <Calendar className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Match Date</span>
                        <span className="text-xs font-black text-slate-700 tabular-nums">
                          {match.matchDate ? new Date(match.matchDate).toLocaleDateString('en-GB') : "TBD"}
                        </span>
                      </div>
                    </div>

                    {/* Center: Competitor Matchup Board Row */}
                    <div className="grid grid-cols-11 items-center gap-2 w-full md:w-[500px] text-xs">
                      {/* Home Team */}
                      <div className="col-span-4 text-right space-y-0.5">
                        <span className="text-[9px] font-mono text-slate-400 font-bold mr-1">#{homeRank}</span>
                        <span className="font-black text-slate-900 uppercase tracking-tight">{match.homeTeamName}</span>
                      </div>

                      {/* Display Score Badge vs Block */}
                      <div className="col-span-3 flex justify-center">
                        {match.status === "completed" ? (
                          <div className="bg-slate-900 text-white font-black tabular-nums px-4 py-1.5 rounded-xl tracking-tight text-center min-w-[70px]">
                            {match.homeTeamScoreTotal} - {match.awayTeamScoreTotal}
                          </div>
                        ) : (
                          <div className="bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest border px-3 py-1.5 rounded-xl">
                            Pending
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="col-span-4 text-left space-y-0.5">
                        <span className="font-black text-slate-900 uppercase tracking-tight">{match.awayTeamName}</span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold ml-1">#{awayRank}</span>
                      </div>
                    </div>

                    {/* Right Hand: Action Portal Arrow Anchor */}
                    <div className="hidden md:flex items-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                      <span className="text-[9px] font-black uppercase tracking-widest mr-2 opacity-0 group-hover:opacity-100 transition-opacity">View Racks</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>

                  </Link>
                );
              })}
            </div>

          </div>
        ))}

        {allMatches.length === 0 && (
          <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
            <p className="text-slate-300 font-black uppercase tracking-widest italic">No match schedules or fixtures have been added yet.</p>
          </div>
        )}

      </div>
    </div>
  );
}