import { getDbConnection, getCurrentYearMonth } from '@/lib/db/connection';
import type { UsageRecord, UsageStats } from './types';
import { QUOTA_LIMITS } from './amenity-search-config';

/**
 * API Usage Tracker
 * Centralized tracking of Google Places API usage in Neon SQL database
 * Ensures all users across the platform count towards the same quota
 */
export class ApiUsageTracker {
  /**
   * Record an API usage event in the database
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    try {
      const sql = getDbConnection();
      const yearMonth = getCurrentYearMonth();

      await sql`
        INSERT INTO api_usage (
          endpoint,
          category_id,
          request_timestamp,
          year_month,
          status,
          error_message,
          location_lat,
          location_lng,
          results_count,
          response_time_ms
        ) VALUES (
          ${record.endpoint},
          ${record.categoryId || null},
          NOW(),
          ${yearMonth},
          ${record.status},
          ${record.errorMessage || null},
          ${record.location?.lat || null},
          ${record.location?.lng || null},
          ${record.resultsCount || 0},
          ${record.responseTimeMs || null}
        )
      `;

      console.log(
        `📊 [Usage Tracker] Recorded ${record.endpoint} - ${record.status} (${record.categoryId || 'N/A'})`
      );
    } catch (error) {
      console.error('❌ [Usage Tracker] Failed to record usage:', error);
      // Don't throw - we don't want tracking failures to break the API
    }
  }

  /**
   * Get monthly usage count for a specific endpoint
   */
  async getMonthlyUsage(endpoint: 'text_search' | 'nearby_search'): Promise<number> {
    try {
      const sql = getDbConnection();
      const yearMonth = getCurrentYearMonth();

      const result = await sql`
        SELECT COUNT(*) as count
        FROM api_usage
        WHERE endpoint = ${endpoint}
          AND year_month = ${yearMonth}
          AND status = 'success'
      `;

      return parseInt(result[0]?.count || '0', 10);
    } catch (error) {
      console.error('❌ [Usage Tracker] Failed to get monthly usage:', error);
      return 0;
    }
  }

  /**
   * Get remaining quota for a specific endpoint
   */
  async getRemainingQuota(endpoint: 'text_search' | 'nearby_search'): Promise<number> {
    const used = await this.getMonthlyUsage(endpoint);
    const limit = QUOTA_LIMITS[endpoint];
    const remaining = Math.max(0, limit - used);
    return remaining;
  }

  /**
   * Check if we can make a request (quota available)
   */
  async canMakeRequest(endpoint: 'text_search' | 'nearby_search'): Promise<boolean> {
    const remaining = await this.getRemainingQuota(endpoint);
    return remaining > 0;
  }

  /**
   * Get comprehensive usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    try {
      const sql = getDbConnection();
      const yearMonth = getCurrentYearMonth();

      // Get usage for both endpoints
      const [textSearchUsed, nearbySearchUsed] = await Promise.all([
        this.getMonthlyUsage('text_search'),
        this.getMonthlyUsage('nearby_search')
      ]);

      const textSearchLimit = QUOTA_LIMITS.text_search;
      const textSearchRemaining = Math.max(0, textSearchLimit - textSearchUsed);
      const textSearchPercentUsed = (textSearchUsed / textSearchLimit) * 100;

      return {
        currentMonth: yearMonth,
        textSearchUsed,
        textSearchLimit,
        textSearchRemaining,
        textSearchPercentUsed,
        nearbySearchUsed,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('❌ [Usage Tracker] Failed to get usage stats:', error);

      // Return safe defaults on error
      return {
        currentMonth: getCurrentYearMonth(),
        textSearchUsed: 0,
        textSearchLimit: QUOTA_LIMITS.text_search,
        textSearchRemaining: QUOTA_LIMITS.text_search,
        textSearchPercentUsed: 0,
        nearbySearchUsed: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Get detailed usage breakdown by category
   */
  async getUsageByCategory(): Promise<Array<{
    categoryId: string;
    endpoint: string;
    count: number;
    successCount: number;
    errorCount: number;
  }>> {
    try {
      const sql = getDbConnection();
      const yearMonth = getCurrentYearMonth();

      const result = await sql`
        SELECT
          category_id,
          endpoint,
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status = 'success') as success_count,
          COUNT(*) FILTER (WHERE status = 'error') as error_count
        FROM api_usage
        WHERE year_month = ${yearMonth}
          AND category_id IS NOT NULL
        GROUP BY category_id, endpoint
        ORDER BY total_count DESC
      `;

      return result.map(row => ({
        categoryId: row.category_id,
        endpoint: row.endpoint,
        count: parseInt(row.total_count, 10),
        successCount: parseInt(row.success_count, 10),
        errorCount: parseInt(row.error_count, 10)
      }));
    } catch (error) {
      console.error('❌ [Usage Tracker] Failed to get usage by category:', error);
      return [];
    }
  }

  /**
   * Check if we're approaching the quota limit (warning threshold)
   */
  async isApproachingLimit(endpoint: 'text_search' | 'nearby_search'): Promise<boolean> {
    const used = await this.getMonthlyUsage(endpoint);
    const limit = QUOTA_LIMITS[endpoint];
    const percentUsed = used / limit;

    return percentUsed >= QUOTA_LIMITS.warning_threshold;
  }
}

// Singleton instance
export const usageTracker = new ApiUsageTracker();
