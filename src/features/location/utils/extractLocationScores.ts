import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';

/**
 * Mapping from actual data table titles to scoring map subcategory names
 */
const TITLE_MAPPING: Record<string, string> = {
  // Amenities - we'll use the Nabijheid (proximity) score as it's more relevant
  'Zorg (Huisarts & Apotheek) - Nabijheid (250m)': 'Zorg (Huisarts & Apotheek)',
  'Zorg (Paramedische voorzieningen) - Nabijheid (250m)': 'Zorg (Paramedische voorzieningen)',
  'Openbaar vervoer (halte) - Nabijheid (250m)': 'Openbaar vervoer (halte)',
  'Mobiliteit & Parkeren - Nabijheid (250m)': 'Mobiliteit & Parkeren',
  'Onderwijs (Basisschool) - Nabijheid (250m)': 'Onderwijs (Basisschool)',
  'Onderwijs (Voortgezet onderwijs) - Nabijheid (250m)': 'Onderwijs (Voortgezet onderwijs)',
  'Onderwijs (Hoger onderwijs) - Nabijheid (250m)': 'Onderwijs (Hoger onderwijs)',
  'Kinderopvang & Opvang - Nabijheid (250m)': 'Kinderopvang & Opvang',
  'Winkels (Dagelijkse boodschappen) - Nabijheid (250m)': 'Winkels (Dagelijkse boodschappen)',
  'Winkels (Overige retail) - Nabijheid (250m)': 'Winkels (Overige retail)',
  'Budget Restaurants (€) - Nabijheid (250m)': 'Budget Restaurants (€)',
  'Mid-range Restaurants (€€€) - Nabijheid (250m)': 'Mid-range Restaurants (€€€)',
  'Upscale Restaurants (€€€€-€€€€€) - Nabijheid (250m)': 'Upscale Restaurants (€€€€-€€€€€)',
  'Cafés en avond programma - Nabijheid (250m)': 'Cafés en avond programma',
  'Sport faciliteiten - Nabijheid (250m)': 'Sport faciliteiten',
  'Sportschool / Fitnesscentrum - Nabijheid (250m)': 'Sportschool / Fitnesscentrum',
  'Groen & Recreatie - Nabijheid (250m)': 'Groen & Recreatie',
  'Cultuur & Entertainment - Nabijheid (250m)': 'Cultuur & Entertainment',
  'Wellness & Recreatie - Nabijheid (250m)': 'Wellness & Recreatie',

  // Housing Stock - exact matches with capitalization differences
  'Percentage Eengezinswoning': 'Percentage eengezinswoning',
  'Percentage Meergezinswoning': 'Percentage meergezinswoning',
  'In Bezit Woningcorporatie': 'In Bezit Woningcorporatie', // Already matches
  'In Bezit Overige Verhuurders': 'In Bezit Overige Verhuurders', // Already matches
  'Hoog stedelijk': 'Woningtype - Hoogstedelijk',
  'Rand stedelijk': 'Woningtype - Randstedelijk',
  'Laag stedelijk': 'Woningtype - Laagstedelijk',

  // Demographics - missing "Aandeel" prefix in data
  '0 Tot 15 Jaar': 'Aandeel 0 tot 15 jaar',
  '15 Tot 25 Jaar': 'Aandeel 15 tot 25 jaar',
  '25 Tot 45 Jaar': 'Aandeel 25 tot 45 jaar',
  '45 Tot 65 Jaar': 'Aandeel 45 tot 65 jaar',
  '65 Jaar Of Ouder': 'Aandeel 65 jaar of ouder',
  'Eenpersoonshuishoudens': 'Aandeel eenpersoonshuishoudens',
  'Huishoudens Zonder Kinderen': 'Aandeel huishoudens zonder kinderen',
  'Huishoudens Met Kinderen': 'Aandeel huishoudens met kinderen',
  'Gemiddeld Inkomen Per Inkomensontvanger': 'Gemiddeld Inkomen Per Inkomensontvanger (medium >80% <120% of mediaan)',
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
      // Map the title to scoring subcategory name
      const mappedTitle = TITLE_MAPPING[row.title] || row.title;

      // Use calculated score if available, otherwise fall back to relative value normalized
      if (row.calculatedScore !== undefined && row.calculatedScore !== null) {
        scores[mappedTitle] = row.calculatedScore;
      } else if (row.relative !== null) {
        // Normalize relative percentage values to -1 to 1 scale
        scores[mappedTitle] = normalizePercentage(row.relative);
      }
    });
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

  // Residential data - extract what's available
  if (data.residential && data.residential.hasData) {
    // Residential data is already included in the rows via convertResidentialToRows
    // So it should be picked up by the amenities/municipality section
    console.log('Residential data available - scores extracted from unified rows');
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
