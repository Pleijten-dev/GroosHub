/**
 * Compact JSON Export for LLM Report Generation
 *
 * This export format is optimized for LLM consumption by:
 * - Including ALL data shown on the UI pages (not just top items)
 * - Using clear section structures matching the UI
 * - Removing redundant metadata and technical fields
 * - Focusing on human-readable values and context
 */

import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from './targetGroupScoring';
import { extractLocationScores } from './extractLocationScores';
import housingPersonasData from '../data/sources/housing-personas.json';

interface CompactMetric {
  name: string;
  neighborhood: string;
  municipality: string;
  national?: string;
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

  // Health - all metrics shown on UI
  health: {
    chronicDiseases: CompactMetric[]; // 9 diseases
    lifestyleHealthRisks: CompactMetric[]; // 7 risks
    mentalHealth: CompactMetric[]; // 4 metrics
  };

  // Safety - all metrics shown on UI
  safety: {
    crimeRates: CompactMetric[]; // 6 crime categories
    trafficSafety: CompactMetric[]; // 3 metrics
    fireIncidents: CompactMetric[]; // 3 metrics
    policeCalls: CompactMetric[]; // 6 call types
    victimRates: CompactMetric[]; // 3 victim types
    crimePerception: CompactMetric[]; // 3 perception types
  };

  // Livability - all metrics shown on UI
  livability: {
    physical: CompactMetric[];
    social: CompactMetric[];
  };

  // Amenities - complete list
  amenities: {
    total: number;
    list: string[]; // All amenity names
  };

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
    familySize: {
      neighborhood: getFieldValue(data.demographics.neighborhood, 'GemiddeldeHuishoudensgrootte_32'),
      municipality: getFieldValue(data.demographics.municipality, 'GemiddeldeHuishoudensgrootte_32'),
      national: getFieldValue(data.demographics.national, 'GemiddeldeHuishoudensgrootte_32'),
    },
    familyType: [
      createMetric('Eenpersoons', 'Eenpersoonshuishoudens_29', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Zonder kinderen', 'HuishoudensZonderKinderen_30', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Met kinderen', 'HuishoudensMetKinderen_31', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    income: {
      neighborhood: getFieldValue(data.demographics.neighborhood, 'GemiddeldInkomenPerInwoner_72'),
      municipality: getFieldValue(data.demographics.municipality, 'GemiddeldInkomenPerInwoner_72'),
      national: getFieldValue(data.demographics.national, 'GemiddeldInkomenPerInwoner_72'),
    },
  };

  // === HEALTH ===
  const health = {
    chronicDiseases: [
      createMetric('Hart- en vaatziekten', 'HartEnVaatziekten_120', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('COPD', 'COPD_121', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Diabetes', 'Diabetes_122', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Astma', 'Astma_123', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Hoge bloeddruk', 'HogeBloeddruk_124', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Duizeligheid met vallen', 'DuizigheidMetVallen_125', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Gewrichtsslijtage', 'Gewrichtsslijtage_126', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Depressie', 'Depressie_127', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Ernstige eenzaamheid', 'ErnistigeEenzaamheid_128', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    lifestyleHealthRisks: [
      createMetric('Rokers', 'PercentageRokers_138', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Alcohol frequent', 'AlcoholGebruikFrequent_139', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Alcohol overmatig', 'AlcoholGebruikOvermatig_140', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Obesitas', 'Obesitas_141', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Niet voldoende sport/bewegen', 'VoldoenNietAanSportEnBeweegnorm_142', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Dagelijkse risico-fruit', 'DagelijkseRisicoFruit_143', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Dagelijkse risico-groente', 'DagelijkseRisicoGroente_144', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    mentalHealth: [
      createMetric('Psychische problematiek', 'PsychischeProblematiek_129', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Angststoornissen', 'Angststoornissen_130', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Slaapstoornissen', 'Slaapstoornissen_131', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Persoonsgebonden psychische stress', 'PersoonsgebondenPsychischeStress_132', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
  };

  // === SAFETY ===
  const safety = {
    crimeRates: [
      createMetric('Geweldsmisdrijven', 'Geweldsmisdrijven_36', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Diefstal', 'Diefstal_37', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Vernieling', 'Vernieling_38', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Drugshandel', 'Drugshandel_39', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Verstoring openbare orde', 'VerstoringOpenbareOrde_40', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Totaal misdrijven', 'TotaalGeregistreerdeMisdrijven_41', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    ],
    trafficSafety: [
      createMetric('Verkeersongevallen', 'Verkeersongevallen_33', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Verkeersongevallen dodelijk', 'VerkeersongevallenDodelijk_34', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Verkeersongevallen ziekenhuisopname', 'VerkeersongevallenZiekenhuisopname_35', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    ],
    fireIncidents: [
      createMetric('Brandmeldingen', 'Brandmeldingen_42', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Brandmeldingen woningen', 'BrandmeldingenWoningen_43', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Brandmeldingen dodelijk', 'BrandmeldingenDodelijk_44', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    ],
    policeCalls: [
      createMetric('Politie-inzet geweld', 'PolitieInzetGeweld_45', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Politie-inzet overlast alcohol', 'PolitieInzetOverlastAlcoholEnDrugs_46', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Politie-inzet overlast jeugd', 'PolitieInzetOverlastJeugd_47', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Politie-inzet overlast overig', 'PolitieInzetOverlastOverig_48', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Politie-inzet verkeer', 'PolitieInzetVerkeer_49', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Politie-inzet totaal', 'PolitieInzetTotaal_50', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    ],
    victimRates: [
      createMetric('Slachtoffer geweld', 'SlachtofferGeweld_51', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Slachtoffer diefstal', 'SlachtofferDiefstal_52', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Slachtoffer vernieling', 'SlachtofferVernieling_53', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    ],
    crimePerception: [
      createMetric('Beleving onveiligheidsgevoelens', 'BelevingOnveiligheidsgevoelens_54', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Beleving overlast', 'BelevingOverlast_55', data.safety.neighborhood, data.safety.municipality, data.safety.national),
      createMetric('Beleving verloedering', 'BelevingVerloedering_56', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    ],
  };

  // === LIVABILITY ===
  const livability = {
    physical: [
      createMetric('Tevredenheid woning', 'TevredenheidWoning_57', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Tevredenheid woonomgeving', 'TevredenheidWoonomgeving_58', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Groen in de buurt', 'GroenInDeBuurt_59', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Geluidsoverlast', 'Geluidsoverlast_60', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Stankoverlast', 'Stankoverlast_61', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Luchtkwaliteit fijnstof', 'LuchtkwaliteitFijnstof_62', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Luchtkwaliteit stikstofdioxide', 'LuchtkwaliteitStikstofdioxide_63', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    social: [
      createMetric('Sociale samenhang', 'SocialeSamenhang_64', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Eenzaamheid', 'Eenzaamheid_65', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Vrijwilligerswerk', 'Vrijwilligerswerk_66', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Mantelzorg', 'Mantelzorg_67', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Geven aan goede doelen', 'GevenAanGoedeDoelen_68', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Informele hulp', 'InformeleHulp_69', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
  };

  // === AMENITIES ===
  const amenities = {
    total: data.amenities.length,
    list: data.amenities.map(a => a.title).sort(),
  };

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
