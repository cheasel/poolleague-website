import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Perform a lightweight query to keep the database connection pooler and database backend awake
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, message: 'Ping successful' });
  } catch (error: any) {
    console.error('Ping database error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
