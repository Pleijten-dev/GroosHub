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
  breakdown: MetricBreakdown[]; // Detailed breakdown of each metric
  insufficientData: boolean;    // True if less than MIN_DATA_THRESHOLD of metrics available
  dataNote?: string;            // Optional note about data source (e.g., municipal level)
}

// Minimum percentage of metrics required to calculate a valid score
const MIN_DATA_THRESHOLD = 0.30; // 30% of metrics must be available

export interface MetricBreakdown {
  key: string;
  nameNl: string;
  nameEn: string;
  localValue: number | null;      // Actual local value (e.g., 45.2%)
  comparisonValue: number | null; // National/comparison value (e.g., 50.0%)
  rawScore: number | null;        // -1 to 1, null if no data
  grade: number | null;           // 1-10, null if no data
  weight: number;                 // Configured weight (e.g., 0.15)
  weightPercent: number;          // Weight as percentage (e.g., 15)
  direction: 'positive' | 'negative';
  contribution: number;           // Actual contribution to final score
  hasData: boolean;
}

export interface LocationScores {
  betaalbaarheid: CategoryScore;
  veiligheid: CategoryScore;
  gezondheid: CategoryScore;
  leefbaarheid: CategoryScore;
  voorzieningen: CategoryScore;
  categories: CategoryScore[];  // Array of all categories for iteration
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
    // Violent Crime (25%) - Removed straatroof, openlijk geweld due to insufficient data
    { key: 'Crime_1.4.5', direction: 'negative', weight: 0.15, source: 'safety' },  // Assault (mishandeling)
    { key: 'Crime_1.4.4', direction: 'negative', weight: 0.10, source: 'safety' },  // Threats (bedreiging)
    // Property Crime (40%)
    { key: 'Crime_1.1.1', direction: 'negative', weight: 0.20, source: 'safety' },  // Home burglary (woninginbraak)
    { key: 'Crime_1.2.1', direction: 'negative', weight: 0.07, source: 'safety' },  // Theft from vehicles
    { key: 'Crime_1.2.2', direction: 'negative', weight: 0.07, source: 'safety' },  // Vehicle theft
    { key: 'Crime_2.2.1', direction: 'negative', weight: 0.06, source: 'safety' },  // Vandalism
    // Safety Perception (25%)
    { key: 'VoeltZichVaakOnveilig_44', direction: 'negative', weight: 0.12, source: 'livability' },
    { key: 'SAvondsOpStraatInBuurtOnveilig_52', direction: 'negative', weight: 0.13, source: 'livability' },
    // Traffic (10%) - Removed drugsoverlast due to insufficient data
    { key: 'Crime_1.3.1', direction: 'negative', weight: 0.10, source: 'safety' },  // Traffic accidents
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
// METRIC NAME MAPPINGS
// ============================================================================

const METRIC_NAMES: Record<string, { nl: string; en: string }> = {
  // Betaalbaarheid - Residential
  'transactieprijs_laag': { nl: 'Woningen lage prijsklasse', en: 'Low price housing' },
  'transactieprijs_midden': { nl: 'Woningen midden prijsklasse', en: 'Mid price housing' },
  'transactieprijs_hoog': { nl: 'Woningen hoge prijsklasse', en: 'High price housing' },
  'woonoppervlak_klein': { nl: 'Kleine woningen beschikbaar', en: 'Small homes available' },
  'woonoppervlak_midden': { nl: 'Middelgrote woningen', en: 'Medium homes available' },
  // Betaalbaarheid - Demographics
  'GemiddeldInkomenPerInwoner_72': { nl: 'Gemiddeld inkomen', en: 'Average income' },
  'HuishoudensMetEenLaagInkomen_78': { nl: 'Huishoudens laag inkomen', en: 'Low income households' },

  // Veiligheid - Crime
  'Crime_1.4.5': { nl: 'Mishandeling', en: 'Assault' },
  'Crime_1.4.4': { nl: 'Bedreiging', en: 'Threats' },
  'Crime_1.4.6': { nl: 'Straatroof', en: 'Street robbery' },
  'Crime_1.4.3': { nl: 'Openlijk geweld', en: 'Public violence' },
  'Crime_1.1.1': { nl: 'Woninginbraak', en: 'Home burglary' },
  'Crime_1.2.1': { nl: 'Diefstal uit voertuig', en: 'Theft from vehicle' },
  'Crime_1.2.2': { nl: 'Voertuigdiefstal', en: 'Vehicle theft' },
  'Crime_2.2.1': { nl: 'Vernieling', en: 'Vandalism' },
  'Crime_1.3.1': { nl: 'Verkeersongevallen', en: 'Traffic accidents' },
  'Crime_2.1.1': { nl: 'Drugsoverlast', en: 'Drug nuisance' },
  // Veiligheid - Perception
  'VoeltZichVaakOnveilig_44': { nl: 'Voelt zich vaak onveilig', en: 'Often feels unsafe' },
  'SAvondsOpStraatInBuurtOnveilig_52': { nl: 'Onveilig op straat (avond)', en: 'Unsafe on street (evening)' },

  // Gezondheid
  'ErvarenGezondheidGoedZeerGoed_4': { nl: 'Goede gezondheid', en: 'Good health' },
  'Overgewicht_9': { nl: 'Overgewicht', en: 'Overweight' },
  'ErnstigOvergewicht_10': { nl: 'Ernstig overgewicht', en: 'Severe overweight' },
  'BeperktVanwegeGezondheid_17': { nl: 'Beperkt door gezondheid', en: 'Health limited' },
  'VoldoetAanBeweegrichtlijn_5': { nl: 'Voldoende beweging', en: 'Sufficient exercise' },
  'Roker_11': { nl: 'Rokers', en: 'Smokers' },
  'ZwareDrinker_14': { nl: 'Zware drinkers', en: 'Heavy drinkers' },
  'HoogRisicoOpAngstOfDepressie_25': { nl: 'Risico angst/depressie', en: 'Risk anxiety/depression' },
  'ErnstigZeerErnstigEenzaam_28': { nl: 'Ernstig eenzaam', en: 'Severely lonely' },
  'PsychischeKlachten_20': { nl: 'Psychische klachten', en: 'Mental health issues' },
  'ZeerHogeVeerkracht_22': { nl: 'Hoge veerkracht', en: 'High resilience' },
  'Vrijwilligerswerk_32': { nl: 'Vrijwilligerswerk', en: 'Volunteer work' },

  // Leefbaarheid
  'RapportcijferLeefbaarheidWoonbuurt_18': { nl: 'Leefbaarheid cijfer', en: 'Livability grade' },
  'FysiekeVoorzieningenSchaalscore_6': { nl: 'Fysieke voorzieningen', en: 'Physical facilities' },
  'OnderhoudStoepenStratenEnPleintjes_1': { nl: 'Onderhoud straten', en: 'Street maintenance' },
  'Straatverlichting_3': { nl: 'Straatverlichting', en: 'Street lighting' },
  'SocialeCohesieSchaalscore_15': { nl: 'Sociale cohesie', en: 'Social cohesion' },
  'GezelligeBuurtWaarMenElkaarHelpt_9': { nl: 'Behulpzame buurt', en: 'Helpful neighborhood' },
  'VoelMijThuisBijMensenInDezeBuurt_10': { nl: 'Thuisgevoel', en: 'Feel at home' },
  'MensenGaanPrettigMetElkaarOm_8': { nl: 'Prettige omgang', en: 'Pleasant interaction' },
  'EenOfMeerVormenFysiekeVerloedering_26': { nl: 'Fysieke verloedering', en: 'Physical deterioration' },
  'EenOfMeerVormenVanSocialeOverlast_34': { nl: 'Sociale overlast', en: 'Social nuisance' },
  'EenOfMeerVormenVanMilieuoverlast_42': { nl: 'Milieuoverlast', en: 'Environmental nuisance' },
  'EenOfMeerVormenVanVerkeersoverlast_38': { nl: 'Verkeersoverlast', en: 'Traffic nuisance' },
  'VooruitGegaan_16': { nl: 'Buurt vooruitgegaan', en: 'Neighborhood improved' },
  'AchteruitGegaan_17': { nl: 'Buurt achteruitgegaan', en: 'Neighborhood declined' },

  // Voorzieningen (amenities)
  'zorg_primair': { nl: 'Huisarts & Apotheek', en: 'GP & Pharmacy' },
  'openbaar_vervoer': { nl: 'Openbaar vervoer', en: 'Public transport' },
  'winkels_dagelijks': { nl: 'Supermarkt & Dagelijks', en: 'Supermarket & Daily' },
  'onderwijs_basisschool': { nl: 'Basisschool', en: 'Primary school' },
  'kinderopvang': { nl: 'Kinderopvang', en: 'Childcare' },
  'onderwijs_voortgezet': { nl: 'Middelbare school', en: 'Secondary school' },
  'zorg_paramedisch': { nl: 'Paramedische zorg', en: 'Paramedical care' },
  'restaurants_budget': { nl: 'Budget restaurants', en: 'Budget restaurants' },
  'restaurants_midrange': { nl: 'Mid-range restaurants', en: 'Mid-range restaurants' },
  'restaurants_upscale': { nl: 'Upscale restaurants', en: 'Upscale restaurants' },
  'sport_faciliteiten': { nl: 'Sportfaciliteiten', en: 'Sports facilities' },
  'sportschool': { nl: 'Sportschool', en: 'Gym' },
  'groen_recreatie': { nl: 'Groen & Recreatie', en: 'Green & Recreation' },
  'cultuur_entertainment': { nl: 'Cultuur & Entertainment', en: 'Culture & Entertainment' },
  'winkels_overig': { nl: 'Overige winkels', en: 'Other retail' },
  'mobiliteit_parkeren': { nl: 'Parkeren & Mobiliteit', en: 'Parking & Mobility' },
  'zakelijke_diensten': { nl: 'Zakelijke diensten', en: 'Business services' },
};

function getMetricName(key: string, locale: 'nl' | 'en'): string {
  const names = METRIC_NAMES[key];
  if (names) {
    return locale === 'nl' ? names.nl : names.en;
  }
  return key;
}

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

interface MetricResult {
  score: number | null;
  localValue: number | null;
  comparisonValue: number | null;
  found: boolean;
}

/**
 * Calculate a score from relative values when no pre-calculated score exists
 * Uses linear interpolation: score = (localValue - nationalValue) / margin
 * Clamped to [-1, 1] range
 */
function calculateScoreFromRelative(
  localValue: number | null,
  nationalValue: number | null,
  margin: number = 20
): number | null {
  if (localValue === null || nationalValue === null) {
    return null;
  }

  // Calculate difference as percentage of national value
  const marginValue = Math.abs(nationalValue) * (margin / 100);
  if (marginValue === 0) return 0;

  const diff = localValue - nationalValue;
  const rawScore = diff / marginValue;

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, rawScore));
}

/**
 * Find a metric value in data rows by key
 */
function findMetricValue(
  rows: UnifiedDataRow[],
  nationalRows: UnifiedDataRow[],
  key: string
): MetricResult {
  const row = rows.find(r => r.key === key);
  const nationalRow = nationalRows.find(r => r.key === key);

  if (!row) {
    return { score: null, localValue: null, comparisonValue: null, found: false };
  }

  const localValue = row.relative ?? row.absolute ?? null;
  const comparisonValue = nationalRow?.relative ?? nationalRow?.absolute ?? null;

  // Use pre-calculated score if available, otherwise calculate from relative values
  let score = row.calculatedScore ?? null;
  if (score === null && localValue !== null && comparisonValue !== null) {
    score = calculateScoreFromRelative(localValue, comparisonValue);
  }

  if (score === null) {
    return { score: null, localValue, comparisonValue, found: false };
  }

  return {
    score,
    localValue,
    comparisonValue,
    found: true,
  };
}

/**
 * Find a metric value from residential data
 */
function findResidentialMetricValue(
  residentialRows: UnifiedDataRow[],
  key: string
): MetricResult {
  const row = residentialRows.find(r => r.key === key);

  if (!row || row.calculatedScore === undefined || row.calculatedScore === null) {
    return { score: null, localValue: null, comparisonValue: null, found: false };
  }

  return {
    score: row.calculatedScore,
    localValue: row.relative ?? row.absolute ?? null,
    comparisonValue: null, // Residential doesn't have national comparison in the same way
    found: true,
  };
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
  const breakdown: MetricBreakdown[] = [];

  // Get residential rows if needed
  const residentialRows = data.residential?.hasData
    ? convertResidentialToRows(data.residential)
    : [];

  for (const metric of config.metrics) {
    let result: MetricResult;

    // Get data based on source
    switch (metric.source) {
      case 'demographics': {
        const demographicsData = getBestAvailableData(
          data.demographics.neighborhood,
          data.demographics.district,
          data.demographics.municipality
        );
        result = findMetricValue(demographicsData, data.demographics.national, metric.key);
        break;
      }
      case 'health': {
        const healthData = getBestAvailableData(
          data.health.neighborhood,
          data.health.district,
          data.health.municipality
        );
        result = findMetricValue(healthData, data.health.national, metric.key);
        break;
      }
      case 'livability': {
        // Livability only has municipality level
        result = findMetricValue(data.livability.municipality, data.livability.national, metric.key);
        break;
      }
      case 'safety': {
        // Safety: Compare neighborhood/district against municipality (not national)
        // NL is relatively safe, so municipal comparison is more meaningful
        const safetyData = getBestAvailableData(
          data.safety.neighborhood,
          data.safety.district,
          [] // Don't fall back to municipality for local data
        );
        // Use municipality as comparison baseline (instead of national)
        // If only municipality data available, fall back to national
        if (safetyData && safetyData.length > 0) {
          result = findMetricValue(safetyData, data.safety.municipality, metric.key);
        } else {
          // Fallback: compare municipality to national
          result = findMetricValue(data.safety.municipality, data.safety.national, metric.key);
        }
        break;
      }
      case 'residential': {
        result = findResidentialMetricValue(residentialRows, metric.key);
        break;
      }
      default:
        result = { score: null, localValue: null, comparisonValue: null, found: false };
    }

    const hasData = result.found && result.score !== null;
    let contribution = 0;

    if (hasData && result.score !== null) {
      // Apply direction (negative metrics should be inverted)
      const adjustedScore = metric.direction === 'negative' ? -result.score : result.score;
      contribution = adjustedScore * metric.weight;
      weightedSum += contribution;
      totalWeight += metric.weight;
      metricsUsed++;
    }

    // Add to breakdown
    const names = METRIC_NAMES[metric.key];
    breakdown.push({
      key: metric.key,
      nameNl: names?.nl || metric.key,
      nameEn: names?.en || metric.key,
      localValue: result.localValue,
      comparisonValue: result.comparisonValue,
      rawScore: result.score,
      grade: result.score !== null ? rawScoreToGrade(metric.direction === 'negative' ? -result.score : result.score) : null,
      weight: metric.weight,
      weightPercent: Math.round(metric.weight * 100),
      direction: metric.direction,
      contribution,
      hasData,
    });
  }

  // Calculate raw score (normalize by actual weights used)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Check if we have enough data to calculate a meaningful score
  const dataRatio = metricsUsed / config.metrics.length;
  const insufficientData = dataRatio < MIN_DATA_THRESHOLD;

  return {
    id: config.id,
    nameNl: config.nameNl,
    nameEn: config.nameEn,
    grade: insufficientData ? 5.5 : rawScoreToGrade(rawScore), // Default to average if insufficient data
    rawScore,
    metricsUsed,
    metricsTotal: config.metrics.length,
    color: config.color,
    breakdown,
    insufficientData,
    // Add data note for leefbaarheid (municipal level data)
    dataNote: config.id === 'leefbaarheid' ? 'municipal' :
              config.id === 'veiligheid' ? 'municipal_comparison' : undefined,
  };
}

/**
 * Calculate Voorzieningen score from amenity scores
 */
function calculateVoorzieningenScore(
  amenityScores: AmenityScore[] | null
): CategoryScore {
  const breakdown: MetricBreakdown[] = [];

  if (!amenityScores || amenityScores.length === 0) {
    // Add empty breakdown for all categories
    for (const [categoryId, weight] of Object.entries(VOORZIENINGEN_WEIGHTS)) {
      const names = METRIC_NAMES[categoryId];
      breakdown.push({
        key: categoryId,
        nameNl: names?.nl || categoryId,
        nameEn: names?.en || categoryId,
        localValue: null,
        comparisonValue: null,
        rawScore: null,
        grade: null,
        weight,
        weightPercent: Math.round(weight * 100),
        direction: 'positive',
        contribution: 0,
        hasData: false,
      });
    }

    return {
      id: 'voorzieningen',
      nameNl: 'Voorzieningen',
      nameEn: 'Amenities',
      grade: 5.5, // Default to average if no data
      rawScore: 0,
      metricsUsed: 0,
      metricsTotal: Object.keys(VOORZIENINGEN_WEIGHTS).length,
      color: '#48806a',
      breakdown,
      insufficientData: true,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  let metricsUsed = 0;

  // Create a map of amenity scores by category ID
  const amenityScoreMap = new Map<string, AmenityScore>();
  for (const score of amenityScores) {
    amenityScoreMap.set(score.categoryId, score);
  }

  // Process all configured categories
  for (const [categoryId, weight] of Object.entries(VOORZIENINGEN_WEIGHTS)) {
    const score = amenityScoreMap.get(categoryId);
    const names = METRIC_NAMES[categoryId];

    if (score) {
      // Combine count score (70%) and proximity bonus (30%)
      // countScore is already -1 to 1, proximityBonus is 0 or 1
      // Convert proximityBonus to -1 to 1 scale: (0 → -1, 1 → 1)
      const normalizedProximity = score.proximityBonus * 2 - 1;
      const combinedScore = (score.countScore * 0.7) + (normalizedProximity * 0.3);
      const contribution = combinedScore * weight;

      weightedSum += contribution;
      totalWeight += weight;
      metricsUsed++;

      breakdown.push({
        key: categoryId,
        nameNl: names?.nl || categoryId,
        nameEn: names?.en || categoryId,
        localValue: score.totalCount, // Number of amenities found
        comparisonValue: null, // No national comparison for amenities
        rawScore: combinedScore,
        grade: rawScoreToGrade(combinedScore),
        weight,
        weightPercent: Math.round(weight * 100),
        direction: 'positive',
        contribution,
        hasData: true,
      });
    } else {
      breakdown.push({
        key: categoryId,
        nameNl: names?.nl || categoryId,
        nameEn: names?.en || categoryId,
        localValue: null,
        comparisonValue: null,
        rawScore: null,
        grade: null,
        weight,
        weightPercent: Math.round(weight * 100),
        direction: 'positive',
        contribution: 0,
        hasData: false,
      });
    }
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const totalMetrics = Object.keys(VOORZIENINGEN_WEIGHTS).length;
  const dataRatio = metricsUsed / totalMetrics;
  const insufficientData = dataRatio < MIN_DATA_THRESHOLD;

  return {
    id: 'voorzieningen',
    nameNl: 'Voorzieningen',
    nameEn: 'Amenities',
    grade: insufficientData ? 5.5 : rawScoreToGrade(rawScore),
    rawScore,
    metricsUsed,
    metricsTotal: totalMetrics,
    color: '#48806a',
    breakdown,
    insufficientData,
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
    categories: [betaalbaarheid, veiligheid, gezondheid, leefbaarheid, voorzieningen],
    overall: Math.round(overallGrade * 10) / 10,
  };
}

/**
 * Get formatted chart data for RadialChart display
 * Categories with insufficient data are shown with average height (5.5) and gray color
 */
export function getScoreChartData(
  scores: LocationScores,
  locale: 'nl' | 'en'
): Array<{ name: string; value: number; color: string; insufficientData?: boolean }> {
  const categories = [
    scores.betaalbaarheid,
    scores.veiligheid,
    scores.gezondheid,
    scores.leefbaarheid,
    scores.voorzieningen,
  ];

  return categories.map(cat => ({
    name: locale === 'nl' ? cat.nameNl : cat.nameEn,
    // Show average height for insufficient data so the bar is visible
    value: cat.insufficientData ? 5.5 : cat.grade,
    // Use gray color for insufficient data categories
    color: cat.insufficientData ? '#9ca3af' : cat.color,
    // Flag for insufficient data (used by RadialChart to show "-" label)
    insufficientData: cat.insufficientData,
  }));
}
