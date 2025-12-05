import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { list } from '@vercel/blob';
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
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }

    // Get folder details - admins can access any folder
    const isAdmin = session.user.role === 'admin';

    console.log('Auth debug:', {
      userId: session.user.id,
      role: session.user.role,
      isAdmin,
      companyId: session.user.companyId,
      requestedFolderId: folderId
    });

    let folderResult;
    if (isAdmin) {
      // Admins can access any folder
      folderResult = await sql`
        SELECT fp.*, c.company_name
        FROM file_permissions fp
        LEFT JOIN companies c ON fp.company_id = c.id
        WHERE fp.id = ${folderId}
      `;
    } else {
      // Non-admins can only access shared, program_files, or their company's folders
      folderResult = await sql`
        SELECT fp.*, c.company_name
        FROM file_permissions fp
        LEFT JOIN companies c ON fp.company_id = c.id
        WHERE fp.id = ${folderId}
        AND (
          fp.folder_type IN ('shared', 'program_files')
          OR fp.company_id = ${session.user.companyId}
        )
      `;
    }

    if (folderResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Access denied',
        debug: {
          role: session.user.role,
          isAdmin,
          companyId: session.user.companyId,
          requestedFolderId: folderId
        }
      }, { status: 403 });
    }

    const folder = folderResult.rows[0];

    // List files from Vercel Blob
    const { blobs } = await list({
      prefix: folder.blob_prefix,
      limit: 1000
    });

    // Debug logging
    console.log('File list debug:', {
      folderId,
      folderName: folder.folder_name,
      blobPrefix: folder.blob_prefix,
      totalBlobs: blobs.length,
      blobPaths: blobs.map(b => b.pathname)
    });

    // Filter to only include files directly in this folder (not in subfolders)
    const filesInThisFolder = blobs.filter(blob => {
      // Remove the folder prefix from the blob pathname
      const relativePath = blob.pathname.replace(folder.blob_prefix, '');

      // If there are any "/" characters in the relative path, it's in a subfolder
      // We only want files directly in this folder
      return relativePath && !relativePath.includes('/');
    });

    // Format file list
    const files = filesInThisFolder.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      filename: blob.pathname.split('/').pop()
    }));

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.folder_name,
        type: folder.folder_type,
        companyName: folder.company_name,
        blobPrefix: folder.blob_prefix
      },
      files,
      debug: {
        totalBlobsFound: blobs.length,
        blobPaths: blobs.slice(0, 10).map(b => b.pathname),
        filteredCount: filesInThisFolder.length
      }
    });

  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}