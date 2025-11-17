import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, email, password, companyId, role } = await req.json();

    // Validate required fields
    if (!username || !email || !password || !companyId) {
      return NextResponse.json({ 
        error: 'Username, email, password, and company are required' 
      }, { status: 400 });
    }

    // Check if username already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username}
    `;

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await sql`
      INSERT INTO users (username, email, password_hash, company_id, role, is_activated)
      VALUES (${username}, ${email}, ${passwordHash}, ${companyId}, ${role || 'user'}, true)
      RETURNING id, username, email, role, company_id, is_activated, created_at
    `;

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}