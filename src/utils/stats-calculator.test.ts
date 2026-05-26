import test, { describe } from "node:test";
import assert from "node:assert";
import {
  calculateTeamStats,
  calculatePlayerStats,
  calculateRosterStats,
  RawTeam,
  RawMatch,
  RawGame,
  RawPlayer,
  PlayerGame,
  RosterPlayer,
  RosterGame,
} from "./stats-calculator.js";

describe("Stats Calculator Utilities", () => {
  // Test calculateTeamStats
  test("should correctly aggregate team stats for singles, doubles, and overall metrics", () => {
    const mockTeams: RawTeam[] = [
      { id: 1, name: "Team Dragons", logoUrl: null },
      { id: 2, name: "Team Tigers", logoUrl: null },
    ];

    const mockMatches: RawMatch[] = [
      { id: 101, homeTeamId: 1, awayTeamId: 2 },
    ];

    const mockGames: RawGame[] = [
      // Game 1: Singles - Home Wins (Dragons win, Tigers lose)
      { matchId: 101, gameType: "single", player1Score: 1, player2Score: 0 },
      // Game 2: Doubles - Away Wins (Tigers win, Dragons lose)
      { matchId: 101, gameType: "double", player1Score: 0, player2Score: 1 },
    ];

    const results = calculateTeamStats(mockTeams, mockMatches, mockGames);

    const dragons = results.find((r) => r.id === 1);
    const tigers = results.find((r) => r.id === 2);

    assert.ok(dragons);
    assert.strictEqual(dragons.singlePlay, 1);
    assert.strictEqual(dragons.singleWin, 1);
    assert.strictEqual(dragons.singleLost, 0);
    assert.strictEqual(dragons.singlePct, "100.0");
    assert.strictEqual(dragons.doublePlay, 1);
    assert.strictEqual(dragons.doubleWin, 0);
    assert.strictEqual(dragons.doubleLost, 1);
    assert.strictEqual(dragons.doublePct, "0.0");
    assert.strictEqual(dragons.totalPlay, 2);
    assert.strictEqual(dragons.totalWin, 1);
    assert.strictEqual(dragons.totalLost, 1);
    assert.strictEqual(dragons.totalPct, "50.0");

    assert.ok(tigers);
    assert.strictEqual(tigers.singlePlay, 1);
    assert.strictEqual(tigers.singleWin, 0);
    assert.strictEqual(tigers.singleLost, 1);
    assert.strictEqual(tigers.singlePct, "0.0");
    assert.strictEqual(tigers.doublePlay, 1);
    assert.strictEqual(tigers.doubleWin, 1);
    assert.strictEqual(tigers.doubleLost, 0);
    assert.strictEqual(tigers.doublePct, "100.0");
    assert.strictEqual(tigers.totalPlay, 2);
    assert.strictEqual(tigers.totalWin, 1);
    assert.strictEqual(tigers.totalLost, 1);
    assert.strictEqual(tigers.totalPct, "50.0");
  });

  // Test calculatePlayerStats
  test("should correctly aggregate player stats and handle attendance ratios", () => {
    const mockPlayers: RawPlayer[] = [
      { id: 10, name: "Alice", imageUrl: null, teamId: 1, teamName: "Team Dragons" },
      { id: 20, name: "Bob", imageUrl: null, teamId: 2, teamName: "Team Tigers" },
    ];

    const teamMatchCountMap = { 1: 3, 2: 3 };
    const teamTotalFramesMap = { 1: 15, 2: 15 };
    const completedMatchIds = [101, 102];

    const mockGames: PlayerGame[] = [
      // Game 1: Match 101, Single: Alice vs Bob, Alice wins
      {
        matchId: 101,
        gameType: "single",
        player1Id: 10,
        player2Id: 20,
        player1PartnerId: null,
        player2PartnerId: null,
        player1Score: 1,
        player2Score: 0,
      },
      // Game 2: Match 102, Double: Alice & Partner vs Bob & Partner, Bob wins
      {
        matchId: 102,
        gameType: "double",
        player1Id: 10,
        player2Id: 20,
        player1PartnerId: 11,
        player2PartnerId: 21,
        player1Score: 0,
        player2Score: 1,
      },
    ];

    const results = calculatePlayerStats(
      mockPlayers,
      teamMatchCountMap,
      teamTotalFramesMap,
      completedMatchIds,
      mockGames
    );

    const alice = results.find((p) => p.id === 10);
    const bob = results.find((p) => p.id === 20);

    assert.ok(alice);
    assert.strictEqual(alice.singlePlay, 1);
    assert.strictEqual(alice.singleWin, 1);
    assert.strictEqual(alice.singlePct, "100.0");
    assert.strictEqual(alice.doublePlay, 1);
    assert.strictEqual(alice.doubleWin, 0);
    assert.strictEqual(alice.doublePct, "0.0");
    assert.strictEqual(alice.totalPlay, 2);
    assert.strictEqual(alice.totalWin, 1);
    assert.strictEqual(alice.totalPct, "50.0");
    assert.strictEqual(alice.maxTeamMatches, 3);
    assert.strictEqual(alice.matchPlay, 2); // Played in match 101 and 102

    assert.ok(bob);
    assert.strictEqual(bob.singlePlay, 1);
    assert.strictEqual(bob.singleWin, 0);
    assert.strictEqual(bob.singlePct, "0.0");
    assert.strictEqual(bob.doublePlay, 1);
    assert.strictEqual(bob.doubleWin, 1);
    assert.strictEqual(bob.doublePct, "100.0");
    assert.strictEqual(bob.totalPlay, 2);
    assert.strictEqual(bob.totalWin, 1);
    assert.strictEqual(bob.totalPct, "50.0");
    assert.strictEqual(bob.matchPlay, 2);
  });

  // Test calculateRosterStats
  test("should calculate roster player statistics and match play percentages for a single team roster", () => {
    const mockRoster: RosterPlayer[] = [
      { id: 10, name: "Alice", imageUrl: null },
    ];

    const completedTeamMatchIds = new Set([101, 102]);

    const mockGames: RosterGame[] = [
      // Game 1: Alice plays home single and wins
      {
        matchId: 101,
        gameType: "single",
        player1Id: 10,
        player2Id: 20,
        player1PartnerId: null,
        player2PartnerId: null,
        player1Score: 1,
        player2Score: 0,
      },
    ];

    const results = calculateRosterStats(
      mockRoster,
      mockGames,
      completedTeamMatchIds
    );

    const alice = results.find((p) => p.id === 10);

    assert.ok(alice);
    assert.strictEqual(alice.singlesPlayed, 1);
    assert.strictEqual(alice.singlesWins, 1);
    assert.strictEqual(alice.singlesLosses, 0);
    assert.strictEqual(alice.doublesPlayed, 0);
    assert.strictEqual(alice.totalPlayed, 1);
    assert.strictEqual(alice.totalWins, 1);
    assert.strictEqual(alice.winPercentage, "100.0");
    assert.strictEqual(alice.matchesPlayed, 1); // Only played in match 101, missed 102
    assert.strictEqual(alice.matchPlayPercentage, "50.0"); // 1 out of 2 completed matches
  });
});
