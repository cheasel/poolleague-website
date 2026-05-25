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

  console.log('Altering role statement_timeouts to 30s...');
  
  await sql`ALTER ROLE anon SET statement_timeout = '30s';`;
  await sql`ALTER ROLE authenticated SET statement_timeout = '30s';`;
  await sql`ALTER ROLE authenticator SET statement_timeout = '30s';`;

  console.log('Verifying settings...');
  const roleSettings = await sql`
    SELECT rolname, rolconfig FROM pg_roles 
    WHERE rolname IN ('anon', 'authenticated', 'authenticator');
  `;
  console.log('New role settings:', roleSettings);

  console.log('✅ Timeouts successfully increased to 30s!');
  await sql.end();
}

main().catch(async (err) => {
  console.error('❌ Script failed:', err);
  await sql.end();
  process.exit(1);
});
