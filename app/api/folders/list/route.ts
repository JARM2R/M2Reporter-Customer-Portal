import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get folders user has access to
    // Includes shared folders and company-specific folders
    const result = await sql`
      SELECT
        id,
        folder_name,
        folder_type,
        blob_prefix
      FROM file_permissions
      WHERE
        folder_type IN ('shared', 'program_files')
        OR company_id = ${session.user.companyId}
      ORDER BY
        CASE folder_type
          WHEN 'program_files' THEN 1
          WHEN 'shared' THEN 2
          WHEN 'company_specific' THEN 3
        END,
        folder_name
    `;

    return NextResponse.json({
      success: true,
      folders: result.rows
    });

  } catch (error) {
    console.error('List folders error:', error);
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 });
  }
}
