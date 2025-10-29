import type { NextAuthConfig } from 'next-auth';

/**
 * Auth configuration for middleware
 * This is separated to avoid importing server-side dependencies in middleware
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/nl/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes that don't require authentication
      const publicRoutes = ['/nl/login', '/en/login'];
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

      // Allow access to public routes
      if (isPublicRoute) {
        // If already logged in and trying to access login page, redirect to home
        if (isLoggedIn) {
          const locale = pathname.startsWith('/en') ? 'en' : 'nl';
          return Response.redirect(new URL(`/${locale}`, nextUrl));
        }
        return true;
      }

      // All other routes require authentication
      if (!isLoggedIn) {
        // Redirect to login page with return URL
        const locale = pathname.startsWith('/en') ? 'en' : 'nl';
        const loginUrl = new URL(`/${locale}/login`, nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
