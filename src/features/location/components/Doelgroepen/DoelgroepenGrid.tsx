'use client';

import React, { useState, useMemo } from 'react';
import { DoelgroepenCard, HousingPersona } from './DoelgroepenCard';
import { DetailedScoringTable } from './DetailedScoringTable';
import { SummaryRankingTable } from './SummaryRankingTable';
import housingPersonasData from '../../data/sources/housing-personas.json';
import { calculatePersonaScores, PersonaScore } from '../../utils/targetGroupScoring';

export interface DoelgroepenGridProps {
  locale?: 'nl' | 'en';
  locationScores?: Record<string, number>;
}

export const DoelgroepenGrid: React.FC<DoelgroepenGridProps> = ({
  locale = 'nl',
  locationScores
}) => {
  const [activeView, setActiveView] = useState<'personas' | 'scoring'>('personas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncomeLevel, setSelectedIncomeLevel] = useState<string>('all');
  const [selectedHouseholdType, setSelectedHouseholdType] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');

  const personas = housingPersonasData[locale].housing_personas as HousingPersona[];

  // Calculate persona scores if location data is available
  const personaScores: PersonaScore[] = useMemo(() => {
    if (!locationScores || Object.keys(locationScores).length === 0) {
      // Use dummy data for demonstration (includes negative scores)
      const dummyScores: Record<string, number> = {
        'Zorg (Huisarts & Apotheek)': 0.8,
        'Zorg (Paramedische voorzieningen)': -0.3,  // Negative: poor healthcare access
        'Openbaar vervoer (halte)': 0.9,
        'Mobiliteit & Parkeren': -0.5,  // Negative: limited parking
        'Onderwijs (Basisschool)': 0.85,
        'Onderwijs (Voortgezet onderwijs)': 0.75,
        'Onderwijs (Hoger onderwijs)': -0.4,  // Negative: far from universities
        'Kinderopvang & Opvang': 0.8,
        'Winkels (Dagelijkse boodschappen)': 0.9,
        'Winkels (Overige retail)': -0.2,  // Negative: limited shopping options
        'Budget Restaurants (€)': 0.6,
        'Mid-range Restaurants (€€€)': 0.7,
        'Upscale Restaurants (€€€€-€€€€€)': -0.6,  // Negative: no upscale dining
        'Cafés en avond programma': 0.8,
        'Sport faciliteiten': 0.75,
        'Sportschool / Fitnesscentrum': -0.1,
        'Groen & Recreatie': 0.85,
        'Cultuur & Entertainment': -0.45,  // Negative: limited cultural venues
        'Wellness & Recreatie': -0.3,
        'Speelplekken Voor Kinderen': 0.8,
        'Voorzieningen Voor Jongeren': 0.7,
        'Percentage eengezinswoning': 0.6,
        'Percentage meergezinswoning': 0.7,
        'Koopwoningen': -0.25,  // Negative: limited homeownership
        'In Bezit Overige Verhuurders': 0.6,
        'In Bezit Woningcorporatie': 0.7,
        'Woningtype - Hoogstedelijk': 0.8,
        'Woningtype - Randstedelijk': 0.6,
        'Woningtype - Laagstedelijk': -0.35,
        'Woonoppervlak - Klein': 0.7,
        'Woonoppervlak - Midden': 0.8,
        'Woonoppervlak - Groot': -0.15,  // Negative: few large homes
        'Transactieprijs - Laag': 0.7,
        'Transactieprijs - Midden': 0.8,
        'Transactieprijs - Hoog': -0.55,  // Negative: few high-priced homes
        'Aandeel 0 tot 15 jaar': 0.6,
        'Aandeel 15 tot 25 jaar': 0.7,
        'Aandeel 25 tot 45 jaar': 0.75,
        'Aandeel 45 tot 65 jaar': 0.7,
        'Aandeel 65 jaar of ouder': -0.2,  // Negative: aging population
        'Aandeel eenpersoonshuishoudens': 0.7,
        'Aandeel huishoudens zonder kinderen': 0.65,
        'Aandeel huishoudens met kinderen': -0.1,
        'Gemiddeld Inkomen Per Inkomensontvanger (low <80% of mediaan)': 0.6,
        'Gemiddeld Inkomen Per Inkomensontvanger (medium >80% <120% of mediaan)': 0.75,
        'Gemiddeld Inkomen Per Inkomensontvanger (high >120% of mediaan)': -0.4,  // Negative: few high earners
      };
      return calculatePersonaScores(personas, dummyScores);
    }
    return calculatePersonaScores(personas, locationScores);
  }, [personas, locationScores]);

  const translations = {
    nl: {
      title: 'Doelgroepen',
      subtitle: 'Ontdek de verschillende woonbehoeften per doelgroep',
      personasView: 'Doelgroepen Overzicht',
      scoringView: 'Score Tabellen',
      search: 'Zoek doelgroepen...',
      filters: 'Filters',
      incomeLevel: 'Inkomensniveau',
      householdType: 'Huishoudtype',
      ageGroup: 'Leeftijdsgroep',
      all: 'Alle',
      results: 'resultaten',
      noResults: 'Geen doelgroepen gevonden',
      noResultsDescription: 'Probeer andere filters of zoektermen',
      lowIncome: 'Laag inkomen',
      averageIncome: 'Gemiddeld inkomen',
      highIncome: 'Hoog inkomen',
      single: '1-persoonshuishouden',
      couple: '2-persoonshuishouden',
      family: 'met kinderen',
      young: '20-35 jaar',
      middle: '35-55 jaar',
      senior: '55+ jaar',
    },
    en: {
      title: 'Target Groups',
      subtitle: 'Discover the different housing needs per target group',
      personasView: 'Target Groups Overview',
      scoringView: 'Scoring Tables',
      search: 'Search target groups...',
      filters: 'Filters',
      incomeLevel: 'Income Level',
      householdType: 'Household Type',
      ageGroup: 'Age Group',
      all: 'All',
      results: 'results',
      noResults: 'No target groups found',
      noResultsDescription: 'Try different filters or search terms',
      lowIncome: 'Low income',
      averageIncome: 'Average income',
      highIncome: 'High income',
      single: '1-person household',
      couple: '2-person household',
      family: 'with children',
      young: '20-35 years',
      middle: '35-55 years',
      senior: '55+ years',
    },
  };

  const t = translations[locale];

  // Extract unique values for filters
  const incomeLevels = useMemo(() => {
    const levels = Array.from(new Set(personas.map(p => p.income_level)));
    return levels;
  }, [personas]);

  const householdTypes = useMemo(() => {
    const types = Array.from(new Set(personas.map(p => p.household_type)));
    return types;
  }, [personas]);

  const ageGroups = useMemo(() => {
    const groups = Array.from(new Set(personas.map(p => p.age_group)));
    return groups;
  }, [personas]);

  // Filter personas based on search and filters
  const filteredPersonas = useMemo(() => {
    return personas.filter(persona => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        persona.name.toLowerCase().includes(searchLower) ||
        persona.description.toLowerCase().includes(searchLower) ||
        persona.current_situation.toLowerCase().includes(searchLower) ||
        persona.desired_situation.toLowerCase().includes(searchLower);

      // Income level filter
      const matchesIncome = selectedIncomeLevel === 'all' || persona.income_level === selectedIncomeLevel;

      // Household type filter
      const matchesHousehold = selectedHouseholdType === 'all' || persona.household_type === selectedHouseholdType;

      // Age group filter
      const matchesAge = selectedAgeGroup === 'all' || persona.age_group === selectedAgeGroup;

      return matchesSearch && matchesIncome && matchesHousehold && matchesAge;
    });
  }, [personas, searchTerm, selectedIncomeLevel, selectedHouseholdType, selectedAgeGroup]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.title}</h2>
        <p className="text-gray-600">{t.subtitle}</p>
      </div>

      {/* View Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('personas')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeView === 'personas'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t.personasView}
          </button>
          <button
            onClick={() => setActiveView('scoring')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeView === 'scoring'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t.scoringView}
          </button>
        </div>
      </div>

      {/* Personas View */}
      {activeView === 'personas' && (
        <>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Income Level Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.incomeLevel}</label>
            <select
              value={selectedIncomeLevel}
              onChange={(e) => setSelectedIncomeLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t.all}</option>
              {incomeLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Household Type Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.householdType}</label>
            <select
              value={selectedHouseholdType}
              onChange={(e) => setSelectedHouseholdType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t.all}</option>
              {householdTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Age Group Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.ageGroup}</label>
            <select
              value={selectedAgeGroup}
              onChange={(e) => setSelectedAgeGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">{t.all}</option>
              {ageGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {filteredPersonas.length} {t.results}
            </p>
          </div>

          {/* Grid */}
          {filteredPersonas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPersonas.map(persona => (
                <DoelgroepenCard key={persona.id} persona={persona} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t.noResults}</h3>
              <p className="mt-1 text-sm text-gray-500">{t.noResultsDescription}</p>
            </div>
          )}
        </>
      )}

      {/* Scoring View */}
      {activeView === 'scoring' && (
        <div className="space-y-6">
          {/* Summary Ranking Table */}
          <SummaryRankingTable scores={personaScores} locale={locale} />

          {/* Detailed Scoring Table */}
          <DetailedScoringTable scores={personaScores} locale={locale} />
        </div>
      )}
    </div>
  );
};
