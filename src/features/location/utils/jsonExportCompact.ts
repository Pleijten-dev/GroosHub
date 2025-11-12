/**
 * Compact JSON Export for LLM Report Generation
 *
 * This export uses the EXACT field keys shown on the UI pages
 * and structures data to match what users see in the application.
 */

import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from './targetGroupScoring';
import housingPersonasData from '../data/sources/housing-personas.json';

interface CompactMetric {
  name: string;
  neighborhood: string;
  municipality: string;
  national?: string;
}

interface CompactAmenity {
  name: string;
  count: number;
  countScore: number;
  proximityCount: number;
  proximityBonus: number;
}

interface CompactPersonaInfo {
  id: string;
  name: string;
  incomeLevel: string;
  householdType: string;
  ageGroup: string;
  description: string;
  rank: number;
  score: number;
  categoryScores: {
    voorzieningen: number;
    leefbaarheid: number;
    woningvooraad: number;
    demografie: number;
  };
}

interface CompactScenario {
  name: string;
  personaNames: string[];
  avgScore: number;
}

export interface CompactLocationExport {
  metadata: {
    location: string;
    municipality: string;
    district?: string;
    neighborhood?: string;
    exportDate: string;
    coordinates?: { lat: number; lon: number };
  };

  // All personas with their full information
  allPersonas: {
    id: string;
    name: string;
    incomeLevel: string;
    householdType: string;
    ageGroup: string;
    description: string;
  }[];

  // Demographics - all sections shown on UI
  demographics: {
    age: CompactMetric[]; // 5 age groups
    status: CompactMetric[]; // 4 marital statuses
    immigration: CompactMetric[]; // 8 immigration categories
    familySize: { neighborhood: string; municipality: string; national?: string };
    familyType: CompactMetric[]; // 3 family types
    income: { neighborhood: string; municipality: string; national?: string };
  };

  // Health - sections as shown on UI
  health: {
    experiencedHealth: { neighborhood: string; municipality: string; national?: string };
    sports: { neighborhood: string; municipality: string; national?: string };
    weight: CompactMetric[]; // 4 weight categories
    smoker: { neighborhood: string; municipality: string; national?: string };
    alcohol: CompactMetric[]; // 4 alcohol categories
    limitedHealth: { neighborhood: string; municipality: string; national?: string };
    loneliness: CompactMetric[]; // 4 loneliness categories
    emotionalSupport: { neighborhood: string; municipality: string; national?: string };
    psychologicalHealth: CompactMetric[]; // 3 psychological indicators
  };

  // Safety - sections as shown on UI
  safety: {
    totalCrimes: { neighborhood: string; municipality: string; national?: string };
    burglary: { neighborhood: string; municipality: string; national?: string };
    pickpocketing: { neighborhood: string; municipality: string; national?: string };
    accidents: { neighborhood: string; municipality: string; national?: string };
    feelsUnsafe: { neighborhood: string; municipality: string; national?: string };
    streetLighting: { neighborhood: string; municipality: string; national?: string };
  };

  // Livability - sections as shown on UI (only 7 sections)
  livability: {
    maintenance: CompactMetric[]; // 2 metrics
    streetLighting: { neighborhood: string; municipality: string; national?: string };
    youthFacilities: CompactMetric[]; // 2 metrics
    contact: CompactMetric[]; // 4 metrics
    volunteers: { neighborhood: string; municipality: string; national?: string }; // from health data
    socialCohesion: { neighborhood: string; municipality: string; national?: string };
    livabilityScore: { neighborhood: string; municipality: string; national?: string };
  };

  // Amenities - grouped by category with scores
  amenities: CompactAmenity[];

  // Housing market summary
  housingMarket?: {
    avgPrice: number;
    avgSize: number;
    avgBuildYear: number;
    typeDistribution: Array<{ type: string; percentage: number }>;
    priceDistribution: Array<{ range: string; percentage: number }>;
  };

  // Target groups - all 27 personas ranked
  targetGroups: {
    rankedPersonas: CompactPersonaInfo[]; // All 27 personas in rank order
    recommendedScenarios: CompactScenario[];
  };
}

/**
 * Get field value with fallback
 */
function getFieldValue(rows: UnifiedDataRow[], fieldKey: string): string {
  const row = rows.find(r => r.key === fieldKey);
  if (!row) return '-';
  return row.displayRelative || row.displayAbsolute || row.displayValue || '-';
}

/**
 * Create metric with neighborhood, municipality, and national values
 */
function createMetric(
  name: string,
  fieldKey: string,
  neighborhoodData: UnifiedDataRow[],
  municipalityData: UnifiedDataRow[],
  nationalData: UnifiedDataRow[]
): CompactMetric {
  return {
    name,
    neighborhood: getFieldValue(neighborhoodData, fieldKey),
    municipality: getFieldValue(municipalityData, fieldKey),
    national: getFieldValue(nationalData, fieldKey),
  };
}

/**
 * Create single value metric (for isValue: true sections)
 */
function createValueMetric(
  fieldKey: string,
  neighborhoodData: UnifiedDataRow[],
  municipalityData: UnifiedDataRow[],
  nationalData: UnifiedDataRow[]
): { neighborhood: string; municipality: string; national?: string } {
  return {
    neighborhood: getFieldValue(neighborhoodData, fieldKey),
    municipality: getFieldValue(municipalityData, fieldKey),
    national: getFieldValue(nationalData, fieldKey),
  };
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

  // Get all personas from the source data
  const allPersonasSource = housingPersonasData[locale].housing_personas;

  // === ALL PERSONAS (27 total) ===
  const allPersonas = allPersonasSource.map(p => ({
    id: p.id,
    name: p.name,
    incomeLevel: p.income_level,
    householdType: p.household_type,
    ageGroup: p.age_group,
    description: p.description,
  }));

  // === DEMOGRAPHICS ===
  const demographics = {
    age: [
      createMetric('0-15 jaar', 'k_0Tot15Jaar_8', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('15-25 jaar', 'k_15Tot25Jaar_9', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('25-45 jaar', 'k_25Tot45Jaar_10', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('45-65 jaar', 'k_45Tot65Jaar_11', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('65+ jaar', 'k_65JaarOfOuder_12', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    status: [
      createMetric('Ongehuwd', 'Ongehuwd_13', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Gehuwd', 'Gehuwd_14', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Gescheiden', 'Gescheiden_15', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Verweduwd', 'Verweduwd_16', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    immigration: [
      createMetric('Autochtoon', 'Autochtoon', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Westers', 'WestersTotaal_17', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Niet-Westers', 'NietWestersTotaal_18', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Marokko', 'Marokko_19', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Antillen/Aruba', 'NederlandseAntillenEnAruba_20', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Suriname', 'Suriname_21', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Turkije', 'Turkije_22', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Overig Niet-Westers', 'OverigNietWesters_23', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    familySize: createValueMetric('GemiddeldeHuishoudensgrootte_32', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    familyType: [
      createMetric('Eenpersoons', 'Eenpersoonshuishoudens_29', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Zonder kinderen', 'HuishoudensZonderKinderen_30', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Met kinderen', 'HuishoudensMetKinderen_31', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    income: createValueMetric('GemiddeldInkomenPerInwoner_72', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
  };

  // === HEALTH (using actual field keys from HealthPage) ===
  const health = {
    experiencedHealth: createValueMetric('ErvarenGezondheidGoedZeerGoed_4', data.health.neighborhood, data.health.municipality, data.health.national),
    sports: createValueMetric('WekelijkseSporters_6', data.health.neighborhood, data.health.municipality, data.health.national),
    weight: [
      createMetric('Ondergewicht', 'Ondergewicht_7', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Normaal gewicht', 'NormaalGewicht_8', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Overgewicht', 'Overgewicht_9', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Ernstig overgewicht', 'ErnstigOvergewicht_10', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    smoker: createValueMetric('Roker_11', data.health.neighborhood, data.health.municipality, data.health.national),
    alcohol: [
      createMetric('Voldoet aan alcoholrichtlijn', 'VoldoetAanAlcoholRichtlijn_12', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Drinker', 'Drinker_13', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Zware drinker', 'ZwareDrinker_14', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Overmatige drinker', 'OvermatigeDrinker_15', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    limitedHealth: createValueMetric('BeperktVanwegeGezondheid_17', data.health.neighborhood, data.health.municipality, data.health.national),
    loneliness: [
      createMetric('Eenzaam', 'Eenzaam_27', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Ernstig/zeer ernstig eenzaam', 'ErnstigZeerErnstigEenzaam_28', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Emotioneel eenzaam', 'EmotioneelEenzaam_29', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Sociaal eenzaam', 'SociaalEenzaam_30', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    emotionalSupport: createValueMetric('MistEmotioneleSteun_23', data.health.neighborhood, data.health.municipality, data.health.national),
    psychologicalHealth: [
      createMetric('Suïcidegedachten laatste 12 maanden', 'SuicideGedachtenLaatste12Maanden_24', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Hoog risico op angst/depressie', 'HoogRisicoOpAngstOfDepressie_25', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Veel stress afgelopen 4 weken', 'HeelVeelStressInAfgelopen4Weken_26', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
  };

  // === SAFETY (using actual field keys from SafetyPage) ===
  const safety = {
    totalCrimes: createValueMetric('Crime_0.0.0', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    burglary: createValueMetric('Crime_1.1.1', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    pickpocketing: createValueMetric('Crime_1.2.4', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    accidents: createValueMetric('Crime_1.3.1', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    feelsUnsafe: createValueMetric('VoeltZichWeleensOnveilig_43', data.livability.municipality, data.livability.municipality, data.livability.national),
    streetLighting: createValueMetric('Straatverlichting_3', data.livability.municipality, data.livability.municipality, data.livability.national),
  };

  // === LIVABILITY (using actual field keys from LivabilityPage - only 7 sections shown) ===
  const livability = {
    maintenance: [
      createMetric('Onderhoud stoepen, straten en pleintjes', 'OnderhoudStoepenStratenEnPleintjes_1', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Onderhoud plantsoenen en parken', 'OnderhoudVanPlantsoenenEnParken_2', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    streetLighting: createValueMetric('Straatverlichting_3', data.livability.municipality, data.livability.municipality, data.livability.national),
    youthFacilities: [
      createMetric('Speelplekken voor kinderen', 'SpeelplekkenVoorKinderen_4', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Voorzieningen voor jongeren', 'VoorzieningenVoorJongeren_5', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    contact: [
      createMetric('Mensen kennen elkaar nauwelijks', 'MensenKennenElkaarNauwelijks_7', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Mensen gaan prettig met elkaar om', 'MensenGaanPrettigMetElkaarOm_8', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Gezellige buurt waar men elkaar helpt', 'GezelligeBuurtWaarMenElkaarHelpt_9', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Veel contact met andere buurtbewoners', 'VeelContactMetAndereBuurtbewoners_11', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    // Volunteers comes from HEALTH data source, not livability
    volunteers: createValueMetric('Vrijwilligerswerk_32', data.health.neighborhood, data.health.municipality, data.health.national),
    socialCohesion: createValueMetric('SocialeCohesieSchaalscore_15', data.livability.municipality, data.livability.municipality, data.livability.national),
    livabilityScore: createValueMetric('RapportcijferLeefbaarheidWoonbuurt_18', data.livability.municipality, data.livability.municipality, data.livability.national),
  };

  // === AMENITIES - Group by category with count and scores ===
  const amenitiesMap = new Map<string, { count: number; countScore: number; proximityCount: number; proximityBonus: number }>();

  data.amenities.forEach(row => {
    // Extract category name (remove " - Aantal" or " - Nabijheid (250m)")
    const baseName = row.title
      .replace(/ - Aantal$/, '')
      .replace(/ - Nabijheid \(250m\)$/, '');

    if (!amenitiesMap.has(baseName)) {
      amenitiesMap.set(baseName, {
        count: 0,
        countScore: 0,
        proximityCount: 0,
        proximityBonus: 0,
      });
    }

    const amenity = amenitiesMap.get(baseName)!;

    if (row.title.includes('- Aantal')) {
      amenity.count = row.value as number || 0;
      amenity.countScore = row.calculatedScore || 0;
    } else if (row.title.includes('- Nabijheid')) {
      amenity.proximityCount = row.value as number || 0;
      amenity.proximityBonus = row.calculatedScore || 0;
    }
  });

  const amenities: CompactAmenity[] = Array.from(amenitiesMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      countScore: Math.round(data.countScore * 100) / 100,
      proximityCount: data.proximityCount,
      proximityBonus: Math.round(data.proximityBonus * 100) / 100,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
    const avgBuildYear = refHouses.reduce((sum, h) => sum + (h.BuildYear || 0), 0) / refHouses.length;

    // Type distribution
    const typeCount: Record<string, number> = {};
    refHouses.forEach(h => {
      const type = h.HouseType || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const typeDistribution = Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        percentage: Math.round((count / refHouses.length) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Price distribution
    const priceRanges = [
      { range: 'Low (<€300k)', count: refHouses.filter(h => parsePriceRange(h.IndexedTransactionPrice) < 300000).length },
      { range: 'Medium (€300k-€500k)', count: refHouses.filter(h => {
        const price = parsePriceRange(h.IndexedTransactionPrice);
        return price >= 300000 && price < 500000;
      }).length },
      { range: 'High (≥€500k)', count: refHouses.filter(h => parsePriceRange(h.IndexedTransactionPrice) >= 500000).length },
    ];

    const priceDistribution = priceRanges.map(r => ({
      range: r.range,
      percentage: Math.round((r.count / refHouses.length) * 100),
    }));

    housingMarket = {
      avgPrice: Math.round(avgPrice),
      avgSize: Math.round(avgSize),
      avgBuildYear: Math.round(avgBuildYear),
      typeDistribution,
      priceDistribution,
    };
  }

  // === TARGET GROUPS - ALL 27 PERSONAS ===
  const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);

  const rankedPersonas: CompactPersonaInfo[] = sortedPersonas.map(score => {
    const personaSource = allPersonasSource.find(p => p.id === score.personaId);
    return {
      id: score.personaId,
      name: score.personaName,
      incomeLevel: personaSource?.income_level || '',
      householdType: personaSource?.household_type || '',
      ageGroup: personaSource?.age_group || '',
      description: personaSource?.description || '',
      rank: score.rRankPosition,
      score: Math.round(score.rRank * 100) / 100,
      categoryScores: score.categoryScores,
    };
  });

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
      personaNames: scenarioPersonas.map(p => p.personaName),
      avgScore: Math.round(avgScore * 100) / 100,
    };
  };

  const recommendedScenarios = [
    buildScenario('Scenario 1', scenarios.scenario1),
    buildScenario('Scenario 2', scenarios.scenario2),
    buildScenario('Scenario 3', scenarios.scenario3),
  ];

  return {
    metadata: {
      location: locationString,
      municipality: data.location.municipality.statnaam,
      district: data.location.district?.statnaam,
      neighborhood: data.location.neighborhood?.statnaam,
      exportDate: new Date().toISOString().split('T')[0],
      coordinates: data.location.coordinates ? {
        lat: data.location.coordinates.wgs84.latitude,
        lon: data.location.coordinates.wgs84.longitude,
      } : undefined,
    },
    allPersonas,
    demographics,
    health,
    safety,
    livability,
    amenities,
    housingMarket,
    targetGroups: {
      rankedPersonas,
      recommendedScenarios,
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
