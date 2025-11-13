import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM users`;
    return NextResponse.json({ success: true, userCount: result.rows[0].count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}