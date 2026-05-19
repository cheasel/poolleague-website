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
  
  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.startDate));
  const allDivisions = await db.select().from(divisions).orderBy(divisions.tier);

  const selectedSeasonId = params.seasonId ? Number(params.seasonId) : (allSeasons[0]?.id || null);
  const selectedDivisionId = params.divisionId ? Number(params.divisionId) : (allDivisions[0]?.id || null);

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

  const rawLeaderboard = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
      teamId: players.teamId,
      teamName: teams.name,
      divisionId: teams.divisionId,
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
    .groupBy(players.id, players.name, teams.name, players.teamId, players.imageUrl, teams.divisionId);

  const initialPlayers = rawLeaderboard
    .filter((p) => {
      return selectedDivisionId ? p.divisionId === selectedDivisionId : true;
    })
    .map((p) => {
      // 🎯 FORCE NUMERIC CONVERSION to prevent string concatenation ("1" + "2" = "12")
      const sPlay = Number(p.singlePlay || 0);
      const sWin = Number(p.singleWin || 0);
      const dPlay = Number(p.doublePlay || 0);
      const dWin = Number(p.doubleWin || 0);

      const singleLost = Math.max(0, sPlay - sWin);
      const doubleLost = Math.max(0, dPlay - dWin);
      
      // 🎯 Correct Mathematical Sums
      const totalPlay = sPlay + dPlay;
      const totalWin = sWin + dWin;
      const totalLost = singleLost + doubleLost;

      const singlePct = sPlay > 0 ? ((sWin / sPlay) * 100).toFixed(0) : "0";
      const doublePct = dPlay > 0 ? ((dWin / dPlay) * 100).toFixed(0) : "0";
      const totalPct = totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(0) : "0";

      const totalTeamMatches = p.teamId ? (completedMap[p.teamId] || 0) : 0;

      return {
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        teamName: p.teamName || "Unassigned",
        matchPlay: Number(p.matchPlay || 0), 
        maxTeamMatches: totalTeamMatches,
        singlePlay: sPlay,
        singleWin: sWin,
        singleLost,
        singlePct,
        doublePlay: dPlay,
        doubleWin: dWin,
        doubleLost,
        doublePct,
        totalPlay,
        totalWin,
        totalLost,
        totalPct,
        totalPctNum: Number(totalPct)
      };
    })
    .filter((player) => player.totalPlay > 0)
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
        selectedSeasonId={selectedSeasonId || undefined}
        selectedDivisionId={selectedDivisionId || undefined}
      />
    </div>
  );
}