/**
 * Housing Recommendations Page
 * Displays AI-generated housing typology recommendations grouped by persona
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PersonaScenarioSelector } from '@/shared/components/UI/PersonaScenarioSelector';
import { HousingRecommendationCard } from '@/features/location/components/ProgramRecommendations/HousingRecommendationCard';
import { CategoryRadialChart } from '@/features/location/components/ProgramRecommendations/CategoryRadialChart';
import { locationDataCache } from '@/features/location/data/cache/locationDataCache';
import type { BuildingProgram } from '@/app/api/generate-building-program/route';

export default function HousingPage() {
  const params = useParams();
  const locale = (params.locale as 'nl' | 'en') || 'nl';

  const [rapport, setRapport] = useState<BuildingProgram | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);

  // Load rapport from cache
  useEffect(() => {
    const loadRapport = () => {
      try {
        // Try to get the cached address from localStorage
        const cachedAddress = localStorage.getItem('grooshub_current_address');
        if (!cachedAddress) {
          setIsLoading(false);
          return;
        }

        const rapportData = locationDataCache.getRapport(cachedAddress);
        if (rapportData) {
          setRapport(rapportData);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading rapport:', error);
        setIsLoading(false);
      }
    };

    loadRapport();
  }, []);

  const translations = {
    nl: {
      title: 'Woningen',
      noData: 'Geen rapport beschikbaar',
      noDataDesc: 'Genereer eerst een bouwprogramma rapport vanuit de locatie pagina.',
      loading: 'Laden...',
      totalUnits: 'Totaal Eenheden',
      totalArea: 'Totaal Oppervlak',
    },
    en: {
      title: 'Housing',
      noData: 'No report available',
      noDataDesc: 'Please generate a building program report from the location page first.',
      loading: 'Loading...',
      totalUnits: 'Total Units',
      totalArea: 'Total Area',
    },
  };

  const t = translations[locale];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#477638] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!rapport || !rapport.scenarios || rapport.scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.noData}</h2>
          <p className="text-gray-600">{t.noDataDesc}</p>
        </div>
      </div>
    );
  }

  const scenarios = rapport.scenarios.map((scenario, index) => ({
    id: String(index),
    name: scenario.scenario_name,
    simpleName: scenario.scenario_simple_name,
  }));

  const currentScenario = rapport.scenarios[parseInt(activeScenario)];

  // Group housing by persona (for now, we'll show all in one group)
  // In the future, this could be enhanced to actually group by persona
  const housingUnits = currentScenario.residential.unit_mix;

  // Calculate total units and m2
  const totalUnits = currentScenario.residential.total_units;
  const totalM2 = currentScenario.residential.total_m2;

  // Prepare data for radial chart
  const chartData = housingUnits.map((unit) => ({
    name: unit.typology_name,
    m2: unit.total_m2,
    percentage: (unit.total_m2 / totalM2) * 100,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
          <p className="text-gray-600">{currentScenario.summary}</p>
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-8">
          <PersonaScenarioSelector
            scenarios={scenarios}
            activeScenario={activeScenario}
            onChange={setActiveScenario}
            locale={locale}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t.totalUnits}</p>
              <p className="text-4xl font-bold text-gray-900">{totalUnits}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{t.totalArea}</p>
              <p className="text-4xl font-bold text-gray-900">{totalM2} m²</p>
            </div>
          </div>
        </div>

        {/* Housing Cards and Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cards Column */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {housingUnits.map((housing) => (
                <HousingRecommendationCard
                  key={housing.typology_id}
                  housing={housing}
                  locale={locale}
                />
              ))}
            </div>
          </div>

          {/* Chart Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <CategoryRadialChart
                categories={chartData}
                totalM2={totalM2}
                locale={locale}
              />
            </div>
          </div>
        </div>

        {/* Demographics Considerations */}
        {currentScenario.residential.demographics_considerations && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {locale === 'nl' ? 'Demografische Overwegingen' : 'Demographics Considerations'}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {currentScenario.residential.demographics_considerations}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
