/**
 * WMS Grading API Endpoint
 * Performs point, average, and maximum sampling on WMS layers for a given location
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWMSSamplingService } from '@/features/location/data/sources/WMSSamplingService';
import { WMS_CATEGORIES } from '@/features/location/components/Maps/wmsLayers';
import type {
  WMSGradingRequest,
  WMSGradingResponse,
  WMSGradingData,
  WMSLayerGrading,
  SamplingConfig,
} from '@/features/location/types/wms-grading';
import type { WMSLayerConfig } from '@/features/location/components/Maps/wmsLayers';

/**
 * POST /api/location/wms-grading
 * Grade WMS layers at a specific location
 */
export async function POST(request: NextRequest) {
  try {
    const body: WMSGradingRequest = await request.json();

    // Validate input
    if (!body.latitude || !body.longitude || !body.address) {
      return NextResponse.json<WMSGradingResponse>(
        {
          success: false,
          error: 'Missing required fields: latitude, longitude, address',
        },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (
      body.latitude < -90 ||
      body.latitude > 90 ||
      body.longitude < -180 ||
      body.longitude > 180
    ) {
      return NextResponse.json<WMSGradingResponse>(
        {
          success: false,
          error: 'Invalid coordinates',
        },
        { status: 400 }
      );
    }

    const location = { lat: body.latitude, lng: body.longitude };

    // Create sampling service with custom config if provided
    const samplingService = createWMSSamplingService(body.sampling_config);

    // Get all WMS layers to grade
    const layersToGrade = getAllWMSLayers(body.layer_ids);

    console.log(`Grading ${layersToGrade.length} WMS layers at ${body.address}`);

    // Grade each layer
    const gradingPromises = layersToGrade.map(async (layerConfig) => {
      const layerId = layerConfig.layerId;
      const errors: string[] = [];

      try {
        // Skip amenity marker layers (they're not real WMS layers)
        if (layerConfig.config.amenityCategoryId) {
          return null;
        }

        console.log(`Grading layer: ${layerConfig.config.title}`);

        // Perform all three sampling methods in parallel
        const [pointSample, averageSample, maxSample] = await Promise.all([
          samplingService.pointSample(
            layerConfig.config.url,
            layerConfig.config.layers,
            location
          ),
          samplingService.averageAreaSample(
            layerConfig.config.url,
            layerConfig.config.layers,
            location
          ),
          samplingService.maxAreaSample(
            layerConfig.config.url,
            layerConfig.config.layers,
            location
          ),
        ]);

        // Check if all samples failed
        if (!pointSample && !averageSample && !maxSample) {
          errors.push('All sampling methods failed - layer may not have data at this location');
        }

        const grading: WMSLayerGrading = {
          layer_id: layerId,
          layer_name: layerConfig.config.title,
          wms_layer_name: layerConfig.config.layers,
          point_sample: pointSample,
          average_area_sample: averageSample,
          max_area_sample: maxSample,
          errors: errors.length > 0 ? errors : undefined,
        };

        return grading;
      } catch (error) {
        console.error(`Error grading layer ${layerId}:`, error);
        return {
          layer_id: layerId,
          layer_name: layerConfig.config.title,
          wms_layer_name: layerConfig.config.layers,
          point_sample: null,
          average_area_sample: null,
          max_area_sample: null,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        } as WMSLayerGrading;
      }
    });

    // Wait for all grading operations
    const gradingResults = (await Promise.all(gradingPromises)).filter(
      (result): result is WMSLayerGrading => result !== null
    );

    // Convert to record format
    const layersRecord: Record<string, WMSLayerGrading> = {};
    gradingResults.forEach((grading) => {
      layersRecord[grading.layer_id] = grading;
    });

    // Calculate statistics
    const statistics = {
      total_layers: gradingResults.length,
      successful_layers: gradingResults.filter(
        (g) => g.point_sample || g.average_area_sample || g.max_area_sample
      ).length,
      failed_layers: gradingResults.filter(
        (g) => !g.point_sample && !g.average_area_sample && !g.max_area_sample
      ).length,
      total_samples_taken: gradingResults.reduce(
        (sum, g) =>
          sum +
          (g.point_sample ? 1 : 0) +
          (g.average_area_sample?.sample_count || 0) +
          (g.max_area_sample?.sample_count || 0),
        0
      ),
    };

    // Build response
    const response: WMSGradingData = {
      location,
      address: body.address,
      layers: layersRecord,
      graded_at: new Date(),
      sampling_config: {
        area_radius_meters: body.sampling_config?.area_radius_meters ?? 500,
        grid_resolution_meters: body.sampling_config?.grid_resolution_meters ?? 50,
        max_samples_per_layer: body.sampling_config?.max_samples_per_layer ?? 400,
      },
      statistics,
    };

    console.log(
      `WMS grading complete: ${statistics.successful_layers}/${statistics.total_layers} layers successful`
    );

    return NextResponse.json<WMSGradingResponse>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('WMS grading API error:', error);
    return NextResponse.json<WMSGradingResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/location/wms-grading?info=true
 * Get information about available WMS layers
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const info = searchParams.get('info');

  if (info === 'true') {
    const layers = getAllWMSLayers();

    return NextResponse.json({
      success: true,
      data: {
        total_layers: layers.length,
        categories: Object.keys(WMS_CATEGORIES).map((categoryId) => ({
          id: categoryId,
          name: WMS_CATEGORIES[categoryId].name,
          layer_count: Object.keys(WMS_CATEGORIES[categoryId].layers).length,
        })),
        layers: layers.map((layer) => ({
          id: layer.layerId,
          category: layer.categoryId,
          name: layer.config.title,
          description: layer.config.description,
        })),
      },
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Use POST to grade WMS layers, or GET with ?info=true to list available layers',
  });
}

/**
 * Helper: Get all WMS layers or specific layers by ID
 */
function getAllWMSLayers(
  layerIds?: string[]
): Array<{ layerId: string; categoryId: string; config: WMSLayerConfig }> {
  const allLayers: Array<{ layerId: string; categoryId: string; config: WMSLayerConfig }> = [];

  // Iterate through all categories
  Object.entries(WMS_CATEGORIES).forEach(([categoryId, category]) => {
    Object.entries(category.layers).forEach(([layerId, config]) => {
      // Filter by layerIds if provided
      if (!layerIds || layerIds.length === 0 || layerIds.includes(layerId)) {
        allLayers.push({
          layerId,
          categoryId,
          config,
        });
      }
    });
  });

  return allLayers;
}
