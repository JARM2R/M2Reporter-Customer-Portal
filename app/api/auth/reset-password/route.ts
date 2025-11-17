import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ 
        error: 'Token and password are required' 
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    // Find valid token
    const tokenResult = await sql`
      SELECT user_id, expires_at 
      FROM password_reset_tokens 
      WHERE token = ${token}
    `;

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid or expired reset link' 
      }, { status: 400 });
    }

    const resetToken = tokenResult.rows[0];

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires_at)) {
      // Delete expired token
      await sql`
        DELETE FROM password_reset_tokens WHERE token = ${token}
      `;
      return NextResponse.json({ 
        error: 'Reset link has expired. Please request a new one.' 
      }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}
      WHERE id = ${resetToken.user_id}
    `;

    // Delete used token
    await sql`
      DELETE FROM password_reset_tokens WHERE token = ${token}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ 
      error: 'Failed to reset password' 
    }, { status: 500 });
  }
}