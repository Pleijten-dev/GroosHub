import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { getDbConnection } from './db/connection';

/**
 * User type matching the database schema
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * Extended session and JWT types for NextAuth v5
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: number;
    role: string;
  }
}

/**
 * NextAuth configuration with Credentials provider
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Auth: Missing credentials');
          return null;
        }

        try {
          // Trim and lowercase email, trim password (matching old implementation)
          const email = (credentials.email as string).trim().toLowerCase();
          const password = (credentials.password as string).trim();

          console.log('🔍 Auth: Attempting login for:', email);

          const db = getDbConnection();

          // Query user from database with case-insensitive email match
          const result = await db`
            SELECT id, name, email, role, password
            FROM users
            WHERE LOWER(email) = LOWER(${email})
          `;

          console.log('📊 Auth: Query returned', result.length, 'user(s)');

          if (result.length === 0) {
            console.log('❌ Auth: No user found with email:', email);
            return null;
          }

          const user = result[0];
          console.log('👤 Auth: Found user:', user.id, user.email, user.role);

          // Verify password using bcrypt
          const isPasswordValid = await bcrypt.compare(password, user.password);

          console.log('🔐 Auth: Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Auth: Invalid password for user:', email);
            return null;
          }

          console.log('✅ Auth: Login successful for:', email);

          // Return user without password
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('❌ Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user info to token on sign in
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
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
        },
      };
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days - users will stay logged in
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode for detailed logging
});

