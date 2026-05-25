import { db } from "@/src/db";
import { teams, matches, players, seasons, divisions, matchGames } from "@/src/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import PlayerStatsClient from "./PlayerStatsClient";

export const revalidate = 60;

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

  const completedMatches = await db
    .select({
      id: matches.id,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(
      and(
        eq(matches.status, "completed"),
        selectedSeasonId ? eq(matches.seasonId, selectedSeasonId) : undefined,
        selectedDivisionId ? eq(matches.divisionId, selectedDivisionId) : undefined
      )
    );

  const completedMatchIds = completedMatches.map((m) => m.id);

  const teamMatchCountMap: Record<number, number> = {};
  const teamTotalFramesMap: Record<number, number> = {};

  completedMatches.forEach((m) => {
    const totalMatchFrames = Number(m.homeScore || 0) + Number(m.awayScore || 0);

    if (m.homeTeamId) {
      teamMatchCountMap[m.homeTeamId] = (teamMatchCountMap[m.homeTeamId] || 0) + 1;
      teamTotalFramesMap[m.homeTeamId] = (teamTotalFramesMap[m.homeTeamId] || 0) + totalMatchFrames;
    }
    if (m.awayTeamId) {
      teamMatchCountMap[m.awayTeamId] = (teamMatchCountMap[m.awayTeamId] || 0) + 1;
      teamTotalFramesMap[m.awayTeamId] = (teamTotalFramesMap[m.awayTeamId] || 0) + totalMatchFrames;
    }
  });

  const basePlayers = await db
    .select({
      id: players.id,
      name: players.name,
      imageUrl: players.imageUrl,
      teamId: players.teamId,
      teamName: teams.name,
    })
    .from(players)
    .leftJoin(teams, eq(players.teamId, teams.id))
    .where(selectedDivisionId ? eq(teams.divisionId, selectedDivisionId) : undefined);

  const statsMap = basePlayers.reduce((acc, p) => {
    acc[p.id] = {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      teamName: p.teamName || "Free Agent",
      maxTeamMatches: p.teamId ? (teamMatchCountMap[p.teamId] || 0) : 0,
      maxTeamFrames: p.teamId ? (teamTotalFramesMap[p.teamId] || 0) : 0,
      matchPlayGames: new Set<number>(),
      framePlay: 0,
      singlePlay: 0,
      singleWin: 0,
      singleLost: 0,
      singlePct: "0.0",
      doublePlay: 0,
      doubleWin: 0,
      doubleLost: 0,
      doublePct: "0.0",
      totalPlay: 0,
      totalWin: 0,
      totalLost: 0,
      totalPct: "0.0",
    };
    return acc;
  }, {} as Record<number, any>);

  if (completedMatchIds.length > 0) {
    const gamesPlayed = await db
      .select()
      .from(matchGames)
      .where(sql`${matchGames.matchId} IN ${completedMatchIds}`);

    gamesPlayed.forEach((game) => {
      const p1Id = game.player1Id;
      const p2Id = game.player2Id;
      const p1Score = Number(game.player1Score || 0);
      const p2Score = Number(game.player2Score || 0);

      if (game.gameType === "single") {
        if (p1Id && statsMap[p1Id]) {
          statsMap[p1Id].singlePlay += 1;
          statsMap[p1Id].framePlay += 1;
          statsMap[p1Id].matchPlayGames.add(game.matchId);
          if (p1Score > p2Score) statsMap[p1Id].singleWin += 1;
          else if (p1Score < p2Score) statsMap[p1Id].singleLost += 1;
        }
        if (p2Id && statsMap[p2Id]) {
          statsMap[p2Id].singlePlay += 1;
          statsMap[p2Id].framePlay += 1;
          statsMap[p2Id].matchPlayGames.add(game.matchId);
          if (p2Score > p1Score) statsMap[p2Id].singleWin += 1;
          else if (p2Score < p1Score) statsMap[p2Id].singleLost += 1;
        }
      }

      if (game.gameType === "double") {
        const partners = [
          { main: p1Id, won: p1Score > p2Score, lost: p1Score < p2Score },
          { main: game.player1PartnerId, won: p1Score > p2Score, lost: p1Score < p2Score },
          { main: p2Id, won: p2Score > p1Score, lost: p2Score < p1Score },
          { main: game.player2PartnerId, won: p2Score > p1Score, lost: p2Score < p1Score },
        ];

        partners.forEach(({ main, won, lost }) => {
          if (main && statsMap[main]) {
            statsMap[main].doublePlay += 1;
            statsMap[main].framePlay += 1;
            statsMap[main].matchPlayGames.add(game.matchId);
            if (won) statsMap[main].doubleWin += 1;
            if (lost) statsMap[main].doubleLost += 1;
          }
        });
      }
    });
  }

  const calculatedPlayers = Object.values(statsMap).map((p: any) => {
    const totalPlay = p.singlePlay + p.doublePlay;
    const totalWin = p.singleWin + p.doubleWin;
    const totalLost = p.singleLost + p.doubleLost;

    return {
      ...p,
      matchPlay: p.matchPlayGames.size,
      totalPlay,
      totalWin,
      totalLost,
      singlePct: p.singlePlay > 0 ? ((p.singleWin / p.singlePlay) * 100).toFixed(1) : "0.0",
      doublePct: p.doublePlay > 0 ? ((p.doubleWin / p.doublePlay) * 100).toFixed(1) : "0.0",
      totalPct: totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(1) : "0.0",
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      
      {/* HERO SECTION */}
      <div className="relative overflow-hidden bg-slate-950 border-b border-slate-900/60">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 py-12 relative z-10 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block">Performance Matrix</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
            Player <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">Statistics</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs max-w-xl">
            Review performance breakdowns across singles and doubles metrics, attendance tracking, and success percentages.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <PlayerStatsClient
          initialPlayers={calculatedPlayers}
          seasons={allSeasons.map((s) => ({ id: s.id, name: s.name }))}
          divisions={allDivisions.map((d) => ({ id: d.id, name: d.name }))}
          selectedSeasonId={selectedSeasonId || undefined}
          selectedDivisionId={selectedDivisionId || undefined}
        />
      </div>
    </div>
  );
}