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
  { id: 'apartments', nl: 'Woningen', en: 'Apartments', color: '#b5bc79' },
  { id: 'commercial', nl: 'Commercieel', en: 'Commercial', color: '#9ca86d' },
  { id: 'hospitality', nl: 'Horeca', en: 'Hospitality', color: '#869561' },
  { id: 'social', nl: 'Maatschappelijk', en: 'Social', color: '#718456' },
  { id: 'communal', nl: 'Gemeenschappelijk', en: 'Communal', color: '#5e744c' },
  { id: 'offices', nl: 'Kantoren', en: 'Offices', color: '#486341' }
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
  const [lockedCategories, setLockedCategories] = useState<Set<keyof PVEAllocations>>(new Set());
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
      setLockedCategories(new Set()); // Clear locks when changing preset
    }
  };

  const toggleLock = (categoryId: keyof PVEAllocations) => {
    const newLocked = new Set(lockedCategories);
    if (newLocked.has(categoryId)) {
      newLocked.delete(categoryId);
    } else {
      newLocked.add(categoryId);
    }
    setLockedCategories(newLocked);
  };

  const toggleCategory = (categoryId: keyof PVEAllocations) => {
    // Don't allow removing locked categories
    if (lockedCategories.has(categoryId)) {
      return;
    }

    setSelectedPreset('custom');
    const newDisabled = new Set(disabledCategories);

    if (newDisabled.has(categoryId)) {
      // Re-enable category
      newDisabled.delete(categoryId);
      setDisabledCategories(newDisabled);

      // Give it a small percentage and redistribute
      const newPercentages = { ...percentages };
      newPercentages[categoryId] = 5;

      // Reduce other active categories proportionally (only unlocked ones)
      const activeCategories = CATEGORIES.filter(cat =>
        cat.id !== categoryId && !newDisabled.has(cat.id) && !lockedCategories.has(cat.id)
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

      // Redistribute this category's percentage to others (only unlocked ones)
      const percentageToRedistribute = percentages[categoryId];
      const newPercentages = { ...percentages };
      newPercentages[categoryId] = 0;

      // Distribute to active categories proportionally (only unlocked)
      const activeCategories = CATEGORIES.filter(cat =>
        cat.id !== categoryId && !newDisabled.has(cat.id) && !lockedCategories.has(cat.id)
      );
      const totalActivePercentage = activeCategories.reduce((sum, cat) => sum + percentages[cat.id], 0);

      activeCategories.forEach(cat => {
        const proportion = percentages[cat.id] / totalActivePercentage;
        newPercentages[cat.id] = percentages[cat.id] + (percentageToRedistribute * proportion);
      });

      setPercentages(newPercentages);
    }
  };

  const handlePercentageChange = (categoryId: keyof PVEAllocations, newPercentage: number) => {
    setSelectedPreset('custom');
    const clampedPercentage = Math.max(0, Math.min(100, newPercentage));

    // Calculate total of locked categories
    const lockedTotal = CATEGORIES.filter(cat =>
      cat.id !== categoryId &&
      !disabledCategories.has(cat.id) &&
      lockedCategories.has(cat.id)
    ).reduce((sum, cat) => sum + percentages[cat.id], 0);

    // Calculate total of unlocked categories (excluding current)
    const unlockedTotal = CATEGORIES.filter(cat =>
      cat.id !== categoryId &&
      !disabledCategories.has(cat.id) &&
      !lockedCategories.has(cat.id)
    ).reduce((sum, cat) => sum + percentages[cat.id], 0);

    const newPercentages = { ...percentages };
    newPercentages[categoryId] = clampedPercentage;

    // Distribute remaining percentage only to unlocked categories
    const remaining = 100 - clampedPercentage - lockedTotal;
    if (unlockedTotal > 0 && remaining >= 0) {
      const scaleFactor = remaining / unlockedTotal;
      CATEGORIES.forEach(cat => {
        if (cat.id !== categoryId && !disabledCategories.has(cat.id) && !lockedCategories.has(cat.id)) {
          newPercentages[cat.id] = percentages[cat.id] * scaleFactor;
        }
      });
    }

    setPercentages(newPercentages);
  };

  const handleM2Change = (categoryId: keyof PVEAllocations, newM2: number) => {
    setSelectedPreset('custom');
    const clampedM2 = Math.max(0, newM2);
    const newPercentage = (clampedM2 / totalM2) * 100;
    handlePercentageChange(categoryId, newPercentage);
  };

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
    setSelectedPreset('custom'); // Switch to custom when user starts dragging
  };

  const handleDragMove = React.useCallback((e: MouseEvent) => {
    if (draggingIndex === null || !barRef.current) return;

    // Check if either category being adjusted is locked
    const leftCategory = activeCategories[draggingIndex];
    const rightCategory = activeCategories[draggingIndex + 1];
    if (lockedCategories.has(leftCategory?.id) || lockedCategories.has(rightCategory?.id)) {
      return; // Don't allow dragging if either category is locked
    }

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
  }, [draggingIndex, percentages, activeCategories, lockedCategories]);

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

  // Generate Voronoi-like pattern with glass blur effect
  const renderVoronoiPattern = useMemo(() => {
    const width = 600;
    const height = 300;
    const blurAmount = 20;
    const padding = blurAmount * 3; // Extra padding to ensure blur doesn't sample edges

    const cellSize = 5;
    const extendedWidth = width + padding * 2;
    const extendedHeight = height + padding * 2;
    const cols = Math.floor(extendedWidth / cellSize);
    const rows = Math.floor(extendedHeight / cellSize);

    // Create one fixed seed point per category positioned at the edges
    const activeCategories = CATEGORIES.filter(cat => percentages[cat.id] > 0);
    const angleStep = (2 * Math.PI) / activeCategories.length;
    const centerX = extendedWidth / 2;
    const centerY = extendedHeight / 2;

    // Position seeds at the edge of an ellipse
    const radiusX = width * 0.6;
    const radiusY = height * 0.6;

    const seeds: { x: number; y: number; color: string; weight: number }[] = [];

    activeCategories.forEach((cat, idx) => {
      const angle = idx * angleStep;
      const percentage = percentages[cat.id];

      seeds.push({
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
        color: cat.color,
        weight: percentage
      });
    });

    // Generate weighted Voronoi cells for extended area
    const cells: React.ReactElement[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellSize + cellSize / 2;
        const y = row * cellSize + cellSize / 2;

        let minWeightedDist = Infinity;
        let nearestColor = activeCategories[0]?.color || '#48806a';

        seeds.forEach(seed => {
          const dist = Math.sqrt((x - seed.x) ** 2 + (y - seed.y) ** 2);
          const weightedDist = dist / Math.sqrt(seed.weight);

          if (weightedDist < minWeightedDist) {
            minWeightedDist = weightedDist;
            nearestColor = seed.color;
          }
        });

        cells.push(
          <rect
            key={`${row}-${col}`}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill={nearestColor}
          />
        );
      }
    }

    return (
      <svg width={width} height={height} style={{ overflow: 'hidden' }}>
        <defs>
          <filter id="voronoi-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation={blurAmount} />
          </filter>
        </defs>

        {/* Render blurred content offset by padding, crops naturally via SVG viewport */}
        <g transform={`translate(-${padding}, -${padding})`} filter="url(#voronoi-blur)">
          {cells}
        </g>
      </svg>
    );
  }, [percentages]);

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

          {/* Labels positioned below each bar section */}
          <div className="relative mt-4" style={{ height: '160px' }}>
            {(() => {
              // Calculate positions and detect overlaps
              const labelWidth = 100; // Approximate width of each label in pixels
              const containerWidth = 600; // Width of the bar in pixels (assumed from earlier)
              const minGap = 5; // Minimum gap between labels in pixels

              const labelPositions: { cat: Category; x: number; row: number }[] = [];

              CATEGORIES.forEach((cat) => {
                const isDisabled = disabledCategories.has(cat.id);
                if (isDisabled) return;

                const width = percentages[cat.id];
                const activeCatIndex = activeCategories.findIndex(c => c.id === cat.id);
                const xPercent = activeCatIndex >= 0 ? getCumulativePercentage(activeCatIndex) + width / 2 : 0;
                const xPixels = (xPercent / 100) * containerWidth;

                // Start in row 0, will move to row 1 if overlapping
                let row = 0;

                // Check for overlaps with existing labels in row 0
                const labelsInRow0 = labelPositions.filter(lp => lp.row === 0);
                const hasOverlap = labelsInRow0.some(lp => {
                  const distance = Math.abs(xPixels - lp.x);
                  return distance < labelWidth / 2 + minGap;
                });

                if (hasOverlap) {
                  row = 1; // Move to alternate row
                }

                labelPositions.push({ cat, x: xPixels, row });
              });

              // Render labels with calculated positions
              return labelPositions.map(({ cat, x, row }) => {
                const width = percentages[cat.id];
                const xPercent = (x / containerWidth) * 100;
                const verticalOffset = row === 0 ? 0 : 80;

                return (
                  <div
                    key={`label-${cat.id}`}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${xPercent}%`,
                      transform: 'translateX(-50%)',
                      top: `${verticalOffset}px`
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="font-bold text-sm text-gray-900">
                        {cat[locale]}
                      </span>
                      <button
                        onClick={() => toggleLock(cat.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title={lockedCategories.has(cat.id) ? (locale === 'nl' ? 'Ontgrendelen' : 'Unlock') : (locale === 'nl' ? 'Vergrendelen' : 'Lock')}
                      >
                        {lockedCategories.has(cat.id) ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        disabled={lockedCategories.has(cat.id)}
                        className={`text-lg leading-none ${
                          lockedCategories.has(cat.id)
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title={lockedCategories.has(cat.id) ? (locale === 'nl' ? 'Ontgrendel eerst' : 'Unlock first') : (locale === 'nl' ? 'Verwijderen' : 'Remove')}
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={width.toFixed(1)}
                        onChange={(e) => handlePercentageChange(cat.id, parseFloat(e.target.value) || 0)}
                        disabled={lockedCategories.has(cat.id)}
                        className={`w-16 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                          lockedCategories.has(cat.id) ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-xs text-gray-600">%</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={absoluteValues[cat.id]}
                        onChange={(e) => handleM2Change(cat.id, parseInt(e.target.value) || 0)}
                        disabled={lockedCategories.has(cat.id)}
                        className={`w-20 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary ${
                          lockedCategories.has(cat.id) ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        min="0"
                        step="10"
                      />
                      <span className="text-xs text-gray-600">m²</span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Show disabled categories at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 flex-wrap">
              {CATEGORIES.filter(cat => disabledCategories.has(cat.id)).map((cat) => (
                <div key={`disabled-${cat.id}`} className="flex items-center gap-1 opacity-50">
                  <span className="text-xs text-gray-500">{cat[locale]}</span>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="text-gray-500 hover:text-gray-700 text-sm leading-none"
                    title={locale === 'nl' ? 'Toevoegen' : 'Add'}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-muted text-center mt-2">
            {locale === 'nl'
              ? 'Sleep de grenzen om de verdeling aan te passen'
              : 'Drag the boundaries to adjust allocation'}
          </p>
        </div>

        {/* Voronoi visualization */}
        <div className="flex justify-center mb-base">
          <div className="border-2 border-gray-300 overflow-hidden shadow-lg bg-white">
            {renderVoronoiPattern}
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
