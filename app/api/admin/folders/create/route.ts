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

    const { folderName, folderType, companyId, parentFolderId } = await req.json();

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

    // If company_specific, companyId is required (unless it's a subfolder)
    if (folderType === 'company_specific' && !companyId && !parentFolderId) {
      return NextResponse.json({ 
        error: 'Company is required for company-specific folders' 
      }, { status: 400 });
    }

    let blobPrefix = '';
    let finalCompanyId = companyId;
    let finalFolderType = folderType;

    // If this is a subfolder, inherit settings from parent
    if (parentFolderId) {
      const parentResult = await sql`
        SELECT blob_prefix, company_id, folder_type 
        FROM file_permissions 
        WHERE id = ${parentFolderId}
      `;

      if (parentResult.rows.length === 0) {
        return NextResponse.json({ 
          error: 'Parent folder not found' 
        }, { status: 400 });
      }

      const parent = parentResult.rows[0];
      // Subfolder inherits parent's company_id and folder_type
      finalCompanyId = parent.company_id;
      finalFolderType = parent.folder_type;
      
      // Build blob prefix: parent's prefix + new folder name + /
      blobPrefix = `${parent.blob_prefix}${folderName}/`;
    } else {
      // Root folder - generate blob prefix based on folder type
      if (finalFolderType === 'program_files') {
        blobPrefix = 'program-files/';
      } else if (finalFolderType === 'shared') {
        blobPrefix = 'shared/';
      } else if (finalFolderType === 'company_specific') {
        blobPrefix = `company-${finalCompanyId}/`;
      }
    }

    // Create folder
    const result = await sql`
      INSERT INTO file_permissions (
        folder_name, 
        folder_type, 
        blob_prefix, 
        company_id,
        parent_folder_id
      )
      VALUES (
        ${folderName}, 
        ${finalFolderType}, 
        ${blobPrefix}, 
        ${finalCompanyId || null},
        ${parentFolderId || null}
      )
      RETURNING id, folder_name, folder_type, blob_prefix, company_id, parent_folder_id
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