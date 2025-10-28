import { neon } from '@neondatabase/serverless';

/**
 * Get a Neon database connection
 * Uses the non-pooling connection URL for better transaction support
 */
export function getDbConnection() {
  const url = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      'Database URL not configured. Please set POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable.'
    );
  }

  return neon(url);
}

/**
 * Get the current year-month string for tracking
 * Format: 'YYYY-MM' (e.g., '2025-10')
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
