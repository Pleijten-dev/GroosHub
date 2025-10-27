/**
 * Error Handler for Google Places API
 * Provides consistent error handling and retry logic
 */

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

export class ErrorHandler {
  /**
   * Check if an error is retryable
   */
  isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // HTTP status codes that are retryable
    const status = error.response?.status || error.status;
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
    let lastError: any;
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
          console.warn('⚠️  [Error Handler] Non-retryable error:', this.getErrorMessage(error));
          throw error;
        }

        console.warn(
          `⚠️  [Error Handler] Attempt ${attempt + 1}/${config.maxRetries + 1} failed, retrying in ${delay}ms...`
        );

        // Wait before retrying
        await this.sleep(delay);

        // Exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }

    // All retries exhausted
    console.error(
      `❌ [Error Handler] All ${config.maxRetries + 1} attempts failed`
    );
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
  getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }

    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      return error.message;
    }

    return 'An unknown error occurred';
  }

  /**
   * Get HTTP status code from error
   */
  getStatusCode(error: any): number {
    return error.response?.status || error.status || 500;
  }

  /**
   * Check if error is a quota exceeded error
   */
  isQuotaExceededError(error: any): boolean {
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
  isAuthError(error: any): boolean {
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
  logError(context: string, error: any): void {
    console.error(`❌ [${context}] Error:`, {
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
  createErrorResponse(error: any, context?: string): {
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
