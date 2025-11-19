import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check account status
    if (session.user.accountStatus !== 'active') {
      return NextResponse.json({ 
        error: 'Account access restricted. Please contact support.' 
      }, { status: 403 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Extract folder from pathname to check permissions
        // pathname format: "folder-prefix/filename.ext"
        const folderPrefix = pathname.substring(0, pathname.lastIndexOf('/') + 1);

        // Get folder information
        const folderCheck = await sql`
          SELECT fp.id, fp.folder_type, fp.company_id
          FROM file_permissions fp
          WHERE fp.blob_prefix = ${folderPrefix}
        `;

        if (folderCheck.rows.length === 0) {
          throw new Error('Invalid folder');
        }

        const folder = folderCheck.rows[0];

        // Permission check:
        // - Admins can upload anywhere
        // - Customers can only upload to company_specific folders (and it must be their company)
        const isAdmin = session.user.role === 'admin';
        const isOwnCompanyFolder = folder.folder_type === 'company_specific' && 
                                    folder.company_id === session.user.companyId;

        if (!isAdmin && !isOwnCompanyFolder) {
          throw new Error('You do not have permission to upload files to this folder');
        }

        // Comprehensive list of allowed file types
        const allowedTypes = [
          // Executables & Installers
          'application/x-msdownload',           // .exe
          'application/x-msdos-program',        // .exe
          'application/x-msi',                  // .msi
          'application/x-ms-installer',         // .msi
          
          // Database Files
          'application/x-msaccess',             // .mdb
          'application/vnd.ms-access',          // .mdb
          'application/msaccess',               // .mdb
          
          // PDF
          'application/pdf',                    // .pdf
          
          // Word Documents
          'application/msword',                 // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          
          // Excel Files
          'application/vnd.ms-excel',           // .xls
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          
          // CSV & Text
          'text/csv',                           // .csv
          'text/plain',                         // .txt
          'text/tab-separated-values',          // .tsv
          
          // Report Files
          'application/x-rpt',                  // .rpt
          
          // Archives
          'application/zip',                    // .zip
          'application/x-zip-compressed',       // .zip
          'application/x-rar-compressed',       // .rar
          'application/x-7z-compressed',        // .7z
          
          // Images (for documentation)
          'image/jpeg',                         // .jpg
          'image/png',                          // .png
          'image/gif',                          // .gif
          
          // Generic binary (fallback for .exe, .msi, .rpt, etc.)
          'application/octet-stream',           // Generic binary
        ];

        return {
          allowedContentTypes: allowedTypes,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
          allowOverwrite: true,
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
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
            ${request.headers.get('x-forwarded-for') || 'unknown'},
            ${request.headers.get('user-agent') || 'unknown'}
          )
        `;
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}