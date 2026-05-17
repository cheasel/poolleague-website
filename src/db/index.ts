import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is missing from environment variables');
}

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update. In production, this ensures that we don't exhaust the database connection limit.
 */
const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(connectionString || '', { 
  prepare: false,
  // Supabase pooler (Supavisor) works best with these settings
  ssl: 'require',
  max: 1, // High concurrency in serverless is handled by Vercel scaling, not local pooling
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });