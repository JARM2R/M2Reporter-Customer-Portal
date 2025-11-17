import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.is_activated,
        u.created_at,
        u.last_login,
        c.id as company_id,
        c.company_name,
        c.account_status
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY u.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}