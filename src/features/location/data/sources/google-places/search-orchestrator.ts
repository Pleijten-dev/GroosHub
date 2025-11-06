"use client";

import type {
  LatLng,
  AmenitySearchResult,
  AmenityMultiCategoryResponse,
  AmenityCategory
} from './types';
import { DUTCH_AMENITY_CATEGORIES } from './amenity-search-config';

/**
 * Search Orchestrator
 * Coordinates batch searches across multiple amenity categories
 * Handles quota management and sequential execution
 */
export class SearchOrchestrator {
  private readonly nearbyApiEndpoint = '/api/location/nearby-places-new';
  private readonly textApiEndpoint = '/api/location/text-search';
  private readonly usageStatsEndpoint = '/api/location/usage-stats';

  /**
   * Execute searches for all amenity categories
   */
  async searchAllCategories(
    location: LatLng,
    onProgress?: (completed: number, total: number, category: string) => void
  ): Promise<AmenityMultiCategoryResponse> {
    console.log(`🚀 [Search Orchestrator] Starting search for ${DUTCH_AMENITY_CATEGORIES.length} categories`);

    const startTime = Date.now();

    // Step 1: Check quota before starting
    const quotaStatus = await this.checkQuota();

    // Calculate how many text searches we need
    const textSearchCategories = DUTCH_AMENITY_CATEGORIES.filter(
      cat => cat.searchStrategy === 'text'
    );

    if (quotaStatus && quotaStatus.textSearch.remaining < textSearchCategories.length) {
      console.warn(
        `⚠️  [Search Orchestrator] Insufficient quota: need ${textSearchCategories.length}, have ${quotaStatus.textSearch.remaining}`
      );

      return {
        location,
        results: [],
        totalCategories: DUTCH_AMENITY_CATEGORIES.length,
        successfulCategories: 0,
        failedCategories: DUTCH_AMENITY_CATEGORIES.length,
        quotaStatus: {
          textSearchRemaining: quotaStatus.textSearch.remaining,
          textSearchLimit: quotaStatus.textSearch.limit,
          percentUsed: quotaStatus.textSearch.percentUsed
        },
        searchedAt: new Date()
      };
    }

    // Step 2: Execute searches sequentially with delays
    const results: AmenitySearchResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < DUTCH_AMENITY_CATEGORIES.length; i++) {
      const category = DUTCH_AMENITY_CATEGORIES[i];

      try {
        // Notify progress
        if (onProgress) {
          onProgress(i, DUTCH_AMENITY_CATEGORIES.length, category.displayName);
        }

        // Execute search based on strategy
        const result = await this.searchCategory(location, category);

        // Always add result, even if no places found (so user can see what was searched)
        results.push(result);

        if (result.places.length > 0) {
          successCount++;
        } else {
          failedCount++;
        }

        console.log(
          `✅ [${i + 1}/${DUTCH_AMENITY_CATEGORIES.length}] ${category.displayName}: ${result.places.length} places`
        );

        // Small delay between requests to avoid overwhelming the API
        if (i < DUTCH_AMENITY_CATEGORIES.length - 1) {
          await this.delay(100); // 100ms delay between requests
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [Search Orchestrator] Failed for ${category.displayName}:`, errorMessage);
        failedCount++;

        // Continue with other categories even if one fails
        results.push({
          category,
          places: [],
          searchLocation: location,
          searchRadius: category.defaultRadius,
          totalResults: 0,
          searchedAt: new Date(),
          searchStrategy: category.searchStrategy,
          error: errorMessage
        });
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress(
        DUTCH_AMENITY_CATEGORIES.length,
        DUTCH_AMENITY_CATEGORIES.length,
        'Complete'
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `🏁 [Search Orchestrator] Completed in ${totalTime}ms - ${successCount} successful, ${failedCount} failed`
    );

    // Get final quota status
    const finalQuotaStatus = await this.checkQuota();

    return {
      location,
      results,
      totalCategories: DUTCH_AMENITY_CATEGORIES.length,
      successfulCategories: successCount,
      failedCategories: failedCount,
      quotaStatus: finalQuotaStatus ? {
        textSearchRemaining: finalQuotaStatus.textSearch.remaining,
        textSearchLimit: finalQuotaStatus.textSearch.limit,
        percentUsed: finalQuotaStatus.textSearch.percentUsed
      } : undefined,
      searchedAt: new Date()
    };
  }

  /**
   * Search a single category
   */
  private async searchCategory(
    location: LatLng,
    category: AmenityCategory
  ): Promise<AmenitySearchResult> {
    const { searchStrategy } = category;

    // Use text search for price-filtered categories (restaurants)
    if (searchStrategy === 'text' || category.priceLevels) {
      return this.searchWithTextApi(location, category);
    }

    // Use nearby search for everything else
    if (searchStrategy === 'nearby' || searchStrategy === 'both') {
      return this.searchWithNearbyApi(location, category);
    }

    throw new Error(`Unknown search strategy: ${searchStrategy}`);
  }

  /**
   * Search using Nearby API
   */
  private async searchWithNearbyApi(
    location: LatLng,
    category: AmenityCategory
  ): Promise<AmenitySearchResult> {
    const response = await fetch(this.nearbyApiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, category })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Nearby search failed');
    }

    const data = await response.json();

    return {
      category,
      places: data.places || [],
      searchLocation: location,
      searchRadius: category.defaultRadius,
      totalResults: data.totalResults || 0,
      searchedAt: new Date(),
      searchStrategy: 'nearby'
    };
  }

  /**
   * Search using Text API (with price filtering support)
   */
  private async searchWithTextApi(
    location: LatLng,
    category: AmenityCategory
  ): Promise<AmenitySearchResult> {
    const response = await fetch(this.textApiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        category,
        textQuery: category.textQuery,
        priceLevels: category.priceLevels
      })
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle quota exceeded
      if (error.error === 'QUOTA_EXCEEDED') {
        throw new Error('Monthly quota exceeded for restaurant price filtering');
      }

      throw new Error(error.message || 'Text search failed');
    }

    const data = await response.json();

    return {
      category,
      places: data.places || [],
      searchLocation: location,
      searchRadius: category.defaultRadius,
      totalResults: data.totalResults || 0,
      searchedAt: new Date(),
      searchStrategy: 'text'
    };
  }

  /**
   * Check current quota status
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async checkQuota(): Promise<any> {
    try {
      const response = await fetch(this.usageStatsEndpoint);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ [Search Orchestrator] Failed to check quota:', error);
      return null;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get search summary statistics
   */
  getSummary(response: AmenityMultiCategoryResponse): {
    totalPlaces: number;
    categoriesWithResults: number;
    averagePlacesPerCategory: number;
  } {
    const totalPlaces = response.results.reduce((sum, r) => sum + r.places.length, 0);
    const categoriesWithResults = response.results.filter(r => r.places.length > 0).length;
    const averagePlacesPerCategory = categoriesWithResults > 0
      ? Math.round(totalPlaces / categoriesWithResults)
      : 0;

    return {
      totalPlaces,
      categoriesWithResults,
      averagePlacesPerCategory
    };
  }
}

// Singleton instance
export const searchOrchestrator = new SearchOrchestrator();
