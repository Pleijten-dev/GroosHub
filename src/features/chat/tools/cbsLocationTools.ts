/**
 * CBS Location Search Tools
 *
 * These tools enable the AI assistant to search CBS/PDOK/RIVM/Politie databases
 * for any Dutch address, without requiring a saved location snapshot.
 *
 * Uses free public APIs only:
 * - PDOK Locatieserver for geocoding
 * - CBS OData for demographics and livability
 * - RIVM/CBS for health data
 * - Politie/CBS for safety data
 */

import { tool } from 'ai';
import { z } from 'zod';

// Import existing location data clients
import { LocationGeocoderService } from '@/features/location/data/services/locationGeocoder';
import { CBSDemographicsClient } from '@/features/location/data/sources/cbs-demographics/client';
import { CBSLivabilityClient } from '@/features/location/data/sources/cbs-livability/client';
import { RIVMHealthClient } from '@/features/location/data/sources/rivm-health/client';
import { PolitieSafetyClient } from '@/features/location/data/sources/politie-safety/client';

/**
 * Create CBS location search tools
 * These tools do not require authentication as they use public APIs
 */
export function createCBSLocationTools() {
  // Initialize clients
  const geocoder = new LocationGeocoderService();
  const cbsDemographics = new CBSDemographicsClient();
  const cbsLivability = new CBSLivabilityClient();
  const rivmHealth = new RIVMHealthClient();
  const politieSafety = new PolitieSafetyClient();

  return {
    /**
     * Search CBS data for any Dutch address
     * Geocodes the address and fetches available public data
     */
    searchCBSLocation: tool({
      description: `Search CBS (Statistics Netherlands) database for demographic, health, safety, and livability data for any Dutch address or neighborhood.

      Use this tool when:
      - User asks about statistics for a specific Dutch location (city, neighborhood, address)
      - User wants to know demographics, safety, health, or livability data for an area
      - User asks "What are the statistics for..." or "Search data for..."
      - User asks about population, crime rates, or quality of life for a Dutch location

      This tool uses FREE public APIs (CBS, PDOK, RIVM, Politie) and does NOT require a saved location.

      Returns data at multiple geographic levels:
      - National (Netherlands average)
      - Municipality (gemeente)
      - District (wijk)
      - Neighborhood (buurt)`,

      inputSchema: z.object({
        address: z.string().describe('Dutch address or location name to search (e.g., "Amsterdam Centrum", "Kalverstraat 1 Amsterdam", "Utrecht Overvecht")'),
        categories: z.array(z.enum(['demographics', 'health', 'safety', 'livability', 'all']))
          .default(['all'])
          .describe('Data categories to fetch. Use "all" for comprehensive data.'),
      }),

      async execute({ address, categories = ['all'] }) {
        try {
          console.log(`🔍 [CBS Search] Searching for: ${address}`);

          // Step 1: Geocode the address using PDOK
          const locationData = await geocoder.geocodeAddress(address);

          if (!locationData) {
            return {
              success: false,
              error: `Could not find location: "${address}". Please try a more specific Dutch address or neighborhood name.`,
            };
          }

          console.log(`✅ [CBS Search] Geocoded to:`);
          console.log(`   Municipality: ${locationData.municipality.statnaam} (${locationData.municipality.statcode})`);
          console.log(`   District: ${locationData.district?.statnaam || 'N/A'} (${locationData.district?.statcode || 'N/A'})`);
          console.log(`   Neighborhood: ${locationData.neighborhood?.statnaam || 'N/A'} (${locationData.neighborhood?.statcode || 'N/A'})`);

          const fetchAll = categories.includes('all');
          const results: Record<string, unknown> = {
            location: {
              address: locationData.address,
              fullAddress: locationData.fullAddress,
              coordinates: locationData.coordinates.wgs84,
              municipality: {
                code: locationData.municipality.statcode,
                name: locationData.municipality.statnaam,
              },
              district: locationData.district ? {
                code: locationData.district.statcode,
                name: locationData.district.statnaam,
              } : null,
              neighborhood: locationData.neighborhood ? {
                code: locationData.neighborhood.statcode,
                name: locationData.neighborhood.statnaam,
              } : null,
            },
          };

          // Step 2: Fetch data from each requested category in parallel
          const fetchPromises: Promise<void>[] = [];

          // Demographics (CBS 84583NED)
          if (fetchAll || categories.includes('demographics')) {
            fetchPromises.push(
              cbsDemographics.fetchMultiLevel(
                locationData.municipality.statcode,
                locationData.district?.statcode || null,
                locationData.neighborhood?.statcode || null
              ).then(data => {
                results.demographics = {
                  source: 'CBS Kerncijfers wijken en buurten (84583NED)',
                  data: data,
                };
              })
            );
          }

          // Livability (CBS 85146NED)
          if (fetchAll || categories.includes('livability')) {
            fetchPromises.push(
              cbsLivability.fetchMultiLevel(
                locationData.municipality.statcode
              ).then(data => {
                results.livability = {
                  source: 'CBS Leefervaring en voorzieningen (85146NED)',
                  data: data,
                };
              })
            );
          }

          // Health (RIVM 50120NED)
          if (fetchAll || categories.includes('health')) {
            fetchPromises.push(
              rivmHealth.fetchMultiLevel(
                locationData.municipality.statcode,
                locationData.district?.statcode || null,
                locationData.neighborhood?.statcode || null
              ).then(data => {
                results.health = {
                  source: 'RIVM Gezondheid en zorggebruik (50120NED)',
                  data: data,
                };
              })
            );
          }

          // Safety (Politie 47018NED)
          if (fetchAll || categories.includes('safety')) {
            fetchPromises.push(
              politieSafety.fetchMultiLevel(
                locationData.municipality.statcode,
                locationData.district?.statcode || null,
                locationData.neighborhood?.statcode || null
              ).then(data => {
                results.safety = {
                  source: 'Politie Geregistreerde criminaliteit (47018NED)',
                  data: data,
                };
              })
            );
          }

          // Wait for all fetches to complete
          await Promise.all(fetchPromises);

          return {
            success: true,
            message: `Found data for ${locationData.municipality.statnaam}${locationData.neighborhood ? `, ${locationData.neighborhood.statnaam}` : ''}`,
            ...results,
          };
        } catch (error) {
          console.error('❌ [CBS Search] Error:', error);
          return {
            success: false,
            error: `Failed to search CBS data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Get available CBS data sources and their descriptions
     */
    explainCBSDataSources: tool({
      description: `Explain what data sources are available and what they contain.

      Use this tool when:
      - User asks what data is available
      - User wants to understand what CBS/RIVM/Politie data means
      - User asks about data sources or methodology`,

      inputSchema: z.object({}),

      async execute() {
        return {
          success: true,
          dataSources: [
            {
              name: 'CBS Demographics',
              dataset: '84583NED - Kerncijfers wijken en buurten',
              description: 'Population statistics including age distribution, household composition, migration background, income levels, and housing characteristics.',
              coverage: 'National, Municipality, District (Wijk), Neighborhood (Buurt)',
              updateFrequency: 'Annual',
              provider: 'CBS (Statistics Netherlands)',
            },
            {
              name: 'CBS Livability',
              dataset: '85146NED - Leefervaring en voorzieningen',
              description: 'Quality of life indicators including satisfaction with neighborhood, access to facilities, social cohesion, and environmental quality.',
              coverage: 'National, Municipality',
              updateFrequency: 'Annual',
              provider: 'CBS (Statistics Netherlands)',
            },
            {
              name: 'RIVM Health',
              dataset: '50120NED - Gezondheid en zorggebruik',
              description: 'Health indicators including life expectancy, chronic conditions, healthcare usage, and lifestyle factors.',
              coverage: 'National, Municipality, District (Wijk), Neighborhood (Buurt)',
              updateFrequency: 'Annual',
              provider: 'RIVM (National Institute for Public Health)',
            },
            {
              name: 'Politie Safety',
              dataset: '47018NED - Geregistreerde criminaliteit',
              description: 'Crime statistics including registered crimes by type (property crime, violent crime, vandalism, etc.).',
              coverage: 'National, Municipality, District (Wijk), Neighborhood (Buurt)',
              updateFrequency: 'Annual',
              provider: 'Politie (Dutch National Police)',
            },
          ],
          notes: [
            'All data sources are publicly available through CBS OData APIs',
            'Data is typically 1-2 years behind the current year',
            'Not all metrics are available for all geographic levels',
            'Some neighborhoods may have suppressed data for privacy reasons',
          ],
        };
      },
    }),
  };
}
