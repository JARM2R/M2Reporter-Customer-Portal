import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';
import { isValidEmail, isValidUsername, sanitizeInput } from '@/lib/validation';


export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, username, companyId } = await req.json();

    // Validate inputs
    if (!email || !username || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return NextResponse.json({
        error: 'Invalid username. Must be 3-30 characters, alphanumeric, underscore, or hyphen only'
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedUsername = sanitizeInput(username);

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${sanitizedEmail} OR username = ${sanitizedUsername}
    `;

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate secure invite token
    const inviteToken = nanoid(32);
    const inviteExpires = new Date();
    inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 day expiration

    // Create user with invite token
    const result = await sql`
      INSERT INTO users (email, username, company_id, invite_token, invite_expires)
      VALUES (${sanitizedEmail}, ${sanitizedUsername}, ${companyId}, ${inviteToken}, ${inviteExpires.toISOString()})
      RETURNING id, email, username
    `;

    const newUser = result.rows[0];

    // Send invite email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/activate?token=${inviteToken}`;

    try {
	  const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: sanitizedEmail,
        subject: 'Welcome to M2 Reporter - Set Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #144478;">Welcome to M2 Reporter</h2>
            <p>Hello,</p>
            <p>An account has been created for you on M2 Reporter. Please click the link below to set your password and activate your account:</p>
            <p style="margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #B3CC48; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Set Your Password</a>
            </p>
            <p><strong>Your Username:</strong> ${sanitizedUsername}</p>
            <p>This link will expire in 7 days.</p>
            <p>If you did not expect this email, please contact us at ${process.env.ADMIN_EMAIL}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">M2 Reporter - Metro 2 Made Simple</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the request if email fails, admin can resend
    }

    // Audit log
    await sql`
      INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address)
      VALUES (${session.user.id}, 'USER_INVITE_CREATED', 'user', ${newUser.id}, ${req.headers.get('x-forwarded-for') || 'unknown'})
    `;

    return NextResponse.json({
      success: true,
      user: newUser,
      inviteUrl // Return URL in case email fails
    });

  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
