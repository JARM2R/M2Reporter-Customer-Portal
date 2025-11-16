import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify user is authenticated
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderId, folderType, filename, url, size } = await request.json();

    // Validate required fields
    if (!folderId || !filename || !url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user has access to this folder
    const folderCheck = await sql`
      SELECT f.id, f.folder_type, f.company_id
      FROM folders f
      WHERE f.id = ${folderId}
    `;

    if (folderCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    const folder = folderCheck.rows[0];

    // Check permissions
    const canUpload =
      session.user.accountStatus === 'active' &&
      (session.user.role === 'admin' ||
        folder.folder_type !== 'program_files') &&
      (session.user.role === 'admin' ||
        folder.company_id === session.user.companyId);

    if (!canUpload) {
      return NextResponse.json(
        { error: 'You do not have permission to upload to this folder' },
        { status: 403 }
      );
    }

    // Save file metadata to database
    await sql`
      INSERT INTO files (folder_id, filename, url, size, uploaded_at)
      VALUES (${folderId}, ${filename}, ${url}, ${size}, NOW())
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to save file metadata' },
      { status: 500 }
    );
  }
}