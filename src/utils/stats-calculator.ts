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

interface TeamAccumulator {
  id: number;
  name: string;
  logoUrl: string | null;
  singlePlay: number;
  singleWin: number;
  singleLost: number;
  doublePlay: number;
  doubleWin: number;
  doubleLost: number;
}

interface PlayerAccumulator {
  id: number;
  name: string;
  imageUrl: string | null;
  teamName: string;
  maxTeamMatches: number;
  maxTeamFrames: number;
  matchPlayGames: Set<number>;
  framePlay: number;
  singlePlay: number;
  singleWin: number;
  singleLost: number;
  singlePct: string;
  doublePlay: number;
  doubleWin: number;
  doubleLost: number;
  doublePct: string;
  totalPlay: number;
  totalWin: number;
  totalLost: number;
  totalPct: string;
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
  }, {} as Record<number, TeamAccumulator>);

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

  return Object.values(statsMap).map((t: TeamAccumulator) => {
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
  }, {} as Record<number, PlayerAccumulator>);

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

  return Object.values(statsMap).map((p: PlayerAccumulator) => {
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
  // 1. Initialize stats registry for roster players for O(1) lookups
  const playerStatsMap = new Map<number, {
    singlesPlayed: number;
    singlesWins: number;
    doublesPlayed: number;
    doublesWins: number;
    playedMatchIds: Set<number>;
  }>();

  roster.forEach((player) => {
    playerStatsMap.set(player.id, {
      singlesPlayed: 0,
      singlesWins: 0,
      doublesPlayed: 0,
      doublesWins: 0,
      playedMatchIds: new Set<number>(),
    });
  });

  const teamTotalMatches = completedTeamMatchIds.size;

  // 2. Iterate through allGames exactly once - O(G)
  allGames.forEach((game) => {
    if (!game.matchId) return;
    // Only count frames from completed matches to avoid inflating stats with live/scheduled data
    if (!completedTeamMatchIds.has(game.matchId)) return;

    // Retrieve stats records for participating players if they belong to the roster
    const p1 = game.player1Id ? playerStatsMap.get(game.player1Id) : null;
    const p1Partner = game.player1PartnerId ? playerStatsMap.get(game.player1PartnerId) : null;
    const p2 = game.player2Id ? playerStatsMap.get(game.player2Id) : null;
    const p2Partner = game.player2PartnerId ? playerStatsMap.get(game.player2PartnerId) : null;

    // Short-circuit if none of the players in this game belong to the target roster
    if (!p1 && !p1Partner && !p2 && !p2Partner) return;

    const isDouble = game.gameType === 'double';
    const p1Score = Number(game.player1Score || 0);
    const p2Score = Number(game.player2Score || 0);
    const isHomeWin = p1Score > p2Score;
    const isAwayWin = p2Score > p1Score;

    // Home roster players update
    if (p1) {
      p1.playedMatchIds.add(game.matchId);
      if (isDouble) {
        p1.doublesPlayed++;
        if (isHomeWin) p1.doublesWins++;
      } else {
        p1.singlesPlayed++;
        if (isHomeWin) p1.singlesWins++;
      }
    }
    if (p1Partner) {
      p1Partner.playedMatchIds.add(game.matchId);
      if (isDouble) {
        p1Partner.doublesPlayed++;
        if (isHomeWin) p1Partner.doublesWins++;
      } else {
        p1Partner.singlesPlayed++;
        if (isHomeWin) p1Partner.singlesWins++;
      }
    }

    // Away roster players update
    if (p2) {
      p2.playedMatchIds.add(game.matchId);
      if (isDouble) {
        p2.doublesPlayed++;
        if (isAwayWin) p2.doublesWins++;
      } else {
        p2.singlesPlayed++;
        if (isAwayWin) p2.singlesWins++;
      }
    }
    if (p2Partner) {
      p2Partner.playedMatchIds.add(game.matchId);
      if (isDouble) {
        p2Partner.doublesPlayed++;
        if (isAwayWin) p2Partner.doublesWins++;
      } else {
        p2Partner.singlesPlayed++;
        if (isAwayWin) p2Partner.singlesWins++;
      }
    }
  });

  // 3. Map over roster to calculate percentages and construct response - O(R)
  return roster.map((player) => {
    const stats = playerStatsMap.get(player.id)!;
    const singlesPlayed = stats.singlesPlayed;
    const singlesWins = stats.singlesWins;
    const doublesPlayed = stats.doublesPlayed;
    const doublesWins = stats.doublesWins;
    const totalPlayed = singlesPlayed + doublesPlayed;
    const totalWins = singlesWins + doublesWins;

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
      winPercentage: totalPlayed > 0 ? ((totalWins / totalPlayed) * 100).toFixed(1) : "0.0",
      matchesPlayed: stats.playedMatchIds.size,
      matchPlayPercentage: teamTotalMatches > 0 ? ((stats.playedMatchIds.size / teamTotalMatches) * 100).toFixed(1) : "0.0",
    };
  });
}
