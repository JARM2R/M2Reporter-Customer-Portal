import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { nanoid } from 'nanoid';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const userResult = await sql`
      SELECT id, username, email FROM users WHERE email = ${email}
    `;

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not (security)
      return NextResponse.json({ 
        success: true, 
        message: 'If an account exists with this email, a reset link has been sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing tokens for this user
    await sql`
      DELETE FROM password_reset_tokens WHERE user_id = ${user.id}
    `;

    // Store new token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt})
    `;

    // Send reset email
    const resetUrl = `https://portal.m2reporter.com/reset-password?token=${token}`;

    await resend.emails.send({
      from: 'm2r@m2reporter.com',
      to: email,
      subject: 'Reset Your M2 Reporter Password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #144478; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
              .button { display: inline-block; padding: 12px 30px; background-color: #B3CC48; color: #000; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 20px 0; }
              .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hello ${user.username},</h2>
                <p>We received a request to reset your password for the M2 Reporter Customer Portal.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <a href="${resetUrl}" class="button">Reset Password</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #144478;">${resetUrl}</p>
                
                <div class="warning">
                  <strong>⚠️ Important:</strong>
                  <ul>
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your password will not change unless you click the link above</li>
                  </ul>
                </div>
                
                <p>If you have any questions, please contact our support team.</p>
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

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists with this email, a reset link has been sent.' 
    });
  } catch (error) {
    console.error('Request reset error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}