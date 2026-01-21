'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/shared/utils/cn';
import type { WijkWithZScores } from '@/app/api/admin/location-demographics/route';

interface PersonaExpectation {
  personaId: string;
  personaName: string;
  incomeLevel: 'low' | 'middle' | 'high';
  householdType: 'single' | 'couple' | 'family';
  ageGroup: 'young' | 'middle' | 'senior';
  expectedRank: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface ClassificationData {
  classification: string;
  count: number;
  examples: WijkWithZScores[];
  personaExpectations: PersonaExpectation[];
}

// Map CBS classifications to expected persona rankings
function getPersonaExpectations(classification: string): PersonaExpectation[] {
  const expectations: PersonaExpectation[] = [];

  // Define all 27 personas with their characteristics
  const personas = [
    { id: 'jonge-starters', name: 'Jonge Starters', incomeLevel: 'low' as const, householdType: 'single' as const, ageGroup: 'young' as const },
    { id: 'de-doorzetter', name: 'De Doorzetter', incomeLevel: 'low' as const, householdType: 'single' as const, ageGroup: 'middle' as const },
    { id: 'senior-op-budget', name: 'Senior op Budget', incomeLevel: 'low' as const, householdType: 'single' as const, ageGroup: 'senior' as const },
    { id: 'de-groeiers', name: 'De Groeiers', incomeLevel: 'low' as const, householdType: 'couple' as const, ageGroup: 'young' as const },
    { id: 'bescheiden-stellen', name: 'Bescheiden Stellen', incomeLevel: 'low' as const, householdType: 'couple' as const, ageGroup: 'middle' as const },
    { id: 'de-levensgenieters', name: 'De Levensgenieters', incomeLevel: 'low' as const, householdType: 'couple' as const, ageGroup: 'senior' as const },
    { id: 'de-groeigezinnen', name: 'De Groeigezinnen', incomeLevel: 'low' as const, householdType: 'family' as const, ageGroup: 'young' as const },
    { id: 'knusse-gezinnen', name: 'Knusse Gezinnen', incomeLevel: 'low' as const, householdType: 'family' as const, ageGroup: 'middle' as const },
    { id: 'senioren-met-thuiswonende-kinderen', name: 'Senioren met Thuiswonende Kinderen', incomeLevel: 'low' as const, householdType: 'family' as const, ageGroup: 'senior' as const },
    { id: 'ambitieuze-singles', name: 'Ambitieuze Singles', incomeLevel: 'middle' as const, householdType: 'single' as const, ageGroup: 'young' as const },
    { id: 'zelfbewuste-solisten', name: 'Zelfbewuste Solisten', incomeLevel: 'middle' as const, householdType: 'single' as const, ageGroup: 'middle' as const },
    { id: 'zelfstandige-senior', name: 'Zelfstandige Senior', incomeLevel: 'middle' as const, householdType: 'single' as const, ageGroup: 'senior' as const },
    { id: 'samen-starters', name: 'Samen Starters', incomeLevel: 'middle' as const, householdType: 'couple' as const, ageGroup: 'young' as const },
    { id: 'de-balanszoekers', name: 'De Balanszoekers', incomeLevel: 'middle' as const, householdType: 'couple' as const, ageGroup: 'middle' as const },
    { id: 'de-zwitserlevers', name: 'De Zwitserlevers', incomeLevel: 'middle' as const, householdType: 'couple' as const, ageGroup: 'senior' as const },
    { id: 'actieve-jonge-gezinnen', name: 'Actieve Jonge Gezinnen', incomeLevel: 'middle' as const, householdType: 'family' as const, ageGroup: 'young' as const },
    { id: 'stabiele-gezinnen', name: 'Stabiele Gezinnen', incomeLevel: 'middle' as const, householdType: 'family' as const, ageGroup: 'middle' as const },
    { id: 'gezellige-nesthouders', name: 'Gezellige Nesthouders', incomeLevel: 'middle' as const, householdType: 'family' as const, ageGroup: 'senior' as const },
    { id: 'carrierestarter', name: 'Carrierestarter', incomeLevel: 'high' as const, householdType: 'single' as const, ageGroup: 'young' as const },
    { id: 'succesvolle-singles', name: 'Succesvolle Singles', incomeLevel: 'high' as const, householdType: 'single' as const, ageGroup: 'middle' as const },
    { id: 'de-rentenier', name: 'De Rentenier', incomeLevel: 'high' as const, householdType: 'single' as const, ageGroup: 'senior' as const },
    { id: 'grenzeloos-duo', name: 'Grenzeloos Duo', incomeLevel: 'high' as const, householdType: 'couple' as const, ageGroup: 'young' as const },
    { id: 'carriere-stampers', name: 'Carriere Stampers', incomeLevel: 'high' as const, householdType: 'couple' as const, ageGroup: 'middle' as const },
    { id: 'welvarende-bourgondiers', name: 'Welvarende Bourgondiers', incomeLevel: 'high' as const, householdType: 'couple' as const, ageGroup: 'senior' as const },
    { id: 'hard-van-start', name: 'Hard van Start', incomeLevel: 'high' as const, householdType: 'family' as const, ageGroup: 'young' as const },
    { id: 'vermogende-gezinnen', name: 'Vermogende Gezinnen', incomeLevel: 'high' as const, householdType: 'family' as const, ageGroup: 'middle' as const },
    { id: 'laat-bloeiers', name: 'Laat Bloeiers', incomeLevel: 'high' as const, householdType: 'family' as const, ageGroup: 'senior' as const },
  ];

  personas.forEach(persona => {
    let expectedRank: 'high' | 'medium' | 'low' = 'medium';
    let reasoning = '';

    switch (classification) {
      case 'student-area':
        // High youth, high singles
        if (persona.ageGroup === 'young' && persona.householdType === 'single') {
          expectedRank = 'high';
          reasoning = 'Young singles match student demographics';
        } else if (persona.ageGroup === 'senior' || persona.householdType === 'family') {
          expectedRank = 'low';
          reasoning = 'Seniors and families avoid student areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Moderate fit with student demographics';
        }
        break;

      case 'young-professional-area':
        // High income, young adults, singles
        if (persona.ageGroup === 'young' && persona.incomeLevel !== 'low') {
          expectedRank = 'high';
          reasoning = 'Young professionals with income match well';
        } else if (persona.incomeLevel === 'low') {
          expectedRank = 'low';
          reasoning = 'Low income personas cannot afford this area';
        } else {
          expectedRank = 'medium';
          reasoning = 'Moderate income fit';
        }
        break;

      case 'wealthy-family-area':
        // High income + families
        if (persona.incomeLevel === 'high' && persona.householdType === 'family') {
          expectedRank = 'high';
          reasoning = 'Wealthy families perfect match';
        } else if (persona.incomeLevel === 'high') {
          expectedRank = 'medium';
          reasoning = 'High income but different household type';
        } else {
          expectedRank = 'low';
          reasoning = 'Income level mismatch';
        }
        break;

      case 'social-housing-families':
        // Low income + families
        if (persona.incomeLevel === 'low' && persona.householdType === 'family') {
          expectedRank = 'high';
          reasoning = 'Low income families match social housing';
        } else if (persona.incomeLevel === 'low') {
          expectedRank = 'medium';
          reasoning = 'Income matches but different household';
        } else if (persona.incomeLevel === 'high') {
          expectedRank = 'low';
          reasoning = 'High income personas unlikely to choose social housing';
        } else {
          expectedRank = 'medium';
          reasoning = 'Middle income has mixed fit';
        }
        break;

      case 'retirement-area':
        // High elderly, few families
        if (persona.ageGroup === 'senior') {
          expectedRank = 'high';
          reasoning = 'Seniors match retirement area demographics';
        } else if (persona.householdType === 'family') {
          expectedRank = 'low';
          reasoning = 'Families avoid areas with few children';
        } else {
          expectedRank = 'medium';
          reasoning = 'Moderate demographic match';
        }
        break;

      case 'senior-area':
        // High elderly population
        if (persona.ageGroup === 'senior') {
          expectedRank = 'high';
          reasoning = 'Seniors find community in senior areas';
        } else if (persona.ageGroup === 'young') {
          expectedRank = 'low';
          reasoning = 'Young personas prefer younger areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Middle age has mixed fit';
        }
        break;

      case 'young-dominant':
        // High youth or young adults
        if (persona.ageGroup === 'young') {
          expectedRank = 'high';
          reasoning = 'Young personas fit young-dominant areas';
        } else if (persona.ageGroup === 'senior') {
          expectedRank = 'low';
          reasoning = 'Seniors prefer quieter areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Middle age has moderate fit';
        }
        break;

      case 'family-area':
        // High children, family households
        if (persona.householdType === 'family') {
          expectedRank = 'high';
          reasoning = 'Family personas match family areas';
        } else if (persona.householdType === 'single') {
          expectedRank = 'low';
          reasoning = 'Singles often prefer urban areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Couples have moderate fit';
        }
        break;

      case 'wealthy-area':
        // High income
        if (persona.incomeLevel === 'high') {
          expectedRank = 'high';
          reasoning = 'High income matches wealthy area';
        } else if (persona.incomeLevel === 'low') {
          expectedRank = 'low';
          reasoning = 'Low income cannot afford wealthy areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Middle income has limited fit';
        }
        break;

      case 'low-income-area':
        // Low income
        if (persona.incomeLevel === 'low') {
          expectedRank = 'high';
          reasoning = 'Low income personas fit affordable areas';
        } else if (persona.incomeLevel === 'high') {
          expectedRank = 'low';
          reasoning = 'High income unlikely to choose low-income areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Middle income may find value';
        }
        break;

      case 'singles-area':
        // High single person households
        if (persona.householdType === 'single') {
          expectedRank = 'high';
          reasoning = 'Singles match singles-dominant areas';
        } else if (persona.householdType === 'family') {
          expectedRank = 'low';
          reasoning = 'Families prefer family-friendly areas';
        } else {
          expectedRank = 'medium';
          reasoning = 'Couples have moderate fit';
        }
        break;

      default:
        // mixed-demographic
        expectedRank = 'medium';
        reasoning = 'Mixed areas suit most demographics';
    }

    expectations.push({
      personaId: persona.id,
      personaName: persona.name,
      incomeLevel: persona.incomeLevel,
      householdType: persona.householdType,
      ageGroup: persona.ageGroup,
      expectedRank,
      reasoning,
    });
  });

  // Sort by expected rank
  const rankOrder = { high: 0, medium: 1, low: 2 };
  expectations.sort((a, b) => rankOrder[a.expectedRank] - rankOrder[b.expectedRank]);

  return expectations;
}

interface ExtremeLocationFinderProps {
  locale: string;
}

// Calculate how strongly a wijk fits its classification based on relevant z-scores
function calculateClassificationStrength(wijk: WijkWithZScores): number {
  const { zScores, classification } = wijk;

  // Get the relevant z-scores for each classification
  const relevantScores: number[] = [];

  switch (classification) {
    case 'student-area':
      relevantScores.push(Math.abs(zScores.age15to25), Math.abs(zScores.singlePersonHouseholds));
      break;
    case 'young-professional-area':
      relevantScores.push(Math.abs(zScores.age25to45));
      if (zScores.avgIncome !== null) relevantScores.push(Math.abs(zScores.avgIncome));
      relevantScores.push(Math.abs(zScores.singlePersonHouseholds));
      break;
    case 'wealthy-family-area':
      if (zScores.avgIncome !== null) relevantScores.push(Math.abs(zScores.avgIncome));
      relevantScores.push(Math.abs(zScores.householdsWithChildren));
      break;
    case 'social-housing-families':
      if (zScores.avgIncome !== null) relevantScores.push(Math.abs(zScores.avgIncome));
      relevantScores.push(Math.abs(zScores.householdsWithChildren));
      break;
    case 'retirement-area':
    case 'senior-area':
      relevantScores.push(Math.abs(zScores.age65Plus));
      break;
    case 'young-dominant':
      relevantScores.push(Math.abs(zScores.age15to25), Math.abs(zScores.age25to45));
      break;
    case 'family-area':
      relevantScores.push(Math.abs(zScores.householdsWithChildren), Math.abs(zScores.age0to15));
      break;
    case 'wealthy-area':
      if (zScores.avgIncome !== null) relevantScores.push(Math.abs(zScores.avgIncome));
      break;
    case 'low-income-area':
      if (zScores.avgIncome !== null) relevantScores.push(Math.abs(zScores.avgIncome));
      break;
    case 'singles-area':
      relevantScores.push(Math.abs(zScores.singlePersonHouseholds));
      break;
    default:
      // mixed-demographic - use average of all z-scores
      relevantScores.push(
        Math.abs(zScores.age0to15),
        Math.abs(zScores.age65Plus),
        Math.abs(zScores.singlePersonHouseholds),
        Math.abs(zScores.householdsWithChildren)
      );
      if (zScores.avgIncome !== null) relevantScores.push(Math.abs(zScores.avgIncome));
  }

  // Return average of relevant scores (higher = stronger fit)
  if (relevantScores.length === 0) return 0;
  return relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length;
}

type GeoLevel = 'WK' | 'BU' | 'both';

export function ExtremeLocationFinder({ locale }: ExtremeLocationFinderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    level: GeoLevel;
    totalWijken: number;
    classificationCounts: Record<string, number>;
    extremeExamples: Record<string, WijkWithZScores[]>;
    allWijken: WijkWithZScores[];
  } | null>(null);

  const [geoLevel, setGeoLevel] = useState<GeoLevel>('WK');
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'outliers' | 'income' | 'population' | 'strength'>('strength');
  const [minPopulation, setMinPopulation] = useState<number>(500);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/location-demographics?level=${geoLevel}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data);
        // Reset classification selection when level changes
        setSelectedClassification(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [geoLevel]);

  const classificationData = useMemo((): ClassificationData[] => {
    if (!data) return [];

    return Object.entries(data.classificationCounts)
      .map(([classification, count]) => ({
        classification,
        count,
        examples: data.extremeExamples[classification] || [],
        personaExpectations: getPersonaExpectations(classification),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const filteredWijken = useMemo(() => {
    if (!data) return [];

    let wijken = selectedClassification
      ? data.allWijken.filter(w => w.classification === selectedClassification)
      : data.allWijken;

    // Filter by minimum population
    if (minPopulation > 0) {
      wijken = wijken.filter(w => w.totalPopulation >= minPopulation);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      wijken = wijken.filter(w =>
        w.name.toLowerCase().includes(term) ||
        w.municipality.toLowerCase().includes(term) ||
        w.code.toLowerCase().includes(term)
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        wijken = [...wijken].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'outliers':
        wijken = [...wijken].sort((a, b) => b.outliers.length - a.outliers.length);
        break;
      case 'income':
        wijken = [...wijken].sort((a, b) =>
          (b.avgIncomePerInhabitant ?? 0) - (a.avgIncomePerInhabitant ?? 0)
        );
        break;
      case 'population':
        wijken = [...wijken].sort((a, b) => b.totalPopulation - a.totalPopulation);
        break;
      case 'strength':
        wijken = [...wijken].sort((a, b) =>
          calculateClassificationStrength(b) - calculateClassificationStrength(a)
        );
        break;
    }

    return wijken;
  }, [data, selectedClassification, searchTerm, sortBy, minPopulation]);

  const translations = {
    title: locale === 'nl' ? 'Extreme Locatie Analyse' : 'Extreme Location Analysis',
    subtitle: locale === 'nl'
      ? 'Analyse van CBS kerncijfers voor alle wijken'
      : 'Analysis of CBS key figures for all districts',
    loading: locale === 'nl' ? 'Gegevens laden...' : 'Loading data...',
    error: locale === 'nl' ? 'Fout' : 'Error',
    totalWijken: locale === 'nl' ? 'Totaal wijken' : 'Total districts',
    classifications: locale === 'nl' ? 'Classificaties' : 'Classifications',
    showAll: locale === 'nl' ? 'Toon alle' : 'Show all',
    search: locale === 'nl' ? 'Zoek wijk...' : 'Search district...',
    sortBy: locale === 'nl' ? 'Sorteer op' : 'Sort by',
    name: locale === 'nl' ? 'Naam' : 'Name',
    outliers: locale === 'nl' ? 'Uitschieters' : 'Outliers',
    income: locale === 'nl' ? 'Inkomen' : 'Income',
    population: locale === 'nl' ? 'Bevolking' : 'Population',
    personaExpectations: locale === 'nl' ? 'Verwachte Persona Rankings' : 'Expected Persona Rankings',
    highRank: locale === 'nl' ? 'Hoog' : 'High',
    mediumRank: locale === 'nl' ? 'Medium' : 'Medium',
    lowRank: locale === 'nl' ? 'Laag' : 'Low',
    strength: locale === 'nl' ? 'Classificatie Sterkte' : 'Classification Strength',
    minPopulation: locale === 'nl' ? 'Min. bevolking' : 'Min. population',
    filtered: locale === 'nl' ? 'gefilterd' : 'filtered',
    geoLevel: locale === 'nl' ? 'Niveau' : 'Level',
    wijken: locale === 'nl' ? 'Wijken (WK)' : 'Districts (WK)',
    buurten: locale === 'nl' ? 'Buurten (BU)' : 'Neighborhoods (BU)',
    both: locale === 'nl' ? 'Beide' : 'Both',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">{translations.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-base bg-red-50 border border-red-200 rounded-base">
        <h3 className="font-semibold text-red-800">{translations.error}</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const selectedClassificationData = classificationData.find(
    c => c.classification === selectedClassification
  );

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-lg">
        <div className="flex flex-wrap justify-between items-start gap-base mb-base">
          <div>
            <h1 className="text-2xl font-bold mb-sm">{translations.title}</h1>
            <p className="text-gray-600">{translations.subtitle}</p>
          </div>
          <div className="flex items-center gap-sm">
            <label className="text-sm font-medium">{translations.geoLevel}:</label>
            <select
              value={geoLevel}
              onChange={e => setGeoLevel(e.target.value as GeoLevel)}
              className="px-base py-sm border rounded-base font-medium"
            >
              <option value="WK">{translations.wijken}</option>
              <option value="BU">{translations.buurten}</option>
              <option value="both">{translations.both}</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-base text-sm">
          <div className="bg-primary/10 px-base py-sm rounded-base">
            <span className="font-semibold">{translations.totalWijken}:</span>{' '}
            {data.totalWijken.toLocaleString()}
          </div>
          <div className="bg-secondary/10 px-base py-sm rounded-base">
            <span className="font-semibold">{translations.filtered}:</span>{' '}
            {filteredWijken.length.toLocaleString()}
          </div>
          <div className="bg-gray-100 px-base py-sm rounded-base">
            <span className="font-semibold">{translations.classifications}:</span>{' '}
            {Object.keys(data.classificationCounts).length}
          </div>
        </div>
      </div>

      {/* Classification Grid */}
      <div className="bg-white rounded-lg shadow-md p-lg">
        <h2 className="text-xl font-semibold mb-base">{translations.classifications}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-sm">
          <button
            onClick={() => setSelectedClassification(null)}
            className={cn(
              'p-sm rounded-base text-left transition-colors',
              selectedClassification === null
                ? 'bg-primary text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            )}
          >
            <div className="font-medium">{translations.showAll}</div>
            <div className="text-sm opacity-80">{data.totalWijken}</div>
          </button>
          {classificationData.map(({ classification, count }) => (
            <button
              key={classification}
              onClick={() => setSelectedClassification(classification)}
              className={cn(
                'p-sm rounded-base text-left transition-colors',
                selectedClassification === classification
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              )}
            >
              <div className="font-medium capitalize">{classification.replace(/-/g, ' ')}</div>
              <div className="text-sm opacity-80">{count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Persona Expectations for Selected Classification */}
      {selectedClassificationData && (
        <div className="bg-white rounded-lg shadow-md p-lg">
          <h2 className="text-xl font-semibold mb-base">
            {translations.personaExpectations} - {selectedClassificationData.classification.replace(/-/g, ' ')}
          </h2>
          <div className="space-y-base">
            {/* High rank personas */}
            <div>
              <h3 className="font-semibold text-green-700 mb-sm">{translations.highRank}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
                {selectedClassificationData.personaExpectations
                  .filter(p => p.expectedRank === 'high')
                  .map(persona => (
                    <div key={persona.personaId} className="bg-green-50 p-sm rounded-base">
                      <div className="font-medium">{persona.personaName}</div>
                      <div className="text-xs text-gray-600">
                        {persona.incomeLevel} | {persona.householdType} | {persona.ageGroup}
                      </div>
                      <div className="text-xs text-green-700 mt-1">{persona.reasoning}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Medium rank personas */}
            <div>
              <h3 className="font-semibold text-yellow-700 mb-sm">{translations.mediumRank}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
                {selectedClassificationData.personaExpectations
                  .filter(p => p.expectedRank === 'medium')
                  .map(persona => (
                    <div key={persona.personaId} className="bg-yellow-50 p-sm rounded-base">
                      <div className="font-medium">{persona.personaName}</div>
                      <div className="text-xs text-gray-600">
                        {persona.incomeLevel} | {persona.householdType} | {persona.ageGroup}
                      </div>
                      <div className="text-xs text-yellow-700 mt-1">{persona.reasoning}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Low rank personas */}
            <div>
              <h3 className="font-semibold text-red-700 mb-sm">{translations.lowRank}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm">
                {selectedClassificationData.personaExpectations
                  .filter(p => p.expectedRank === 'low')
                  .map(persona => (
                    <div key={persona.personaId} className="bg-red-50 p-sm rounded-base">
                      <div className="font-medium">{persona.personaName}</div>
                      <div className="text-xs text-gray-600">
                        {persona.incomeLevel} | {persona.householdType} | {persona.ageGroup}
                      </div>
                      <div className="text-xs text-red-700 mt-1">{persona.reasoning}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Sort */}
      <div className="bg-white rounded-lg shadow-md p-base">
        <div className="flex flex-wrap gap-base items-center">
          <input
            type="text"
            placeholder={translations.search}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-base py-sm border rounded-base flex-1 min-w-[200px]"
          />
          <div className="flex items-center gap-sm">
            <label className="text-sm font-medium">{translations.minPopulation}:</label>
            <select
              value={minPopulation}
              onChange={e => setMinPopulation(Number(e.target.value))}
              className="px-sm py-sm border rounded-base"
            >
              <option value="0">0</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
              <option value="2500">2,500</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000</option>
            </select>
          </div>
          <div className="flex items-center gap-sm">
            <label className="text-sm font-medium">{translations.sortBy}:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-sm py-sm border rounded-base"
            >
              <option value="strength">{translations.strength}</option>
              <option value="outliers">{translations.outliers}</option>
              <option value="population">{translations.population}</option>
              <option value="income">{translations.income}</option>
              <option value="name">{translations.name}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wijken Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-base py-sm text-left text-sm font-semibold">Code</th>
                <th className="px-base py-sm text-left text-sm font-semibold">
                  {translations.name}
                </th>
                <th className="px-base py-sm text-left text-sm font-semibold">Gemeente</th>
                <th className="px-base py-sm text-left text-sm font-semibold">Classificatie</th>
                <th className="px-base py-sm text-right text-sm font-semibold">
                  {translations.strength}
                </th>
                <th className="px-base py-sm text-right text-sm font-semibold">
                  {translations.population}
                </th>
                <th className="px-base py-sm text-right text-sm font-semibold">
                  {translations.income}
                </th>
                <th className="px-base py-sm text-left text-sm font-semibold">
                  {translations.outliers}
                </th>
                <th className="px-base py-sm text-left text-sm font-semibold">Z-Scores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWijken.slice(0, 100).map(wijk => (
                <tr key={wijk.code} className="hover:bg-gray-50">
                  <td className="px-base py-sm text-sm font-mono">{wijk.code}</td>
                  <td className="px-base py-sm text-sm">{wijk.name}</td>
                  <td className="px-base py-sm text-sm">{wijk.municipality}</td>
                  <td className="px-base py-sm">
                    <span className={cn(
                      'px-sm py-1 rounded-full text-xs font-medium',
                      getClassificationColor(wijk.classification)
                    )}>
                      {wijk.classification.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td className="px-base py-sm text-sm text-right">
                    <StrengthIndicator strength={calculateClassificationStrength(wijk)} />
                  </td>
                  <td className="px-base py-sm text-sm text-right">
                    {wijk.totalPopulation.toLocaleString()}
                  </td>
                  <td className="px-base py-sm text-sm text-right">
                    {wijk.avgIncomePerInhabitant
                      ? `€${wijk.avgIncomePerInhabitant.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-base py-sm">
                    <div className="flex flex-wrap gap-1">
                      {wijk.outliers.map(outlier => (
                        <span
                          key={outlier}
                          className={cn(
                            'px-1 py-0.5 rounded text-xs',
                            getOutlierColor(outlier)
                          )}
                        >
                          {outlier}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-base py-sm">
                    <ZScoreDisplay zScores={wijk.zScores} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredWijken.length > 100 && (
          <div className="p-base text-center text-sm text-gray-500">
            Showing 100 of {filteredWijken.length} results
          </div>
        )}
      </div>
    </div>
  );
}

function ZScoreDisplay({ zScores }: { zScores: WijkWithZScores['zScores'] }) {
  return (
    <div className="text-xs space-y-0.5">
      <div className="flex gap-2">
        <span title="Age 0-15">
          0-15: <ZValue value={zScores.age0to15} />
        </span>
        <span title="Age 15-25">
          15-25: <ZValue value={zScores.age15to25} />
        </span>
        <span title="Age 25-45">
          25-45: <ZValue value={zScores.age25to45} />
        </span>
      </div>
      <div className="flex gap-2">
        <span title="Age 45-65">
          45-65: <ZValue value={zScores.age45to65} />
        </span>
        <span title="Age 65+">
          65+: <ZValue value={zScores.age65Plus} />
        </span>
        <span title="Income">
          Inc: <ZValue value={zScores.avgIncome} />
        </span>
      </div>
      <div className="flex gap-2">
        <span title="Single person households">
          1p: <ZValue value={zScores.singlePersonHouseholds} />
        </span>
        <span title="Households without children">
          NoKid: <ZValue value={zScores.householdsWithoutChildren} />
        </span>
        <span title="Households with children">
          Kid: <ZValue value={zScores.householdsWithChildren} />
        </span>
      </div>
    </div>
  );
}

function ZValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">-</span>;

  const absValue = Math.abs(value);
  let color = 'text-gray-600';

  if (absValue > 2) {
    color = value > 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold';
  } else if (absValue > 1.5) {
    color = value > 0 ? 'text-green-600' : 'text-red-600';
  }

  return <span className={color}>{value.toFixed(1)}</span>;
}

function StrengthIndicator({ strength }: { strength: number }) {
  // Strength ranges from 0 to ~3+ (average of z-scores)
  // Categorize: <1.5 = weak, 1.5-2 = moderate, 2-2.5 = strong, >2.5 = very strong
  let label: string;
  let color: string;
  let bgColor: string;

  if (strength >= 2.5) {
    label = '+++';
    color = 'text-green-800';
    bgColor = 'bg-green-200';
  } else if (strength >= 2) {
    label = '++';
    color = 'text-green-700';
    bgColor = 'bg-green-100';
  } else if (strength >= 1.5) {
    label = '+';
    color = 'text-yellow-700';
    bgColor = 'bg-yellow-100';
  } else {
    label = '~';
    color = 'text-gray-600';
    bgColor = 'bg-gray-100';
  }

  return (
    <span
      className={cn('px-1.5 py-0.5 rounded text-xs font-mono', color, bgColor)}
      title={`Strength: ${strength.toFixed(2)}`}
    >
      {label} {strength.toFixed(1)}
    </span>
  );
}

function getClassificationColor(classification: string): string {
  const colors: Record<string, string> = {
    'student-area': 'bg-purple-100 text-purple-800',
    'young-professional-area': 'bg-blue-100 text-blue-800',
    'wealthy-family-area': 'bg-emerald-100 text-emerald-800',
    'social-housing-families': 'bg-orange-100 text-orange-800',
    'retirement-area': 'bg-gray-100 text-gray-800',
    'senior-area': 'bg-slate-100 text-slate-800',
    'young-dominant': 'bg-cyan-100 text-cyan-800',
    'family-area': 'bg-green-100 text-green-800',
    'wealthy-area': 'bg-amber-100 text-amber-800',
    'low-income-area': 'bg-rose-100 text-rose-800',
    'singles-area': 'bg-indigo-100 text-indigo-800',
    'mixed-demographic': 'bg-gray-100 text-gray-600',
  };

  return colors[classification] || 'bg-gray-100 text-gray-600';
}

function getOutlierColor(outlier: string): string {
  if (outlier.startsWith('high-') || outlier === 'wealthy' || outlier.endsWith('-dominant')) {
    return 'bg-green-100 text-green-800';
  }
  if (outlier.startsWith('low-') || outlier.startsWith('few-')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}

export default ExtremeLocationFinder;
