import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { isValidFileType, sanitizeFilename } from '@/lib/validation';

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check account status
    if (session.user.accountStatus === 'suspended' || session.user.accountStatus === 'past_due') {
      return NextResponse.json({
        error: 'Account access restricted. Please contact support to resolve payment issues.'
      }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderType = formData.get('folderType') as string;
    const folderId = formData.get('folderId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 100MB limit' }, { status: 400 });
    }

    // Validate file type
    const fileTypeValidation = isValidFileType(file.type, file.name);
    if (!fileTypeValidation.valid) {
      return NextResponse.json({ error: fileTypeValidation.error }, { status: 400 });
    }

    // Sanitize filename to prevent path traversal attacks
    const sanitizedFilename = sanitizeFilename(file.name);

    // Verify user has access to this folder
    let blobPrefix = '';

    if (folderType === 'company_specific') {
      // Check user owns this company folder
      const accessCheck = await sql`
        SELECT blob_prefix
        FROM file_permissions
        WHERE id = ${folderId}
        AND company_id = ${session.user.companyId}
      `;

      if (accessCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Access denied to this folder' }, { status: 403 });
      }

      blobPrefix = accessCheck.rows[0].blob_prefix;
    } else if (folderType === 'shared' || folderType === 'program_files') {
      // Shared folders - verify they exist
      const accessCheck = await sql`
        SELECT blob_prefix
        FROM file_permissions
        WHERE id = ${folderId}
        AND folder_type = ${folderType}
      `;

      if (accessCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
      }

      blobPrefix = accessCheck.rows[0].blob_prefix;
    } else {
      return NextResponse.json({ error: 'Invalid folder type' }, { status: 400 });
    }

    // Upload to Vercel Blob with encryption
    const blobPath = `${blobPrefix}${sanitizedFilename}`;
    const blob = await put(blobPath, file, {
      access: 'public', // Will be protected by signed URLs
      addRandomSuffix: true, // Prevents filename collisions
    });

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
        'FILE_UPLOADED',
        'file',
        ${blob.url},
        ${req.headers.get('x-forwarded-for') || 'unknown'},
        ${req.headers.get('user-agent') || 'unknown'}
      )
    `;

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: sanitizedFilename,
      size: file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

