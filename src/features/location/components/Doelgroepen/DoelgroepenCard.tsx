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
  imageUrl?: string;
}

export interface DoelgroepenCardProps {
  persona: HousingPersona;
  locale?: 'nl' | 'en';
}

export const DoelgroepenCard: React.FC<DoelgroepenCardProps> = ({ persona, locale = 'nl' }) => {
  const translations = {
    nl: {
      currentSituation: 'Huidige Situatie',
      desiredSituation: 'Gewenste Situatie',
      currentHousing: 'Huidig Woningtype',
      desiredHousing: 'Gewenst Woningtype',
      income: 'Inkomen',
      age: 'Leeftijd',
      household: 'Huishouden',
    },
    en: {
      currentSituation: 'Current Situation',
      desiredSituation: 'Desired Situation',
      currentHousing: 'Current Housing',
      desiredHousing: 'Desired Housing',
      income: 'Income',
      age: 'Age',
      household: 'Household',
    },
  };

  const t = translations[locale];

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full overflow-hidden">
      {/* 16:9 Image Space */}
      <div className="w-full bg-gray-100 relative" style={{ paddingBottom: '56.25%' }}>
        {persona.imageUrl ? (
          <img
            src={persona.imageUrl}
            alt={persona.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-400 text-sm">{locale === 'nl' ? 'Afbeelding' : 'Image'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">{persona.name}</h3>

          {/* Three banners: Income, Age, Household */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 mb-1">{t.income}</p>
              <p className="text-xs font-semibold text-gray-900">{persona.income_level}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 mb-1">{t.age}</p>
              <p className="text-xs font-semibold text-gray-900">{persona.age_group}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 mb-1">{t.household}</p>
              <p className="text-xs font-semibold text-gray-900">{persona.household_type}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-700 mb-3 leading-relaxed">{persona.description}</p>

        {/* Current Situation */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">
            {t.currentSituation}
          </h4>
          <p className="text-xs text-gray-600 mb-2 leading-relaxed">{persona.current_situation}</p>
          <div className="text-xs text-gray-500">
            <span className="font-medium">{t.currentHousing}:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {persona.current_property_types.map((type, idx) => (
                <span key={idx} className="inline-block bg-gray-50 px-2 py-1 rounded text-gray-700">
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Desired Situation */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">
            {t.desiredSituation}
          </h4>
          <p className="text-xs text-gray-600 mb-2 leading-relaxed">{persona.desired_situation}</p>
          <div className="text-xs text-gray-500">
            <span className="font-medium">{t.desiredHousing}:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {persona.desired_property_types.map((type, idx) => (
                <span key={idx} className="inline-block bg-gray-50 px-2 py-1 rounded text-gray-700">
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
