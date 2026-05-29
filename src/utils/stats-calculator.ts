export interface RawTeam {
  id: number;
  name: string;
  logoUrl: string | null;
}

export interface RawMatch {
  id: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
}

export interface RawGame {
  matchId: number | null;
  gameType: string | null;
  player1Score: number | null;
  player2Score: number | null;
}

export interface RawPlayer {
  id: number;
  name: string;
  imageUrl: string | null;
  teamId: number | null;
  teamName: string | null;
}

export interface PlayerGame {
  matchId: number | null;
  gameType: string | null;
  player1Id: number | null;
  player2Id: number | null;
  player1PartnerId: number | null;
  player2PartnerId: number | null;
  player1Score: number | null;
  player2Score: number | null;
}

export interface RosterPlayer {
  id: number;
  name: string;
  imageUrl: string | null;
}

export interface RosterGame {
  matchId: number | null;
  gameType: string | null;
  player1Id: number | null;
  player2Id: number | null;
  player1PartnerId: number | null;
  player2PartnerId: number | null;
  player1Score: number | null;
  player2Score: number | null;
}

/**
 * Calculates statistics for all teams inside a division scope.
 */
export function calculateTeamStats(
  baseTeams: RawTeam[],
  completedMatches: RawMatch[],
  gamesPlayed: RawGame[]
) {
  const statsMap = baseTeams.reduce((acc, t) => {
    acc[t.id] = {
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      singlePlay: 0,
      singleWin: 0,
      singleLost: 0,
      doublePlay: 0,
      doubleWin: 0,
      doubleLost: 0,
    };
    return acc;
  }, {} as Record<number, any>);

  if (completedMatches.length > 0 && gamesPlayed.length > 0) {
    const matchTeamMap = new Map<number, { homeTeamId: number | null; awayTeamId: number | null }>();
    completedMatches.forEach((m) => {
      matchTeamMap.set(m.id, { homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId });
    });

    gamesPlayed.forEach((game) => {
      if (!game.matchId) return;
      const teamIds = matchTeamMap.get(game.matchId);
      if (!teamIds) return;

      const { homeTeamId, awayTeamId } = teamIds;
      const p1Score = Number(game.player1Score || 0);
      const p2Score = Number(game.player2Score || 0);

      const isHomeWin = p1Score > p2Score;
      const isAwayWin = p2Score > p1Score;

      if (game.gameType === "single") {
        if (homeTeamId && statsMap[homeTeamId]) {
          statsMap[homeTeamId].singlePlay += 1;
          if (isHomeWin) statsMap[homeTeamId].singleWin += 1;
          else if (isAwayWin) statsMap[homeTeamId].singleLost += 1;
        }
        if (awayTeamId && statsMap[awayTeamId]) {
          statsMap[awayTeamId].singlePlay += 1;
          if (isAwayWin) statsMap[awayTeamId].singleWin += 1;
          else if (isHomeWin) statsMap[awayTeamId].singleLost += 1;
        }
      } else if (game.gameType === "double") {
        if (homeTeamId && statsMap[homeTeamId]) {
          statsMap[homeTeamId].doublePlay += 1;
          if (isHomeWin) statsMap[homeTeamId].doubleWin += 1;
          else if (isAwayWin) statsMap[homeTeamId].doubleLost += 1;
        }
        if (awayTeamId && statsMap[awayTeamId]) {
          statsMap[awayTeamId].doublePlay += 1;
          if (isAwayWin) statsMap[awayTeamId].doubleWin += 1;
          else if (isHomeWin) statsMap[awayTeamId].doubleLost += 1;
        }
      }
    });
  }

  return Object.values(statsMap).map((t: any) => {
    const totalPlay = t.singlePlay + t.doublePlay;
    const totalWin = t.singleWin + t.doubleWin;
    const totalLost = t.singleLost + t.doubleLost;

    return {
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      singlePlay: t.singlePlay,
      singleWin: t.singleWin,
      singleLost: t.singleLost,
      singlePct: t.singlePlay > 0 ? ((t.singleWin / t.singlePlay) * 100).toFixed(1) : "0.0",
      doublePlay: t.doublePlay,
      doubleWin: t.doubleWin,
      doubleLost: t.doubleLost,
      doublePct: t.doublePlay > 0 ? ((t.doubleWin / t.doublePlay) * 100).toFixed(1) : "0.0",
      totalPlay,
      totalWin,
      totalLost,
      totalPct: totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(1) : "0.0",
    };
  });
}

/**
 * Calculates statistics for all players in the league.
 */
export function calculatePlayerStats(
  basePlayers: RawPlayer[],
  teamMatchCountMap: Record<number, number>,
  teamTotalFramesMap: Record<number, number>,
  completedMatchIds: number[],
  gamesPlayed: PlayerGame[]
) {
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

  if (completedMatchIds.length > 0 && gamesPlayed.length > 0) {
    const completedSet = new Set(completedMatchIds);

    gamesPlayed.forEach((game) => {
      if (!game.matchId || !completedSet.has(game.matchId)) return;

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
      } else if (game.gameType === "double") {
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
            statsMap[main].matchPlayGames.add(game.matchId!);
            if (won) statsMap[main].doubleWin += 1;
            if (lost) statsMap[main].doubleLost += 1;
          }
        });
      }
    });
  }

  return Object.values(statsMap).map((p: any) => {
    const totalPlay = p.singlePlay + p.doublePlay;
    const totalWin = p.singleWin + p.doubleWin;
    const totalLost = p.singleLost + p.doubleLost;

    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      teamName: p.teamName,
      maxTeamMatches: p.maxTeamMatches,
      maxTeamFrames: p.maxTeamFrames,
      framePlay: p.framePlay,
      singlePlay: p.singlePlay,
      singleWin: p.singleWin,
      singleLost: p.singleLost,
      singlePct: p.singlePlay > 0 ? ((p.singleWin / p.singlePlay) * 100).toFixed(1) : "0.0",
      doublePlay: p.doublePlay,
      doubleWin: p.doubleWin,
      doubleLost: p.doubleLost,
      doublePct: p.doublePlay > 0 ? ((p.doubleWin / p.doublePlay) * 100).toFixed(1) : "0.0",
      totalPlay,
      totalWin,
      totalLost,
      totalPct: totalPlay > 0 ? ((totalWin / totalPlay) * 100).toFixed(1) : "0.0",
      matchPlay: p.matchPlayGames.size,
    };
  });
}

/**
 * Calculates statistics for all players rostered on a team.
 */
export function calculateRosterStats(
  roster: RosterPlayer[],
  allGames: RosterGame[],
  completedTeamMatchIds: Set<number>
) {
  return roster.map((player) => {
    let singlesPlayed = 0;
    let singlesWins = 0;
    let doublesPlayed = 0;
    let doublesWins = 0;
    const playedMatchIds = new Set<number>();

    allGames.forEach((game) => {
      if (!game.matchId) return;
      // Only count frames from completed matches to avoid inflating stats with live/scheduled data
      if (!completedTeamMatchIds.has(game.matchId)) return;

      const isHome = game.player1Id === player.id || game.player1PartnerId === player.id;
      const isAway = game.player2Id === player.id || game.player2PartnerId === player.id;
      
      if (!isHome && !isAway) return;

      playedMatchIds.add(game.matchId);

      const playerWon = isHome 
        ? (Number(game.player1Score || 0) > Number(game.player2Score || 0)) 
        : (Number(game.player2Score || 0) > Number(game.player1Score || 0));
      
      if (game.gameType === 'double') {
        doublesPlayed++;
        if (playerWon) doublesWins++;
      } else {
        singlesPlayed++;
        if (playerWon) singlesWins++;
      }
    });

    const totalPlayed = singlesPlayed + doublesPlayed;
    const totalWins = singlesWins + doublesWins;
    const winPercentage = totalPlayed > 0 ? ((totalWins / totalPlayed) * 100).toFixed(1) : "0.0";
    const matchesPlayed = playedMatchIds.size;
    const teamTotalMatches = completedTeamMatchIds.size;
    const matchPlayPercentage = teamTotalMatches > 0 ? ((matchesPlayed / teamTotalMatches) * 100).toFixed(1) : "0.0";

    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      singlesPlayed,
      singlesWins,
      singlesLosses: singlesPlayed - singlesWins,
      doublesPlayed,
      doublesWins,
      doublesLosses: doublesPlayed - doublesWins,
      totalPlayed,
      totalWins,
      winPercentage,
      matchesPlayed,
      matchPlayPercentage,
    };
  });
}
