/**
 * Location Score Calculation System
 *
 * Calculates scores for 5 categories comparing a location to the Dutch average.
 * Uses a 1-10 Dutch grade scale where:
 * - 1.0 = worst (far below average)
 * - 5.5 = Dutch average (passing grade)
 * - 10.0 = best (far above average)
 *
 * Categories:
 * 1. Betaalbaarheid (Affordability) - Housing prices + Income data
 * 2. Veiligheid (Safety) - Crime statistics + Safety perception
 * 3. Gezondheid (Health) - Physical, mental, lifestyle health
 * 4. Leefbaarheid (Livability) - Physical environment, social cohesion, nuisance
 * 5. Voorzieningen (Amenities) - 21 amenity categories with proximity
 */

import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import type { AmenityScore } from '../data/scoring/amenityScoring';
import { convertResidentialToRows } from '../components/Residential/residentialDataConverter';

// ============================================================================
// TYPES
// ============================================================================

export interface MetricConfig {
  key: string;
  direction: 'positive' | 'negative';
  weight: number;
  source: 'demographics' | 'health' | 'livability' | 'safety' | 'residential';
}

export interface CategoryConfig {
  id: string;
  nameNl: string;
  nameEn: string;
  metrics: MetricConfig[];
  color: string;
}

export interface CategoryScore {
  id: string;
  nameNl: string;
  nameEn: string;
  grade: number;        // 1-10 Dutch grade scale
  rawScore: number;     // -1 to 1 internal score
  metricsUsed: number;  // Number of metrics with data
  metricsTotal: number; // Total metrics configured
  color: string;
}

export interface LocationScores {
  betaalbaarheid: CategoryScore;
  veiligheid: CategoryScore;
  gezondheid: CategoryScore;
  leefbaarheid: CategoryScore;
  voorzieningen: CategoryScore;
  overall: number;      // Weighted average grade
}

// ============================================================================
// SCORE CONFIGURATION
// ============================================================================

/**
 * Betaalbaarheid (Affordability) Configuration
 * Data from: Woningmarkt (residential) + Demografie (demographics)
 */
export const BETAALBAARHEID_CONFIG: CategoryConfig = {
  id: 'betaalbaarheid',
  nameNl: 'Betaalbaarheid',
  nameEn: 'Affordability',
  color: '#48806a',
  metrics: [
    // Housing Prices (50%)
    { key: 'transactieprijs_laag', direction: 'positive', weight: 0.20, source: 'residential' },
    { key: 'transactieprijs_midden', direction: 'positive', weight: 0.15, source: 'residential' },
    { key: 'transactieprijs_hoog', direction: 'negative', weight: 0.15, source: 'residential' },
    // Income vs Cost (30%)
    { key: 'GemiddeldInkomenPerInwoner_72', direction: 'positive', weight: 0.15, source: 'demographics' },
    { key: 'HuishoudensMetEenLaagInkomen_78', direction: 'negative', weight: 0.15, source: 'demographics' },
    // Housing Variety (20%)
    { key: 'woonoppervlak_klein', direction: 'positive', weight: 0.10, source: 'residential' },
    { key: 'woonoppervlak_midden', direction: 'positive', weight: 0.10, source: 'residential' },
  ],
};

/**
 * Veiligheid (Safety) Configuration
 * Data from: Politie crime statistics + CBS Livability (safety perception)
 */
export const VEILIGHEID_CONFIG: CategoryConfig = {
  id: 'veiligheid',
  nameNl: 'Veiligheid',
  nameEn: 'Safety',
  color: '#477638',
  metrics: [
    // Violent Crime (35%)
    { key: 'Crime_1.4.5', direction: 'negative', weight: 0.12, source: 'safety' },  // Assault
    { key: 'Crime_1.4.4', direction: 'negative', weight: 0.08, source: 'safety' },  // Threats
    { key: 'Crime_1.4.6', direction: 'negative', weight: 0.08, source: 'safety' },  // Street robbery
    { key: 'Crime_1.4.3', direction: 'negative', weight: 0.07, source: 'safety' },  // Public violence
    // Property Crime (30%)
    { key: 'Crime_1.1.1', direction: 'negative', weight: 0.15, source: 'safety' },  // Home burglary
    { key: 'Crime_1.2.1', direction: 'negative', weight: 0.05, source: 'safety' },  // Theft from vehicles
    { key: 'Crime_1.2.2', direction: 'negative', weight: 0.05, source: 'safety' },  // Vehicle theft
    { key: 'Crime_2.2.1', direction: 'negative', weight: 0.05, source: 'safety' },  // Vandalism
    // Safety Perception (20%)
    { key: 'VoeltZichVaakOnveilig_44', direction: 'negative', weight: 0.10, source: 'livability' },
    { key: 'SAvondsOpStraatInBuurtOnveilig_52', direction: 'negative', weight: 0.10, source: 'livability' },
    // Traffic & Other (15%)
    { key: 'Crime_1.3.1', direction: 'negative', weight: 0.08, source: 'safety' },  // Traffic accidents
    { key: 'Crime_2.1.1', direction: 'negative', weight: 0.07, source: 'safety' },  // Drug nuisance
  ],
};

/**
 * Gezondheid (Health) Configuration
 * Data from: RIVM Health statistics
 */
export const GEZONDHEID_CONFIG: CategoryConfig = {
  id: 'gezondheid',
  nameNl: 'Gezondheid',
  nameEn: 'Health',
  color: '#8a976b',
  metrics: [
    // Physical Health (40%)
    { key: 'ErvarenGezondheidGoedZeerGoed_4', direction: 'positive', weight: 0.15, source: 'health' },
    { key: 'Overgewicht_9', direction: 'negative', weight: 0.08, source: 'health' },
    { key: 'ErnstigOvergewicht_10', direction: 'negative', weight: 0.07, source: 'health' },
    { key: 'BeperktVanwegeGezondheid_17', direction: 'negative', weight: 0.10, source: 'health' },
    // Lifestyle (25%)
    { key: 'VoldoetAanBeweegrichtlijn_5', direction: 'positive', weight: 0.10, source: 'health' },
    { key: 'Roker_11', direction: 'negative', weight: 0.08, source: 'health' },
    { key: 'ZwareDrinker_14', direction: 'negative', weight: 0.07, source: 'health' },
    // Mental Health (25%)
    { key: 'HoogRisicoOpAngstOfDepressie_25', direction: 'negative', weight: 0.10, source: 'health' },
    { key: 'ErnstigZeerErnstigEenzaam_28', direction: 'negative', weight: 0.08, source: 'health' },
    { key: 'PsychischeKlachten_20', direction: 'negative', weight: 0.07, source: 'health' },
    // Social & Resilience (10%)
    { key: 'ZeerHogeVeerkracht_22', direction: 'positive', weight: 0.05, source: 'health' },
    { key: 'Vrijwilligerswerk_32', direction: 'positive', weight: 0.05, source: 'health' },
  ],
};

/**
 * Leefbaarheid (Livability) Configuration
 * Data from: CBS Livability statistics
 */
export const LEEFBAARHEID_CONFIG: CategoryConfig = {
  id: 'leefbaarheid',
  nameNl: 'Leefbaarheid',
  nameEn: 'Livability',
  color: '#0c211a',
  metrics: [
    // Physical Environment (30%)
    { key: 'RapportcijferLeefbaarheidWoonbuurt_18', direction: 'positive', weight: 0.12, source: 'livability' },
    { key: 'FysiekeVoorzieningenSchaalscore_6', direction: 'positive', weight: 0.08, source: 'livability' },
    { key: 'OnderhoudStoepenStratenEnPleintjes_1', direction: 'positive', weight: 0.05, source: 'livability' },
    { key: 'Straatverlichting_3', direction: 'positive', weight: 0.05, source: 'livability' },
    // Social Cohesion (30%)
    { key: 'SocialeCohesieSchaalscore_15', direction: 'positive', weight: 0.12, source: 'livability' },
    { key: 'GezelligeBuurtWaarMenElkaarHelpt_9', direction: 'positive', weight: 0.08, source: 'livability' },
    { key: 'VoelMijThuisBijMensenInDezeBuurt_10', direction: 'positive', weight: 0.05, source: 'livability' },
    { key: 'MensenGaanPrettigMetElkaarOm_8', direction: 'positive', weight: 0.05, source: 'livability' },
    // Nuisance (25%)
    { key: 'EenOfMeerVormenFysiekeVerloedering_26', direction: 'negative', weight: 0.08, source: 'livability' },
    { key: 'EenOfMeerVormenVanSocialeOverlast_34', direction: 'negative', weight: 0.08, source: 'livability' },
    { key: 'EenOfMeerVormenVanMilieuoverlast_42', direction: 'negative', weight: 0.05, source: 'livability' },
    { key: 'EenOfMeerVormenVanVerkeersoverlast_38', direction: 'negative', weight: 0.04, source: 'livability' },
    // Neighborhood Trajectory (15%)
    { key: 'VooruitGegaan_16', direction: 'positive', weight: 0.08, source: 'livability' },
    { key: 'AchteruitGegaan_17', direction: 'negative', weight: 0.07, source: 'livability' },
  ],
};

/**
 * Voorzieningen (Amenities) Configuration
 * Weights for each amenity category
 */
export const VOORZIENINGEN_WEIGHTS: Record<string, number> = {
  // Essential Services (45%)
  'zorg_primair': 0.12,
  'openbaar_vervoer': 0.12,
  'winkels_dagelijks': 0.12,
  'onderwijs_basisschool': 0.09,
  // Family & Care (20%)
  'kinderopvang': 0.08,
  'onderwijs_voortgezet': 0.06,
  'zorg_paramedisch': 0.06,
  // Lifestyle & Leisure (20%)
  'restaurants_budget': 0.02,
  'restaurants_midrange': 0.02,
  'restaurants_upscale': 0.02,
  'sport_faciliteiten': 0.03,
  'sportschool': 0.03,
  'groen_recreatie': 0.04,
  'cultuur_entertainment': 0.04,
  // Convenience (15%)
  'winkels_overig': 0.05,
  'mobiliteit_parkeren': 0.05,
  'zakelijke_diensten': 0.05,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert raw score (-1 to 1) to Dutch grade (1 to 10)
 * Where: -1 → 1.0, 0 → 5.5, 1 → 10.0
 */
export function rawScoreToGrade(rawScore: number): number {
  const clamped = Math.max(-1, Math.min(1, rawScore));
  const grade = (clamped * 4.5) + 5.5;
  return Math.round(grade * 10) / 10; // Round to 1 decimal
}

/**
 * Convert Dutch grade (1 to 10) to raw score (-1 to 1)
 * Where: 1.0 → -1, 5.5 → 0, 10.0 → 1
 */
export function gradeToRawScore(grade: number): number {
  const clamped = Math.max(1, Math.min(10, grade));
  return (clamped - 5.5) / 4.5;
}

/**
 * Get the best available data from geographic levels
 * Priority: neighborhood > district > municipality
 */
function getBestAvailableData(
  neighborhood: UnifiedDataRow[],
  district: UnifiedDataRow[],
  municipality: UnifiedDataRow[]
): UnifiedDataRow[] {
  if (neighborhood.length > 0) return neighborhood;
  if (district.length > 0) return district;
  if (municipality.length > 0) return municipality;
  return [];
}

/**
 * Find a metric value in data rows by key
 */
function findMetricValue(rows: UnifiedDataRow[], key: string): { score: number | null; found: boolean } {
  const row = rows.find(r => r.key === key);
  if (!row || row.calculatedScore === undefined || row.calculatedScore === null) {
    return { score: null, found: false };
  }
  return { score: row.calculatedScore, found: true };
}

/**
 * Find a metric value from residential data
 */
function findResidentialMetricValue(
  residentialRows: UnifiedDataRow[],
  key: string
): { score: number | null; found: boolean } {
  const row = residentialRows.find(r => r.key === key);
  if (!row || row.calculatedScore === undefined || row.calculatedScore === null) {
    return { score: null, found: false };
  }
  return { score: row.calculatedScore, found: true };
}

// ============================================================================
// CATEGORY SCORE CALCULATIONS
// ============================================================================

/**
 * Calculate a category score from its configured metrics
 */
function calculateCategoryScore(
  config: CategoryConfig,
  data: UnifiedLocationData
): CategoryScore {
  let weightedSum = 0;
  let totalWeight = 0;
  let metricsUsed = 0;

  // Get residential rows if needed
  const residentialRows = data.residential?.hasData
    ? convertResidentialToRows(data.residential)
    : [];

  for (const metric of config.metrics) {
    let result: { score: number | null; found: boolean };

    // Get data based on source
    switch (metric.source) {
      case 'demographics': {
        const demographicsData = getBestAvailableData(
          data.demographics.neighborhood,
          data.demographics.district,
          data.demographics.municipality
        );
        result = findMetricValue(demographicsData, metric.key);
        break;
      }
      case 'health': {
        const healthData = getBestAvailableData(
          data.health.neighborhood,
          data.health.district,
          data.health.municipality
        );
        result = findMetricValue(healthData, metric.key);
        break;
      }
      case 'livability': {
        // Livability only has municipality level
        result = findMetricValue(data.livability.municipality, metric.key);
        break;
      }
      case 'safety': {
        const safetyData = getBestAvailableData(
          data.safety.neighborhood,
          data.safety.district,
          data.safety.municipality
        );
        result = findMetricValue(safetyData, metric.key);
        break;
      }
      case 'residential': {
        result = findResidentialMetricValue(residentialRows, metric.key);
        break;
      }
      default:
        result = { score: null, found: false };
    }

    if (result.found && result.score !== null) {
      // Apply direction (negative metrics should be inverted)
      const adjustedScore = metric.direction === 'negative' ? -result.score : result.score;
      weightedSum += adjustedScore * metric.weight;
      totalWeight += metric.weight;
      metricsUsed++;
    }
  }

  // Calculate raw score (normalize by actual weights used)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    id: config.id,
    nameNl: config.nameNl,
    nameEn: config.nameEn,
    grade: rawScoreToGrade(rawScore),
    rawScore,
    metricsUsed,
    metricsTotal: config.metrics.length,
    color: config.color,
  };
}

/**
 * Calculate Voorzieningen score from amenity scores
 */
function calculateVoorzieningenScore(
  amenityScores: AmenityScore[] | null
): CategoryScore {
  if (!amenityScores || amenityScores.length === 0) {
    return {
      id: 'voorzieningen',
      nameNl: 'Voorzieningen',
      nameEn: 'Amenities',
      grade: 5.5, // Default to average if no data
      rawScore: 0,
      metricsUsed: 0,
      metricsTotal: Object.keys(VOORZIENINGEN_WEIGHTS).length,
      color: '#48806a',
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let metricsUsed = 0;

  for (const score of amenityScores) {
    const weight = VOORZIENINGEN_WEIGHTS[score.categoryId];
    if (weight) {
      // Combine count score (70%) and proximity bonus (30%)
      // countScore is already -1 to 1, proximityBonus is 0 or 1
      // Convert proximityBonus to -1 to 1 scale: (0 → -1, 1 → 1)
      const normalizedProximity = score.proximityBonus * 2 - 1;
      const combinedScore = (score.countScore * 0.7) + (normalizedProximity * 0.3);

      weightedSum += combinedScore * weight;
      totalWeight += weight;
      metricsUsed++;
    }
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    id: 'voorzieningen',
    nameNl: 'Voorzieningen',
    nameEn: 'Amenities',
    grade: rawScoreToGrade(rawScore),
    rawScore,
    metricsUsed,
    metricsTotal: Object.keys(VOORZIENINGEN_WEIGHTS).length,
    color: '#48806a',
  };
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate all location scores
 */
export function calculateLocationScores(
  data: UnifiedLocationData,
  amenityScores: AmenityScore[] | null
): LocationScores {
  const betaalbaarheid = calculateCategoryScore(BETAALBAARHEID_CONFIG, data);
  const veiligheid = calculateCategoryScore(VEILIGHEID_CONFIG, data);
  const gezondheid = calculateCategoryScore(GEZONDHEID_CONFIG, data);
  const leefbaarheid = calculateCategoryScore(LEEFBAARHEID_CONFIG, data);
  const voorzieningen = calculateVoorzieningenScore(amenityScores);

  // Calculate overall score (equal weights for all categories)
  const overallGrade = (
    betaalbaarheid.grade +
    veiligheid.grade +
    gezondheid.grade +
    leefbaarheid.grade +
    voorzieningen.grade
  ) / 5;

  return {
    betaalbaarheid,
    veiligheid,
    gezondheid,
    leefbaarheid,
    voorzieningen,
    overall: Math.round(overallGrade * 10) / 10,
  };
}

/**
 * Get formatted chart data for RadialChart display
 */
export function getScoreChartData(
  scores: LocationScores,
  locale: 'nl' | 'en'
): Array<{ name: string; value: number; color: string }> {
  return [
    {
      name: locale === 'nl' ? scores.betaalbaarheid.nameNl : scores.betaalbaarheid.nameEn,
      value: scores.betaalbaarheid.grade,
      color: scores.betaalbaarheid.color,
    },
    {
      name: locale === 'nl' ? scores.veiligheid.nameNl : scores.veiligheid.nameEn,
      value: scores.veiligheid.grade,
      color: scores.veiligheid.color,
    },
    {
      name: locale === 'nl' ? scores.gezondheid.nameNl : scores.gezondheid.nameEn,
      value: scores.gezondheid.grade,
      color: scores.gezondheid.color,
    },
    {
      name: locale === 'nl' ? scores.leefbaarheid.nameNl : scores.leefbaarheid.nameEn,
      value: scores.leefbaarheid.grade,
      color: scores.leefbaarheid.color,
    },
    {
      name: locale === 'nl' ? scores.voorzieningen.nameNl : scores.voorzieningen.nameEn,
      value: scores.voorzieningen.grade,
      color: scores.voorzieningen.color,
    },
  ];
}
