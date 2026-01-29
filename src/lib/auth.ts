import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { getDbConnection } from './db/connection';

/**
 * User type matching the database schema (user_accounts table)
 */
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  org_id: string; // UUID from org_organizations
  is_active: boolean;
  must_change_password: boolean;
}

/**
 * Extended session and JWT types for NextAuth v5
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      role: string;
      org_id: string;
      must_change_password: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: number;
    role: string;
    org_id: string;
    is_active: boolean;
    must_change_password: boolean;
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

          // Query user from user_accounts table with case-insensitive email match
          const result = await db`
            SELECT id, name, email, role, password, org_id, is_active, must_change_password
            FROM user_accounts
            WHERE LOWER(email) = LOWER(${email})
          `;

          console.log('📊 Auth: Query returned', result.length, 'user(s)');

          if (result.length === 0) {
            console.log('❌ Auth: No user found with email:', email);
            return null;
          }

          const user = result[0];
          console.log('👤 Auth: Found user:', user.id, user.email, user.role, 'org:', user.org_id);

          // Check if user account is active
          if (!user.is_active) {
            console.log('❌ Auth: User account is inactive:', email);
            return null;
          }

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
            org_id: user.org_id,
            is_active: user.is_active,
            must_change_password: user.must_change_password ?? false,
          };
        } catch (error) {
          console.error('❌ Auth error:', error);
          return null;
        }
      },
    }),
  ],
});

