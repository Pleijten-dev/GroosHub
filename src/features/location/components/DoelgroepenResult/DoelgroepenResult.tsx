// src/features/location/components/DoelgroepenResult/DoelgroepenResult.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { StaticCube } from './StaticCube';
import { PersonaScore } from '../../utils/targetGroupScoring';
import { SummaryRankingTable } from '../Doelgroepen/SummaryRankingTable';
import { DetailedScoringTable } from '../Doelgroepen/DetailedScoringTable';
import { DoelgroepenCard } from '../Doelgroepen/DoelgroepenCard';

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
  allPersonaScores: PersonaScore[]; // All persona scores for table ranking
  getScenarioData: (scenario: string) => {
    cubeIndices: number[];
    personas: PersonaScore[];
  };
}

type Scenario = 'scenario1' | 'scenario2' | 'scenario3' | 'custom';
type ContentView = 'table' | 'cards';

/**
 * Result component showing static cube with target groups and scenario selector
 * Features:
 * - Static cube at 60vh height with target group configuration
 * - Segmented button with 4 scenarios
 * - Smooth fade-in animation
 * - Expandable detail panel with table/cards view
 */
export const DoelgroepenResult: React.FC<DoelgroepenResultProps> = ({
  locale,
  cubeColors,
  allPersonas,
  allPersonaScores,
  getScenarioData
}) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('scenario1');
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentView, setContentView] = useState<ContentView>('table');
  const [showDetailedScoring, setShowDetailedScoring] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleScenarioClick = (scenario: Scenario) => {
    setSelectedScenario(scenario);
  };

  const handleExpandClick = () => {
    setIsExpanded(!isExpanded);
  };

  // Get current scenario data
  const scenarioData = getScenarioData(selectedScenario);

  const scenarios: { id: Scenario; label: string }[] = [
    { id: 'scenario1', label: locale === 'nl' ? 'Scenario 1' : 'Scenario 1' },
    { id: 'scenario2', label: locale === 'nl' ? 'Scenario 2' : 'Scenario 2' },
    { id: 'scenario3', label: locale === 'nl' ? 'Scenario 3' : 'Scenario 3' },
    { id: 'custom', label: locale === 'nl' ? 'Op maat' : 'Custom' }
  ];

  const translations = {
    nl: {
      table: 'Tabel',
      cards: 'Kaarten',
      showDetails: 'Toon Details',
      hideDetails: 'Verberg Details'
    },
    en: {
      table: 'Table',
      cards: 'Cards',
      showDetails: 'Show Details',
      hideDetails: 'Hide Details'
    }
  };

  const t = translations[locale];

  // Get selected personas from scenario
  const selectedPersonasForCards = scenarioData.personas.map(ps =>
    allPersonas.find(p => p.id === ps.personaId)
  ).filter(p => p !== undefined) as HousingPersona[];

  return (
    <div
      className={`
        h-full w-full flex
        transition-opacity duration-1000
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Left Side - Cube and Segmented Button */}
      <div
        className={`
          flex flex-col items-center justify-center gap-8
          transition-all duration-700 ease-in-out z-50
          ${isExpanded ? 'w-[30%]' : 'w-full'}
        `}
      >
        {/* Static Cube - takes available space */}
        <div className={`flex-1 flex items-center justify-center w-full transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[50vh]' : 'max-h-[70vh]'}`}>
          <div className={`w-full h-full ${!isExpanded ? 'max-w-[1000px]' : ''}`}>
            <StaticCube
              targetGroupIndices={scenarioData.cubeIndices}
              cubeColors={cubeColors}
              allPersonas={allPersonas}
              selectedPersonas={scenarioData.personas}
              locale={locale}
              zoom={isExpanded ? 40 : 80}
            />
          </div>
        </div>

        {/* Segmented Button */}
        <div className="flex-shrink-0 flex flex-col items-center gap-4 pb-8">
          <div
            className={`
              flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg
              transition-all duration-700 ease-in-out
              ${isExpanded ? 'scale-75' : 'scale-100'}
            `}
          >
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

          {/* Downward Arrow Button - Only show when not expanded */}
          {!isExpanded && (
            <button
              className="group cursor-pointer bg-transparent border-none p-0 m-0 focus:outline-none transition-transform duration-200 hover:scale-110"
              onClick={handleExpandClick}
            >
              <svg
                width="48"
                height="24"
                viewBox="0 0 48 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-colors duration-200"
              >
                {/* Simple V-shaped arrow pointing downwards - wide horizontally */}
                <path
                  d="M12 8 L24 20 L36 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-700 group-hover:text-gray-900"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Right Side - Sliding Panel */}
      <div
        className={`
          flex flex-col bg-white border-l border-gray-200 shadow-xl
          transition-all duration-700 ease-in-out overflow-hidden
          ${isExpanded ? 'w-[70%] opacity-100' : 'w-0 opacity-0'}
        `}
      >
        <div className="flex-1 flex flex-col p-6 min-h-0">
          {/* Content Switcher - Hidden when detailed scoring is shown */}
          {!showDetailedScoring && (
            <div className="flex-shrink-0 flex items-center justify-center mb-4">
              <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
                <button
                  onClick={() => setContentView('table')}
                  className={`
                    px-6 py-3 rounded-full font-medium text-sm transition-all duration-300
                    ${
                      contentView === 'table'
                        ? 'bg-gradient-3-mid text-gray-900 shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {t.table}
                </button>
                <button
                  onClick={() => setContentView('cards')}
                  className={`
                    px-6 py-3 rounded-full font-medium text-sm transition-all duration-300
                    ${
                      contentView === 'cards'
                        ? 'bg-gradient-3-mid text-gray-900 shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {t.cards}
                </button>
              </div>
            </div>
          )}

          {/* Main Content Window - Hidden when detailed scoring is shown */}
          {!showDetailedScoring && (
            <div className="flex-1 overflow-auto mb-4 min-h-0">
              {contentView === 'table' ? (
                <SummaryRankingTable
                  scores={allPersonaScores}
                  locale={locale}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPersonasForCards.map(persona => (
                    <DoelgroepenCard
                      key={persona.id}
                      persona={persona}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detailed Scoring Table - Replaces all content above when shown */}
          {showDetailedScoring && (
            <div className="flex-1 overflow-auto mb-4 min-h-0">
              <DetailedScoringTable
                scores={allPersonaScores}
                locale={locale}
              />
            </div>
          )}

          {/* Second Arrow for Detailed Scoring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4 border-t border-gray-200 pt-4">
            <button
              className="group cursor-pointer bg-transparent border-none p-0 m-0 focus:outline-none transition-transform duration-200 hover:scale-110"
              onClick={() => setShowDetailedScoring(!showDetailedScoring)}
            >
              <svg
                width="48"
                height="24"
                viewBox="0 0 48 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-colors duration-200"
              >
                {/* Simple V-shaped arrow - pointing down or up */}
                <path
                  d="M12 8 L24 20 L36 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-700 group-hover:text-gray-900"
                  transform={showDetailedScoring ? "rotate(180 24 12)" : ""}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoelgroepenResult;
