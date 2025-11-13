import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Try to find the user
    const result = await sql`
      SELECT id, username, password_hash, is_activated
      FROM users
      WHERE username = 'testadmin'
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = result.rows[0];
    
    // Test password comparison
    const isValid = await bcrypt.compare('secret', user.password_hash);
    
    return NextResponse.json({
      success: true,
      userFound: true,
      isActivated: user.is_activated,
      passwordValid: isValid,
      userId: user.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}