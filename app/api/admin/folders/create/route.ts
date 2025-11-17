import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderName, folderType, companyId } = await req.json();

    // Validate required fields
    if (!folderName || !folderType) {
      return NextResponse.json({ 
        error: 'Folder name and type are required' 
      }, { status: 400 });
    }

    // Validate folder type
    if (!['program_files', 'shared', 'company_specific'].includes(folderType)) {
      return NextResponse.json({ 
        error: 'Invalid folder type' 
      }, { status: 400 });
    }

    // If company_specific, companyId is required
    if (folderType === 'company_specific' && !companyId) {
      return NextResponse.json({ 
        error: 'Company is required for company-specific folders' 
      }, { status: 400 });
    }

    // Generate blob prefix based on folder type
    let blobPrefix = '';
    if (folderType === 'program_files') {
      blobPrefix = 'program-files/';
    } else if (folderType === 'shared') {
      blobPrefix = 'shared/';
    } else if (folderType === 'company_specific') {
      blobPrefix = `company-${companyId}/`;
    }

    // Create folder
    const result = await sql`
      INSERT INTO file_permissions (folder_name, folder_type, blob_prefix, company_id)
      VALUES (${folderName}, ${folderType}, ${blobPrefix}, ${companyId || null})
      RETURNING id, folder_name, folder_type, blob_prefix, company_id
    `;

    return NextResponse.json({
      success: true,
      folder: result.rows[0]
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}