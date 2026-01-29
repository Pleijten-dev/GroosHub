import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy (Edge Middleware) for route protection
 *
 * This is a simple, edge-compatible middleware that:
 * 1. Checks for session cookie existence
 * 2. Redirects unauthenticated users to login
 * 3. Allows public routes through
 *
 * Advanced auth logic (must_change_password) is handled in layouts
 * using server-side auth() calls, not here.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all API routes - locale-prefixed ones are rewritten in next.config.ts
  // via beforeFiles rewrites: /nl/api/* -> /api/*, /en/api/* -> /api/*
  if (pathname.includes('/api/')) {
    return NextResponse.next();
  }

  // Only process GET requests for page routes - other methods pass through
  if (request.method !== 'GET') {
    return NextResponse.next();
  }

  // Determine locale from path
  const locale = pathname.startsWith('/en') ? 'en' : 'nl';

  // Public routes that don't require authentication
  const publicRoutes = [
    '/nl/login',
    '/en/login',
    '/nl/change-password',
    '/en/change-password',
  ];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for session cookie (NextAuth v5 uses authjs.session-token)
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value;

  if (!sessionToken) {
    // No session - redirect to login
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists - allow through
  return NextResponse.next();
}

// Export as both named and default for Next.js 16 compatibility
export default proxy;

export const config = {
  // Match all paths except /api/* routes, static files, and assets
  // Note: Locale-prefixed API routes like /nl/api/* are handled by
  // next.config.ts beforeFiles rewrites, not this proxy
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
