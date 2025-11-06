/**
 * Target Group Scoring System
 *
 * This module calculates R-rank and Z-rank scores for housing personas
 * based on location data and persona characteristics.
 */

import scoringMapData from '../data/sources/target-group-scoring-map.json';

export interface PersonaCharacteristics {
  income_level: string;
  household_type: string;
  age_group: string;
}

export interface ScoringMapping {
  category: string;
  subcategory: string;
  characteristicType: string;
  most: string;
  average: string;
  least: string;
}

export interface CategoryWeights {
  voorzieningen: number;
  leefbaarheid: number;
  woningvooraad: number;
  demografie: number;
}

export interface PersonaScore {
  personaId: string;
  personaName: string;
  categoryScores: {
    voorzieningen: number;
    leefbaarheid: number;
    woningvooraad: number;
    demografie: number;
  };
  weightedTotal: number;
  maxPossibleScore: number;
  rRank: number;
  zRank: number;
  rRankPosition: number;
  zRankPosition: number;
  detailedScores: Array<{
    category: string;
    subcategory: string;
    characteristicType: string;
    multiplier: number;
    baseScore: number;
    weightedScore: number;
  }>;
}

const CATEGORY_WEIGHTS: CategoryWeights = scoringMapData.categoryWeights as CategoryWeights;
const SCORING_MAPPINGS: ScoringMapping[] = scoringMapData.scoringMappings as ScoringMapping[];

/**
 * Normalize persona characteristics to match scoring map format
 */
function normalizeCharacteristic(value: string, type: 'income' | 'household' | 'age'): string {
  // Remove spaces and hyphens for comparison
  const normalized = value.toLowerCase().replace(/[\s-]/g, '');

  // Map variations to standard format
  const mappings: Record<string, string> = {
    // Income mappings
    'laaginkomen': 'Laag inkomen',
    'lowIncome': 'Laag inkomen',
    'gemiddeldinkomen': 'Gemiddeld inkomen',
    'averageincome': 'Gemiddeld inkomen',
    'hooginkomen': 'Hoog inkomen',
    'highincome': 'Hoog inkomen',

    // Household mappings
    '1persoonshuishouden': '1persoons',
    '1personhousehold': '1persoons',
    '2persoonshuishouden': '2persoons',
    '2personhousehold': '2persoons',
    'metkinderen': 'met kinderen',
    'withchildren': 'met kinderen',

    // Age mappings
    '2035jaar': '20-35',
    '2035years': '20-35',
    '3555jaar': '35-55',
    '3555years': '35-55',
    '55+jaar': '55+',
    '55+years': '55+',
  };

  return mappings[normalized] || value;
}

/**
 * Get multiplier for a persona characteristic based on scoring mapping
 */
function getMultiplier(
  persona: PersonaCharacteristics,
  mapping: ScoringMapping
): number {
  let personaValue = '';

  // Get the appropriate persona characteristic
  switch (mapping.characteristicType) {
    case 'Inkomen':
      personaValue = normalizeCharacteristic(persona.income_level, 'income');
      break;
    case 'Huishouden':
      personaValue = normalizeCharacteristic(persona.household_type, 'household');
      break;
    case 'Leeftijd':
      personaValue = normalizeCharacteristic(persona.age_group, 'age');
      break;
    default:
      return 0;
  }

  // Return multiplier based on match
  if (personaValue === mapping.most) return 3;
  if (personaValue === mapping.average) return 2;
  if (personaValue === mapping.least) return 1;

  return 0;
}

/**
 * Calculate category score for a persona
 */
function calculateCategoryScore(
  persona: PersonaCharacteristics,
  category: string,
  locationScores: Record<string, number>
): { score: number; maxPossible: number; details: PersonaScore['detailedScores'] } {
  let totalScore = 0;
  let maxPossible = 0;
  const details: PersonaScore['detailedScores'] = [];

  // Filter mappings for this category
  const categoryMappings = SCORING_MAPPINGS.filter(m =>
    m.category.toLowerCase() === category.toLowerCase()
  );

  // Calculate score for each mapping
  for (const mapping of categoryMappings) {
    const multiplier = getMultiplier(persona, mapping);
    const baseScore = locationScores[mapping.subcategory] || 0;
    const weightedScore = baseScore * multiplier;

    totalScore += weightedScore;
    // Max possible is if all base scores were +1 with THIS persona's multiplier
    maxPossible += multiplier;

    if (multiplier > 0) {
      details.push({
        category: mapping.category,
        subcategory: mapping.subcategory,
        characteristicType: mapping.characteristicType,
        multiplier,
        baseScore,
        weightedScore,
      });
    }
  }

  return { score: totalScore, maxPossible, details };
}

/**
 * Calculate Z-rank (normalized score from -1 to 1)
 */
function calculateZRanks(scores: PersonaScore[]): PersonaScore[] {
  const totalScores = scores.map(s => s.weightedTotal);
  const mean = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const stdDev = Math.sqrt(
    totalScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / totalScores.length
  );

  // Calculate z-scores and normalize to -1 to 1 range
  const zScores = scores.map(s => {
    const zScore = stdDev === 0 ? 0 : (s.weightedTotal - mean) / stdDev;
    // Normalize to -1 to 1 (using tanh for smooth normalization)
    return Math.tanh(zScore / 2);
  });

  // Update scores with z-ranks
  return scores.map((score, index) => ({
    ...score,
    zRank: zScores[index],
  }));
}

/**
 * Calculate R-rank and Z-rank positions
 */
function calculateRankPositions(scores: PersonaScore[]): PersonaScore[] {
  // Sort by R-rank (descending)
  const sortedByR = [...scores].sort((a, b) => b.rRank - a.rRank);
  const rRankMap = new Map(sortedByR.map((score, index) => [score.personaId, index + 1]));

  // Sort by Z-rank (descending)
  const sortedByZ = [...scores].sort((a, b) => b.zRank - a.zRank);
  const zRankMap = new Map(sortedByZ.map((score, index) => [score.personaId, index + 1]));

  // Update scores with positions
  return scores.map(score => ({
    ...score,
    rRankPosition: rRankMap.get(score.personaId) || 0,
    zRankPosition: zRankMap.get(score.personaId) || 0,
  }));
}

/**
 * Main function to calculate scores for all personas
 */
export function calculatePersonaScores(
  personas: Array<{ id: string; name: string } & PersonaCharacteristics>,
  locationScores: Record<string, number>
): PersonaScore[] {
  const scores: PersonaScore[] = [];

  for (const persona of personas) {
    // Calculate scores for each category
    const voorzieningen = calculateCategoryScore(persona, 'Voorzieningen', locationScores);
    const leefbaarheid = calculateCategoryScore(persona, 'Leefbaarheid', locationScores);
    const woningvooraad = calculateCategoryScore(persona, 'Woningvooraad', locationScores);
    const demografie = calculateCategoryScore(persona, 'Demografie', locationScores);

    // Calculate weighted total
    const categoryScores = {
      voorzieningen: voorzieningen.score,
      leefbaarheid: leefbaarheid.score,
      woningvooraad: woningvooraad.score,
      demografie: demografie.score,
    };

    const weightedTotal =
      categoryScores.voorzieningen * CATEGORY_WEIGHTS.voorzieningen +
      categoryScores.leefbaarheid * CATEGORY_WEIGHTS.leefbaarheid +
      categoryScores.woningvooraad * CATEGORY_WEIGHTS.woningvooraad +
      categoryScores.demografie * CATEGORY_WEIGHTS.demografie;

    // Calculate max possible score
    const maxPossibleScore =
      voorzieningen.maxPossible * CATEGORY_WEIGHTS.voorzieningen +
      leefbaarheid.maxPossible * CATEGORY_WEIGHTS.leefbaarheid +
      woningvooraad.maxPossible * CATEGORY_WEIGHTS.woningvooraad +
      demografie.maxPossible * CATEGORY_WEIGHTS.demografie;

    // Calculate R-rank (percentage of max possible)
    const rRank = maxPossibleScore > 0 ? weightedTotal / maxPossibleScore : 0;

    // Combine all details
    const detailedScores = [
      ...voorzieningen.details,
      ...leefbaarheid.details,
      ...woningvooraad.details,
      ...demografie.details,
    ];

    scores.push({
      personaId: persona.id,
      personaName: persona.name,
      categoryScores,
      weightedTotal,
      maxPossibleScore,
      rRank,
      zRank: 0, // Will be calculated below
      rRankPosition: 0, // Will be calculated below
      zRankPosition: 0, // Will be calculated below
      detailedScores,
    });
  }

  // Calculate Z-ranks
  const scoresWithZ = calculateZRanks(scores);

  // Calculate rank positions
  const finalScores = calculateRankPositions(scoresWithZ);

  return finalScores;
}

/**
 * Get category weight
 */
export function getCategoryWeight(category: string): number {
  const normalized = category.toLowerCase();
  if (normalized === 'voorzieningen') return CATEGORY_WEIGHTS.voorzieningen;
  if (normalized === 'leefbaarheid') return CATEGORY_WEIGHTS.leefbaarheid;
  if (normalized === 'woningvooraad') return CATEGORY_WEIGHTS.woningvooraad;
  if (normalized === 'demografie') return CATEGORY_WEIGHTS.demografie;
  return 1;
}

export { CATEGORY_WEIGHTS, SCORING_MAPPINGS };
