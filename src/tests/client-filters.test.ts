import { test, describe } from "node:test";
import assert from "node:assert";

// Pure replication of client-side filtering logic to assert algorithmic correctness
function filterPlayers(
  players: any[],
  searchQuery: string,
  teamFilter: string
) {
  return players.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = 
      teamFilter === "all" ||
      (teamFilter === "free-agent" && !player.teamId) ||
      (player.teamId !== null && player.teamId.toString() === teamFilter);
    return matchesSearch && matchesTeam;
  });
}

function filterVenues(venues: any[], searchQuery: string) {
  return venues.filter((v) => {
    const nameMatch = v.name.toLowerCase().includes(searchQuery.toLowerCase());
    const addressMatch = (v.address || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || addressMatch;
  });
}

function filterMatches(
  matches: any[],
  searchQuery: string,
  activeTab: 'fixtures' | 'results',
  selectedSeasonId: string,
  selectedDivisionId: string
) {
  return matches.filter((match) => {
    const homeName = match.homeTeam?.name || 'Unknown Team';
    const awayName = match.awayTeam?.name || 'Unknown Team';
    
    const matchesSearch = 
      homeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      awayName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedSeasonId !== "all" && match.seasonId?.toString() !== selectedSeasonId) return false;
    if (selectedDivisionId !== "all" && match.divisionId?.toString() !== selectedDivisionId) return false;

    if (activeTab === 'fixtures') {
      return match.status !== 'completed';
    } else {
      return match.status === 'completed';
    }
  });
}

describe("Client-Side Filtering Logic", () => {
  const mockPlayers = [
    { id: 1, name: "Ronnie O'Sullivan", teamId: 10 },
    { id: 2, name: "Judd Trump", teamId: 10 },
    { id: 3, name: "Mark Selby", teamId: 20 },
    { id: 4, name: "Jimmy White", teamId: null }, // Free Agent
  ];

  const mockVenues = [
    { id: 1, name: "Crucible Club", address: "123 Snooker St" },
    { id: 2, name: "Rack & Cue Arena", address: "456 Pocket Rd" },
    { id: 3, name: "Corner Pub", address: null },
  ];

  const mockMatches = [
    { 
      id: 1, 
      status: "scheduled", 
      seasonId: 5, 
      divisionId: 50,
      homeTeam: { name: "Crucible Club" },
      awayTeam: { name: "Rack Packers" }
    },
    { 
      id: 2, 
      status: "completed", 
      seasonId: 5, 
      divisionId: 60,
      homeTeam: { name: "Cue Masters" },
      awayTeam: { name: "Crucible Club" }
    },
    { 
      id: 3, 
      status: "completed", 
      seasonId: 6, 
      divisionId: 50,
      homeTeam: { name: "Rack Packers" },
      awayTeam: { name: "Cue Masters" }
    }
  ];

  test("should filter players by name (case-insensitive search)", () => {
    const res = filterPlayers(mockPlayers, "judd", "all");
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].name, "Judd Trump");

    const res2 = filterPlayers(mockPlayers, "O'SULLIVAN", "all");
    assert.strictEqual(res2.length, 1);
    assert.strictEqual(res2[0].name, "Ronnie O'Sullivan");
  });

  test("should filter players by team affiliation", () => {
    const res = filterPlayers(mockPlayers, "", "10");
    assert.strictEqual(res.length, 2);
    assert.strictEqual(res.some(p => p.name === "Ronnie O'Sullivan"), true);
    assert.strictEqual(res.some(p => p.name === "Judd Trump"), true);
  });

  test("should filter players by Free Agent status", () => {
    const res = filterPlayers(mockPlayers, "", "free-agent");
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].name, "Jimmy White");
  });

  test("should filter venues by name or address", () => {
    const resName = filterVenues(mockVenues, "rack");
    assert.strictEqual(resName.length, 1);
    assert.strictEqual(resName[0].name, "Rack & Cue Arena");

    const resAddr = filterVenues(mockVenues, "Snooker");
    assert.strictEqual(resAddr.length, 1);
    assert.strictEqual(resAddr[0].name, "Crucible Club");
  });

  test("should filter matches by active tab (fixtures vs results)", () => {
    const fixtures = filterMatches(mockMatches, "", "fixtures", "all", "all");
    assert.strictEqual(fixtures.length, 1);
    assert.strictEqual(fixtures[0].id, 1);

    const results = filterMatches(mockMatches, "", "results", "all", "all");
    assert.strictEqual(results.length, 2);
    assert.strictEqual(results.some(m => m.id === 2), true);
    assert.strictEqual(results.some(m => m.id === 3), true);
  });

  test("should filter matches by season and division parameters", () => {
    const res = filterMatches(mockMatches, "", "results", "5", "60");
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].id, 2);
  });
});
