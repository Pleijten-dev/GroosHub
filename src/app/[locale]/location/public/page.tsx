/**
 * Public Spaces Recommendations Page
 * Displays AI-generated public space recommendations grouped by category
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PersonaScenarioSelector } from '@/shared/components/UI/PersonaScenarioSelector';
import { AmenityRecommendationCard } from '@/features/location/components/ProgramRecommendations/AmenityRecommendationCard';
import { CategoryRadialChart } from '@/features/location/components/ProgramRecommendations/CategoryRadialChart';
import { ExpandableAmenityList } from '@/features/location/components/ProgramRecommendations/ExpandableAmenityList';
import { locationDataCache } from '@/features/location/data/cache/locationDataCache';
import type { BuildingProgram } from '@/app/api/generate-building-program/route';
import publicSpaces from '@/features/location/data/sources/public-spaces.json';

export default function PublicPage() {
  const params = useParams();
  const locale = (params.locale as 'nl' | 'en') || 'nl';

  const [rapport, setRapport] = useState<BuildingProgram | null>(null);
  const [activeScenario, setActiveScenario] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);

  // Load rapport from cache
  useEffect(() => {
    const loadRapport = () => {
      try {
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
      title: 'Publiek',
      noData: 'Geen rapport beschikbaar',
      noDataDesc: 'Genereer eerst een bouwprogramma rapport vanuit de locatie pagina.',
      loading: 'Laden...',
      totalArea: 'Totaal Oppervlak',
      allOptions: 'Alle Opties in Deze Categorie',
    },
    en: {
      title: 'Public',
      noData: 'No report available',
      noDataDesc: 'Please generate a building program report from the location page first.',
      loading: 'Loading...',
      totalArea: 'Total Area',
      allOptions: 'All Options in This Category',
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

  // Group spaces by category
  const spacesByCategory: Record<string, typeof currentScenario.public_spaces.spaces> = {};
  currentScenario.public_spaces.spaces.forEach((space) => {
    // Find the space in the JSON to get its category
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fullSpaceData = publicSpaces[locale].spaces.find((s: any) => s.id === space.amenity_id);
    const category = fullSpaceData?.category || 'other';

    if (!spacesByCategory[category]) {
      spacesByCategory[category] = [];
    }
    spacesByCategory[category].push(space);
  });

  const totalM2 = currentScenario.public_spaces.total_m2;

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
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">{t.totalArea}</p>
            <p className="text-4xl font-bold text-gray-900">{totalM2} m²</p>
          </div>
        </div>

        {/* Categories */}
        {Object.entries(spacesByCategory).map(([category, spaces]) => {
          const categoryM2 = spaces.reduce((sum, space) => sum + space.size_m2, 0);
          const categoryPercentage = (categoryM2 / totalM2) * 100;

          // Get all amenities in this category from JSON
          const allCategoryAmenities = publicSpaces[locale].spaces
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((s: any) => s.category === category && s.area_min_m2 !== undefined && s.area_max_m2 !== undefined)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              area_min_m2: s.area_min_m2,
              area_max_m2: s.area_max_m2,
              category: s.category,
            }));

          return (
            <div key={category} className="mb-12">
              {/* Category Header */}
              <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase">
                {category.replace(/_/g, ' ')}
              </h2>

              {/* Cards, Arrow, and Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Cards Column */}
                <div className="lg:col-span-7">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {spaces.map((space) => (
                      <AmenityRecommendationCard
                        key={space.amenity_id}
                        space={space}
                        locale={locale}
                      />
                    ))}
                  </div>
                </div>

                {/* Arrow Column */}
                <div className="lg:col-span-1 flex items-center justify-center">
                  <ExpandableAmenityList
                    amenities={allCategoryAmenities}
                    locale={locale}
                  />
                </div>

                {/* Chart Column */}
                <div className="lg:col-span-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
                    <CategoryRadialChart
                      categories={[
                        {
                          name: category.replace(/_/g, ' '),
                          m2: categoryM2,
                          percentage: categoryPercentage,
                        },
                      ]}
                      totalM2={categoryM2}
                      locale={locale}
                      height={300}
                    />
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600">
                        {categoryPercentage.toFixed(1)}% {locale === 'nl' ? 'van totaal' : 'of total'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
