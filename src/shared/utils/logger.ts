/**
 * Strategic Logger for Data Fetching Operations
 *
 * Usage:
 *   import { logger } from '@/shared/utils/logger';
 *   logger.dataFetch('demographics', 'cache', { address: '...' });
 *   logger.dataFetch('demographics', 'api', { endpoint: '...' });
 *   logger.dataFetch('demographics', 'saved', { id: '...' });
 */

export type DataSource = 'cache' | 'api' | 'saved' | 'database';

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log data fetching operations with source information
   */
  dataFetch(dataType: string, source: DataSource, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const sourceEmoji = {
      cache: '📦',
      api: '🌐',
      saved: '💾',
      database: '🗄️',
    };

    const emoji = sourceEmoji[source] || '📥';
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];

    const parts = [`[${timestamp}]`, emoji, `Fetching ${dataType} from ${source.toUpperCase()}`];

    if (context && Object.keys(context).length > 0) {
      parts.push('-', JSON.stringify(context));
    }

    // Use a single console.log for better performance
    console.log(parts.join(' '));
  }

  /**
   * Log errors (always shown, even in production)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const parts = [`[${timestamp}]`, '❌', message];

    if (error) {
      if (error instanceof Error) {
        parts.push('-', error.message);
      } else {
        parts.push('-', String(error));
      }
    }

    if (context && Object.keys(context).length > 0) {
      parts.push('-', JSON.stringify(context));
    }

    console.error(parts.join(' '));
  }

  /**
   * Log warnings (development only)
   */
  warn(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const parts = [`[${timestamp}]`, '⚠️', message];

    if (context && Object.keys(context).length > 0) {
      parts.push('-', JSON.stringify(context));
    }

    console.warn(parts.join(' '));
  }

  /**
   * Log info messages (development only)
   */
  info(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const parts = [`[${timestamp}]`, 'ℹ️', message];

    if (context && Object.keys(context).length > 0) {
      parts.push(' - ', JSON.stringify(context));
    }

    console.log(parts.join(' '));
  }

  /**
   * Log success messages (development only)
   */
  success(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const parts = [`[${timestamp}]`, '✅', message];

    if (context && Object.keys(context).length > 0) {
      parts.push('-', JSON.stringify(context));
    }

    console.log(parts.join(' '));
  }
}

export const logger = new Logger();
