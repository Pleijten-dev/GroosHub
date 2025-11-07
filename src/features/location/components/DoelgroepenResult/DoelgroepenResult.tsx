// src/features/location/components/DoelgroepenResult/DoelgroepenResult.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { StaticCube } from './StaticCube';
import { generateGradientColors } from '../../utils/cubePatterns';

interface DoelgroepenResultProps {
  locale: Locale;
  targetGroupIndices: number[];
  onScenarioChange?: (scenario: string) => void;
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
  targetGroupIndices,
  onScenarioChange
}) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('scenario1');
  const [isVisible, setIsVisible] = useState(false);

  const cubeColors = useMemo(() => generateGradientColors(), []);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleScenarioClick = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    if (onScenarioChange) {
      onScenarioChange(scenario);
    }
  };

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
          targetGroupIndices={targetGroupIndices}
          cubeColors={cubeColors}
        />
      </div>

      {/* Segmented Button */}
      <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => handleScenarioClick(scenario.id)}
            className={`
              px-6 py-3 rounded-full font-medium text-sm transition-all duration-300
              ${
                selectedScenario === scenario.id
                  ? 'bg-gradient-3-mid text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            {scenario.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DoelgroepenResult;
