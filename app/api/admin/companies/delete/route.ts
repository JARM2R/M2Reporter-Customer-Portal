import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check if company has users
    const usersCheck = await sql`
      SELECT COUNT(*) as count FROM users WHERE company_id = ${companyId}
    `;

    if (parseInt(usersCheck.rows[0].count) > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete company with existing users. Delete users first.' 
      }, { status: 400 });
    }

    // Delete company (folders will cascade delete due to foreign key)
    await sql`
      DELETE FROM companies WHERE id = ${companyId}
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (user_id, action, resource_type, resource_id)
      VALUES (${session.user.id}, 'COMPANY_DELETED', 'company', ${companyId})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete company error:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
