import type { NextAuthConfig } from 'next-auth';

/**
 * Auth configuration for middleware
 * This is separated to avoid importing server-side dependencies in middleware
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/nl/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to token on sign in
      if (user) {
        return {
          ...token,
          id: (user as any).id,
          role: (user as any).role,
          org_id: (user as any).org_id,
          must_change_password: (user as any).must_change_password,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Add user info to session
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as number,
          role: token.role as string,
          org_id: token.org_id as string,
          must_change_password: token.must_change_password as boolean,
        },
      };
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const locale = pathname.startsWith('/en') ? 'en' : 'nl';

      console.log(`🔐 [Auth] authorized() called for: ${pathname}`);
      console.log(`🔐 [Auth] isLoggedIn: ${isLoggedIn}, user: ${auth?.user?.email || 'none'}`);

      // API routes handle their own authentication - let them through
      // This prevents redirecting API calls to HTML pages
      if (pathname.startsWith('/api/')) {
        console.log(`🔐 [Auth] API route - allowing through: ${pathname}`);
        return true;
      }

      // Public routes that don't require authentication
      const publicRoutes = ['/nl/login', '/en/login'];
      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

      // Change password routes - accessible only when logged in
      const changePasswordRoutes = ['/nl/change-password', '/en/change-password'];
      const isChangePasswordRoute = changePasswordRoutes.some((route) => pathname.startsWith(route));

      // Allow access to public routes
      if (isPublicRoute) {
        // If already logged in and trying to access login page, redirect to home
        if (isLoggedIn) {
          console.log(`🔐 [Auth] Logged in user on login page - redirecting to home`);
          return Response.redirect(new URL(`/${locale}`, nextUrl));
        }
        console.log(`🔐 [Auth] Public route - allowing: ${pathname}`);
        return true;
      }

      // All other routes require authentication
      if (!isLoggedIn) {
        // Redirect to login page with return URL
        const loginUrl = new URL(`/${locale}/login`, nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        console.log(`🔐 [Auth] Not logged in - redirecting to: ${loginUrl.toString()}`);
        return Response.redirect(loginUrl);
      }

      // Check if user must change password
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mustChangePassword = (auth?.user as any)?.must_change_password;
      console.log(`🔐 [Auth] mustChangePassword: ${mustChangePassword}`);

      // If user must change password, only allow access to change-password page
      // (API routes are already allowed through above)
      if (mustChangePassword) {
        if (isChangePasswordRoute) {
          console.log(`🔐 [Auth] User must change password, on change-password page - allowing`);
          return true;
        }
        // Redirect to change password page
        console.log(`🔐 [Auth] User must change password - redirecting to change-password`);
        return Response.redirect(new URL(`/${locale}/change-password`, nextUrl));
      }

      // If user doesn't need to change password but is on change-password page, redirect to home
      if (isChangePasswordRoute && !mustChangePassword) {
        console.log(`🔐 [Auth] User on change-password but doesn't need to - redirecting home`);
        return Response.redirect(new URL(`/${locale}`, nextUrl));
      }

      console.log(`🔐 [Auth] Allowing access to: ${pathname}`);
      return true;
    },
  },
  providers: [], // Providers are added in auth.ts
};
