import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Get company name
    const companyResult = await sql`
      SELECT company_name FROM companies WHERE id = ${companyId}
    `;

    if (companyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const companyName = companyResult.rows[0].company_name;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await sql`
      INSERT INTO users (username, email, password_hash, company_id, role, is_activated)
      VALUES (${username}, ${email}, ${passwordHash}, ${companyId}, ${role || 'user'}, true)
      RETURNING id, username, email, role, company_id, is_activated, created_at
    `;

    // Send welcome email
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@m2reporter.com',
        to: email,
        subject: 'Welcome to M2 Reporter Customer Portal',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #144478; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
                .credentials { background-color: white; padding: 15px; border-left: 4px solid #B3CC48; margin: 20px 0; }
                .button { display: inline-block; padding: 12px 30px; background-color: #B3CC48; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to M2 Reporter</h1>
                </div>
                <div class="content">
                  <h2>Hello!</h2>
                  <p>Your account has been created for the M2 Reporter Customer Portal.</p>
                  
                  <div class="credentials">
                    <h3>Your Login Credentials:</h3>
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p><strong>Company:</strong> ${companyName}</p>
                  </div>
                  
                  <p>You can access the portal using the button below:</p>
                  
                  <a href="https://portal.m2reporter.com" class="button">Access Portal</a>
                  
                  <p><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
                  
                  <p>If you have any questions or need assistance, please contact our support team.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} M2 Reporter. All rights reserved.</p>
                  <p>This is an automated message, please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail user creation if email fails
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}