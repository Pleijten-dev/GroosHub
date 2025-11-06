'use client';

import React, { useState, useMemo } from 'react';
import { DoelgroepenCard, HousingPersona } from './DoelgroepenCard';
import { DetailedScoringTable } from './DetailedScoringTable';
import { SummaryRankingTable } from './SummaryRankingTable';
import { CubeVisualization } from './CubeVisualization';
import housingPersonasData from '../../data/sources/housing-personas.json';
import { calculatePersonaScores, PersonaScore } from '../../utils/targetGroupScoring';
import { useSelectedDoelgroepen } from '../../hooks/useSelectedDoelgroepen';
import { getPersonaCubePosition } from '../../utils/cubePositionMapping';

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

  // Check if location data is available
  const hasLocationData = locationScores && Object.keys(locationScores).length > 0;

  // Calculate persona scores only if location data is available
  const personaScores: PersonaScore[] = useMemo(() => {
    if (!hasLocationData) {
      return [];
    }
    return calculatePersonaScores(personas, locationScores);
  }, [personas, locationScores, hasLocationData]);

  // Hook for managing selected doelgroepen with caching
  const {
    selectedIds,
    toggleSelection,
    isInitialized,
  } = useSelectedDoelgroepen(personaScores);

  // Generate cube colors and indices for visualization based on fixed positions
  const { cubeColors, activeIndices } = useMemo(() => {
    // Initialize arrays for all 27 possible positions
    const colors: (string | undefined)[] = new Array(27);
    const indices: number[] = [];

    // Map each selected persona to its fixed position in the cube
    selectedIds.forEach((personaId) => {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;

      // Get the fixed cube position based on characteristics
      const { index } = getPersonaCubePosition({
        income_level: persona.income_level,
        age_group: persona.age_group,
        household_type: persona.household_type,
      });

      // Assign unique color and mark position as active
      colors[index] = getPersonaColor(personaId);
      indices.push(index);
    });

    return {
      cubeColors: colors.map(c => c || '#888888'), // Default gray for inactive
      activeIndices: indices
    };
  }, [selectedIds, personas]);

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
      noLocationData: 'Geen locatiegegevens beschikbaar',
      noLocationDataDescription: 'Zoek naar een adres om de doelgroepen scores en rankings te zien op basis van echte locatiegegevens.',
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
      noLocationData: 'No location data available',
      noLocationDataDescription: 'Search for an address to see target group scores and rankings based on real location data.',
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
        <>
          {hasLocationData ? (
            <div className="space-y-6">
              {/* 3D Cube Visualization */}
              {isInitialized && (
                <CubeVisualization
                  activeIndices={activeIndices}
                  cubeColors={cubeColors}
                  locale={locale}
                />
              )}

              {/* Summary Ranking Table */}
              <SummaryRankingTable
                scores={personaScores}
                locale={locale}
                onRowClick={toggleSelection}
                selectedIds={selectedIds}
              />

              {/* Detailed Scoring Table */}
              <DetailedScoringTable scores={personaScores} locale={locale} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noLocationData}</h3>
                <p className="text-sm text-gray-600">{t.noLocationDataDescription}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Green gradient palette with 27 distinct shades
 * Ranges from light mint to deep forest green
 */
const GREEN_GRADIENT_PALETTE = [
  '#d1fae5', // mint-100
  '#a7f3d0', // mint-200
  '#6ee7b7', // mint-300
  '#34d399', // emerald-400
  '#10b981', // emerald-500
  '#059669', // emerald-600
  '#047857', // emerald-700
  '#065f46', // emerald-800
  '#064e3b', // emerald-900
  '#bbf7d0', // green-200
  '#86efac', // green-300
  '#4ade80', // green-400
  '#22c55e', // green-500
  '#16a34a', // green-600
  '#15803d', // green-700
  '#166534', // green-800
  '#14532d', // green-900
  '#d9f99d', // lime-200
  '#bef264', // lime-300
  '#a3e635', // lime-400
  '#84cc16', // lime-500
  '#65a30d', // lime-600
  '#4d7c0f', // lime-700
  '#3f6212', // lime-800
  '#365314', // lime-900
  '#1a5a2e', // custom dark green
  '#0f3d1f', // custom forest green
];

/**
 * Get unique color for a persona based on its ID
 * Uses consistent hashing to ensure same persona always gets same color
 */
function getPersonaColor(personaId: string): string {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < personaId.length; i++) {
    const char = personaId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Map hash to palette index
  const index = Math.abs(hash) % GREEN_GRADIENT_PALETTE.length;
  return GREEN_GRADIENT_PALETTE[index];
}
