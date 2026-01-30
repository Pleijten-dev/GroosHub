import type { NextAuthConfig } from 'next-auth';

/**
 * NextAuth v5 configuration
 *
 * This config is shared between auth.ts (API handlers) and can be
 * used by middleware if needed. Providers are added in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
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
  },
  providers: [], // Providers are added in auth.ts
};
