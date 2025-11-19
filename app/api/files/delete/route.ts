import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { del } from '@vercel/blob';
import { sql } from '@vercel/postgres';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'File URL required' },
        { status: 400 }
      );
    }

    // Extract blob path from URL to determine which folder it belongs to
    const urlParts = url.split('/');
    const domainIndex = urlParts.findIndex(part => part.includes('blob.vercel-storage.com'));
    const blobPath = domainIndex !== -1 ? urlParts.slice(domainIndex + 1).join('/') : url.split('/').pop() || '';

    // Get folder information for this file
    const folderCheck = await sql`
      SELECT fp.id, fp.folder_type, fp.company_id
      FROM file_permissions fp
      WHERE ${blobPath} LIKE fp.blob_prefix || '%'
      ORDER BY length(fp.blob_prefix) DESC
      LIMIT 1
    `;

    if (folderCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Could not determine file location' },
        { status: 400 }
      );
    }

    const folder = folderCheck.rows[0];

    // Permission check:
    // - Admins can delete anywhere
    // - Customers can only delete in their company-specific folders
    const isAdmin = session.user.role === 'admin';
    const isOwnCompanyFolder = folder.folder_type === 'company_specific' && 
                                folder.company_id === session.user.companyId;

    if (!isAdmin && !isOwnCompanyFolder) {
      return NextResponse.json(
        { error: 'You do not have permission to delete files in this folder' },
        { status: 403 }
      );
    }

    // Delete file from Vercel Blob
    await del(url);

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
        'FILE_DELETED',
        'file',
        ${url},
        ${request.headers.get('x-forwarded-for') || 'unknown'},
        ${request.headers.get('user-agent') || 'unknown'}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}