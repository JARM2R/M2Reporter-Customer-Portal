import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { list, del } from '@vercel/blob';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderId } = await req.json();

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // Get folder info
    const folderInfo = await sql`
      SELECT folder_name, blob_prefix FROM file_permissions WHERE id = ${folderId}
    `;

    if (folderInfo.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const folder = folderInfo.rows[0];

    // Delete all files in this folder from Vercel Blob
    try {
      const { blobs } = await list({
        prefix: folder.blob_prefix,
        limit: 1000
      });

      // Delete each file
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch (blobError) {
      console.error('Error deleting blob files:', blobError);
      // Continue with folder deletion even if blob cleanup fails
    }

    // Delete folder from database
    await sql`
      DELETE FROM file_permissions WHERE id = ${folderId}
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (user_id, action, resource_type, resource_id)
      VALUES (${session.user.id}, 'FOLDER_DELETED', 'folder', ${folder.folder_name})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
