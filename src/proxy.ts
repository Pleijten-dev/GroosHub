import NextAuth from 'next-auth';
import { authConfig } from './lib/auth.config';

const { auth } = NextAuth(authConfig);

/**
 * Next.js 16 Proxy (formerly middleware) for NextAuth v5
 * Handles CSRF token management and the authorized callback
 */
export const proxy = auth;

export const config = {
  // Match all paths except static files, _next, and public assets
  // Note: /api/auth/* routes are included so NextAuth can handle CSRF tokens
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
