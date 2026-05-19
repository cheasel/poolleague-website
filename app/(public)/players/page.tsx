import { db } from "@/src/db";
import { players, matchGames, teams, matches, seasons, divisions } from "@/src/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import PlayerStatsClient from "./PlayerStatsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    seasonId?: string;
    divisionId?: string;
  }>;
}

export default async function PublicPlayersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // 1. Fetch Seasons & Divisions lists for the filter menus
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const allDivisions = await db.select().from(divisions).orderBy(divisions.tier);

  // Fallback to active/latest items if no query parameters exist yet
  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : allSeasons[0]?.id;
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : allDivisions[0]?.id;

  // 2. Calculate completed matches per team within the chosen scope
  const teamCompletedCounts = await db
    .select({
      teamId: teams.id,
      completedMatches: sql<number>`
        count(
          case 
            when ${matches.status} = 'completed' then 1 
            else null 
          end
        )
      `
    })
    .from(teams)
    .leftJoin(
      matches,
      sql`${teams.id} = ${matches.homeTeamId} or ${teams.id} = ${matches.awayTeamId}`
    )
    .groupBy(teams.id);

  const completedMap = teamCompletedCounts.reduce((acc, curr) => {
    acc[curr.teamId] = Number(curr.completedMatches || 0);
    return acc;
  }, {} as Record<number, number>);

  // 3. Extract player performances
  const rawLeaderboard = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
      teamId: players.teamId,
      teamName: teams.name,
      divisionId: teams.divisionId,
      seasonId: matches.seasonId,
      matchPlay: sql<number>`count(distinct ${matchGames.matchId})`,
      singlePlay: sql<number>`count(case when ${matchGames.gameType} = 'single' then 1 else null end)`,
      singleWin: sql<number>`
        count(
          case 
            when ${matchGames.gameType} = 'single' 
                 and ((${players.id} = ${matchGames.player1Id} and ${matchGames.player1Score} > ${matchGames.player2Score}) or 
                      (${players.id} = ${matchGames.player2Id} and ${matchGames.player2Score} > ${matchGames.player1Score})) then 1 
            else null 
          end
        )
      `,
      doublePlay: sql<number>`count(case when ${matchGames.gameType} = 'double' then 1 else null end)`,
      doubleWin: sql<number>`
        count(
          case 
            when ${matchGames.gameType} = 'double' 
                 and ((${players.id} = ${matchGames.player1Id} or ${players.id} = ${matchGames.player1PartnerId}) and ${matchGames.player1Score} > ${matchGames.player2Score} or 
                      (${players.id} = ${matchGames.player2Id} or ${players.id} = ${matchGames.player2PartnerId}) and ${matchGames.player2Score} > ${matchGames.player1Score}) then 1 
            else null 
          end
        )
      `,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .leftJoin(
      matchGames,
      sql`${players.id} = ${matchGames.player1Id} 
          or ${players.id} = ${matchGames.player1PartnerId} 
          or ${players.id} = ${matchGames.player2Id} 
          or ${players.id} = ${matchGames.player2PartnerId}`
    )
    // Link through matches to cleanly separate seasons
    .leftJoin(matches, eq(matchGames.matchId, matches.id))
    .groupBy(players.id, players.name, teams.name, players.teamId, players.imageUrl, teams.divisionId, matches.seasonId);

  // 4. Map & transform data matrices
  const initialPlayers = rawLeaderboard
    .filter((p) => {
      // Apply strict server-side structural scoping
      const matchesSeason = selectedSeasonId ? p.seasonId === selectedSeasonId : true;
      const matchesDivision = selectedDivisionId ? p.divisionId === selectedDivisionId : true;
      return matchesSeason && matchesDivision;
    })
    .map((p) => {
      const singleLost = Math.max(0, p.singlePlay - p.singleWin);
      const doubleLost = Math.max(0, p.doublePlay - p.doubleWin);
      
      // 🎯 TOTALS: Perfect aggregate sums of singles + doubles metrics
      const totalPlay = p.singlePlay + p.doublePlay;
      const totalWin = p.singleWin + p.doubleWin;
      const totalLost = singleLost + doubleLost;

      const singlePct = p.singlePlay > 0 ? ((p.singleWin / p.singlePlay) * 100).toFixed(0) : "0";
      const doublePct = p.doublePlay > 0 ? ((p.doubleWin / p.doublePlay) * 100).toFixed(0) : "0";
      const totalPct = totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(0) : "0";

      const totalTeamMatches = p.teamId ? (completedMap[p.teamId] || 0) : 0;

      return {
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        teamName: p.teamName || "Unassigned",
        matchPlay: p.matchPlay, 
        maxTeamMatches: totalTeamMatches,
        singlePlay: p.singlePlay,
        singleWin: p.singleWin,
        singleLost,
        singlePct,
        doublePlay: p.doublePlay,
        doubleWin: p.doubleWin,
        doubleLost,
        doublePct,
        totalPlay,
        totalWin,
        totalLost,
        totalPct,
        totalPctNum: Number(totalPct) // Used purely for clean client sorting
      };
    })
    .filter((player) => player.totalPlay > 0)
    // 🎯 INITIAL SORT: Automatically orders by highest overall success percentage on mount
    .sort((a, b) => b.totalPctNum - a.totalPctNum);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">Seasonal Analytics</span>
        <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">
          Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Leaderboard</span>
        </h1>
        <p className="text-slate-500 font-medium text-xs mt-1">
          Live statistics tracking framing efficiency, singles performance, and overall win ratios.
        </p>
      </div>

      <PlayerStatsClient 
        initialPlayers={initialPlayers} 
        seasons={allSeasons.map(s => ({ id: s.id, name: s.name }))}
        divisions={allDivisions.map(d => ({ id: d.id, name: d.name }))}
        selectedSeasonId={selectedSeasonId}
        selectedDivisionId={selectedDivisionId}
      />
    </div>
  );
}