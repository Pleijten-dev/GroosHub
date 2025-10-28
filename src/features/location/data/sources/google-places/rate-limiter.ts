import { usageTracker } from './usage-tracker';
import { QUOTA_LIMITS } from './amenity-search-config';
import type { QuotaCheckResult } from './types';

/**
 * Rate Limiter for Google Places API
 * Enforces quota limits and prevents exceeding monthly allowances
 */
export class RateLimiter {
  private lastRequestTime = 0;
  private readonly minRequestInterval = 20; // Minimum 20ms between requests (50 req/sec max)

  /**
   * Check if we have quota available for an endpoint
   */
  async checkQuota(endpoint: 'text_search' | 'nearby_search'): Promise<QuotaCheckResult> {
    try {
      const used = await usageTracker.getMonthlyUsage(endpoint);
      const limit = QUOTA_LIMITS[endpoint];
      const remaining = Math.max(0, limit - used);
      const percentUsed = (used / limit) * 100;

      const allowed = remaining > 0;

      // Log warnings when approaching limit
      if (percentUsed >= 80 && percentUsed < 90) {
        console.warn(
          `⚠️  [Rate Limiter] ${endpoint} quota at ${percentUsed.toFixed(1)}% (${remaining} remaining)`
        );
      } else if (percentUsed >= 90 && percentUsed < 100) {
        console.warn(
          `🚨 [Rate Limiter] ${endpoint} quota at ${percentUsed.toFixed(1)}% (${remaining} remaining) - CRITICAL`
        );
      } else if (!allowed) {
        console.error(
          `❌ [Rate Limiter] ${endpoint} quota EXCEEDED (${used}/${limit})`
        );
      }

      return {
        allowed,
        remaining,
        limit,
        percentUsed,
        message: allowed
          ? undefined
          : `Monthly quota limit reached (${limit} requests)`
      };
    } catch (error) {
      console.error('❌ [Rate Limiter] Error checking quota:', error);

      // Fail safe - allow request but log error
      return {
        allowed: true,
        remaining: 0,
        limit: QUOTA_LIMITS[endpoint],
        percentUsed: 0,
        message: 'Quota check failed - allowing request'
      };
    }
  }

  /**
   * Wait if needed to respect rate limits (50 requests/second)
   * Google's default limit is 50 QPS (queries per second)
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Check if we're approaching the warning threshold
   */
  async isApproachingLimit(endpoint: 'text_search' | 'nearby_search'): Promise<{
    approaching: boolean;
    percentUsed: number;
  }> {
    const quotaCheck = await this.checkQuota(endpoint);

    return {
      approaching: quotaCheck.percentUsed >= (QUOTA_LIMITS.warning_threshold * 100),
      percentUsed: quotaCheck.percentUsed
    };
  }

  /**
   * Check if we have enough quota for multiple requests
   * Useful for batch operations
   */
  async checkBatchQuota(
    endpoint: 'text_search' | 'nearby_search',
    requestCount: number
  ): Promise<QuotaCheckResult> {
    const quotaCheck = await this.checkQuota(endpoint);

    if (quotaCheck.remaining < requestCount) {
      return {
        allowed: false,
        remaining: quotaCheck.remaining,
        limit: quotaCheck.limit,
        percentUsed: quotaCheck.percentUsed,
        message: `Insufficient quota: need ${requestCount} requests, only ${quotaCheck.remaining} remaining`
      };
    }

    return {
      ...quotaCheck,
      message: `Sufficient quota for ${requestCount} requests (${quotaCheck.remaining} remaining)`
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
