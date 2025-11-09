import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { isValidPassword } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    // Validate inputs
    if (!token || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Password strength validation
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      }, { status: 400 });
    }

    // Find user with valid token
    const result = await sql`
      SELECT id, email, username, invite_expires
      FROM users
      WHERE invite_token = ${token}
      AND is_activated = false
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 });
    }

    const user = result.rows[0];

    // Check if token is expired
    if (new Date() > new Date(user.invite_expires)) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user with password and activate account
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          is_activated = true,
          invite_token = NULL,
          invite_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;

    // Audit log
    await sql`
      INSERT INTO audit_log (user_id, action, resource_type, ip_address)
      VALUES (${user.id}, 'ACCOUNT_ACTIVATED', 'user', ${req.headers.get('x-forwarded-for') || 'unknown'})
    `;

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully',
      username: user.username
    });

  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Failed to activate account' }, { status: 500 });
  }
}
