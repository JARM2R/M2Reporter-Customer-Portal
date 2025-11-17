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

    const { companyName } = await req.json();

    if (!companyName || companyName.trim() === '') {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Check if company already exists
    const existing = await sql`
      SELECT id FROM companies WHERE company_name = ${companyName}
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Company already exists' }, { status: 400 });
    }

    // Create company
    const result = await sql`
      INSERT INTO companies (company_name, account_status)
      VALUES (${companyName}, 'active')
      RETURNING id, company_name, account_status, created_at
    `;

    const company = result.rows[0];

    // Create company-specific folder in file_permissions
    const blobPrefix = `company-${company.id}/`;
    await sql`
      INSERT INTO file_permissions (folder_name, folder_type, blob_prefix, company_id)
      VALUES (${companyName}, 'company_specific', ${blobPrefix}, ${company.id})
    `;

    return NextResponse.json({
      success: true,
      company: result.rows[0]
    });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}