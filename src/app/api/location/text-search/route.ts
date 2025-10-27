import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesClient } from '@/features/location/data/sources/google-places/client';
import { usageTracker } from '@/features/location/data/sources/google-places/usage-tracker';
import { rateLimiter } from '@/features/location/data/sources/google-places/rate-limiter';
import type { AmenityCategory, LatLng, PRICE_LEVELS } from '@/features/location/data/sources/google-places/types';

/**
 * POST /api/location/text-search
 * Search for places using text query with Google Places API (New)
 * QUOTA PROTECTED: Free tier limit of 1,000 requests/month across all users
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestBody: any;

  try {
    // Parse request body
    requestBody = await request.json();
    const {
      location,
      category,
      textQuery,
      priceLevels
    }: {
      location: LatLng;
      category: AmenityCategory;
      textQuery?: string;
      priceLevels?: PRICE_LEVELS[];
    } = requestBody;

    // Validate inputs
    if (!location || !location.lat || !location.lng) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Location (lat, lng) is required' },
        { status: 400 }
      );
    }

    if (!category || !category.id) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Category is required' },
        { status: 400 }
      );
    }

    console.log(`🟣 [Text Search API] ${category.displayName} @ ${location.lat}, ${location.lng}`);

    // ⚠️ QUOTA CHECK - This is critical for Text Search
    const quotaCheck = await rateLimiter.checkQuota('text_search');

    if (!quotaCheck.allowed) {
      console.error(`🚨 [Text Search API] QUOTA EXCEEDED - ${quotaCheck.limit} requests/month limit reached`);

      // Record quota exceeded event
      await usageTracker.recordUsage({
        endpoint: 'text_search',
        categoryId: category.id,
        status: 'quota_exceeded',
        location,
        errorMessage: 'Monthly quota limit exceeded',
        responseTimeMs: Date.now() - startTime
      });

      return NextResponse.json(
        {
          error: 'QUOTA_EXCEEDED',
          message: `Monthly quota limit reached (${quotaCheck.limit} requests). Please try again next month.`,
          quotaStatus: {
            limit: quotaCheck.limit,
            remaining: 0,
            percentUsed: 100
          },
          places: []
        },
        { status: 429 } // 429 Too Many Requests
      );
    }

    // Log quota status if approaching limit
    if (quotaCheck.percentUsed >= 80) {
      console.warn(
        `⚠️  [Text Search API] Quota at ${quotaCheck.percentUsed.toFixed(1)}% - ${quotaCheck.remaining} requests remaining`
      );
    }

    // Rate limiting (to respect Google's 50 QPS limit)
    await rateLimiter.waitIfNeeded();

    // Initialize Google Places client
    const client = new GooglePlacesClient();

    // Execute search
    const places = await client.searchWithText(
      location,
      category,
      textQuery,
      priceLevels
    );

    const responseTime = Date.now() - startTime;

    // Record successful usage in database
    await usageTracker.recordUsage({
      endpoint: 'text_search',
      categoryId: category.id,
      status: 'success',
      location,
      resultsCount: places.length,
      responseTimeMs: responseTime
    });

    console.log(
      `✅ [Text Search API] Completed in ${responseTime}ms - ${places.length} results (${quotaCheck.remaining - 1} quota remaining)`
    );

    return NextResponse.json({
      success: true,
      places,
      category: {
        id: category.id,
        displayName: category.displayName
      },
      location,
      totalResults: places.length,
      quotaStatus: {
        remaining: quotaCheck.remaining - 1, // Subtract the request we just made
        limit: quotaCheck.limit,
        percentUsed: ((quotaCheck.limit - quotaCheck.remaining + 1) / quotaCheck.limit) * 100
      },
      responseTimeMs: responseTime
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    console.error('❌ [Text Search API] Error:', error);

    // Record error in database
    await usageTracker.recordUsage({
      endpoint: 'text_search',
      categoryId: requestBody?.category?.id,
      status: 'error',
      location: requestBody?.location,
      errorMessage: error.message || 'Unknown error',
      responseTimeMs: responseTime
    });

    return NextResponse.json(
      {
        error: 'SEARCH_FAILED',
        message: error.message || 'Failed to search places',
        places: []
      },
      { status: error.status || 500 }
    );
  }
}
