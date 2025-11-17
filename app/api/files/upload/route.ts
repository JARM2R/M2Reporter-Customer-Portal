import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    // Verify user is authenticated
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
onBeforeGenerateToken: async (pathname, clientPayload) => {
  // Validate file type
  const allowedTypes = [
    'application/x-msdownload',
    'application/x-msi',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-msaccess',
    'application/vnd.ms-access',
  ];

  // You can add custom validation here
  return {
    allowedContentTypes: allowedTypes,
    maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
    allowOverwrite: true, // Changed from addRandomSuffix
  };
},

      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: Save file metadata to database
        console.log('Upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}