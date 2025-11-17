import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminPage = req.nextUrl.pathname === '/admin';

    // Protect /admin page - only admins can access
    if (isAdminPage && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Allow all API routes (they have their own auth)
        if (path.startsWith('/api/')) {
          return true;
        }
        
        // Require login for /admin page
        if (path === '/admin') {
          return !!token;
        }
        
        // Require login for /dashboard and /files
        if (path.startsWith('/dashboard') || path.startsWith('/files')) {
          return !!token;
        }
        
        return true;
      },
    },
  }
);

export const config = {
  // Only protect these specific routes
  matcher: [
    '/admin',
    '/dashboard/:path*',
    '/files/:path*',
  ],
};