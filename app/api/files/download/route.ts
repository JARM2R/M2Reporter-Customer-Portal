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

    // Check account status
    if (session.user.accountStatus === 'suspended' || session.user.accountStatus === 'past_due') {
      return NextResponse.json({
        error: 'Account access restricted. Please contact support.'
      }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL required' }, { status: 400 });
    }

    // Extract blob path from URL
    const blobPath = fileUrl.split('/').slice(-2).join('/');

    // Verify user has access to this file path
    const accessCheck = await sql`
      SELECT fp.id, fp.folder_name
      FROM file_permissions fp
      WHERE (
        fp.folder_type IN ('shared', 'program_files')
        OR fp.company_id = ${session.user.companyId}
      )
      AND ${blobPath} LIKE fp.blob_prefix || '%'
    `;

    if (accessCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Access denied to this file' }, { status: 403 });
    }

    // Audit log
    await sql`
      INSERT INTO audit_log (
        user_id,
        action,
        resource_type,
        resource_id,
        ip_address,
        user_agent
      )
      VALUES (
        ${session.user.id},
        'FILE_DOWNLOADED',
        'file',
        ${fileUrl},
        ${req.headers.get('x-forwarded-for') || 'unknown'},
        ${req.headers.get('user-agent') || 'unknown'}
      )
    `;

    // Fetch file from Vercel Blob
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Stream file to user
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment',
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
