// Simulate the round-robin generator algorithm with greedy home-balancing in Leg 1
// and reversed venues in Leg 2.
function simulate(numTeams) {
  const list = [];
  for (let i = 0; i < numTeams; i++) {
    list.push({ id: i + 1, name: `Team ${i + 1}` });
  }

  const roundsCount = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  const homeCounts1 = {};
  const awayCounts1 = {};
  const homeCounts2 = {};
  const awayCounts2 = {};

  for (let i = 1; i <= numTeams; i++) {
    homeCounts1[i] = 0;
    awayCounts1[i] = 0;
    homeCounts2[i] = 0;
    awayCounts2[i] = 0;
  }

  const singleLegRounds = roundsCount;

  for (let round = 0; round < singleLegRounds; round++) {
    for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
      const homeIdx = (round + matchIdx) % (numTeams - 1);
      let awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

      if (matchIdx === 0) {
        awayIdx = numTeams - 1;
      }

      const teamA = list[homeIdx];
      const teamB = list[awayIdx];

      // Alternating row default
      const defaultAIsHome = round % 2 === 0;

      // Greedy choice: who has fewer home games in Leg 1?
      let aIsHome1 = defaultAIsHome;
      if (homeCounts1[teamA.id] < homeCounts1[teamB.id]) {
        aIsHome1 = true;
      } else if (homeCounts1[teamB.id] < homeCounts1[teamA.id]) {
        aIsHome1 = false;
      }

      let homeTeamId1 = aIsHome1 ? teamA.id : teamB.id;
      let awayTeamId1 = aIsHome1 ? teamB.id : teamA.id;

      homeCounts1[homeTeamId1]++;
      awayCounts1[awayTeamId1]++;

      // Leg 2 is the exact reverse of Leg 1
      let homeTeamId2 = awayTeamId1;
      let awayTeamId2 = homeTeamId1;

      homeCounts2[homeTeamId2]++;
      awayCounts2[awayTeamId2]++;
    }
  }

  console.log(`=== Simulation for ${numTeams} teams ===`);
  console.log("Leg 1 (Home - Away):");
  for (let i = 1; i <= numTeams; i++) {
    console.log(`  Team ${i}: Home = ${homeCounts1[i]}, Away = ${awayCounts1[i]}`);
  }
  console.log("Leg 2 (Home - Away):");
  for (let i = 1; i <= numTeams; i++) {
    console.log(`  Team ${i}: Home = ${homeCounts2[i]}, Away = ${awayCounts2[i]}`);
  }
}

simulate(6);
simulate(8);
simulate(10);
simulate(12);
