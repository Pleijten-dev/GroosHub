// src/features/location/components/DoelgroepenResult/DoelgroepenResult.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { StaticCube } from './StaticCube';
import { PersonaScore } from '../../utils/targetGroupScoring';

interface HousingPersona {
  id: string;
  name: string;
  income_level: string;
  household_type: string;
  age_group: string;
  description: string;
  current_situation: string;
  desired_situation: string;
  current_property_types: string[];
  desired_property_types: string[];
}

interface DoelgroepenResultProps {
  locale: Locale;
  cubeColors: string[]; // Shared cube colors for consistency
  allPersonas: HousingPersona[]; // All persona data for tooltip mapping
  getScenarioData: (scenario: string) => {
    cubeIndices: number[];
    personas: PersonaScore[];
  };
}

type Scenario = 'scenario1' | 'scenario2' | 'scenario3' | 'custom';

/**
 * Result component showing static cube with target groups and scenario selector
 * Features:
 * - Static cube at 60vh height with target group configuration
 * - Segmented button with 4 scenarios
 * - Smooth fade-in animation
 */
export const DoelgroepenResult: React.FC<DoelgroepenResultProps> = ({
  locale,
  cubeColors,
  allPersonas,
  getScenarioData
}) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('scenario1');
  const [isVisible, setIsVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleScenarioClick = (scenario: Scenario) => {
    setSelectedScenario(scenario);
  };

  // Get current scenario data
  const scenarioData = getScenarioData(selectedScenario);

  const scenarios: { id: Scenario; label: string }[] = [
    { id: 'scenario1', label: locale === 'nl' ? 'Scenario 1' : 'Scenario 1' },
    { id: 'scenario2', label: locale === 'nl' ? 'Scenario 2' : 'Scenario 2' },
    { id: 'scenario3', label: locale === 'nl' ? 'Scenario 3' : 'Scenario 3' },
    { id: 'custom', label: locale === 'nl' ? 'Op maat' : 'Custom' }
  ];

  return (
    <div
      className={`
        relative h-full w-full flex flex-col items-center justify-center gap-8
        transition-opacity duration-1000
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Static Cube - 60vh height, no spinning */}
      <div style={{ height: '60vh', width: '100%', maxWidth: '1000px' }} className="flex items-center justify-center">
        <StaticCube
          targetGroupIndices={scenarioData.cubeIndices}
          cubeColors={cubeColors}
          allPersonas={allPersonas}
          selectedPersonas={scenarioData.personas}
          locale={locale}
        />
      </div>

      {/* Segmented Button */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleScenarioClick(scenario.id)}
              className={`
                px-6 py-3 rounded-full font-medium text-sm transition-all duration-300
                ${
                  selectedScenario === scenario.id
                    ? 'bg-gradient-3-mid text-gray-900 shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {scenario.label}
            </button>
          ))}
        </div>

        {/* Downward Arrow Button */}
        <button
          onClick={() => {
            // TODO: Add scroll or expand functionality
            console.log('Arrow clicked');
          }}
          className="p-0 bg-transparent border-0 cursor-pointer group"
          aria-label="Expand details"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-all duration-300 group-hover:translate-y-1"
          >
            <path
              d="M8 12 L16 20 L24 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600 group-hover:text-gray-900 transition-colors duration-300"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default DoelgroepenResult;
