import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load env variables
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from .env.local');
}

// Disable prefetch as it is not supported by Supabase's IPv4/PGBouncer setup in some cases
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });