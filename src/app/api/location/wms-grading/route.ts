/**
 * WMS Grading API Endpoint
 * Performs configured sampling on WMS layers based on wmsGradingConfig
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWMSSamplingService } from '@/features/location/data/sources/WMSSamplingService';
import { getWMSLayer } from '@/features/location/components/Maps/wmsLayers';
import {
  getLayersByPriority,
  getLayerConfig,
  getSamplingConfig,
  SCALE_CONFIGS,
  type LayerGradingConfig,
} from '@/features/location/data/sources/wmsGradingConfig';
import type {
  WMSGradingRequest,
  WMSGradingResponse,
  WMSGradingData,
  WMSLayerGrading,
  PointSample,
  AreaSample,
  MaxAreaSample,
} from '@/features/location/types/wms-grading';

/**
 * POST /api/location/wms-grading
 * Grade WMS layers at a specific location using configured sampling methods
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

    // Get configured layers (25 layers, skips historical/amenity layers)
    // Sorted by priority (critical layers first)
    const configuredLayers = getLayersByPriority();

    // Filter by layer_ids if provided
    const layersToGrade = body.layer_ids && body.layer_ids.length > 0
      ? configuredLayers.filter(layer => body.layer_ids!.includes(layer.layerId))
      : configuredLayers;

    console.log(`🎯 Grading ${layersToGrade.length} configured WMS layers at ${body.address}`);
    console.log(`📊 Critical layers: ${layersToGrade.filter(l => l.critical).length}`);

    const gradingResults: WMSLayerGrading[] = [];
    let totalSamplesTaken = 0;

    // Process layers in parallel batches to speed up grading
    const PARALLEL_LAYERS = 3; // Process 3 layers at once to stay under timeout

    /**
     * Grade a single layer with all its configured sampling methods
     */
    const gradeLayer = async (layerConfig: LayerGradingConfig): Promise<WMSLayerGrading> => {
      const wmsLayer = getWMSLayer(layerConfig.category, layerConfig.layerId);

      if (!wmsLayer) {
        console.warn(`⚠️ WMS layer not found: ${layerConfig.layerId}`);
        return {
          layer_id: layerConfig.layerId,
          layer_name: layerConfig.name,
          wms_layer_name: '',
          point_sample: null,
          average_area_sample: null,
          max_area_sample: null,
          errors: ['Layer not found in WMS configuration'],
        };
      }

      // Skip amenity layers
      if (wmsLayer.amenityCategoryId) {
        return {
          layer_id: layerConfig.layerId,
          layer_name: layerConfig.name,
          wms_layer_name: wmsLayer.layers,
          point_sample: null,
          average_area_sample: null,
          max_area_sample: null,
          errors: ['Amenity layer - skipped'],
        };
      }

      console.log(`🔍 Grading: ${layerConfig.name} (${layerConfig.category})`);

      const grading: Partial<WMSLayerGrading> = {
        layer_id: layerConfig.layerId,
        layer_name: layerConfig.name,
        wms_layer_name: wmsLayer.layers,
        errors: [],
      };

      let layerSampleCount = 0;

      // Perform configured sampling methods in parallel
      const samplingTasks: Promise<void>[] = [];

      // Point sample
      if (layerConfig.methods.point) {
        const config = getSamplingConfig(layerConfig.layerId, 'point');
        if (config) {
          const service = createWMSSamplingService(config.config);
          samplingTasks.push(
            service.pointSample(wmsLayer.url, wmsLayer.layers, location)
              .then(result => {
                grading.point_sample = result;
                if (result) layerSampleCount += 1;
              })
              .catch(err => {
                grading.errors!.push(`Point sample failed: ${err.message}`);
              })
          );
        }
      }

      // Average area sample
      if (layerConfig.methods.average) {
        const config = getSamplingConfig(layerConfig.layerId, 'average');
        if (config) {
          const service = createWMSSamplingService(config.config);
          samplingTasks.push(
            service.averageAreaSample(wmsLayer.url, wmsLayer.layers, location)
              .then(result => {
                grading.average_area_sample = result;
                if (result) layerSampleCount += result.sample_count;
              })
              .catch(err => {
                grading.errors!.push(`Average area sample failed: ${err.message}`);
              })
          );
        }
      }

      // Max area sample
      if (layerConfig.methods.max) {
        const config = getSamplingConfig(layerConfig.layerId, 'max');
        if (config) {
          const service = createWMSSamplingService(config.config);
          samplingTasks.push(
            service.maxAreaSample(wmsLayer.url, wmsLayer.layers, location)
              .then(result => {
                grading.max_area_sample = result;
                if (result) layerSampleCount += result.sample_count;
              })
              .catch(err => {
                grading.errors!.push(`Max area sample failed: ${err.message}`);
              })
          );
        }
      }

      // Handle alternate scales (e.g., road traffic noise with BOTH quick and default)
      if (layerConfig.alternateScales) {
        for (const altScale of layerConfig.alternateScales) {
          const altConfig = SCALE_CONFIGS[altScale.scale];
          const service = createWMSSamplingService(altConfig);

          if (altScale.method === 'max') {
            samplingTasks.push(
              service.maxAreaSample(wmsLayer.url, wmsLayer.layers, location)
                .then(result => {
                  // Store alternate scale result
                  // For now, we'll keep the larger radius result as the primary
                  if (result && grading.max_area_sample) {
                    if (result.radius_meters > grading.max_area_sample.radius_meters) {
                      grading.max_area_sample = result;
                    }
                  } else if (result) {
                    grading.max_area_sample = result;
                  }
                  if (result) layerSampleCount += result.sample_count;
                })
                .catch(err => {
                  grading.errors!.push(`Alt max sample (${altScale.scale}) failed: ${err.message}`);
                })
            );
          }
        }
      }

      // Wait for all sampling tasks to complete
      await Promise.all(samplingTasks);

      // Update total sample count (thread-safe since we're awaiting each batch)
      totalSamplesTaken += layerSampleCount;

      // Check if all samples failed
      if (!grading.point_sample && !grading.average_area_sample && !grading.max_area_sample) {
        grading.errors!.push('All sampling methods failed - layer may not have data at this location');
      }

      // Clean up errors array
      if (grading.errors!.length === 0) {
        delete grading.errors;
      }

      console.log(`✅ ${layerConfig.name}: ${grading.point_sample ? '✓Point ' : ''}${grading.average_area_sample ? '✓Avg ' : ''}${grading.max_area_sample ? '✓Max' : ''}`);

      return grading as WMSLayerGrading;
    };

    // Process layers in parallel batches
    for (let i = 0; i < layersToGrade.length; i += PARALLEL_LAYERS) {
      const batch = layersToGrade.slice(i, i + PARALLEL_LAYERS);
      console.log(`📦 Processing batch ${Math.floor(i / PARALLEL_LAYERS) + 1}/${Math.ceil(layersToGrade.length / PARALLEL_LAYERS)} (${batch.length} layers)`);

      try {
        // Grade all layers in this batch in parallel
        const batchResults = await Promise.all(
          batch.map(layerConfig => gradeLayer(layerConfig))
        );

        gradingResults.push(...batchResults);
      } catch (error) {
        console.error(`❌ Error processing batch:`, error);
        // Add failed layers from this batch
        batch.forEach(layerConfig => {
          gradingResults.push({
            layer_id: layerConfig.layerId,
            layer_name: layerConfig.name,
            wms_layer_name: '',
            point_sample: null,
            average_area_sample: null,
            max_area_sample: null,
            errors: [error instanceof Error ? error.message : 'Batch processing error'],
          });
        });
      }
    }

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
      total_samples_taken: totalSamplesTaken,
    };

    // Build response
    const response: WMSGradingData = {
      location,
      address: body.address,
      layers: layersRecord,
      graded_at: new Date(),
      sampling_config: {
        area_radius_meters: 500, // Default/most common
        grid_resolution_meters: 50,
        max_samples_per_layer: 400,
      },
      statistics,
    };

    console.log(
      `🎉 WMS grading complete: ${statistics.successful_layers}/${statistics.total_layers} layers successful (${statistics.total_samples_taken} total samples)`
    );

    return NextResponse.json<WMSGradingResponse>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('❌ WMS grading API error:', error);
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
 * Get information about configured WMS layers
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const info = searchParams.get('info');

  if (info === 'true') {
    const layers = getLayersByPriority();

    return NextResponse.json({
      success: true,
      data: {
        total_layers: layers.length,
        critical_layers: layers.filter(l => l.critical).length,
        categories: Array.from(new Set(layers.map(l => l.category))),
        layers: layers.map((layer) => ({
          id: layer.layerId,
          category: layer.category,
          name: layer.name,
          methods: layer.methods,
          scale: layer.scale,
          priority: layer.priority,
          critical: layer.critical,
          unit: layer.unit,
        })),
      },
    });
  }

  return NextResponse.json({
    success: false,
    error: 'Use POST to grade WMS layers, or GET with ?info=true to list configured layers',
  });
}
