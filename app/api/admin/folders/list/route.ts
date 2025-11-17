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
        fp.id,
        fp.folder_name,
        fp.folder_type,
        fp.blob_prefix,
        fp.company_id,
        c.company_name
      FROM file_permissions fp
      LEFT JOIN companies c ON fp.company_id = c.id
      ORDER BY 
        CASE fp.folder_type
          WHEN 'program_files' THEN 1
          WHEN 'shared' THEN 2
          WHEN 'company_specific' THEN 3
        END,
        fp.folder_name
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