import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is missing from environment variables (.env.local)');
  process.exit(1);
}

const client = postgres(connectionString, { ssl: 'require' });
const db = drizzle(client, { schema });

async function runBackup() {
  console.log('Initiating database backup from Supabase...');
  
  // Format timestamp for file name (e.g. 2026-06-09T03-15-00)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  
  // Ensure the backups directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFilePath = path.join(backupDir, `backup-${timestamp}.json`);
  
  console.log('Fetching table data...');
  
  const data = {
    metadata: {
      timestamp: new Date().toISOString(),
      schemaVersion: '1.0.0',
    },
    tables: {
      profiles: await db.select().from(schema.profiles),
      venues: await db.select().from(schema.venues),
      seasons: await db.select().from(schema.seasons),
      divisions: await db.select().from(schema.divisions),
      teams: await db.select().from(schema.teams),
      teamRegistrations: await db.select().from(schema.teamRegistrations),
      players: await db.select().from(schema.players),
      teamMemberships: await db.select().from(schema.teamMemberships),
      matches: await db.select().from(schema.matches),
      matchGames: await db.select().from(schema.matchGames),
    }
  };
  
  fs.writeFileSync(backupFilePath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`\n✅ Backup successfully created at:`);
  console.log(`   ${backupFilePath}`);
  console.log('\nExported records count:');
  Object.entries(data.tables).forEach(([tableName, rows]) => {
    console.log(`  - ${tableName}: ${rows.length} rows`);
  });
  
  await client.end();
}

runBackup().catch(async (error) => {
  console.error('❌ Backup failed:', error);
  await client.end();
  process.exit(1);
});
