/**
 * Location Agent Tool: Get Location Data
 *
 * Retrieves specific data category for a saved location
 * Returns formatted data optimized for LLM interpretation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDbConnection } from '@/lib/db/connection';
import type { UnifiedLocationData, UnifiedDataRow } from '@/features/location/data/aggregator/multiLevelAggregator';
import type { ResidentialData } from '@/features/location/data/sources/altum-ai/types';

// Available data categories
const DataCategories = [
  'demographics',
  'health',
  'safety',
  'livability',
  'residential',
  'amenities',
  'all',
] as const;

type DataCategory = (typeof DataCategories)[number];

/**
 * Tool: getLocationData
 *
 * Retrieves specific data category for a saved location
 * Returns the most granular level available (neighborhood > district > municipality > national)
 */
export const getLocationData = tool({
  description: `Get specific data category for a saved location.

  Available categories:
  - demographics: Age, income, household types, population statistics
  - health: Air quality, life expectancy, healthcare metrics
  - safety: Crime rates, traffic safety, security data
  - livability: Playgrounds, youth facilities, public amenities
  - residential: Housing market prices, typologies, ownership data
  - amenities: Nearby restaurants, shops, schools, services
  - all: Returns summary of all categories

  Use this tool when:
  - User asks about a specific data type (e.g., "demographics in Utrecht")
  - User wants detailed information about a location
  - You need data to answer questions about a location

  The tool returns the most granular level available (neighborhood data is most accurate).`,

  inputSchema: z.object({
    locationId: z.string().uuid().describe('The UUID of the saved location'),
    category: z.enum(DataCategories).describe('The data category to retrieve'),
    userId: z
      .number()
      .describe('The user ID requesting the data (for access control)'),
  }),

  async execute({ locationId, category, userId }) {
    try {
      console.log(
        `[Location Agent] Fetching ${category} data for location ${locationId} (user ${userId})`
      );

      // Get database connection
      const sql = getDbConnection();

      // Query location with access control (must be owned or shared with user)
      const results = await sql`
        SELECT
          sl.id,
          sl.name,
          sl.address,
          sl.location_data as "locationData",
          sl.amenities_data as "amenitiesData",
          sl.completion_status as "completionStatus"
        FROM saved_locations sl
        WHERE sl.id = ${locationId}
          AND (
            sl.user_id = ${userId}
            OR EXISTS (
              SELECT 1 FROM location_shares ls
              WHERE ls.saved_location_id = sl.id
                AND ls.shared_with_user_id = ${userId}
            )
          )
      `;

      if (results.length === 0) {
        return {
          success: false,
          error: 'Location not found or access denied',
          message: 'Unable to access this location. It may not exist or you may not have permission.',
        };
      }

      const location = results[0];
      const locationData = location.locationData as UnifiedLocationData;

      // Extract requested category
      if (category === 'all') {
        return formatAllData(location.name || location.address, locationData);
      }

      switch (category) {
        case 'demographics':
          return formatMultiLevelData(
            location.name || location.address,
            'Demographics',
            locationData.demographics
          );

        case 'health':
          return formatMultiLevelData(
            location.name || location.address,
            'Health',
            locationData.health
          );

        case 'safety':
          return formatMultiLevelData(
            location.name || location.address,
            'Safety',
            locationData.safety
          );

        case 'livability':
          return formatMultiLevelData(
            location.name || location.address,
            'Livability',
            locationData.livability
          );

        case 'residential':
          return formatResidentialData(location.name || location.address, locationData.residential);

        case 'amenities':
          return formatAmenitiesData(location.name || location.address, locationData.amenities);

        default:
          return {
            success: false,
            error: 'Invalid category',
            message: `Category "${category}" is not recognized.`,
          };
      }
    } catch (error) {
      console.error('[Location Agent] Error fetching location data:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch location data',
        message: 'Unable to retrieve location data. Please try again.',
      };
    }
  },
});

/**
 * Format multi-level data (demographics, health, safety, livability)
 * Returns the most granular level available with context from broader levels
 */
function formatMultiLevelData(
  locationName: string,
  categoryName: string,
  data: {
    national?: UnifiedDataRow[];
    municipality?: UnifiedDataRow[];
    district?: UnifiedDataRow[];
    neighborhood?: UnifiedDataRow[];
  }
) {
  // Determine most granular level available
  const levels: Array<{ name: string; data: UnifiedDataRow[] }> = [];

  if (data.neighborhood && data.neighborhood.length > 0) {
    levels.push({ name: 'neighborhood', data: data.neighborhood });
  }
  if (data.district && data.district.length > 0) {
    levels.push({ name: 'district', data: data.district });
  }
  if (data.municipality && data.municipality.length > 0) {
    levels.push({ name: 'municipality', data: data.municipality });
  }
  if (data.national && data.national.length > 0) {
    levels.push({ name: 'national', data: data.national });
  }

  if (levels.length === 0) {
    return {
      success: false,
      message: `No ${categoryName.toLowerCase()} data available for this location.`,
    };
  }

  // Primary data is most granular level
  const primary = levels[0];

  // Extract key metrics (top 10 most relevant)
  const keyMetrics = extractKeyMetrics(primary.data);

  // Get geographic context from first row
  const geoContext =
    primary.data[0]?.geographicName || primary.data[0]?.geographicCode || 'Unknown';

  return {
    success: true,
    locationName,
    category: categoryName,
    primaryLevel: primary.name,
    geographicContext: geoContext,
    keyMetrics,
    availableLevels: levels.map((l) => l.name),
    message: `${categoryName} data for ${locationName} at ${primary.name} level.`,
  };
}

/**
 * Extract key metrics from data rows
 * Prioritizes scored metrics and most important fields
 */
function extractKeyMetrics(data: UnifiedDataRow[]) {
  // Sort by importance: scored items first, then by display value
  const sorted = [...data].sort((a, b) => {
    const aHasScore = a.calculatedScore !== undefined && a.calculatedScore !== null;
    const bHasScore = b.calculatedScore !== undefined && b.calculatedScore !== null;

    if (aHasScore && !bHasScore) return -1;
    if (!aHasScore && bHasScore) return 1;
    return 0;
  });

  // Take top 15 metrics
  return sorted.slice(0, 15).map((row) => ({
    title: row.titleEn || row.title,
    value: row.displayValue || String(row.value),
    unit: row.unit || '',
    score: row.calculatedScore,
    // Simplified interpretation
    interpretation:
      row.calculatedScore !== undefined && row.calculatedScore !== null
        ? interpretScore(row.calculatedScore)
        : undefined,
  }));
}

/**
 * Interpret score value into human-readable text
 */
function interpretScore(score: number): string {
  if (score >= 0.7) return 'Much better than average';
  if (score >= 0.3) return 'Above average';
  if (score >= -0.3) return 'Average';
  if (score >= -0.7) return 'Below average';
  return 'Much worse than average';
}

/**
 * Format residential data
 */
function formatResidentialData(locationName: string, residential: ResidentialData | null) {
  if (!residential) {
    return {
      success: false,
      message: `No residential data available for ${locationName}.`,
    };
  }

  // Extract key housing market metrics
  const keyMetrics: Array<{ title: string; data: unknown }> = [];

  if (residential.typologie) {
    keyMetrics.push({
      title: 'Housing Types',
      data: residential.typologie,
    });
  }

  if (residential.woonoppervlak) {
    keyMetrics.push({
      title: 'Living Area',
      data: residential.woonoppervlak,
    });
  }

  if (residential.transactieprijs) {
    keyMetrics.push({
      title: 'Transaction Prices',
      data: residential.transactieprijs,
    });
  }

  return {
    success: true,
    locationName,
    category: 'Residential',
    keyMetrics,
    message: `Housing market data for ${locationName}.`,
  };
}

/**
 * Format amenities data
 */
function formatAmenitiesData(locationName: string, amenities: UnifiedDataRow[]) {
  if (!amenities || amenities.length === 0) {
    return {
      success: false,
      message: `No amenities data available for ${locationName}.`,
    };
  }

  // Group by category
  const grouped: Record<string, { count: number; items: string[] }> = {};

  amenities.forEach((amenity) => {
    const category = amenity.metadata?.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = { count: 0, items: [] };
    }
    grouped[category].count++;
    if (grouped[category].items.length < 3 && amenity.title) {
      grouped[category].items.push(amenity.title);
    }
  });

  return {
    success: true,
    locationName,
    category: 'Amenities',
    totalCount: amenities.length,
    categories: Object.entries(grouped).map(([name, data]) => ({
      category: name,
      count: data.count,
      examples: data.items,
    })),
    message: `Found ${amenities.length} amenities near ${locationName}.`,
  };
}

/**
 * Format all data - provides summary of all categories
 */
function formatAllData(locationName: string, locationData: UnifiedLocationData) {
  const summary: Record<string, unknown> = {};

  // Demographics summary
  if (locationData.demographics.neighborhood?.length > 0) {
    summary.demographics = {
      level: 'neighborhood',
      keyMetrics: extractKeyMetrics(locationData.demographics.neighborhood).slice(0, 5),
    };
  } else if (locationData.demographics.municipality?.length > 0) {
    summary.demographics = {
      level: 'municipality',
      keyMetrics: extractKeyMetrics(locationData.demographics.municipality).slice(0, 5),
    };
  }

  // Safety summary
  if (locationData.safety.neighborhood?.length > 0) {
    summary.safety = {
      level: 'neighborhood',
      keyMetrics: extractKeyMetrics(locationData.safety.neighborhood).slice(0, 3),
    };
  }

  // Health summary
  if (locationData.health.municipality?.length > 0) {
    summary.health = {
      level: 'municipality',
      keyMetrics: extractKeyMetrics(locationData.health.municipality).slice(0, 3),
    };
  }

  // Amenities count
  if (locationData.amenities?.length > 0) {
    summary.amenities = {
      count: locationData.amenities.length,
    };
  }

  // Residential availability
  summary.residential = {
    available: !!locationData.residential,
  };

  return {
    success: true,
    locationName,
    category: 'All Categories',
    summary,
    message: `Summary of all data for ${locationName}.`,
  };
}
