import { db } from './index'; // You'll need to export your db connection
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load env variables for local seeding
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("Emptying existing data...");
  // Clear tables sequentially using delete to avoid pooler issues with TRUNCATE
  await db.delete(schema.matchGames);
  await db.delete(schema.matches);
  await db.delete(schema.teamMemberships);
  await db.delete(schema.teamRegistrations);
  await db.delete(schema.players);
  await db.delete(schema.teams);
  await db.delete(schema.divisions);
  await db.delete(schema.seasons);
  await db.delete(schema.venues);

  console.log("Seeding new data...");
  console.log('--- Seeding Database ---');

  // 1. Create a Season
  const [season] = await db.insert(schema.seasons).values({
    name: 'Inaugural Season 2026',
    isActive: true,
  }).returning();

  // 2. Create Divisions
  const [premier] = await db.insert(schema.divisions).values({
    name: 'Premier Division',
    seasonId: season.id,
    tier: 1,
  }).returning();

  // 3. Create a Venue
  const [venue] = await db.insert(schema.venues).values({
    name: 'The Crucible Club',
    address: '123 Snooker Lane',
  }).returning();

  // 4. Create Teams
  const [teamA] = await db.insert(schema.teams).values({
    name: 'Rocket Snooker',
    homeVenueId: venue.id,
  }).returning();

  const [teamB] = await db.insert(schema.teams).values({
    name: 'Juddernauts',
    homeVenueId: venue.id,
  }).returning();

  // 5. Register Teams to Season and Division
  console.log("Registering teams to division...");
  await db.insert(schema.teamRegistrations).values([
    { teamId: teamA.id, seasonId: season.id, divisionId: premier.id },
    { teamId: teamB.id, seasonId: season.id, divisionId: premier.id },
  ]);

  // 6. Create Players
  console.log("Seeding players...");
  const [playerA] = await db.insert(schema.players).values({
    name: "Ronnie O'Sullivan",
  }).returning();

  const [playerB] = await db.insert(schema.players).values({
    name: "Judd Trump",
  }).returning();

  // 7. Assign players to team rosters (Memberships)
  console.log("Assigning players to memberships...");
  await db.insert(schema.teamMemberships).values([
    {
      playerId: playerA.id,
      teamId: teamA.id,
      seasonId: season.id,
      divisionId: premier.id,
      isCaptain: false,
    },
    {
      playerId: playerB.id,
      teamId: teamB.id,
      seasonId: season.id,
      divisionId: premier.id,
      isCaptain: false,
    },
  ]);

  console.log('--- Seeding Complete! ---');
}

main().catch((err) => {
  console.error('Seeding failed');
  console.error(err);
  process.exit(1);
});