import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { sql } from '@vercel/postgres';

/**
 * Login rate limiting endpoint
 * This should be called BEFORE NextAuth credential validation
 */
export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Check rate limit by username and IP
    const usernameLimit = checkRateLimit(`login:username:${username}`, 5, 15 * 60 * 1000);
    const ipLimit = checkRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);

    if (!usernameLimit.success) {
      // Log failed attempt
      await sql`
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (NULL, 'LOGIN_RATE_LIMITED', 'auth', ${username}, ${ip})
      `;

      const remainingMinutes = Math.ceil((usernameLimit.resetTime - Date.now()) / 60000);

      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${remainingMinutes} minutes.`,
          resetTime: usernameLimit.resetTime,
        },
        { status: 429 }
      );
    }

    if (!ipLimit.success) {
      await sql`
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address)
        VALUES (NULL, 'LOGIN_RATE_LIMITED_IP', 'auth', ${username}, ${ip})
      `;

      const remainingMinutes = Math.ceil((ipLimit.resetTime - Date.now()) / 60000);

      return NextResponse.json(
        {
          error: `Too many login attempts from this location. Please try again in ${remainingMinutes} minutes.`,
          resetTime: ipLimit.resetTime,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      remaining: Math.min(usernameLimit.remaining, ipLimit.remaining),
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 });
  }
}
