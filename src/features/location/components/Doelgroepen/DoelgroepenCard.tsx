import React from 'react';

export interface HousingPersona {
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

export interface DoelgroepenCardProps {
  persona: HousingPersona;
  locale?: 'nl' | 'en';
}

const getIncomeColor = (incomeLevel: string): string => {
  const lowerLevel = incomeLevel.toLowerCase();
  if (lowerLevel.includes('laag') || lowerLevel.includes('low')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (lowerLevel.includes('gemiddeld') || lowerLevel.includes('average')) {
    return 'bg-green-100 text-green-800 border-green-200';
  } else if (lowerLevel.includes('hoog') || lowerLevel.includes('high')) {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const getIncomeBorderColor = (incomeLevel: string): string => {
  const lowerLevel = incomeLevel.toLowerCase();
  if (lowerLevel.includes('laag') || lowerLevel.includes('low')) {
    return '#3b82f6'; // blue-500
  } else if (lowerLevel.includes('gemiddeld') || lowerLevel.includes('average')) {
    return '#22c55e'; // green-500
  } else if (lowerLevel.includes('hoog') || lowerLevel.includes('high')) {
    return '#a855f7'; // purple-500
  }
  return '#6b7280'; // gray-500
};

export const DoelgroepenCard: React.FC<DoelgroepenCardProps> = ({ persona, locale = 'nl' }) => {
  const translations = {
    nl: {
      currentSituation: 'Huidige Situatie',
      desiredSituation: 'Gewenste Situatie',
      currentHousing: 'Huidig Woningtype',
      desiredHousing: 'Gewenst Woningtype',
      householdType: 'Huishoudtype',
      ageGroup: 'Leeftijdsgroep',
    },
    en: {
      currentSituation: 'Current Situation',
      desiredSituation: 'Desired Situation',
      currentHousing: 'Current Housing',
      desiredHousing: 'Desired Housing',
      householdType: 'Household Type',
      ageGroup: 'Age Group',
    },
  };

  const t = translations[locale];

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
      style={{ borderLeftColor: getIncomeBorderColor(persona.income_level), borderLeftWidth: '4px' }}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{persona.name}</h3>
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getIncomeColor(persona.income_level)}`}>
            {persona.income_level}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            {persona.age_group}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">{persona.description}</p>

      {/* Household Info */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-gray-600 font-medium">{t.householdType}:</span>
          <span className="text-gray-800">{persona.household_type}</span>
        </div>
      </div>

      {/* Current Situation */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
          {t.currentSituation}
        </h4>
        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{persona.current_situation}</p>
        <div className="text-xs text-gray-500">
          <span className="font-medium">{t.currentHousing}:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {persona.current_property_types.map((type, idx) => (
              <span key={idx} className="inline-block bg-gray-100 px-2 py-1 rounded">
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Desired Situation */}
      <div className="mt-auto">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          {t.desiredSituation}
        </h4>
        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{persona.desired_situation}</p>
        <div className="text-xs text-gray-500">
          <span className="font-medium">{t.desiredHousing}:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {persona.desired_property_types.map((type, idx) => (
              <span key={idx} className="inline-block bg-green-50 px-2 py-1 rounded border border-green-200">
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
