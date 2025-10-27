import { NextRequest, NextResponse } from 'next/server';
import { usageTracker } from '@/features/location/data/sources/google-places/usage-tracker';
import { QUOTA_LIMITS } from '@/features/location/data/sources/google-places/amenity-search-config';

/**
 * GET /api/location/usage-stats
 * Get current API usage statistics
 * Returns quota usage for all users combined
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Usage Stats API] Fetching usage statistics...');

    // Get comprehensive usage stats
    const stats = await usageTracker.getUsageStats();

    // Get usage breakdown by category
    const categoryBreakdown = await usageTracker.getUsageByCategory();

    // Check if approaching limit
    const isApproachingTextLimit = stats.textSearchPercentUsed >= (QUOTA_LIMITS.warning_threshold * 100);

    const response = {
      success: true,
      currentMonth: stats.currentMonth,
      textSearch: {
        used: stats.textSearchUsed,
        limit: stats.textSearchLimit,
        remaining: stats.textSearchRemaining,
        percentUsed: Math.round(stats.textSearchPercentUsed * 10) / 10,
        quotaExceeded: stats.textSearchRemaining === 0,
        approachingLimit: isApproachingTextLimit
      },
      nearbySearch: {
        used: stats.nearbySearchUsed,
        unlimited: true
      },
      categoryBreakdown,
      lastUpdated: stats.lastUpdated,
      quotaResetDate: getNextMonthFirstDay()
    };

    console.log(`✅ [Usage Stats API] Text Search: ${stats.textSearchUsed}/${stats.textSearchLimit} (${response.textSearch.percentUsed}%)`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [Usage Stats API] Error:', error);

    return NextResponse.json(
      {
        error: 'STATS_FETCH_FAILED',
        message: error.message || 'Failed to fetch usage statistics'
      },
      { status: 500 }
    );
  }
}

/**
 * Get the first day of next month (when quota resets)
 */
function getNextMonthFirstDay(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0]; // YYYY-MM-DD format
}
