import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is missing from environment variables');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
  console.log('Connecting to database...');
  
  // 1. Create the function
  console.log('Creating public.handle_new_user() function...');
  await sql`
    create or replace function public.handle_new_user()
    returns trigger as $$
    begin
      insert into public.profiles (id, email, role)
      values (new.id, new.email, 'viewer');
      return new;
    end;
    $$ language plpgsql security definer;
  `;
  
  // 2. Create the trigger
  console.log('Creating trigger on_auth_user_created...');
  await sql`
    drop trigger if exists on_auth_user_created on auth.users;
  `;
  await sql`
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  `;
  
  // 3. Sync existing users
  console.log('Syncing existing users to public.profiles...');
  await sql`
    insert into public.profiles (id, email, role)
    select id, email, 'viewer'
    from auth.users
    where id not in (select id from public.profiles)
    on conflict (id) do nothing;
  `;

  console.log('✅ Trigger setup and user sync completed successfully!');
  await sql.end();
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
