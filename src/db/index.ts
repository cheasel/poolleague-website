import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { revalidateTag } from 'next/cache';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is missing from environment variables');
}

/**
 * Cache the database connection. This avoids creating a new connection on every HMR
 * update in development, and ensures that we don't leak or exhaust database connections
 * in production environments.
 */
const globalForDb = global as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(connectionString || '', { 
  prepare: false,
  // Supabase pooler (Supavisor) works best with these settings
  ssl: 'require',
  max: Number(process.env.DATABASE_POOL_SIZE || 10), // Allow concurrency to prevent client queue blocking and deadlocks
  idle_timeout: 20,
  connect_timeout: 10,
  // NOTE: statement_timeout cannot be set here — Supavisor (port 6543) strips all
  // client-side session parameters. Timeout is enforced at the Postgres role level:
  // ALTER ROLE postgres SET statement_timeout = '15s';
});

globalForDb.conn = conn;

const rawDb = drizzle(conn, { schema });

// Tag-based cache invalidation helper
function invalidatePublicCaches() {
  const tags = [
    "seasons",
    "divisions",
    "matches",
    "teams",
    "players",
    "matchGames",
    "player-profile",
    "player-games",
    "team-profile"
  ];
  tags.forEach(tag => {
    try {
      revalidateTag(tag);
    } catch (e) {
      // Ignore errors when called during build/prerender or other environments
    }
  });
}

function wrapBuilder(builder: any) {
  return new Proxy(builder, {
    get(bTarget, bProp, bReceiver) {
      const bValue = Reflect.get(bTarget, bProp, bReceiver);
      if (bProp === 'then') {
        return function (onfulfilled?: Function, onrejected?: Function) {
          return bValue.call(bTarget, (res: any) => {
            invalidatePublicCaches();
            return onfulfilled ? onfulfilled(res) : res;
          }, onrejected);
        };
      }
      if (bProp === 'execute') {
        return async function (...args: any[]) {
          const res = await (bValue as Function).apply(bTarget, args);
          invalidatePublicCaches();
          return res;
        };
      }
      if (typeof bValue === 'function') {
        return bValue.bind(bTarget);
      }
      return bValue;
    }
  });
}

// Proxied Drizzle DB client to automatically trigger cache invalidation on write mutations
export const db = new Proxy(rawDb, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);

    if (prop === 'insert' || prop === 'update' || prop === 'delete') {
      return function (...args: any[]) {
        const builder = (value as Function).apply(target, args);
        return wrapBuilder(builder);
      };
    }

    if (prop === 'transaction') {
      return async function (transactionCallback: Function, ...args: any[]) {
        const wrappedCallback = async (tx: any) => {
          const proxiedTx = new Proxy(tx, {
            get(tTarget, tProp, tReceiver) {
              const tValue = Reflect.get(tTarget, tProp, tReceiver);
              if (typeof tValue === 'function') {
                return tValue.bind(tTarget);
              }
              return tValue;
            }
          });
          return transactionCallback(proxiedTx);
        };
        const res = await (value as Function).call(target, wrappedCallback, ...args);
        invalidatePublicCaches();
        return res;
      };
    }

    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
}) as typeof rawDb;