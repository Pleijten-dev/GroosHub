/**
 * Error Handler for Google Places API
 * Provides consistent error handling and retry logic
 */

import { logger } from '@/shared/utils/logger';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

interface ApiError {
  code?: string;
  status?: number;
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
      };
      message?: string;
    };
  };
  message?: string;
}

export class ErrorHandler {
  /**
   * Check if an error is retryable
   */
  isRetryableError(error: unknown): boolean {
    const err = error as ApiError;
    // Network errors
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      return true;
    }

    // HTTP status codes that are retryable
    const status = err.response?.status || err.status;
    if (status) {
      // Retry on server errors (5xx) and rate limit (429)
      if (status >= 500 || status === 429) {
        return true;
      }
    }

    return false;
  }

  /**
   * Execute function with retry logic
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: unknown;
    let delay = config.initialDelayMs;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Don't retry if error is not retryable
        if (!this.isRetryableError(error)) {
          logger.warn('Non-retryable error', { message: this.getErrorMessage(error) });
          throw error;
        }

        logger.warn(`Retry attempt ${attempt + 1}/${config.maxRetries + 1}`, { delayMs: delay });

        // Wait before retrying
        await this.sleep(delay);

        // Exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }

    // All retries exhausted
    logger.error('All retry attempts failed', undefined, { maxRetries: config.maxRetries + 1 });
    throw lastError;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract error message from various error formats
   */
  getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    const err = error as ApiError;

    if (err.response?.data?.error?.message) {
      return err.response.data.error.message;
    }

    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    if (err.message) {
      return err.message;
    }

    return 'An unknown error occurred';
  }

  /**
   * Get HTTP status code from error
   */
  getStatusCode(error: unknown): number {
    const err = error as ApiError;
    return err.response?.status || err.status || 500;
  }

  /**
   * Check if error is a quota exceeded error
   */
  isQuotaExceededError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const status = this.getStatusCode(error);

    return (
      status === 429 ||
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(error: unknown): boolean {
    const status = this.getStatusCode(error);
    const message = this.getErrorMessage(error).toLowerCase();

    return (
      status === 401 ||
      status === 403 ||
      message.includes('api key') ||
      message.includes('authentication') ||
      message.includes('unauthorized')
    );
  }

  /**
   * Log error with context
   */
  logError(context: string, error: unknown): void {
    logger.error(`${context}`, error instanceof Error ? error : undefined, {
      message: this.getErrorMessage(error),
      status: this.getStatusCode(error),
      retryable: this.isRetryableError(error),
      quotaExceeded: this.isQuotaExceededError(error),
      authError: this.isAuthError(error)
    });
  }

  /**
   * Create a standardized error response
   */
  createErrorResponse(error: unknown, context?: string): {
    error: string;
    message: string;
    statusCode: number;
    retryable: boolean;
  } {
    const message = this.getErrorMessage(error);
    const statusCode = this.getStatusCode(error);

    if (context) {
      this.logError(context, error);
    }

    return {
      error: context || 'API_ERROR',
      message,
      statusCode,
      retryable: this.isRetryableError(error)
    };
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();
