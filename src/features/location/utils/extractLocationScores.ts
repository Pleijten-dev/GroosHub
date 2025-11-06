import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import { convertResidentialToRows } from '../components/Residential/residentialDataConverter';

/**
 * Mapping from actual data table titles to scoring map subcategory names
 */
const TITLE_MAPPING: Record<string, string> = {
  // Housing Stock
  'Percentage Eengezinswoning': 'Percentage eengezinswoning',
  'Percentage Meergezinswoning': 'Percentage meergezinswoning',
  'Koopwoningen': 'Koopwoningen',
  'In Bezit Woningcorporatie': 'In Bezit Woningcorporatie',
  'In Bezit Overige Verhuurders': 'In Bezit Overige Verhuurders',
  'Hoog stedelijk': 'Woningtype - Hoogstedelijk',
  'Rand stedelijk': 'Woningtype - Randstedelijk',
  'Laag stedelijk': 'Woningtype - Laagstedelijk',
  'Klein (< 60m²)': 'Woonoppervlak - Klein',
  'Midden (60-110m²)': 'Woonoppervlak - Midden',
  'Groot (> 110m²)': 'Woonoppervlak - Groot',
  'Laag (< €350k)': 'Transactieprijs - Laag',
  'Midden (€350k-€525k)': 'Transactieprijs - Midden',
  'Hoog (> €525k)': 'Transactieprijs - Hoog',

  // Livability
  'Speelplekken Voor Kinderen': 'Speelplekken Voor Kinderen',
  'Voorzieningen Voor Jongeren': 'Voorzieningen Voor Jongeren',

  // Demographics
  '0 Tot 15 Jaar': 'Aandeel 0 tot 15 jaar',
  '15 Tot 25 Jaar': 'Aandeel 15 tot 25 jaar',
  '25 Tot 45 Jaar': 'Aandeel 25 tot 45 jaar',
  '45 Tot 65 Jaar': 'Aandeel 45 tot 65 jaar',
  '65 Jaar Of Ouder': 'Aandeel 65 jaar of ouder',
  'Eenpersoonshuishoudens': 'Aandeel eenpersoonshuishoudens',
  'Huishoudens Zonder Kinderen': 'Aandeel huishoudens zonder kinderen',
  'Huishoudens Met Kinderen': 'Aandeel huishoudens met kinderen',
};

/**
 * Extracts location scores from UnifiedLocationData and maps them to
 * subcategory names used in the target group scoring system
 */
export function extractLocationScores(data: UnifiedLocationData): Record<string, number> {
  const scores: Record<string, number> = {};

  // Helper to add scores from UnifiedDataRows
  const addScoresFromRows = (rows: UnifiedDataRow[]) => {
    rows.forEach(row => {
      // For amenities, keep the full title with "- Aantal" or "- Nabijheid (250m)"
      // For other fields, use the title mapping
      const mappedTitle = TITLE_MAPPING[row.title] || row.title;
      const score = getScore(row);
      if (score !== null) {
        scores[mappedTitle] = score;
      }
    });
  };

  // Helper to get score from a row
  const getScore = (row: UnifiedDataRow): number | null => {
    if (row.calculatedScore !== undefined && row.calculatedScore !== null) {
      return row.calculatedScore;
    } else if (row.relative !== null) {
      return normalizePercentage(row.relative);
    }
    return null;
  };

  // Extract from all geographic levels (prioritize more specific levels)
  // Demographics
  if (data.demographics.neighborhood.length > 0) {
    addScoresFromRows(data.demographics.neighborhood);
  } else if (data.demographics.district.length > 0) {
    addScoresFromRows(data.demographics.district);
  } else if (data.demographics.municipality.length > 0) {
    addScoresFromRows(data.demographics.municipality);
  }

  // Handle income splitting - find the income row and split into brackets
  const allDemographicRows = [
    ...data.demographics.neighborhood,
    ...data.demographics.district,
    ...data.demographics.municipality,
  ];
  const incomeRow = allDemographicRows.find(
    row => row.title === 'Gemiddeld Inkomen Per Inkomensontvanger'
  );
  if (incomeRow && incomeRow.relative !== null) {
    const income = incomeRow.relative / 1000; // Convert to thousands

    // Split into three brackets based on Dutch median (€36k in 2024)
    const medianIncome = 36; // in thousands
    const lowThreshold = medianIncome * 0.8; // 28.8k
    const highThreshold = medianIncome * 1.2; // 43.2k

    // Low income: score 1 if below 28.8k, -1 if above
    scores['Gemiddeld Inkomen Per Inkomensontvanger (low <80% of mediaan)'] =
      income < lowThreshold ? 1 : -1;

    // Medium income: score 1 if between 28.8k and 43.2k, -1 if outside
    scores['Gemiddeld Inkomen Per Inkomensontvanger (medium >80% <120% of mediaan)'] =
      income >= lowThreshold && income <= highThreshold ? 1 : -1;

    // High income: score 1 if above 43.2k, -1 if below
    scores['Gemiddeld Inkomen Per Inkomensontvanger (high >120% of mediaan)'] =
      income > highThreshold ? 1 : -1;
  }

  // Health
  if (data.health.neighborhood.length > 0) {
    addScoresFromRows(data.health.neighborhood);
  } else if (data.health.district.length > 0) {
    addScoresFromRows(data.health.district);
  } else if (data.health.municipality.length > 0) {
    addScoresFromRows(data.health.municipality);
  }

  // Livability
  if (data.livability.municipality.length > 0) {
    addScoresFromRows(data.livability.municipality);
  }

  // Safety
  if (data.safety.neighborhood.length > 0) {
    addScoresFromRows(data.safety.neighborhood);
  } else if (data.safety.district.length > 0) {
    addScoresFromRows(data.safety.district);
  } else if (data.safety.municipality.length > 0) {
    addScoresFromRows(data.safety.municipality);
  }

  // Amenities
  if (data.amenities && data.amenities.length > 0) {
    addScoresFromRows(data.amenities);
  }

  // Residential data - convert to rows and extract scores
  if (data.residential && data.residential.hasData) {
    const residentialRows = convertResidentialToRows(data.residential);
    addScoresFromRows(residentialRows);
  }

  return scores;
}

/**
 * Normalize a percentage (0-100) to a score (-1 to 1)
 * Uses reference values for interpretation:
 * - Below 30%: negative
 * - 30-70%: around 0
 * - Above 70%: positive
 */
function normalizePercentage(percentage: number): number {
  if (percentage < 30) {
    // Map 0-30% to -1 to 0
    return (percentage / 30) - 1;
  } else if (percentage < 70) {
    // Map 30-70% to -0.5 to 0.5
    return ((percentage - 30) / 40) - 0.5;
  } else {
    // Map 70-100% to 0.5 to 1
    return ((percentage - 70) / 30) * 0.5 + 0.5;
  }
}
