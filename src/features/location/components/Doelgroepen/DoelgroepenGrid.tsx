'use client';

import React, { useState, useMemo } from 'react';
import { DoelgroepenCard, HousingPersona } from './DoelgroepenCard';
import housingPersonasData from '../../data/sources/housing-personas.json';

export interface DoelgroepenGridProps {
  locale?: 'nl' | 'en';
}

export const DoelgroepenGrid: React.FC<DoelgroepenGridProps> = ({ locale = 'nl' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncomeLevel, setSelectedIncomeLevel] = useState<string>('all');
  const [selectedHouseholdType, setSelectedHouseholdType] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');

  const personas = housingPersonasData[locale].housing_personas as HousingPersona[];

  const translations = {
    nl: {
      title: 'Doelgroepen',
      subtitle: 'Ontdek de verschillende woonbehoeften per doelgroep',
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
    </div>
  );
};
