import NextAuth from 'next-auth';
import { authConfig } from './lib/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Match all paths except static files, api routes, _next, and auth API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
