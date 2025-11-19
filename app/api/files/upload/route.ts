import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
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
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB (increased from 100MB)
          allowOverwrite: true,
        };
      },

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: Save file metadata to database
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