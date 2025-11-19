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

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (parseInt(userId) === parseInt(session.user.id)) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account' 
      }, { status: 400 });
    }

    // Get user info before deleting
    const userInfo = await sql`
      SELECT username FROM users WHERE id = ${userId}
    `;

    if (userInfo.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (audit logs will remain due to nullable user_id)
    await sql`
      DELETE FROM users WHERE id = ${userId}
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (user_id, action, resource_type, resource_id)
      VALUES (${session.user.id}, 'USER_DELETED', 'user', ${userInfo.rows[0].username})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
