import { db } from './index'; // You'll need to export your db connection
import * as schema from './schema';

async function main() {
  console.log('--- Seeding Database ---');

  // 1. Create a Season
  const [season] = await db.insert(schema.seasons).values({
    name: 'Inaugural Season 2026',
    isActive: true,
  }).returning();

  // 2. Create Divisions
  const [premier] = await db.insert(schema.divisions).values({
    name: 'Premier Division',
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

  console.log('--- Seeding Complete! ---');
}

main().catch((err) => {
  console.error('Seeding failed');
  console.error(err);
  process.exit(1);
});