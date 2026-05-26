import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { db } = await import("../src/db/index");
  const { players, teams } = await import("../src/db/schema");

  console.log("Checking image URLs...");
  const playersWithImages = await db.select({ id: players.id, name: players.name, imageUrl: players.imageUrl }).from(players);
  const teamsWithLogos = await db.select({ id: teams.id, name: teams.name, logoUrl: teams.logoUrl }).from(teams);
  
  const emptyPlayers = playersWithImages.filter(p => p.imageUrl !== null && p.imageUrl.trim() === "");
  const emptyTeams = teamsWithLogos.filter(t => t.logoUrl !== null && t.logoUrl.trim() === "");

  console.log(`Players with empty image URLs (""):`, emptyPlayers);
  console.log(`Teams with empty logo URLs (""):`, emptyTeams);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
