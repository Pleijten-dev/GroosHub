console.log('[auth.ts] Starting module initialization...');

import NextAuth, { type DefaultSession } from 'next-auth';
console.log('[auth.ts] NextAuth imported');

import Credentials from 'next-auth/providers/credentials';
console.log('[auth.ts] Credentials imported');

import bcrypt from 'bcryptjs';
console.log('[auth.ts] bcrypt imported');

import { authConfig } from './auth.config';
console.log('[auth.ts] authConfig imported');

import { getDbConnection } from './db/connection';
console.log('[auth.ts] getDbConnection imported');

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

console.log('[auth.ts] About to call NextAuth()...');

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
          return null;
        }

        try {
          // Trim and lowercase email, trim password
          const email = (credentials.email as string).trim().toLowerCase();
          const password = (credentials.password as string).trim();

          const db = getDbConnection();

          // Query user from user_accounts table with case-insensitive email match
          const result = await db`
            SELECT id, name, email, role, password, org_id, is_active, must_change_password
            FROM user_accounts
            WHERE LOWER(email) = LOWER(${email})
          `;

          if (result.length === 0) {
            return null;
          }

          const user = result[0];

          // Check if user account is active
          if (!user.is_active) {
            return null;
          }

          // Verify password using bcrypt
          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            return null;
          }

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
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
});

console.log('[auth.ts] NextAuth() completed, module initialized');
