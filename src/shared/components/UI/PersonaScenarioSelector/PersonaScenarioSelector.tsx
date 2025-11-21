/**
 * PersonaScenarioSelector Component
 * Segmented button control for switching between persona scenarios
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface ScenarioOption {
  id: string;
  name: string;
  simpleName: string;
}

export interface PersonaScenarioSelectorProps {
  scenarios: ScenarioOption[];
  activeScenario: string;
  onChange: (scenarioId: string) => void;
  className?: string;
  locale?: 'nl' | 'en';
}

export function PersonaScenarioSelector({
  scenarios,
  activeScenario,
  onChange,
  className,
  locale = 'nl',
}: PersonaScenarioSelectorProps) {
  return (
    <div className={cn('relative flex items-center justify-center w-full', className)}>
      <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onChange(scenario.id)}
            className={cn(
              'px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 whitespace-nowrap',
              activeScenario === scenario.id
                ? 'bg-[#477638] text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {scenario.simpleName}
          </button>
        ))}
      </div>
    </div>
  );
}

PersonaScenarioSelector.displayName = 'PersonaScenarioSelector';

export default PersonaScenarioSelector;
