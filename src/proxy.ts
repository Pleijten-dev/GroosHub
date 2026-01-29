import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './lib/auth.config';

const { auth } = NextAuth(authConfig);

/**
 * Next.js 16 Proxy (formerly middleware) for NextAuth v5
 * Handles CSRF token management and the authorized callback
 *
 * Using the auth function directly as NextAuth v5 middleware wrapper
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // Log all requests passing through the proxy
  console.log(`🔄 [Proxy] ${method} ${pathname} - auth: ${req.auth?.user?.email || 'none'}`);

  // Handle non-GET/POST requests (OPTIONS, HEAD, etc.) - let them through
  // These don't need auth redirects and can cause 400 errors if processed
  if (method !== 'GET' && method !== 'POST') {
    console.log(`🔄 [Proxy] ${method} request - allowing through`);
    return NextResponse.next();
  }

  // Return undefined to let the authorized callback handle the response
  // The authorized callback in auth.config.ts will handle redirects
  return undefined;
});

// Also export as default for compatibility
export default proxy;

export const config = {
  // Match all paths except static files, _next, and public assets
  // Note: /api/auth/* routes are included so NextAuth can handle CSRF tokens
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
