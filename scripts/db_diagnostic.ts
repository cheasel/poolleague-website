import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
  console.log('Connecting to database...');
  
  // 1. Get database settings
  const settings = await sql`
    show statement_timeout;
  `;
  console.log('Current statement_timeout:', settings);

  // 1b. Get all roles configurations
  const roleSettings = await sql`
    SELECT rolname, rolconfig FROM pg_roles;
  `;
  console.log('Role settings:', roleSettings);

  // 1c. Get database/role specific settings
  const dbRoleSettings = await sql`
    SELECT r.rolname, d.datname, s.setconfig 
    FROM pg_db_role_setting s
    LEFT JOIN pg_roles r ON r.oid = s.setrole
    LEFT JOIN pg_database d ON d.oid = s.setdatabase;
  `;
  console.log('DB-Role-specific settings:', dbRoleSettings);

  // 2. Get connection statistics
  const connStats = await sql`
    select state, count(*) 
    from pg_stat_activity 
    group by state;
  `;
  console.log('Current connection states:', connStats);

  // 3. Get active locks/blocks
  const locks = await sql`
    select 
      blocked_locks.pid     as blocked_pid,
      blocked_activity.usename  as blocked_user,
      blocking_locks.pid    as blocking_pid,
      blocking_activity.usename as blocking_user,
      blocked_activity.query    as blocked_statement,
      blocking_activity.query   as blocking_statement
    from  pg_catalog.pg_locks         blocked_locks
    join pg_catalog.pg_stat_activity blocked_activity on blocked_activity.pid = blocked_locks.pid
    join pg_catalog.pg_locks         blocking_locks 
        on blocking_locks.locktype = blocked_locks.locktype
        and blocking_locks.database is not distinct from blocked_locks.database
        and blocking_locks.relation is not distinct from blocked_locks.relation
        and blocking_locks.page is not distinct from blocked_locks.page
        and blocking_locks.tuple is not distinct from blocked_locks.tuple
        and blocking_locks.virtualxid is not distinct from blocked_locks.virtualxid
        and blocking_locks.transactionid is not distinct from blocked_locks.transactionid
        and blocking_locks.classid is not distinct from blocked_locks.classid
        and blocking_locks.objid is not distinct from blocked_locks.objid
        and blocking_locks.objsubid is not distinct from blocked_locks.objsubid
        and blocking_locks.pid != blocked_locks.pid
    join pg_catalog.pg_stat_activity blocking_activity on blocking_activity.pid = blocking_locks.pid
    where not blocked_locks.granted;
  `;
  console.log('Blocked queries / locks:', locks);

  // 4. Check if seasons table can be queried from here
  console.log('Testing simple select from seasons...');
  const start = Date.now();
  const seasons = await sql`
    select id, name, is_active from seasons limit 1;
  `;
  console.log(`Success! seasons query completed in ${Date.now() - start}ms:`, seasons);

  await sql.end();
}

main().catch(async (err) => {
  console.error('❌ Diagnostic failed:', err);
  await sql.end();
  process.exit(1);
});
