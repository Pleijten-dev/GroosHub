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
      const locale = pathname.startsWith('/en') ? 'en' : 'nl';

      // Public routes that don't require authentication
      const publicRoutes = ['/nl/login', '/en/login'];
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

      // Change password routes - accessible only when logged in
      const changePasswordRoutes = ['/nl/change-password', '/en/change-password'];
      const isChangePasswordRoute = changePasswordRoutes.some((route) => pathname.startsWith(route));

      // API routes for password change should be accessible
      const isChangePasswordApi = pathname.startsWith('/api/auth/change-password');

      // Allow access to public routes
      if (isPublicRoute) {
        // If already logged in and trying to access login page, redirect to home
        if (isLoggedIn) {
          return Response.redirect(new URL(`/${locale}`, nextUrl));
        }
        return true;
      }

      // All other routes require authentication
      if (!isLoggedIn) {
        // Redirect to login page with return URL
        const loginUrl = new URL(`/${locale}/login`, nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return Response.redirect(loginUrl);
      }

      // Check if user must change password
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mustChangePassword = (auth?.user as any)?.must_change_password;

      // Debug logging
      console.log('🔒 Middleware auth check:', {
        pathname,
        isLoggedIn,
        userId: (auth?.user as any)?.id,
        mustChangePassword,
        authUser: auth?.user,
      });

      // If user must change password, only allow access to change-password page and API
      if (mustChangePassword) {
        if (isChangePasswordRoute || isChangePasswordApi) {
          return true;
        }
        // Redirect to change password page
        return Response.redirect(new URL(`/${locale}/change-password`, nextUrl));
      }

      // If user doesn't need to change password but is on change-password page, redirect to home
      if (isChangePasswordRoute && !mustChangePassword) {
        return Response.redirect(new URL(`/${locale}`, nextUrl));
      }

      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
