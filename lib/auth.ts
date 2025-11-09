import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Rate limiting check
          const ip = (req as any)?.headers?.['x-forwarded-for'] || (req as any)?.headers?.['x-real-ip'] || 'unknown';
          const usernameLimit = checkRateLimit(`login:username:${credentials.username}`, 5, 15 * 60 * 1000);
          const ipLimit = checkRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);

          if (!usernameLimit.success || !ipLimit.success) {
            // Log rate limit violation
            await sql`
              INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address)
              VALUES (NULL, 'LOGIN_RATE_LIMITED', 'auth', ${credentials.username}, ${ip})
            `;
            throw new Error('Too many login attempts. Please try again later.');
          }

          // Get user from database
          const result = await sql`
            SELECT u.*, c.account_status, c.company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.username = ${credentials.username}
            AND u.is_activated = true
          `;

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          // Check if account is active
          if (user.account_status === 'suspended' || user.account_status === 'past_due') {
            throw new Error('Account access restricted. Please contact support.');
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password_hash);

          if (!isValid) {
            // Failed login attempt
            await sql`
              INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address)
              VALUES (${user.id}, 'LOGIN_FAILED', 'auth', ${credentials.username}, ${ip})
            `;
            return null;
          }

          // Successful login - reset rate limit for this user
          resetRateLimit(`login:username:${credentials.username}`);

          // Update last login
          await sql`
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = ${user.id}
          `;

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.username,
            companyId: user.company_id,
            companyName: user.company_name,
            role: user.role,
            accountStatus: user.account_status
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.role = user.role;
        token.accountStatus = user.accountStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as number;
        session.user.companyName = token.companyName as string;
        session.user.role = token.role as string;
        session.user.accountStatus = token.accountStatus as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};