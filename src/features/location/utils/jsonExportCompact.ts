/**
 * Compact JSON Export for LLM Report Generation
 *
 * This export format is optimized for LLM consumption by:
 * - Aggregating data by category instead of individual rows
 * - Removing redundant fields and metadata
 * - Focusing on key insights and summaries
 * - Using compact structures to reduce token count
 */

import type { UnifiedLocationData } from '../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from './targetGroupScoring';
import { extractLocationScores } from './extractLocationScores';

interface CompactDataCategory {
  category: string;
  highlights: string[]; // Key notable values
  topScores: Array<{ name: string; value: number; score?: number }>;
}

interface CompactPersona {
  id: string;
  name: string;
  rank: number;
  score: number;
  strengths: string[]; // Top scoring categories
}

interface CompactScenario {
  name: string;
  personas: string[]; // Just persona names
  avgScore: number;
}

export interface CompactLocationExport {
  metadata: {
    location: string; // Single formatted string
    exportDate: string;
    coordinates?: { lat: number; lon: number };
  };

  // Summary statistics instead of all rows
  demographics: {
    population: { value: number; comparison: string };
    keyMetrics: Array<{ name: string; value: string; context: string }>;
  };

  health: {
    overallScore: number;
    keyMetrics: Array<{ name: string; value: string; context: string }>;
  };

  safety: {
    overallScore: number;
    keyMetrics: Array<{ name: string; value: string; context: string }>;
  };

  livability: {
    overallScore: number;
    keyMetrics: Array<{ name: string; value: string; context: string }>;
  };

  amenities: {
    total: number;
    byCategory: Array<{ category: string; count: number; notable: string[] }>;
  };

  housingMarket?: {
    avgPrice: number;
    avgSize: number;
    typology: Array<{ type: string; percentage: number }>;
    priceRange: Array<{ range: string; percentage: number }>;
  };

  targetGroups: {
    topMatches: CompactPersona[]; // Top 5 personas
    bottomMatches: CompactPersona[]; // Bottom 3 personas
    recommendedScenarios: CompactScenario[];
  };

  locationScores: {
    total: number;
    byCategory: Array<{ category: string; score: number; weight: string }>;
  };
}

/**
 * Get top N items from array sorted by value
 */
function getTopN<T>(items: T[], getValue: (item: T) => number, n: number): T[] {
  return [...items].sort((a, b) => getValue(b) - getValue(a)).slice(0, n);
}

/**
 * Get bottom N items from array sorted by value
 */
function getBottomN<T>(items: T[], getValue: (item: T) => number, n: number): T[] {
  return [...items].sort((a, b) => getValue(a) - getValue(b)).slice(0, n);
}

/**
 * Format a metric with context
 */
function formatMetric(
  name: string,
  value: number | string,
  nationalValue?: number | string,
  unit: string = ''
): { name: string; value: string; context: string } {
  const formattedValue = typeof value === 'number'
    ? `${value.toLocaleString('nl-NL')}${unit}`
    : value;

  let context = '';
  if (nationalValue !== undefined && typeof value === 'number' && typeof nationalValue === 'number') {
    const diff = value - nationalValue;
    const percentage = ((diff / nationalValue) * 100).toFixed(1);
    context = diff > 0
      ? `+${percentage}% vs national`
      : `${percentage}% vs national`;
  }

  return { name, value: formattedValue, context };
}

/**
 * Export location data in compact format optimized for LLM consumption
 */
export function exportCompactForLLM(
  data: UnifiedLocationData,
  personaScores: PersonaScore[],
  scenarios: { scenario1: number[]; scenario2: number[]; scenario3: number[] },
  locale: 'nl' | 'en' = 'nl'
): CompactLocationExport {
  // Format location string
  const locationParts = [
    data.location.neighborhood?.statnaam,
    data.location.district?.statnaam,
    data.location.municipality.statnaam,
  ].filter(Boolean);
  const locationString = locationParts.join(', ');

  // === DEMOGRAPHICS ===
  const popRow = data.demographics.neighborhood.find(r => r.key === 'bevolking_aantal_inwoners');
  const nationalPop = data.demographics.national.find(r => r.key === 'bevolking_aantal_inwoners');

  const avgIncomeRow = data.demographics.neighborhood.find(r => r.key === 'inkomen_gemiddeld_inkomen_per_inwoner');
  const nationalIncome = data.demographics.national.find(r => r.key === 'inkomen_gemiddeld_inkomen_per_inwoner');

  const avgAgeRow = data.demographics.neighborhood.find(r => r.key === 'leeftijd_gemiddelde_leeftijd');
  const nationalAge = data.demographics.national.find(r => r.key === 'leeftijd_gemiddelde_leeftijd');

  const householdSizeRow = data.demographics.neighborhood.find(r => r.key === 'huishoudens_gemiddelde_huishoudensgrootte');
  const nationalHouseholdSize = data.demographics.national.find(r => r.key === 'huishoudens_gemiddelde_huishoudensgrootte');

  // === HEALTH ===
  const healthScores = data.health.neighborhood
    .filter(r => r.calculatedScore !== undefined)
    .map(r => r.calculatedScore as number);
  const avgHealthScore = healthScores.length > 0
    ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
    : 0;

  const topHealthMetrics = getTopN(
    data.health.neighborhood.filter(r => r.value !== null),
    r => r.calculatedScore || 0,
    3
  );

  // === SAFETY ===
  const safetyScores = data.safety.neighborhood
    .filter(r => r.calculatedScore !== undefined)
    .map(r => r.calculatedScore as number);
  const avgSafetyScore = safetyScores.length > 0
    ? safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length
    : 0;

  const topSafetyMetrics = getTopN(
    data.safety.neighborhood.filter(r => r.value !== null),
    r => r.calculatedScore || 0,
    3
  );

  // === LIVABILITY ===
  const livabilityScores = data.livability.municipality
    .filter(r => r.calculatedScore !== undefined)
    .map(r => r.calculatedScore as number);
  const avgLivabilityScore = livabilityScores.length > 0
    ? livabilityScores.reduce((a, b) => a + b, 0) / livabilityScores.length
    : 0;

  const topLivabilityMetrics = getTopN(
    data.livability.municipality.filter(r => r.value !== null),
    r => r.calculatedScore || 0,
    3
  );

  // === AMENITIES ===
  // Group by first word of title as category (simplified approach)
  const amenitiesByCategory = data.amenities.reduce((acc, amenity) => {
    const firstWord = amenity.title.split(' ')[0] || 'Other';
    const category = firstWord.length > 15 ? 'Other' : firstWord;
    if (!acc[category]) {
      acc[category] = { count: 0, items: [] };
    }
    acc[category].count++;
    if (acc[category].items.length < 3) {
      acc[category].items.push(amenity.title);
    }
    return acc;
  }, {} as Record<string, { count: number; items: string[] }>);

  const amenitiesCompact = Object.entries(amenitiesByCategory)
    .map(([category, data]) => ({
      category,
      count: data.count,
      notable: data.items,
    }))
    .sort((a, b) => b.count - a.count);

  // === HOUSING MARKET ===
  let housingMarket: CompactLocationExport['housingMarket'];
  if (data.residential?.hasData) {
    const refHouses = data.residential.referenceHouses;

    // Helper to parse price range string to average number
    const parsePriceRange = (priceStr: string | number): number => {
      if (typeof priceStr === 'number') return priceStr;
      const parts = priceStr.split('-').map(p => parseInt(p.replace(/[^0-9]/g, '')));
      return parts.length === 2 ? (parts[0] + parts[1]) / 2 : parts[0] || 0;
    };

    // Calculate averages
    const avgPrice = refHouses.reduce((sum, h) => sum + parsePriceRange(h.TransactionPrice), 0) / refHouses.length;
    const avgSize = refHouses.reduce((sum, h) => sum + (h.InnerSurfaceArea || 0), 0) / refHouses.length;

    // Typology distribution (using HouseType as it exists in the interface)
    const typologyCount: Record<string, number> = {};
    refHouses.forEach(h => {
      const type = h.HouseType || 'Unknown';
      typologyCount[type] = (typologyCount[type] || 0) + 1;
    });

    const typology = Object.entries(typologyCount)
      .map(([type, count]) => ({
        type,
        percentage: Math.round((count / refHouses.length) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Price ranges
    const priceRanges = [
      { range: 'Low (<€300k)', count: refHouses.filter(h => parsePriceRange(h.IndexedTransactionPrice) < 300000).length },
      { range: 'Medium (€300k-€500k)', count: refHouses.filter(h => {
        const price = parsePriceRange(h.IndexedTransactionPrice);
        return price >= 300000 && price < 500000;
      }).length },
      { range: 'High (≥€500k)', count: refHouses.filter(h => parsePriceRange(h.IndexedTransactionPrice) >= 500000).length },
    ];

    const priceRange = priceRanges.map(r => ({
      range: r.range,
      percentage: Math.round((r.count / refHouses.length) * 100),
    }));

    housingMarket = {
      avgPrice: Math.round(avgPrice),
      avgSize: Math.round(avgSize),
      typology,
      priceRange,
    };
  }

  // === TARGET GROUPS ===
  const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);

  const topPersonas: CompactPersona[] = sortedPersonas.slice(0, 5).map(p => {
    // Get top 2 category scores
    const categoryScores = Object.entries(p.categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);

    return {
      id: p.personaId,
      name: p.personaName,
      rank: p.rRankPosition,
      score: Math.round(p.rRank * 100) / 100,
      strengths: categoryScores,
    };
  });

  const bottomPersonas: CompactPersona[] = sortedPersonas.slice(-3).map(p => ({
    id: p.personaId,
    name: p.personaName,
    rank: p.rRankPosition,
    score: Math.round(p.rRank * 100) / 100,
    strengths: [],
  }));

  // === SCENARIOS ===
  const buildScenario = (name: string, positions: number[]): CompactScenario => {
    const scenarioPersonas = positions
      .map(pos => sortedPersonas[pos - 1])
      .filter(p => p !== undefined);

    const avgScore = scenarioPersonas.length > 0
      ? scenarioPersonas.reduce((sum, p) => sum + p.rRank, 0) / scenarioPersonas.length
      : 0;

    return {
      name,
      personas: scenarioPersonas.map(p => p.personaName),
      avgScore: Math.round(avgScore * 100) / 100,
    };
  };

  const recommendedScenarios = [
    buildScenario('Scenario 1', scenarios.scenario1),
    buildScenario('Scenario 2', scenarios.scenario2),
    buildScenario('Scenario 3', scenarios.scenario3),
  ];

  // === LOCATION SCORES ===
  const locationScores = extractLocationScores(data);
  const scoresByCategory = {
    voorzieningen: Object.entries(locationScores)
      .filter(([key]) => key.startsWith('voorzieningen_'))
      .reduce((sum, [, val]) => sum + val, 0),
    leefbaarheid: Object.entries(locationScores)
      .filter(([key]) => key.startsWith('leefbaarheid_'))
      .reduce((sum, [, val]) => sum + val, 0),
    demografie: Object.entries(locationScores)
      .filter(([key]) => key.startsWith('demografie_') || key.startsWith('bevolking_') || key.startsWith('huishoudens_'))
      .reduce((sum, [, val]) => sum + val, 0),
    woningvooraad: Object.entries(locationScores)
      .filter(([key]) => key.startsWith('woningvooraad_') || key.startsWith('residential_'))
      .reduce((sum, [, val]) => sum + val, 0),
  };

  const totalScore = Object.values(scoresByCategory).reduce((a, b) => a + b, 0);

  return {
    metadata: {
      location: locationString,
      exportDate: new Date().toISOString().split('T')[0],
      coordinates: data.location.coordinates ? {
        lat: data.location.coordinates.wgs84.latitude,
        lon: data.location.coordinates.wgs84.longitude,
      } : undefined,
    },
    demographics: {
      population: {
        value: popRow?.value as number || 0,
        comparison: nationalPop ? `National: ${(nationalPop.value as number).toLocaleString('nl-NL')}` : '',
      },
      keyMetrics: [
        formatMetric('Average Income', avgIncomeRow?.value as number || 0, nationalIncome?.value as number, ' €'),
        formatMetric('Average Age', avgAgeRow?.value as number || 0, nationalAge?.value as number, ' years'),
        formatMetric('Household Size', householdSizeRow?.value as number || 0, nationalHouseholdSize?.value as number, ' persons'),
      ],
    },
    health: {
      overallScore: Math.round(avgHealthScore),
      keyMetrics: topHealthMetrics.map(m => ({
        name: locale === 'nl' ? m.titleNl || m.title : m.titleEn || m.title,
        value: m.displayValue,
        context: `Score: ${m.calculatedScore || 0}`,
      })),
    },
    safety: {
      overallScore: Math.round(avgSafetyScore),
      keyMetrics: topSafetyMetrics.map(m => ({
        name: locale === 'nl' ? m.titleNl || m.title : m.titleEn || m.title,
        value: m.displayValue,
        context: `Score: ${m.calculatedScore || 0}`,
      })),
    },
    livability: {
      overallScore: Math.round(avgLivabilityScore),
      keyMetrics: topLivabilityMetrics.map(m => ({
        name: locale === 'nl' ? m.titleNl || m.title : m.titleEn || m.title,
        value: m.displayValue,
        context: `Score: ${m.calculatedScore || 0}`,
      })),
    },
    amenities: {
      total: data.amenities.length,
      byCategory: amenitiesCompact,
    },
    housingMarket,
    targetGroups: {
      topMatches: topPersonas,
      bottomMatches: bottomPersonas,
      recommendedScenarios,
    },
    locationScores: {
      total: Math.round(totalScore),
      byCategory: [
        { category: 'Voorzieningen', score: Math.round(scoresByCategory.voorzieningen), weight: 'High' },
        { category: 'Leefbaarheid', score: Math.round(scoresByCategory.leefbaarheid), weight: 'High' },
        { category: 'Demografie', score: Math.round(scoresByCategory.demografie), weight: 'Medium' },
        { category: 'Woningvooraad', score: Math.round(scoresByCategory.woningvooraad), weight: 'Medium' },
      ],
    },
  };
}

/**
 * Download compact JSON for LLM
 */
export function downloadCompactJSON(data: CompactLocationExport, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
