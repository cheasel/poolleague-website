import * as dotenv from 'dotenv';
import * as path from 'path';
import http from 'http';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testUrl(url: string): Promise<number> {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve(res.statusCode || 0);
      });
    }).on('error', () => {
      resolve(500);
    });
  });
}

async function main() {
  const { db } = await import("../src/db/index");
  const { players, teams } = await import("../src/db/schema");

  console.log("Fetching all players and teams from database...");
  const allPlayersList = await db.select({ id: players.id, name: players.name }).from(players);
  const allTeamsList = await db.select({ id: teams.id, name: teams.name }).from(teams);

  console.log(`Scanning ${allPlayersList.length} player profiles and ${allTeamsList.length} team profiles...\n`);

  let failCount = 0;

  for (const player of allPlayersList) {
    const url = `http://localhost:3000/players/${player.id}`;
    const status = await testUrl(url);
    if (status !== 200) {
      console.log(`❌ Player ID ${player.id} (${player.name}) failed with status ${status}`);
      failCount++;
    }
  }

  for (const team of allTeamsList) {
    const url = `http://localhost:3000/teams/${team.id}`;
    const status = await testUrl(url);
    if (status !== 200) {
      console.log(`❌ Team ID ${team.id} (${team.name}) failed with status ${status}`);
      failCount++;
    }
  }

  if (failCount === 0) {
    console.log("🎉 All player and team profiles scanned successfully with 200 OK!");
  } else {
    console.log(`\n⚠️ Finished scanning with ${failCount} failures.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
