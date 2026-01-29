import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy for route protection
 *
 * Simple middleware that checks for session cookie and redirects
 * to login if not present. Does NOT use NextAuth to avoid
 * dual-instance CSRF token issues.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  console.log(`🔄 [Proxy] ${method} ${pathname}`);

  // Handle non-GET requests - let them through
  if (method !== 'GET') {
    console.log(`🔄 [Proxy] ${method} request - allowing through`);
    return NextResponse.next();
  }

  // Determine locale from path
  const locale = pathname.startsWith('/en') ? 'en' : 'nl';

  // Public routes that don't require authentication
  const publicRoutes = ['/nl/login', '/en/login', '/nl/change-password', '/en/change-password'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    console.log(`🔄 [Proxy] Public route - allowing: ${pathname}`);
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth v5 uses authjs.session-token)
  const sessionToken = request.cookies.get('authjs.session-token')?.value
    || request.cookies.get('__Secure-authjs.session-token')?.value;

  if (!sessionToken) {
    console.log(`🔄 [Proxy] No session - redirecting to login`);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`🔄 [Proxy] Session found - allowing: ${pathname}`);
  return NextResponse.next();
}

// Export as both named and default for Next.js 16 compatibility
export default proxy;

export const config = {
  // Match all paths except API routes, static files, _next, and public assets
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
