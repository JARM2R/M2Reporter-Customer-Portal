import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all companies
    const result = await sql`
      SELECT
        id,
        company_name,
        account_status,
        created_at,
        updated_at
      FROM companies
      ORDER BY company_name
    `;

    return NextResponse.json({
      success: true,
      companies: result.rows
    });

  } catch (error) {
    console.error('List companies error:', error);
    return NextResponse.json({ error: 'Failed to list companies' }, { status: 500 });
  }
}
