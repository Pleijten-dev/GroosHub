/**
 * Compact JSON Export for LLM Report Generation
 *
 * This export uses the EXACT field keys shown on the UI pages
 * and structures data to match what users see in the application.
 */

import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from './targetGroupScoring';
import housingPersonasData from '../data/sources/housing-personas.json';
import { pveConfigCache, type PVEFinalState } from '../data/cache/pveConfigCache';

interface CompactMetric {
  name: string;
  description: string;
  neighborhood: string;
  municipality: string;
  national?: string;
}

interface CompactAmenity {
  name: string;
  description: string;
  count: number;
  countScore: number;
  proximityCount: number;
  proximityBonus: number;
  scoringNote: string;
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

export interface CompactScenario {
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

  // PVE (Program van Eisen) - Final configuration from cache
  pve?: {
    description: string;
    totalM2: number;
    percentages: {
      apartments: { percentage: number; m2: number; description: string };
      commercial: { percentage: number; m2: number; description: string };
      hospitality: { percentage: number; m2: number; description: string };
      social: { percentage: number; m2: number; description: string };
      communal: { percentage: number; m2: number; description: string };
      offices: { percentage: number; m2: number; description: string };
    };
    timestamp: string;
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
    description: string;
    age: CompactMetric[]; // 5 age groups
    status: CompactMetric[]; // 4 marital statuses
    immigration: CompactMetric[]; // 8 immigration categories
    familySize: { description: string; neighborhood: string; municipality: string; national?: string };
    familyType: CompactMetric[]; // 3 family types
    income: { description: string; neighborhood: string; municipality: string; national?: string };
  };

  // Health - sections as shown on UI
  health: {
    description: string;
    experiencedHealth: { description: string; neighborhood: string; municipality: string; national?: string };
    sports: { description: string; neighborhood: string; municipality: string; national?: string };
    weight: CompactMetric[]; // 4 weight categories
    smoker: { description: string; neighborhood: string; municipality: string; national?: string };
    alcohol: CompactMetric[]; // 4 alcohol categories
    limitedHealth: { description: string; neighborhood: string; municipality: string; national?: string };
    loneliness: CompactMetric[]; // 4 loneliness categories
    emotionalSupport: { description: string; neighborhood: string; municipality: string; national?: string };
    psychologicalHealth: CompactMetric[]; // 3 psychological indicators
  };

  // Safety - sections as shown on UI
  safety: {
    description: string;
    totalCrimes: { description: string; neighborhood: string; municipality: string; national?: string };
    burglary: { description: string; neighborhood: string; municipality: string; national?: string };
    pickpocketing: { description: string; neighborhood: string; municipality: string; national?: string };
    accidents: { description: string; neighborhood: string; municipality: string; national?: string };
    feelsUnsafe: { description: string; neighborhood: string; municipality: string; national?: string };
    streetLighting: { description: string; neighborhood: string; municipality: string; national?: string };
  };

  // Livability - sections as shown on UI (only 7 sections)
  livability: {
    description: string;
    maintenance: CompactMetric[]; // 2 metrics
    streetLighting: { description: string; neighborhood: string; municipality: string; national?: string };
    youthFacilities: CompactMetric[]; // 2 metrics
    contact: CompactMetric[]; // 4 metrics
    volunteers: { description: string; neighborhood: string; municipality: string; national?: string }; // from health data
    socialCohesion: { description: string; neighborhood: string; municipality: string; national?: string };
    livabilityScore: { description: string; neighborhood: string; municipality: string; national?: string };
  };

  // Amenities - grouped by category with scores
  amenities: {
    description: string;
    items: CompactAmenity[];
  };

  // Housing market summary
  housingMarket?: {
    description: string;
    avgPrice: number;
    avgSize: number;
    avgBuildYear: number;
    typeDistribution: Array<{ type: string; percentage: number }>;
    priceDistribution: Array<{ range: string; percentage: number }>;
  };

  // Target groups - all 27 personas ranked
  targetGroups: {
    description: string;
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
  description: string,
  fieldKey: string,
  neighborhoodData: UnifiedDataRow[],
  municipalityData: UnifiedDataRow[],
  nationalData: UnifiedDataRow[]
): CompactMetric {
  return {
    name,
    description,
    neighborhood: getFieldValue(neighborhoodData, fieldKey),
    municipality: getFieldValue(municipalityData, fieldKey),
    national: getFieldValue(nationalData, fieldKey),
  };
}

/**
 * Create single value metric (for isValue: true sections)
 */
function createValueMetric(
  description: string,
  fieldKey: string,
  neighborhoodData: UnifiedDataRow[],
  municipalityData: UnifiedDataRow[],
  nationalData: UnifiedDataRow[]
): { description: string; neighborhood: string; municipality: string; national?: string } {
  return {
    description,
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
  locale: 'nl' | 'en' = 'nl',
  customScenarioPersonaIds: string[] = []
): CompactLocationExport {
  // Format location string
  const locationParts = [
    data.location.neighborhood?.statnaam,
    data.location.district?.statnaam,
    data.location.municipality.statnaam,
  ].filter(Boolean);
  const locationString = locationParts.join(', ');

  // Get PVE final state from cache
  const pveFinalState = pveConfigCache.getFinalPVE();
  const pveData = pveFinalState ? {
    description: locale === 'nl'
      ? 'Program van Eisen (PvE) - De definitieve verdeling van het te ontwikkelen programma. Alle waarden zijn uitgedrukt in percentages van het totaal en vierkante meters (m²).'
      : 'Program of Requirements (PvE) - The final distribution of the development program. All values are expressed as percentages of the total and square meters (m²).',
    totalM2: pveFinalState.totalM2,
    percentages: {
      apartments: {
        percentage: pveFinalState.percentages.apartments,
        m2: Math.round((pveFinalState.percentages.apartments / 100) * pveFinalState.totalM2),
        description: locale === 'nl'
          ? 'Woningen/appartementen - Het percentage en m² toegewezen aan residentiële wooneenheden'
          : 'Residential apartments - The percentage and m² allocated to residential housing units'
      },
      commercial: {
        percentage: pveFinalState.percentages.commercial,
        m2: Math.round((pveFinalState.percentages.commercial / 100) * pveFinalState.totalM2),
        description: locale === 'nl'
          ? 'Commercieel - Het percentage en m² voor winkels, retail en commerciële activiteiten'
          : 'Commercial - The percentage and m² for shops, retail and commercial activities'
      },
      hospitality: {
        percentage: pveFinalState.percentages.hospitality,
        m2: Math.round((pveFinalState.percentages.hospitality / 100) * pveFinalState.totalM2),
        description: locale === 'nl'
          ? 'Horeca - Het percentage en m² voor restaurants, cafés en horecagelegenheden'
          : 'Hospitality - The percentage and m² for restaurants, cafés and hospitality venues'
      },
      social: {
        percentage: pveFinalState.percentages.social,
        m2: Math.round((pveFinalState.percentages.social / 100) * pveFinalState.totalM2),
        description: locale === 'nl'
          ? 'Sociaal - Het percentage en m² voor sociale voorzieningen zoals zorg, onderwijs en welzijn'
          : 'Social - The percentage and m² for social facilities such as healthcare, education and welfare'
      },
      communal: {
        percentage: pveFinalState.percentages.communal,
        m2: Math.round((pveFinalState.percentages.communal / 100) * pveFinalState.totalM2),
        description: locale === 'nl'
          ? 'Gemeenschappelijk - Het percentage en m² voor gedeelde ruimtes en gemeenschappelijke voorzieningen'
          : 'Communal - The percentage and m² for shared spaces and communal facilities'
      },
      offices: {
        percentage: pveFinalState.percentages.offices,
        m2: Math.round((pveFinalState.percentages.offices / 100) * pveFinalState.totalM2),
        description: locale === 'nl'
          ? 'Kantoren - Het percentage en m² voor kantoorruimtes en werkplekken'
          : 'Offices - The percentage and m² for office spaces and workplaces'
      }
    },
    timestamp: new Date(pveFinalState.timestamp).toISOString()
  } : undefined;

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
    description: locale === 'nl'
      ? 'Demografische kenmerken van de bevolking, inclusief leeftijd, burgerlijke staat, herkomst en inkomen'
      : 'Demographic characteristics of the population, including age, marital status, origin and income',
    age: [
      createMetric('0-15 jaar', locale === 'nl' ? 'Percentage kinderen en jongeren' : 'Percentage children and youth', 'k_0Tot15Jaar_8', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('15-25 jaar', locale === 'nl' ? 'Percentage jongvolwassenen' : 'Percentage young adults', 'k_15Tot25Jaar_9', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('25-45 jaar', locale === 'nl' ? 'Percentage volwassenen in de werkzame leeftijd' : 'Percentage working-age adults', 'k_25Tot45Jaar_10', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('45-65 jaar', locale === 'nl' ? 'Percentage middelbare leeftijd' : 'Percentage middle-aged', 'k_45Tot65Jaar_11', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('65+ jaar', locale === 'nl' ? 'Percentage ouderen (gepensioneerd)' : 'Percentage elderly (retired)', 'k_65JaarOfOuder_12', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    status: [
      createMetric('Ongehuwd', locale === 'nl' ? 'Percentage ongehuwden' : 'Percentage unmarried', 'Ongehuwd_13', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Gehuwd', locale === 'nl' ? 'Percentage gehuwden' : 'Percentage married', 'Gehuwd_14', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Gescheiden', locale === 'nl' ? 'Percentage gescheidenen' : 'Percentage divorced', 'Gescheiden_15', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Verweduwd', locale === 'nl' ? 'Percentage weduwen/weduwnaars' : 'Percentage widowed', 'Verweduwd_16', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    immigration: [
      createMetric('Autochtoon', locale === 'nl' ? 'Percentage met Nederlandse herkomst' : 'Percentage of Dutch origin', 'Autochtoon', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Westers', locale === 'nl' ? 'Percentage met Westerse migratieachtergrond' : 'Percentage with Western migration background', 'WestersTotaal_17', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Niet-Westers', locale === 'nl' ? 'Percentage met niet-Westerse migratieachtergrond' : 'Percentage with non-Western migration background', 'NietWestersTotaal_18', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Marokko', locale === 'nl' ? 'Percentage met Marokkaanse herkomst' : 'Percentage of Moroccan origin', 'Marokko_19', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Antillen/Aruba', locale === 'nl' ? 'Percentage met Antilliaanse/Arubaanse herkomst' : 'Percentage of Antillean/Aruban origin', 'NederlandseAntillenEnAruba_20', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Suriname', locale === 'nl' ? 'Percentage met Surinaamse herkomst' : 'Percentage of Surinamese origin', 'Suriname_21', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Turkije', locale === 'nl' ? 'Percentage met Turkse herkomst' : 'Percentage of Turkish origin', 'Turkije_22', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Overig Niet-Westers', locale === 'nl' ? 'Percentage met overige niet-Westerse herkomst' : 'Percentage with other non-Western origin', 'OverigNietWesters_23', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    familySize: createValueMetric(locale === 'nl' ? 'Gemiddeld aantal personen per huishouden' : 'Average number of persons per household', 'GemiddeldeHuishoudensgrootte_32', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    familyType: [
      createMetric('Eenpersoons', locale === 'nl' ? 'Percentage alleenstaanden' : 'Percentage single-person households', 'Eenpersoonshuishoudens_29', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Zonder kinderen', locale === 'nl' ? 'Percentage huishoudens zonder kinderen' : 'Percentage households without children', 'HuishoudensZonderKinderen_30', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
      createMetric('Met kinderen', locale === 'nl' ? 'Percentage huishoudens met kinderen' : 'Percentage households with children', 'HuishoudensMetKinderen_31', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
    ],
    income: createValueMetric(locale === 'nl' ? 'Gemiddeld inkomen per inwoner per jaar (in euro)' : 'Average income per resident per year (in euros)', 'GemiddeldInkomenPerInwoner_72', data.demographics.neighborhood, data.demographics.municipality, data.demographics.national),
  };

  // === HEALTH (using actual field keys from HealthPage) ===
  const health = {
    description: locale === 'nl'
      ? 'Gezondheidskenmerken van de bevolking, inclusief fysieke en mentale gezondheid'
      : 'Health characteristics of the population, including physical and mental health',
    experiencedHealth: createValueMetric(locale === 'nl' ? 'Percentage dat eigen gezondheid als goed of zeer goed ervaart' : 'Percentage experiencing own health as good or very good', 'ErvarenGezondheidGoedZeerGoed_4', data.health.neighborhood, data.health.municipality, data.health.national),
    sports: createValueMetric(locale === 'nl' ? 'Percentage dat wekelijks sport' : 'Percentage exercising weekly', 'WekelijkseSporters_6', data.health.neighborhood, data.health.municipality, data.health.national),
    weight: [
      createMetric('Ondergewicht', locale === 'nl' ? 'Percentage met ondergewicht (BMI < 18.5)' : 'Percentage underweight (BMI < 18.5)', 'Ondergewicht_7', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Normaal gewicht', locale === 'nl' ? 'Percentage met gezond gewicht (BMI 18.5-25)' : 'Percentage normal weight (BMI 18.5-25)', 'NormaalGewicht_8', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Overgewicht', locale === 'nl' ? 'Percentage met overgewicht (BMI 25-30)' : 'Percentage overweight (BMI 25-30)', 'Overgewicht_9', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Ernstig overgewicht', locale === 'nl' ? 'Percentage met obesitas (BMI > 30)' : 'Percentage obese (BMI > 30)', 'ErnstigOvergewicht_10', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    smoker: createValueMetric(locale === 'nl' ? 'Percentage rokers' : 'Percentage smokers', 'Roker_11', data.health.neighborhood, data.health.municipality, data.health.national),
    alcohol: [
      createMetric('Voldoet aan alcoholrichtlijn', locale === 'nl' ? 'Percentage dat zich houdt aan gezonde alcoholrichtlijnen' : 'Percentage adhering to healthy alcohol guidelines', 'VoldoetAanAlcoholRichtlijn_12', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Drinker', locale === 'nl' ? 'Percentage dat alcohol drinkt' : 'Percentage drinking alcohol', 'Drinker_13', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Zware drinker', locale === 'nl' ? 'Percentage zware drinkers (>14 glazen/week)' : 'Percentage heavy drinkers (>14 drinks/week)', 'ZwareDrinker_14', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Overmatige drinker', locale === 'nl' ? 'Percentage overmatige drinkers (>21 glazen/week)' : 'Percentage excessive drinkers (>21 drinks/week)', 'OvermatigeDrinker_15', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    limitedHealth: createValueMetric(locale === 'nl' ? 'Percentage met langdurige beperkingen vanwege gezondheidsproblemen' : 'Percentage with long-term health limitations', 'BeperktVanwegeGezondheid_17', data.health.neighborhood, data.health.municipality, data.health.national),
    loneliness: [
      createMetric('Eenzaam', locale === 'nl' ? 'Percentage dat zich eenzaam voelt' : 'Percentage feeling lonely', 'Eenzaam_27', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Ernstig/zeer ernstig eenzaam', locale === 'nl' ? 'Percentage met ernstige eenzaamheidsgevoelens' : 'Percentage with severe loneliness', 'ErnstigZeerErnstigEenzaam_28', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Emotioneel eenzaam', locale === 'nl' ? 'Percentage dat emotionele verbinding mist' : 'Percentage missing emotional connection', 'EmotioneelEenzaam_29', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Sociaal eenzaam', locale === 'nl' ? 'Percentage dat sociaal netwerk mist' : 'Percentage missing social network', 'SociaalEenzaam_30', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
    emotionalSupport: createValueMetric(locale === 'nl' ? 'Percentage dat emotionele steun mist' : 'Percentage lacking emotional support', 'MistEmotioneleSteun_23', data.health.neighborhood, data.health.municipality, data.health.national),
    psychologicalHealth: [
      createMetric('Suïcidegedachten laatste 12 maanden', locale === 'nl' ? 'Percentage met suïcidale gedachten in afgelopen jaar' : 'Percentage with suicidal thoughts in past year', 'SuicideGedachtenLaatste12Maanden_24', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Hoog risico op angst/depressie', locale === 'nl' ? 'Percentage met verhoogd risico op angststoornissen of depressie' : 'Percentage at high risk for anxiety or depression', 'HoogRisicoOpAngstOfDepressie_25', data.health.neighborhood, data.health.municipality, data.health.national),
      createMetric('Veel stress afgelopen 4 weken', locale === 'nl' ? 'Percentage met veel stress in afgelopen maand' : 'Percentage with high stress in past month', 'HeelVeelStressInAfgelopen4Weken_26', data.health.neighborhood, data.health.municipality, data.health.national),
    ],
  };

  // === SAFETY (using actual field keys from SafetyPage) ===
  const safety = {
    description: locale === 'nl'
      ? 'Veiligheidsindicatoren inclusief criminaliteit en veiligheidsbeleving'
      : 'Safety indicators including crime rates and safety perception',
    totalCrimes: createValueMetric(locale === 'nl' ? 'Totaal aantal geregistreerde misdrijven per 1000 inwoners' : 'Total registered crimes per 1000 residents', 'Crime_0.0.0', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    burglary: createValueMetric(locale === 'nl' ? 'Aantal woninginbraken per 1000 woningen' : 'Residential burglaries per 1000 homes', 'Crime_1.1.1', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    pickpocketing: createValueMetric(locale === 'nl' ? 'Aantal zakkenrollerij incidenten per 1000 inwoners' : 'Pickpocketing incidents per 1000 residents', 'Crime_1.2.4', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    accidents: createValueMetric(locale === 'nl' ? 'Aantal verkeersongevallen per 1000 inwoners' : 'Traffic accidents per 1000 residents', 'Crime_1.3.1', data.safety.neighborhood, data.safety.municipality, data.safety.national),
    feelsUnsafe: createValueMetric(locale === 'nl' ? 'Percentage dat zich weleens onveilig voelt in de buurt' : 'Percentage sometimes feeling unsafe in the neighborhood', 'VoeltZichWeleensOnveilig_43', data.livability.municipality, data.livability.municipality, data.livability.national),
    streetLighting: createValueMetric(locale === 'nl' ? 'Waardering voor straatverlichting (schaal 1-10)' : 'Rating for street lighting (scale 1-10)', 'Straatverlichting_3', data.livability.municipality, data.livability.municipality, data.livability.national),
  };

  // === LIVABILITY (using actual field keys from LivabilityPage - only 7 sections shown) ===
  const livability = {
    description: locale === 'nl'
      ? 'Leefbaarheid van de buurt, inclusief onderhoud, voorzieningen en sociale cohesie'
      : 'Neighborhood livability, including maintenance, facilities and social cohesion',
    maintenance: [
      createMetric('Onderhoud stoepen, straten en pleintjes', locale === 'nl' ? 'Waardering onderhoud openbare ruimte (schaal 1-10)' : 'Rating for public space maintenance (scale 1-10)', 'OnderhoudStoepenStratenEnPleintjes_1', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Onderhoud plantsoenen en parken', locale === 'nl' ? 'Waardering onderhoud groen (schaal 1-10)' : 'Rating for green space maintenance (scale 1-10)', 'OnderhoudVanPlantsoenenEnParken_2', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    streetLighting: createValueMetric(locale === 'nl' ? 'Waardering voor straatverlichting (schaal 1-10)' : 'Rating for street lighting (scale 1-10)', 'Straatverlichting_3', data.livability.municipality, data.livability.municipality, data.livability.national),
    youthFacilities: [
      createMetric('Speelplekken voor kinderen', locale === 'nl' ? 'Waardering speelvoorzieningen (schaal 1-10)' : 'Rating for play facilities (scale 1-10)', 'SpeelplekkenVoorKinderen_4', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Voorzieningen voor jongeren', locale === 'nl' ? 'Waardering jongerenvoorzieningen (schaal 1-10)' : 'Rating for youth facilities (scale 1-10)', 'VoorzieningenVoorJongeren_5', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    contact: [
      createMetric('Mensen kennen elkaar nauwelijks', locale === 'nl' ? 'Percentage dat weinig contact heeft met buurtbewoners' : 'Percentage with little contact with neighbors', 'MensenKennenElkaarNauwelijks_7', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Mensen gaan prettig met elkaar om', locale === 'nl' ? 'Percentage dat positief is over onderlinge omgang' : 'Percentage positive about mutual interaction', 'MensenGaanPrettigMetElkaarOm_8', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Gezellige buurt waar men elkaar helpt', locale === 'nl' ? 'Percentage dat buurt als gezellig en helpend ervaart' : 'Percentage experiencing neighborhood as pleasant and helpful', 'GezelligeBuurtWaarMenElkaarHelpt_9', data.livability.municipality, data.livability.municipality, data.livability.national),
      createMetric('Veel contact met andere buurtbewoners', locale === 'nl' ? 'Percentage met veel buurtcontact' : 'Percentage with frequent neighbor contact', 'VeelContactMetAndereBuurtbewoners_11', data.livability.municipality, data.livability.municipality, data.livability.national),
    ],
    // Volunteers comes from HEALTH data source, not livability
    volunteers: createValueMetric(locale === 'nl' ? 'Percentage dat vrijwilligerswerk doet' : 'Percentage doing volunteer work', 'Vrijwilligerswerk_32', data.health.neighborhood, data.health.municipality, data.health.national),
    socialCohesion: createValueMetric(locale === 'nl' ? 'Score voor sociale cohesie (schaal 0-100)' : 'Social cohesion score (scale 0-100)', 'SocialeCohesieSchaalscore_15', data.livability.municipality, data.livability.municipality, data.livability.national),
    livabilityScore: createValueMetric(locale === 'nl' ? 'Rapportcijfer voor leefbaarheid woonbuurt (schaal 1-10)' : 'Overall livability rating (scale 1-10)', 'RapportcijferLeefbaarheidWoonbuurt_18', data.livability.municipality, data.livability.municipality, data.livability.national),
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

  // Amenity descriptions
  const amenityDescriptions: Record<string, { nl: string; en: string }> = {
    'Supermarkt': { nl: 'Aantal supermarkten en nabijheid binnen 250m', en: 'Number of supermarkets and proximity within 250m' },
    'Huisartsen': { nl: 'Aantal huisartsen en nabijheid binnen 250m', en: 'Number of general practitioners and proximity within 250m' },
    'Tandarts': { nl: 'Aantal tandartsen en nabijheid binnen 250m', en: 'Number of dentists and proximity within 250m' },
    'Basisscholen': { nl: 'Aantal basisscholen en nabijheid binnen 250m', en: 'Number of primary schools and proximity within 250m' },
    'Middelbare scholen': { nl: 'Aantal middelbare scholen en nabijheid binnen 250m', en: 'Number of secondary schools and proximity within 250m' },
    'Restaurants': { nl: 'Aantal restaurants en nabijheid binnen 250m', en: 'Number of restaurants and proximity within 250m' },
    'Cafés/Bars': { nl: 'Aantal cafés en bars en nabijheid binnen 250m', en: 'Number of cafés/bars and proximity within 250m' },
    'Sportfaciliteiten': { nl: 'Aantal sportfaciliteiten en nabijheid binnen 250m', en: 'Number of sports facilities and proximity within 250m' },
    'Parken': { nl: 'Aantal parken en nabijheid binnen 250m', en: 'Number of parks and proximity within 250m' },
    'Openbaar vervoer': { nl: 'Aantal OV-haltes en nabijheid binnen 250m', en: 'Number of public transport stops and proximity within 250m' },
    'Kinderdagverblijven': { nl: 'Aantal kinderdagverblijven en nabijheid binnen 250m', en: 'Number of daycare centers and proximity within 250m' },
    'Bibliotheken': { nl: 'Aantal bibliotheken en nabijheid binnen 250m', en: 'Number of libraries and proximity within 250m' },
    'Apotheken': { nl: 'Aantal apotheken en nabijheid binnen 250m', en: 'Number of pharmacies and proximity within 250m' },
    'Banken': { nl: 'Aantal banken en nabijheid binnen 250m', en: 'Number of banks and proximity within 250m' },
    'Culturele voorzieningen': { nl: 'Aantal culturele voorzieningen en nabijheid binnen 250m', en: 'Number of cultural facilities and proximity within 250m' },
  };

  const scoringNote = locale === 'nl'
    ? 'Scores liggen tussen -1 en 1, waarbij 1 de best mogelijke score is. De proximityBonus geeft +1 wanneer een voorziening binnen 250m van de locatie ligt.'
    : 'Scores range from -1 to 1, where 1 is the best possible score. The proximityBonus awards +1 when an amenity is within 250m of the location.';

  const amenities: CompactAmenity[] = Array.from(amenitiesMap.entries())
    .map(([name, data]) => ({
      name,
      description: amenityDescriptions[name]?.[locale] || (locale === 'nl' ? `Aantal ${name.toLowerCase()} en nabijheid` : `Number of ${name.toLowerCase()} and proximity`),
      count: data.count,
      countScore: Math.round(data.countScore * 100) / 100,
      proximityCount: data.proximityCount,
      proximityBonus: Math.round(data.proximityBonus * 100) / 100,
      scoringNote,
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
      description: locale === 'nl'
        ? 'Woningmarkt statistieken gebaseerd op referentiewoningen in het gebied'
        : 'Housing market statistics based on reference homes in the area',
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

  // Add custom scenario if provided
  if (customScenarioPersonaIds.length > 0) {
    const customPersonas = customScenarioPersonaIds
      .map(id => sortedPersonas.find(p => p.personaId === id))
      .filter((p): p is PersonaScore => p !== undefined);

    const avgScore = customPersonas.length > 0
      ? customPersonas.reduce((sum, p) => sum + p.rRank, 0) / customPersonas.length
      : 0;

    recommendedScenarios.push({
      name: locale === 'nl' ? 'Op maat' : 'Custom',
      personaNames: customPersonas.map(p => p.personaName),
      avgScore: Math.round(avgScore * 100) / 100,
    });
  }

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
    pve: pveData,
    allPersonas,
    demographics,
    health,
    safety,
    livability,
    amenities: {
      description: locale === 'nl'
        ? 'Voorzieningen in de buurt met aantal, nabijheid en scores. Alle scores liggen tussen -1 en 1, waarbij 1 de best mogelijke score is. De proximityBonus geeft +1 wanneer een voorziening binnen 250m van de locatie ligt.'
        : 'Local amenities with count, proximity and scores. All scores range from -1 to 1, where 1 is the best possible score. The proximityBonus awards +1 when an amenity is within 250m of the location.',
      items: amenities,
    },
    housingMarket,
    targetGroups: {
      description: locale === 'nl'
        ? 'Alle 27 woonpersona\'s gerangschikt op geschiktheid voor deze locatie, met geautomatiseerde scenario\'s en optioneel een op maat samengesteld scenario'
        : 'All 27 housing personas ranked by suitability for this location, with automated scenarios and optionally a custom scenario',
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
