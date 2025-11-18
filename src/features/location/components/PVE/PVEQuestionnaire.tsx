// src/features/location/components/PVE/PVEQuestionnaire.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Locale } from '../../../../lib/i18n/config';

interface PVEAllocations {
  apartments: number;
  commercial: number;
  hospitality: number;
  social: number;
  communal: number;
  offices: number;
}

interface PVEQuestionnaireProps {
  locale: Locale;
}

interface Category {
  id: keyof PVEAllocations;
  nl: string;
  en: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'apartments', nl: 'Woningen', en: 'Apartments', color: '#48806a' },
  { id: 'commercial', nl: 'Commercieel', en: 'Commercial', color: '#477638' },
  { id: 'hospitality', nl: 'Horeca', en: 'Hospitality', color: '#8a976b' },
  { id: 'social', nl: 'Maatschappelijk', en: 'Social', color: '#0c211a' },
  { id: 'communal', nl: 'Gemeenschappelijk', en: 'Communal', color: '#a3b18a' },
  { id: 'offices', nl: 'Kantoren', en: 'Offices', color: '#588157' }
];

type PresetId = 'mixed-residential' | 'urban-retail' | 'community' | 'custom';

interface Preset {
  id: PresetId;
  nl: string;
  en: string;
  allocations: PVEAllocations;
}

const PRESETS: Preset[] = [
  {
    id: 'mixed-residential',
    nl: 'Gemengd Wonen',
    en: 'Mixed Residential',
    allocations: { apartments: 70, commercial: 15, hospitality: 5, social: 5, communal: 3, offices: 2 }
  },
  {
    id: 'urban-retail',
    nl: 'Urban Retail',
    en: 'Urban Retail',
    allocations: { apartments: 20, commercial: 40, hospitality: 25, social: 5, communal: 5, offices: 5 }
  },
  {
    id: 'community',
    nl: 'Gemeenschapscentrum',
    en: 'Community Center',
    allocations: { apartments: 10, commercial: 10, hospitality: 10, social: 40, communal: 25, offices: 5 }
  },
  {
    id: 'custom',
    nl: 'Op maat',
    en: 'Custom',
    allocations: { apartments: 16.67, commercial: 16.67, hospitality: 16.67, social: 16.67, communal: 16.67, offices: 16.65 }
  }
];

export const PVEQuestionnaire: React.FC<PVEQuestionnaireProps> = ({ locale }) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetId>('mixed-residential');
  const [totalM2, setTotalM2] = useState<number>(10000);
  const [percentages, setPercentages] = useState<PVEAllocations>(PRESETS[0].allocations);
  const [disabledCategories, setDisabledCategories] = useState<Set<keyof PVEAllocations>>(new Set());
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Get only active (non-disabled) categories
  const activeCategories = useMemo(() =>
    CATEGORIES.filter(cat => !disabledCategories.has(cat.id)),
    [disabledCategories]
  );

  const handlePresetChange = (presetId: PresetId) => {
    setSelectedPreset(presetId);
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setPercentages(preset.allocations);
    }
  };

  const toggleCategory = (categoryId: keyof PVEAllocations) => {
    setSelectedPreset('custom');
    const newDisabled = new Set(disabledCategories);

    if (newDisabled.has(categoryId)) {
      // Re-enable category
      newDisabled.delete(categoryId);
      setDisabledCategories(newDisabled);

      // Give it a small percentage and redistribute
      const newPercentages = { ...percentages };
      newPercentages[categoryId] = 5;

      // Reduce other active categories proportionally
      const activeCategories = CATEGORIES.filter(cat =>
        cat.id !== categoryId && !newDisabled.has(cat.id)
      );
      const totalOtherPercentage = activeCategories.reduce((sum, cat) => sum + percentages[cat.id], 0);
      const reductionFactor = (totalOtherPercentage - 5) / totalOtherPercentage;

      activeCategories.forEach(cat => {
        newPercentages[cat.id] = percentages[cat.id] * reductionFactor;
      });

      setPercentages(newPercentages);
    } else {
      // Disable category
      newDisabled.add(categoryId);
      setDisabledCategories(newDisabled);

      // Redistribute this category's percentage to others
      const percentageToRedistribute = percentages[categoryId];
      const newPercentages = { ...percentages };
      newPercentages[categoryId] = 0;

      // Distribute to active categories proportionally
      const activeCategories = CATEGORIES.filter(cat =>
        cat.id !== categoryId && !newDisabled.has(cat.id)
      );
      const totalActivePercentage = activeCategories.reduce((sum, cat) => sum + percentages[cat.id], 0);

      activeCategories.forEach(cat => {
        const proportion = percentages[cat.id] / totalActivePercentage;
        newPercentages[cat.id] = percentages[cat.id] + (percentageToRedistribute * proportion);
      });

      setPercentages(newPercentages);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    setSelectedPreset('custom'); // Switch to custom when user starts dragging
  };

  const handleDragMove = React.useCallback((e: MouseEvent) => {
    if (draggingIndex === null || !barRef.current) return;

    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    // Calculate cumulative percentages to find boundaries
    const newPercentages = { ...percentages };

    // Calculate cumulative sum up to dragging point
    let cumulativeSum = 0;
    for (let i = 0; i < draggingIndex; i++) {
      cumulativeSum += newPercentages[activeCategories[i].id];
    }

    // Calculate remaining after the next category (categories that stay fixed)
    let remainingSum = 0;
    for (let i = draggingIndex + 2; i < activeCategories.length; i++) {
      remainingSum += newPercentages[activeCategories[i].id];
    }

    // Calculate available space for the two categories being adjusted
    const availableSpace = 100 - cumulativeSum - remainingSum;

    // Calculate new value for the dragged category (constrained between 1 and availableSpace - 1)
    const requestedValue = percentage - cumulativeSum;
    const newValue = Math.max(1, Math.min(availableSpace - 1, requestedValue));

    // Adjust the two categories
    if (draggingIndex < activeCategories.length - 1) {
      newPercentages[activeCategories[draggingIndex].id] = newValue;
      newPercentages[activeCategories[draggingIndex + 1].id] = availableSpace - newValue;
    }

    setPercentages(newPercentages);
  }, [draggingIndex, percentages, activeCategories]);

  const handleDragEnd = React.useCallback(() => {
    setDraggingIndex(null);
  }, []);

  useEffect(() => {
    if (draggingIndex !== null) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingIndex, handleDragMove, handleDragEnd]);

  // Calculate absolute values
  const absoluteValues = useMemo(() => {
    const result: Record<keyof PVEAllocations, number> = {
      apartments: 0,
      commercial: 0,
      hospitality: 0,
      social: 0,
      communal: 0,
      offices: 0
    };
    CATEGORIES.forEach(cat => {
      result[cat.id] = Math.round((percentages[cat.id] / 100) * totalM2);
    });
    return result;
  }, [percentages, totalM2]);

  // Render 200 squares grid
  const renderGrid = () => {
    const squares: React.ReactElement[] = [];
    let currentIndex = 0;

    CATEGORIES.forEach(({ id, color }) => {
      const count = Math.round((percentages[id] / 100) * 200);
      for (let i = 0; i < count; i++) {
        squares.push(
          <div
            key={currentIndex++}
            className="w-full h-full rounded-sm"
            style={{ backgroundColor: color }}
          />
        );
      }
    });

    // Fill remaining with gray
    while (currentIndex < 200) {
      squares.push(
        <div
          key={currentIndex++}
          className="w-full h-full bg-gray-200 rounded-sm"
        />
      );
    }

    return squares;
  };

  // Calculate cumulative percentages for positioning (using active categories only)
  const getCumulativePercentage = (upToIndex: number): number => {
    let sum = 0;
    for (let i = 0; i < upToIndex; i++) {
      sum += percentages[activeCategories[i].id];
    }
    return sum;
  };

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 p-lg">
      <div className="w-full max-w-6xl">
        {/* Header with presets */}
        <div className="mb-lg text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-base">
            {locale === 'nl' ? 'Programma van Eisen' : 'Requirements Program'}
          </h2>

          {/* Preset Selector */}
          <div className="flex items-center justify-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg inline-flex">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`
                  px-6 py-3 rounded-full font-medium text-sm transition-all duration-300
                  ${
                    selectedPreset === preset.id
                      ? 'bg-gradient-3-mid text-gray-900 shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {preset[locale]}
              </button>
            ))}
          </div>
        </div>

        {/* Total M2 Input */}
        <div className="mb-base">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {locale === 'nl' ? 'Totale bruto vloer oppervlakte (m²)' : 'Total gross floor area (m²)'}
          </label>
          <input
            type="number"
            value={totalM2}
            onChange={(e) => setTotalM2(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            min="1"
            step="100"
          />
        </div>

        {/* Interactive Stacked Bar */}
        <div className="mb-lg">
          <div
            ref={barRef}
            className="relative h-32 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg bg-white"
            style={{ cursor: draggingIndex !== null ? 'ew-resize' : 'default' }}
          >
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                {/* Noise gradient filters for each category */}
                {CATEGORIES.map((cat, idx) => (
                  <filter
                    key={cat.id}
                    id={`noise-${cat.id}`}
                    filterUnits="objectBoundingBox"
                    primitiveUnits="objectBoundingBox"
                    x="-0.2"
                    y="-0.2"
                    width="1.4"
                    height="1.4"
                  >
                    {/* Procedural noise */}
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency={0.001 * (0.9 + idx * 0.05)}
                      numOctaves="3"
                      seed={idx * 1000}
                      result="noise"
                    />
                    {/* Soften */}
                    <feGaussianBlur in="noise" stdDeviation="0.015" edgeMode="duplicate" result="soft" />
                    {/* Grayscale */}
                    <feColorMatrix in="soft" type="saturate" values="0" result="gray" />
                    {/* Levels */}
                    <feComponentTransfer in="gray" result="leveled">
                      <feFuncR type="linear" slope="3.33" intercept="-1" />
                      <feFuncG type="linear" slope="3.33" intercept="-1" />
                      <feFuncB type="linear" slope="3.33" intercept="-1" />
                    </feComponentTransfer>
                    {/* Gradient map to green palette */}
                    <feComponentTransfer in="leveled" result="colorized">
                      <feFuncR type="table" tableValues="0.047 0.282 0.278 0.541 0.973" />
                      <feFuncG type="table" tableValues="0.129 0.502 0.463 0.592 0.933" />
                      <feFuncB type="table" tableValues="0.102 0.416 0.220 0.420 0.894" />
                    </feComponentTransfer>
                    {/* Clip to shape */}
                    <feComposite in="colorized" in2="SourceAlpha" operator="in" result="final" />
                  </filter>
                ))}
              </defs>

              {/* Render sections */}
              {activeCategories.map((cat, idx) => {
                const x = getCumulativePercentage(idx);
                const width = percentages[cat.id];
                if (width === 0) return null;

                return (
                  <rect
                    key={cat.id}
                    x={`${x}%`}
                    y="0"
                    width={`${width}%`}
                    height="100%"
                    fill="#fff"
                    filter={`url(#noise-${cat.id})`}
                    style={{ opacity: 0.98 }}
                  />
                );
              })}

              {/* Draggable dividers */}
              {activeCategories.slice(0, -1).map((cat, idx) => {
                const x = getCumulativePercentage(idx + 1);

                return (
                  <g
                    key={`divider-${idx}`}
                    onMouseDown={() => handleDragStart(idx)}
                    style={{ cursor: 'ew-resize' }}
                  >
                    <line
                      x1={`${x}%`}
                      y1="0"
                      x2={`${x}%`}
                      y2="100%"
                      stroke="#fff"
                      strokeWidth="3"
                      opacity="0.8"
                    />
                    <rect
                      x={`calc(${x}% - 4px)`}
                      y="0"
                      width="8"
                      height="100%"
                      fill="transparent"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Labels below bar */}
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            {CATEGORIES.map((cat) => {
              const isDisabled = disabledCategories.has(cat.id);
              const width = percentages[cat.id];

              return (
                <div
                  key={`label-${cat.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                    isDisabled ? 'bg-gray-100 border-gray-300 opacity-50' : 'bg-white border-gray-400'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{
                      backgroundColor: cat.color,
                      opacity: isDisabled ? 0.3 : 1
                    }}
                  />
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                      {cat[locale]}
                    </span>
                    <span className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                      {isDisabled ? '0%' : `${width.toFixed(1)}%`} • {isDisabled ? '0' : absoluteValues[cat.id].toLocaleString()} m²
                    </span>
                  </div>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={`ml-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDisabled
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    title={isDisabled ? (locale === 'nl' ? 'Toevoegen' : 'Add') : (locale === 'nl' ? 'Verwijderen' : 'Remove')}
                  >
                    {isDisabled ? '+' : '×'}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-text-muted text-center mt-2">
            {locale === 'nl'
              ? 'Sleep de grenzen om de verdeling aan te passen'
              : 'Drag the boundaries to adjust allocation'}
          </p>
        </div>

        {/* Grid visualization */}
        <div className="flex justify-center mb-base">
          <div
            className="border-2 border-gray-300 rounded-lg p-2 bg-white shadow-lg"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(20, 1fr)',
              gap: '4px',
              width: '600px',
              height: '300px'
            }}
          >
            {renderGrid()}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold text-text-primary mb-3">
            {locale === 'nl' ? 'Overzicht' : 'Summary'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    {cat[locale]}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {percentages[cat.id].toFixed(1)}% · {absoluteValues[cat.id].toLocaleString()} m²
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PVEQuestionnaire;
