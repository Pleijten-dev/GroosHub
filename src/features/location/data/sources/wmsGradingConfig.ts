/**
 * WMS Layer Grading Configuration
 * Defines which sampling methods and scales to use for each WMS layer
 *
 * Based on user requirements:
 * - Historical: Mostly skip, only building age
 * - Climate: Max for heat, Average for cooling
 * - Air Quality: All Max (worst-case exposure)
 * - Nature: All Average (neighborhood greenness)
 * - Noise: All Max (worst-case noise)
 * - Archaeology: Point only
 * - Topography: Point + Average for elevation
 */

export type SamplingMethod = 'point' | 'average' | 'max' | 'skip';
export type SamplingScale = 'quick' | 'default' | 'detailed';

export interface LayerGradingConfig {
  /** Layer ID from wmsLayers.ts */
  layerId: string;
  /** Display name */
  name: string;
  /** Category */
  category: string;
  /** Sampling methods to perform */
  methods: {
    point?: boolean;
    average?: boolean;
    max?: boolean;
  };
  /** Sampling scale configuration */
  scale: SamplingScale;
  /** Alternative scale for specific methods (e.g., road noise with quick + default) */
  alternateScales?: {
    method: 'point' | 'average' | 'max';
    scale: SamplingScale;
  }[];
  /** Priority for grading order (1 = highest) */
  priority: number;
  /** Whether this layer is critical (blocks rapport generation if incomplete) */
  critical: boolean;
  /** Expected value type */
  valueType: 'numeric' | 'categorical' | 'mixed';
  /** Unit of measurement */
  unit?: string;
}

/**
 * Complete WMS layer grading configuration
 * Organized by category with specific sampling strategies
 */
export const WMS_GRADING_CONFIG: Record<string, LayerGradingConfig> = {
  // ============================================================================
  // HISTORICAL MAPS - Mostly skipped, only building age matters
  // ============================================================================

  rivm_pand_bouwjaar: {
    layerId: 'rivm_pand_bouwjaar',
    name: 'Pand bouwjaar',
    category: 'historical',
    methods: { average: true },
    scale: 'quick',
    priority: 50,
    critical: false,
    valueType: 'numeric',
    unit: 'jaar'
  },

  // ============================================================================
  // CLIMATE & ENVIRONMENT - Heat islands (max) and cooling effects (average)
  // ============================================================================

  stedelijk_hitte_eiland_effect: {
    layerId: 'stedelijk_hitte_eiland_effect',
    name: 'Stedelijk hitte eiland effect',
    category: 'climate',
    methods: { max: true },
    scale: 'quick',
    priority: 20,
    critical: true,
    valueType: 'numeric',
    unit: '°C'
  },

  rivm_dalingUHImaxmediaan: {
    layerId: 'rivm_dalingUHImaxmediaan',
    name: 'Dalingskaart UHI',
    category: 'climate',
    methods: { max: true },
    scale: 'quick',
    priority: 30,
    critical: false,
    valueType: 'numeric',
    unit: '°C'
  },

  verkoelend_effect_groen: {
    layerId: 'verkoelend_effect_groen',
    name: 'Verkoelend effect groen',
    category: 'climate',
    methods: { average: true },
    scale: 'quick',
    priority: 30,
    critical: false,
    valueType: 'numeric',
    unit: '°C'
  },

  // ============================================================================
  // AIR QUALITY - All max area (worst-case exposure assessment)
  // ============================================================================

  mgr_tot_2020: {
    layerId: 'mgr_tot_2020',
    name: 'MGR Milieugezondheidsrisico',
    category: 'airQuality',
    methods: { max: true },
    scale: 'default',
    priority: 5,
    critical: true,
    valueType: 'numeric',
    unit: '%'
  },

  rivm_nsl_ec2021: {
    layerId: 'rivm_nsl_ec2021',
    name: 'Roet (EC)',
    category: 'airQuality',
    methods: { max: true },
    scale: 'default',
    priority: 10,
    critical: true,
    valueType: 'numeric',
    unit: 'µg EC/m³'
  },

  rivm_nsl_pm25_2021: {
    layerId: 'rivm_nsl_pm25_2021',
    name: 'Fijn stof PM2.5',
    category: 'airQuality',
    methods: { max: true },
    scale: 'default',
    priority: 8,
    critical: true,
    valueType: 'numeric',
    unit: 'µg PM2.5/m³'
  },

  rivm_nsl_pm10_2021: {
    layerId: 'rivm_nsl_pm10_2021',
    name: 'Fijn stof PM10',
    category: 'airQuality',
    methods: { max: true },
    scale: 'default',
    priority: 9,
    critical: true,
    valueType: 'numeric',
    unit: 'µg PM10/m³'
  },

  rivm_nsl_no2_2021: {
    layerId: 'rivm_nsl_no2_2021',
    name: 'Stikstofdioxide (NO2)',
    category: 'airQuality',
    methods: { max: true },
    scale: 'default',
    priority: 10,
    critical: true,
    valueType: 'numeric',
    unit: 'µg/m³'
  },

  // ============================================================================
  // NATURE & BIODIVERSITY - All average area (neighborhood greenness)
  // ============================================================================

  bomenkaart_v2: {
    layerId: 'bomenkaart_v2',
    name: 'Bomenkaart',
    category: 'nature',
    methods: { average: true },
    scale: 'default',
    priority: 25,
    critical: true,
    valueType: 'numeric',
    unit: '%'
  },

  graskaart_v2: {
    layerId: 'graskaart_v2',
    name: 'Groenkaart',
    category: 'nature',
    methods: { average: true },
    scale: 'default',
    priority: 25,
    critical: false,
    valueType: 'numeric',
    unit: '%'
  },

  struikenkaart_v2: {
    layerId: 'struikenkaart_v2',
    name: 'Struikenkaart',
    category: 'nature',
    methods: { average: true },
    scale: 'default',
    priority: 30,
    critical: false,
    valueType: 'numeric',
    unit: '%'
  },

  koolstof_opslag_biomassa: {
    layerId: 'koolstof_opslag_biomassa',
    name: 'Koolstof opslag biomassa',
    category: 'nature',
    methods: { average: true },
    scale: 'default',
    priority: 40,
    critical: false,
    valueType: 'numeric',
    unit: 'ton C/dam²/jaar'
  },

  teeb_afvang_pm10: {
    layerId: 'teeb_afvang_pm10',
    name: 'Afvang PM10 door groen',
    category: 'nature',
    methods: { average: true },
    scale: 'default',
    priority: 35,
    critical: false,
    valueType: 'numeric',
    unit: 'ton PM10/dam²/jaar'
  },

  rivm_percbomenbuurt: {
    layerId: 'rivm_percbomenbuurt',
    name: 'Percentage bomen in buurt',
    category: 'nature',
    methods: { average: true },
    scale: 'default',
    priority: 25,
    critical: false,
    valueType: 'numeric',
    unit: '%'
  },

  // ============================================================================
  // NOISE POLLUTION - All max area (worst-case noise exposure)
  // Road traffic has BOTH quick and default scales
  // ============================================================================

  rivm_geluidkaart_lden_alle_bronnen: {
    layerId: 'rivm_geluidkaart_lden_alle_bronnen',
    name: 'Geluid alle bronnen',
    category: 'noise',
    methods: { max: true },
    scale: 'quick',
    priority: 12,
    critical: true,
    valueType: 'numeric',
    unit: 'dB'
  },

  rivm_geluid_lden_wegverkeer_2020: {
    layerId: 'rivm_geluid_lden_wegverkeer_2020',
    name: 'Geluid wegverkeer',
    category: 'noise',
    methods: { max: true },
    scale: 'quick',
    // SPECIAL: This layer gets graded with BOTH quick and default scales
    alternateScales: [
      { method: 'max', scale: 'default' }
    ],
    priority: 15,
    critical: true,
    valueType: 'numeric',
    unit: 'dB'
  },

  rivm_geluid_lnight_wegverkeer_2020: {
    layerId: 'rivm_geluid_lnight_wegverkeer_2020',
    name: 'Geluid wegverkeer nacht',
    category: 'noise',
    methods: { max: true },
    scale: 'quick',
    priority: 15,
    critical: true,
    valueType: 'numeric',
    unit: 'dB'
  },

  rivm_geluid_lden_treinverkeer_2020: {
    layerId: 'rivm_geluid_lden_treinverkeer_2020',
    name: 'Geluid treinverkeer',
    category: 'noise',
    methods: { max: true },
    scale: 'quick',
    priority: 20,
    critical: false,
    valueType: 'numeric',
    unit: 'dB'
  },

  rivm_geluid_lden_industrie_2008: {
    layerId: 'rivm_geluid_lden_industrie_2008',
    name: 'Geluid industrie',
    category: 'noise',
    methods: { max: true },
    scale: 'default',
    priority: 20,
    critical: false,
    valueType: 'numeric',
    unit: 'dB'
  },

  geluid_lden_vliegverkeer_2020: {
    layerId: 'geluid_lden_vliegverkeer_2020',
    name: 'Geluid vliegverkeer',
    category: 'noise',
    methods: { max: true },
    scale: 'default',
    priority: 25,
    critical: false,
    valueType: 'numeric',
    unit: 'dB'
  },

  // ============================================================================
  // SOIL & ARCHEOLOGY - Point sample only (categorical data)
  // ============================================================================

  rce_ikaw3_2008: {
    layerId: 'rce_ikaw3_2008',
    name: 'Archeologische vindkans',
    category: 'soil',
    methods: { point: true },
    scale: 'default',
    priority: 45,
    critical: false,
    valueType: 'categorical',
    unit: undefined
  },

  // ============================================================================
  // TOPOGRAPHY & BUILDINGS - Elevation (point + average), Energy labels (average)
  // ============================================================================

  dtm_05m: {
    layerId: 'dtm_05m',
    name: 'Terrein hoogte (DTM)',
    category: 'topography',
    methods: { point: true, average: true },
    scale: 'default',
    priority: 35,
    critical: false,
    valueType: 'numeric',
    unit: 'm'
  },

  dsm_05m: {
    layerId: 'dsm_05m',
    name: 'Oppervlakte hoogte (DSM)',
    category: 'topography',
    methods: { point: true, average: true },
    scale: 'default',
    priority: 35,
    critical: false,
    valueType: 'numeric',
    unit: 'm'
  },

  vw_rvo_pand_energielabels: {
    layerId: 'vw_rvo_pand_energielabels',
    name: 'Energielabels panden',
    category: 'topography',
    methods: { average: true },
    scale: 'default',
    priority: 40,
    critical: false,
    valueType: 'categorical',
    unit: undefined
  },
};

/**
 * Sampling scale configurations
 * Defines radius and grid resolution for each scale
 */
export const SCALE_CONFIGS = {
  quick: {
    area_radius_meters: 250,
    grid_resolution_meters: 100,
    max_samples_per_layer: 25,
    description: 'Quick scan (250m radius, ~25 samples)'
  },
  default: {
    area_radius_meters: 500,
    grid_resolution_meters: 50,
    max_samples_per_layer: 400,  // Back to original - testing with reduced logging
    description: 'Standard scan (500m radius, ~100-400 samples)'
  },
  detailed: {
    area_radius_meters: 1000,
    grid_resolution_meters: 25,
    max_samples_per_layer: 1600,  // Back to original - testing with reduced logging
    description: 'Detailed scan (1000m radius, ~1300-1600 samples)'
  }
} as const;

/**
 * Get all layers to grade (excludes skipped layers)
 */
export function getLayersToGrade(): LayerGradingConfig[] {
  return Object.values(WMS_GRADING_CONFIG);
}

/**
 * Get layers sorted by priority (critical first)
 */
export function getLayersByPriority(): LayerGradingConfig[] {
  return Object.values(WMS_GRADING_CONFIG).sort((a, b) => {
    // Critical layers first
    if (a.critical !== b.critical) {
      return a.critical ? -1 : 1;
    }
    // Then by priority number (lower = higher priority)
    return a.priority - b.priority;
  });
}

/**
 * Get critical layers only (block rapport generation until complete)
 */
export function getCriticalLayers(): LayerGradingConfig[] {
  return Object.values(WMS_GRADING_CONFIG).filter(layer => layer.critical);
}

/**
 * Get layer configuration by ID
 */
export function getLayerConfig(layerId: string): LayerGradingConfig | undefined {
  return WMS_GRADING_CONFIG[layerId];
}

/**
 * Get sampling configuration for a specific layer and method
 */
export function getSamplingConfig(
  layerId: string,
  method: 'point' | 'average' | 'max'
): { scale: SamplingScale; config: typeof SCALE_CONFIGS[SamplingScale] } | null {
  const layer = WMS_GRADING_CONFIG[layerId];
  if (!layer) return null;

  // Check for alternate scale for this method
  const alternateScale = layer.alternateScales?.find(alt => alt.method === method);
  const scale = alternateScale?.scale || layer.scale;

  return {
    scale,
    config: SCALE_CONFIGS[scale]
  };
}

/**
 * Statistics about grading configuration
 */
export const GRADING_STATS = {
  total_layers: Object.keys(WMS_GRADING_CONFIG).length,
  critical_layers: getCriticalLayers().length,
  by_category: {
    historical: 1,
    climate: 3,
    airQuality: 5,
    nature: 6,
    noise: 6,
    soil: 1,
    topography: 3
  },
  by_method: {
    point: Object.values(WMS_GRADING_CONFIG).filter(l => l.methods.point).length,
    average: Object.values(WMS_GRADING_CONFIG).filter(l => l.methods.average).length,
    max: Object.values(WMS_GRADING_CONFIG).filter(l => l.methods.max).length
  },
  estimated_time_seconds: {
    quick: 2,
    default: 10,   // Back to original with 400 samples
    detailed: 130  // Back to original with 1600 samples
  }
};

/**
 * Calculate estimated grading time for all configured layers
 */
export function getEstimatedGradingTime(): number {
  let totalSeconds = 0;

  Object.values(WMS_GRADING_CONFIG).forEach(layer => {
    const baseTime = GRADING_STATS.estimated_time_seconds[layer.scale];

    // Count methods
    const methodCount =
      (layer.methods.point ? 1 : 0) +
      (layer.methods.average ? 1 : 0) +
      (layer.methods.max ? 1 : 0);

    totalSeconds += baseTime * methodCount;

    // Add time for alternate scales (e.g., road noise with quick + default)
    if (layer.alternateScales) {
      layer.alternateScales.forEach(alt => {
        totalSeconds += GRADING_STATS.estimated_time_seconds[alt.scale];
      });
    }
  });

  return totalSeconds;
}
