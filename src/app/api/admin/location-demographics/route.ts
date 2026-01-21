import { NextResponse } from 'next/server';

/**
 * API endpoint to fetch all wijken (districts) from CBS Kerncijfers API
 * Dataset: 84583NED (Kerncijfers wijken en buurten)
 *
 * This endpoint is used for the ExtremeLocationFinder testing tool
 * to analyze demographic characteristics across all Dutch neighborhoods.
 */

export interface WijkDemographics {
  code: string;
  name: string;
  municipality: string;
  // Population
  totalPopulation: number;
  // Age distribution (percentages)
  age0to15Pct: number;
  age15to25Pct: number;
  age25to45Pct: number;
  age45to65Pct: number;
  age65PlusPct: number;
  // Income
  avgIncomePerInhabitant: number | null;
  // Household composition (percentages)
  singlePersonHouseholdsPct: number;
  householdsWithoutChildrenPct: number;
  householdsWithChildrenPct: number;
  totalHouseholds: number;
}

export interface WijkWithZScores extends WijkDemographics {
  zScores: {
    age0to15: number;
    age15to25: number;
    age25to45: number;
    age45to65: number;
    age65Plus: number;
    avgIncome: number | null;
    singlePersonHouseholds: number;
    householdsWithoutChildren: number;
    householdsWithChildren: number;
  };
  outliers: string[];
  classification: string;
}

const CBS_BASE_URL = 'https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet';
const DEFAULT_PERIOD = '2023JJ00';

// Field mappings from CBS API
const CBS_FIELDS = {
  code: 'WijkenEnBuurten',
  name: 'Wijken_en_buurten',
  municipality: 'Gemeentenaam_1',
  // Population
  totalPopulation: 'AantalInwoners_5',
  // Age groups
  age0to15: 'k_0Tot15Jaar_8',
  age15to25: 'k_15Tot25Jaar_9',
  age25to45: 'k_25Tot45Jaar_10',
  age45to65: 'k_45Tot65Jaar_11',
  age65Plus: 'k_65JaarOfOuder_12',
  // Income
  avgIncomePerInhabitant: 'GemiddeldInkomenPerInwoner_72',
  // Households
  totalHouseholds: 'HuishoudensTotaal_28',
  singlePersonHouseholds: 'Eenpersoonshuishoudens_29',
  householdsWithoutChildren: 'HuishoudensZonderKinderen_30',
  householdsWithChildren: 'HuishoudensMetKinderen_31',
};

async function fetchAllWijken(period: string = DEFAULT_PERIOD): Promise<WijkDemographics[]> {
  const url = `${CBS_BASE_URL}?$filter=startswith(WijkenEnBuurten,'WK') and Perioden eq '${period}'`;

  console.log(`🔵 [CBS Wijken] Fetching all wijken for period ${period}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CBS API error: ${response.statusText}`);
  }

  const data = await response.json();
  const rows = data.value as Record<string, unknown>[];

  console.log(`✅ [CBS Wijken] Found ${rows.length} wijken`);

  // Transform raw data to structured format
  return rows
    .map((row): WijkDemographics | null => {
      const totalPop = parseNumber(row[CBS_FIELDS.totalPopulation]);
      const totalHH = parseNumber(row[CBS_FIELDS.totalHouseholds]);

      // Skip wijken with no population data
      if (totalPop === null || totalPop === 0) return null;

      // Calculate age percentages
      const age0to15 = parseNumber(row[CBS_FIELDS.age0to15]) ?? 0;
      const age15to25 = parseNumber(row[CBS_FIELDS.age15to25]) ?? 0;
      const age25to45 = parseNumber(row[CBS_FIELDS.age25to45]) ?? 0;
      const age45to65 = parseNumber(row[CBS_FIELDS.age45to65]) ?? 0;
      const age65Plus = parseNumber(row[CBS_FIELDS.age65Plus]) ?? 0;

      // Calculate household percentages
      const singleHH = parseNumber(row[CBS_FIELDS.singlePersonHouseholds]) ?? 0;
      const hhWithoutChildren = parseNumber(row[CBS_FIELDS.householdsWithoutChildren]) ?? 0;
      const hhWithChildren = parseNumber(row[CBS_FIELDS.householdsWithChildren]) ?? 0;

      return {
        code: String(row[CBS_FIELDS.code] ?? '').trim(),
        name: String(row[CBS_FIELDS.name] ?? '').trim(),
        municipality: String(row[CBS_FIELDS.municipality] ?? '').trim(),
        totalPopulation: totalPop,
        // Age percentages (relative to total population)
        age0to15Pct: (age0to15 / totalPop) * 100,
        age15to25Pct: (age15to25 / totalPop) * 100,
        age25to45Pct: (age25to45 / totalPop) * 100,
        age45to65Pct: (age45to65 / totalPop) * 100,
        age65PlusPct: (age65Plus / totalPop) * 100,
        // Income (already per inhabitant)
        avgIncomePerInhabitant: parseNumber(row[CBS_FIELDS.avgIncomePerInhabitant]),
        // Household percentages (relative to total households)
        singlePersonHouseholdsPct: totalHH > 0 ? (singleHH / totalHH) * 100 : 0,
        householdsWithoutChildrenPct: totalHH > 0 ? (hhWithoutChildren / totalHH) * 100 : 0,
        householdsWithChildrenPct: totalHH > 0 ? (hhWithChildren / totalHH) * 100 : 0,
        totalHouseholds: totalHH ?? 0,
      };
    })
    .filter((w): w is WijkDemographics => w !== null);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function calculateZScores(wijken: WijkDemographics[]): WijkWithZScores[] {
  // Calculate means and standard deviations for each metric
  const metrics = [
    'age0to15Pct', 'age15to25Pct', 'age25to45Pct', 'age45to65Pct', 'age65PlusPct',
    'avgIncomePerInhabitant',
    'singlePersonHouseholdsPct', 'householdsWithoutChildrenPct', 'householdsWithChildrenPct'
  ] as const;

  const stats: Record<string, { mean: number; std: number }> = {};

  metrics.forEach(metric => {
    const values = wijken
      .map(w => w[metric as keyof WijkDemographics] as number | null)
      .filter((v): v is number => v !== null && !isNaN(v));

    if (values.length === 0) {
      stats[metric] = { mean: 0, std: 1 };
      return;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance) || 1; // Avoid division by zero

    stats[metric] = { mean, std };
  });

  // Calculate z-scores for each wijk
  return wijken.map(wijk => {
    const zScores = {
      age0to15: calculateZ(wijk.age0to15Pct, stats.age0to15Pct),
      age15to25: calculateZ(wijk.age15to25Pct, stats.age15to25Pct),
      age25to45: calculateZ(wijk.age25to45Pct, stats.age25to45Pct),
      age45to65: calculateZ(wijk.age45to65Pct, stats.age45to65Pct),
      age65Plus: calculateZ(wijk.age65PlusPct, stats.age65PlusPct),
      avgIncome: wijk.avgIncomePerInhabitant !== null
        ? calculateZ(wijk.avgIncomePerInhabitant, stats.avgIncomePerInhabitant)
        : null,
      singlePersonHouseholds: calculateZ(wijk.singlePersonHouseholdsPct, stats.singlePersonHouseholdsPct),
      householdsWithoutChildren: calculateZ(wijk.householdsWithoutChildrenPct, stats.householdsWithoutChildrenPct),
      householdsWithChildren: calculateZ(wijk.householdsWithChildrenPct, stats.householdsWithChildrenPct),
    };

    // Flag outliers (|z| > 1.5)
    const outliers: string[] = [];
    const OUTLIER_THRESHOLD = 1.5;

    if (Math.abs(zScores.age0to15) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.age0to15 > 0 ? 'high-children' : 'low-children');
    }
    if (Math.abs(zScores.age15to25) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.age15to25 > 0 ? 'high-youth' : 'low-youth');
    }
    if (Math.abs(zScores.age25to45) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.age25to45 > 0 ? 'high-young-adults' : 'low-young-adults');
    }
    if (Math.abs(zScores.age45to65) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.age45to65 > 0 ? 'high-middle-aged' : 'low-middle-aged');
    }
    if (Math.abs(zScores.age65Plus) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.age65Plus > 0 ? 'high-elderly' : 'low-elderly');
    }
    if (zScores.avgIncome !== null && Math.abs(zScores.avgIncome) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.avgIncome > 0 ? 'wealthy' : 'low-income');
    }
    if (Math.abs(zScores.singlePersonHouseholds) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.singlePersonHouseholds > 0 ? 'singles-dominant' : 'few-singles');
    }
    if (Math.abs(zScores.householdsWithChildren) > OUTLIER_THRESHOLD) {
      outliers.push(zScores.householdsWithChildren > 0 ? 'family-dominant' : 'few-families');
    }

    // Classify neighborhood type
    const classification = classifyNeighborhood(zScores, outliers);

    return {
      ...wijk,
      zScores,
      outliers,
      classification,
    };
  });
}

function calculateZ(value: number, stats: { mean: number; std: number }): number {
  return (value - stats.mean) / stats.std;
}

function classifyNeighborhood(
  zScores: WijkWithZScores['zScores'],
  outliers: string[]
): string {
  // Priority-based classification

  // Student area: high youth (15-25) + high singles
  if (outliers.includes('high-youth') && outliers.includes('singles-dominant')) {
    return 'student-area';
  }

  // Young professional area: high young adults (25-45) + high income + high singles
  if (outliers.includes('high-young-adults') &&
      (outliers.includes('wealthy') || outliers.includes('singles-dominant'))) {
    return 'young-professional-area';
  }

  // Wealthy family area
  if (outliers.includes('wealthy') &&
      (outliers.includes('family-dominant') || outliers.includes('high-children'))) {
    return 'wealthy-family-area';
  }

  // Low-income family area
  if (outliers.includes('low-income') &&
      (outliers.includes('family-dominant') || outliers.includes('high-children'))) {
    return 'social-housing-families';
  }

  // Retirement area
  if (outliers.includes('high-elderly') && outliers.includes('few-families')) {
    return 'retirement-area';
  }

  // Senior living area
  if (outliers.includes('high-elderly')) {
    return 'senior-area';
  }

  // Young dominant area
  if (outliers.includes('high-youth') || outliers.includes('high-young-adults')) {
    return 'young-dominant';
  }

  // Family area
  if (outliers.includes('family-dominant') || outliers.includes('high-children')) {
    return 'family-area';
  }

  // Wealthy area
  if (outliers.includes('wealthy')) {
    return 'wealthy-area';
  }

  // Low-income area
  if (outliers.includes('low-income')) {
    return 'low-income-area';
  }

  // Singles area
  if (outliers.includes('singles-dominant')) {
    return 'singles-area';
  }

  return 'mixed-demographic';
}

export async function GET() {
  try {
    const wijken = await fetchAllWijken();
    const wijkenWithZScores = calculateZScores(wijken);

    // Calculate summary statistics
    const classificationCounts: Record<string, number> = {};
    wijkenWithZScores.forEach(w => {
      classificationCounts[w.classification] = (classificationCounts[w.classification] || 0) + 1;
    });

    // Find extreme examples for each classification
    const extremeExamples: Record<string, WijkWithZScores[]> = {};
    Object.keys(classificationCounts).forEach(classification => {
      extremeExamples[classification] = wijkenWithZScores
        .filter(w => w.classification === classification)
        .sort((a, b) => b.outliers.length - a.outliers.length)
        .slice(0, 5);
    });

    return NextResponse.json({
      success: true,
      data: {
        totalWijken: wijkenWithZScores.length,
        classificationCounts,
        extremeExamples,
        allWijken: wijkenWithZScores,
      },
    });
  } catch (error) {
    console.error('Error fetching wijk demographics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wijk demographics' },
      { status: 500 }
    );
  }
}
