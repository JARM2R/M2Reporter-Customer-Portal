import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminPage = req.nextUrl.pathname.startsWith('/admin');

    // Protect /admin route - only admins can access
    if (isAdminPage && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Must be logged in to access /admin or /dashboard
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token;
        }
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  // Protect page routes but EXCLUDE API routes
  matcher: [
    '/admin',
    '/dashboard/:path*',
    '/files/:path*',
    // Exclude API routes, static files, and images
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};