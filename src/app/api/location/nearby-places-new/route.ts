import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesClient } from '@/features/location/data/sources/google-places/client';
import { usageTracker } from '@/features/location/data/sources/google-places/usage-tracker';
import { rateLimiter } from '@/features/location/data/sources/google-places/rate-limiter';
import type { AmenityCategory, LatLng } from '@/features/location/data/sources/google-places/types';

/**
 * POST /api/location/nearby-places-new
 * Search for nearby places using Google Places API (New)
 * No quota restrictions - Nearby Search is effectively unlimited
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { location, category }: { location: LatLng; category: AmenityCategory } = body;

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

    console.log(`🔵 [Nearby Search API] ${category.displayName} @ ${location.lat}, ${location.lng}`);

    // Rate limiting (to respect Google's 50 QPS limit)
    await rateLimiter.waitIfNeeded();

    // Initialize Google Places client
    const client = new GooglePlacesClient();

    // Execute search
    const places = await client.searchNearby(location, category);

    const responseTime = Date.now() - startTime;

    // Record usage in database
    await usageTracker.recordUsage({
      endpoint: 'nearby_search',
      categoryId: category.id,
      status: 'success',
      location,
      resultsCount: places.length,
      responseTimeMs: responseTime
    });

    console.log(`✅ [Nearby Search API] Completed in ${responseTime}ms - ${places.length} results`);

    return NextResponse.json({
      success: true,
      places,
      category: {
        id: category.id,
        displayName: category.displayName
      },
      location,
      totalResults: places.length,
      responseTimeMs: responseTime
    });

  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ [Nearby Search API] Error:', error);

    // Record error in database
    await usageTracker.recordUsage({
      endpoint: 'nearby_search',
      categoryId: (await request.json().catch(() => ({}))).category?.id,
      status: 'error',
      errorMessage,
      responseTimeMs: responseTime
    });

    return NextResponse.json(
      {
        error: 'SEARCH_FAILED',
        message: errorMessage,
        places: [] // Return empty array on error
      },
      { status: 500 }
    );
  }
}
