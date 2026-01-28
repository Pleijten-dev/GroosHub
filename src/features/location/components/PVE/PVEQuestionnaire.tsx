// src/features/location/components/PVE/PVEQuestionnaire.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { pveConfigCache, type FSIConfig, type HousingCategoryPercentages } from '../../data/cache/pveConfigCache';
import { registerPVEBarElement } from '../../utils/pveCapture';
import {
  calculateFSI,
  getFSICategory,
  getFSICategoryLabel,
  getHousingTypeLabel,
  getHousingRecommendation,
  validateHousingCategories,
  getUnallocatedPercentage,
  DEFAULT_HOUSING_CATEGORIES,
} from '../../utils/fsiCalculations';

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
  /** Address density from CBS demographics (Omgevingsadressendichtheid) - per km² */
  addressDensity?: number;
}

interface Category {
  id: keyof PVEAllocations;
  nl: string;
  en: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'apartments', nl: 'Woningen', en: 'Apartments', color: '#8a976b' },
  { id: 'commercial', nl: 'Commercieel', en: 'Commercial', color: '#778a5e' },
  { id: 'hospitality', nl: 'Horeca', en: 'Hospitality', color: '#63834c' },
  { id: 'social', nl: 'Maatschappelijk', en: 'Social', color: '#477638' },
  { id: 'communal', nl: 'Gemeenschappelijk', en: 'Communal', color: '#48806a' },
  { id: 'offices', nl: 'Kantoren', en: 'Offices', color: '#0c211a' }
];

// Grayscale values for Voronoi (will be recolored by filter to match noise pattern)
const VORONOI_GRAYSCALE: Record<keyof PVEAllocations, string> = {
  apartments: '#ffffff',    // Lightest → will become #8a976b
  commercial: '#cccccc',    // → will become #778a5e
  hospitality: '#999999',   // → will become #63834c
  social: '#666666',        // → will become #477638
  communal: '#333333',      // → will become #48806a
  offices: '#000000'        // Darkest → will become #0c211a
};

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

export const PVEQuestionnaire: React.FC<PVEQuestionnaireProps> = ({ locale, addressDensity }) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetId>('mixed-residential');
  const [totalM2, setTotalM2] = useState<number>(10000);
  const [percentages, setPercentages] = useState<PVEAllocations>(PRESETS[0].allocations);
  const [disabledCategories, setDisabledCategories] = useState<Set<keyof PVEAllocations>>(new Set());
  const [lockedCategories, setLockedCategories] = useState<Set<keyof PVEAllocations>>(new Set());
  const [expandedLabel, setExpandedLabel] = useState<keyof PVEAllocations | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  // FSI state
  const [fsiOverride, setFsiOverride] = useState<number | null>(null);
  const [showFsiSection, setShowFsiSection] = useState<boolean>(true);

  // Housing categories state
  const [housingCategories, setHousingCategories] = useState<HousingCategoryPercentages>(DEFAULT_HOUSING_CATEGORIES);
  const [showHousingSection, setShowHousingSection] = useState<boolean>(true);

  // Calculate FSI from address density
  const fsiResult = useMemo(() => {
    if (addressDensity === undefined || addressDensity === null) return null;
    return calculateFSI(addressDensity);
  }, [addressDensity]);

  // Final FSI value (use override if set, otherwise calculated)
  const finalFSI = useMemo(() => {
    if (fsiOverride !== null) return fsiOverride;
    return fsiResult?.calculatedFSI ?? 1.5; // Default to medium if no data
  }, [fsiOverride, fsiResult]);

  // FSI category and recommendation
  const fsiCategory = useMemo(() => getFSICategory(finalFSI), [finalFSI]);
  const fsiCategoryLabel = useMemo(() => getFSICategoryLabel(finalFSI, locale), [finalFSI, locale]);
  const housingTypeLabel = useMemo(() => getHousingTypeLabel(finalFSI, locale), [finalFSI, locale]);
  const housingRecommendation = useMemo(() => getHousingRecommendation(finalFSI, locale), [finalFSI, locale]);

  // Validate housing categories
  const housingValidation = useMemo(() => validateHousingCategories(housingCategories), [housingCategories]);
  const unallocatedPercentage = useMemo(() => getUnallocatedPercentage(housingCategories), [housingCategories]);

  // Calculate residential m² for housing categories display
  const residentialM2 = useMemo(() => {
    return Math.round((percentages.apartments / 100) * totalM2);
  }, [percentages.apartments, totalM2]);

  // Get only active (non-disabled) categories
  const activeCategories = useMemo(() =>
    CATEGORIES.filter(cat => !disabledCategories.has(cat.id)),
    [disabledCategories]
  );

  const handlePresetChange = (presetId: PresetId) => {
    setSelectedPreset(presetId);

    // If switching to custom preset, try to load from cache
    if (presetId === 'custom') {
      const cachedConfig = pveConfigCache.get();
      if (cachedConfig) {
        setTotalM2(cachedConfig.totalM2);
        setPercentages(cachedConfig.percentages);
        setDisabledCategories(new Set(cachedConfig.disabledCategories as Array<keyof PVEAllocations>));
        setLockedCategories(new Set(cachedConfig.lockedCategories as Array<keyof PVEAllocations>));
        return;
      }
    }

    // For non-custom presets or if no cache exists, use preset defaults
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setPercentages(preset.allocations);
      setLockedCategories(new Set()); // Clear locks when changing preset
      setDisabledCategories(new Set()); // Clear disabled categories when changing preset
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

  // Close expanded label when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (expandedLabel) {
        // Check if click is outside the expanded label
        const target = e.target as HTMLElement;
        const isLabelClick = target.closest('[data-label-id]');
        if (!isLabelClick) {
          setExpandedLabel(null);
        }
      }
    };

    if (expandedLabel) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [expandedLabel]);

  // Load cached custom configuration on mount
  useEffect(() => {
    const cachedConfig = pveConfigCache.get();
    if (cachedConfig) {
      setSelectedPreset('custom');
      setTotalM2(cachedConfig.totalM2);
      setPercentages(cachedConfig.percentages);
      setDisabledCategories(new Set(cachedConfig.disabledCategories as Array<keyof PVEAllocations>));
      setLockedCategories(new Set(cachedConfig.lockedCategories as Array<keyof PVEAllocations>));
      // Load FSI override if present
      if (cachedConfig.fsi?.overriddenFSI !== undefined) {
        setFsiOverride(cachedConfig.fsi.overriddenFSI);
      }
      // Load housing categories if present
      if (cachedConfig.housingCategories) {
        setHousingCategories(cachedConfig.housingCategories);
      }
    }
  }, []); // Only run on mount

  // Save custom configuration to cache whenever it changes
  useEffect(() => {
    if (selectedPreset === 'custom') {
      // Build FSI config
      const fsiConfig: FSIConfig | undefined = addressDensity !== undefined ? {
        calculatedFSI: fsiResult?.calculatedFSI ?? 1.5,
        overriddenFSI: fsiOverride,
        addressDensity: addressDensity,
        category: fsiCategory,
      } : undefined;

      pveConfigCache.set({
        totalM2,
        percentages,
        disabledCategories: Array.from(disabledCategories),
        lockedCategories: Array.from(lockedCategories),
        fsi: fsiConfig,
        housingCategories,
      });
    }
  }, [selectedPreset, totalM2, percentages, disabledCategories, lockedCategories, fsiOverride, fsiResult, fsiCategory, addressDensity, housingCategories]);

  // Save final PVE state with debounce (for all presets, captures last shown configuration)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Build FSI config
      const fsiConfig: FSIConfig | undefined = addressDensity !== undefined ? {
        calculatedFSI: fsiResult?.calculatedFSI ?? 1.5,
        overriddenFSI: fsiOverride,
        addressDensity: addressDensity,
        category: fsiCategory,
      } : undefined;

      pveConfigCache.setFinalPVE({
        totalM2,
        percentages,
        fsi: fsiConfig,
        housingCategories,
      });
    }, 500); // Wait 500ms after last change before saving

    return () => clearTimeout(debounceTimer);
  }, [totalM2, percentages, fsiOverride, fsiResult, fsiCategory, addressDensity, housingCategories]);

  // Register the bar element for PDF capture
  useEffect(() => {
    registerPVEBarElement(captureRef.current);
    return () => registerPVEBarElement(null);
  }, []);

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
    const width = 1200;
    const height = 300;
    const blurAmount = 70; // Increased from 20 to 70 for much stronger blur
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
        color: VORONOI_GRAYSCALE[cat.id],
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
        let nearestColor = VORONOI_GRAYSCALE[activeCategories[0]?.id] || '#666666';

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
          <filter id="voronoi-mute">
            {/* Ensure grayscale (redundant since already gray, but keeps consistency) */}
            <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray" />
            {/* Map 6 discrete grayscale values directly through 6-color gradient table */}
            <feComponentTransfer in="gray" result="colorized">
              <feFuncR type="table" tableValues="0.047 0.282 0.278 0.388 0.467 0.541" />
              <feFuncG type="table" tableValues="0.129 0.502 0.463 0.514 0.541 0.592" />
              <feFuncB type="table" tableValues="0.102 0.416 0.220 0.298 0.369 0.420" />
            </feComponentTransfer>
            {/* Blur AFTER color mapping - creates smooth transitions between solid colors */}
            <feGaussianBlur in="colorized" stdDeviation={blurAmount} result="blurred" />
          </filter>
        </defs>

        {/* Render blurred content offset by padding, crops naturally via SVG viewport */}
        <g transform={`translate(-${padding}, -${padding})`} filter="url(#voronoi-mute)">
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
    <div className="overflow-auto h-full bg-gradient-to-br from-gray-50 to-gray-100 p-lg">
      <div className="w-full max-w-6xl mx-auto">
        {/* Voronoi visualization */}
        <div className="flex justify-center mb-base">
          <div className="border-2 border-gray-300 overflow-hidden shadow-lg bg-white">
            {renderVoronoiPattern}
          </div>
        </div>

        {/* Total M2 Input */}
        <div className="flex justify-center mb-base">
          <div className="w-[1200px]">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {locale === 'nl' ? 'Totale bruto vloer oppervlakte (m²)' : 'Total gross floor area (m²)'}
            </label>
            <input
              type="number"
              value={totalM2}
              onChange={(e) => setTotalM2(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min="1"
              step="100"
            />
          </div>
        </div>

        <p className="text-xs text-text-muted text-center mb-base">
          {locale === 'nl'
            ? 'Sleep de grenzen om de verdeling aan te passen'
            : 'Drag the boundaries to adjust allocation'}
        </p>

        {/* Interactive Stacked Bar */}
        <div className="flex justify-center mb-lg">
          <div className="w-[1200px]">
            <div
              ref={(el) => {
                (barRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                (captureRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }}
              id="pve-stacked-bar"
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
                        seed={cat.id === 'communal' ? 7500 : idx * 1000}
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

                {/* Render bar sections */}
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

                {/* Draggable dividers (invisible handles for dragging) */}
                {activeCategories.slice(0, -1).map((cat, idx) => {
                  const x = getCumulativePercentage(idx + 1);

                  return (
                    <g
                      key={`divider-${idx}`}
                      onMouseDown={() => handleDragStart(idx)}
                      style={{ cursor: 'ew-resize' }}
                    >
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
          <div className="relative mt-4" style={{ height: '100px' }}>
            {(() => {
              // Calculate positions and detect overlaps
              const labelWidth = 100; // Approximate width of each label in pixels
              const containerWidth = 1200; // Width of the bar in pixels (assumed from earlier)
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
                const verticalOffset = row === 0 ? 0 : 50;
                const isExpanded = expandedLabel === cat.id;
                const isSmall = width < 15; // Show compact version if less than 15%

                const toggleExpanded = () => {
                  if (isExpanded) {
                    setExpandedLabel(null);
                  } else {
                    setExpandedLabel(cat.id);
                  }
                };

                // Compact label for small sections
                if (isSmall && !isExpanded) {
                  return (
                    <div
                      key={`label-${cat.id}`}
                      data-label-id={cat.id}
                      className="absolute"
                      style={{
                        left: `${xPercent}%`,
                        transform: 'translateX(-50%)',
                        top: `${verticalOffset}px`
                      }}
                    >
                      <button
                        onClick={toggleExpanded}
                        className="bg-white border border-gray-300 rounded px-2 py-1 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        title={locale === 'nl' ? 'Klik om uit te klappen' : 'Click to expand'}
                      >
                        <div className="text-xs font-bold text-gray-900">{cat[locale].slice(0, 3)}.</div>
                        <div className="text-xs text-gray-600">{width.toFixed(1)}%</div>
                      </button>
                    </div>
                  );
                }

                // Expanded label (shown with high z-index overlay)
                return (
                  <div
                    key={`label-${cat.id}`}
                    data-label-id={cat.id}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${xPercent}%`,
                      transform: 'translateX(-50%)',
                      top: `${verticalOffset}px`,
                      zIndex: isExpanded ? 50 : 1
                    }}
                  >
                    {isExpanded && (
                      <button
                        onClick={toggleExpanded}
                        className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-900 z-10"
                        title={locale === 'nl' ? 'Sluiten' : 'Close'}
                      >
                        ×
                      </button>
                    )}
                    <div
                      className={`p-2 ${isExpanded ? 'bg-white rounded-lg border-2 border-gray-300 shadow-lg ring-2 ring-primary' : ''}`}
                      onClick={isSmall && !isExpanded ? toggleExpanded : undefined}
                      style={{ cursor: isSmall && !isExpanded ? 'pointer' : 'default' }}
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
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex justify-center mb-lg">
          <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 ${
                  selectedPreset === preset.id
                    ? 'bg-gradient-3-mid text-gray-900 shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {preset[locale]}
              </button>
            ))}
          </div>
        </div>

        {/* FSI and Housing Categories Sections */}
        <div className="flex justify-center">
          <div className="w-[1200px] space-y-4">

            {/* FSI Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowFsiSection(!showFsiSection)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-900">
                  {locale === 'nl' ? 'Bebouwingsintensiteit (FSI)' : 'Floor Space Index (FSI)'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showFsiSection ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showFsiSection && (
                <div className="p-4 space-y-4">
                  {/* FSI Source Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {addressDensity !== undefined ? (
                      <span title={`${locale === 'nl' ? 'Omgevingsadressendichtheid' : 'Address density'}: ${Math.round(addressDensity)} ${locale === 'nl' ? 'adressen/km²' : 'addresses/km²'}`}>
                        {locale === 'nl'
                          ? `Berekend op basis van omgevingsadressendichtheid (${Math.round(addressDensity)}/km²)`
                          : `Calculated from address density (${Math.round(addressDensity)}/km²)`}
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        {locale === 'nl'
                          ? 'Geen adresdata beschikbaar - standaardwaarde gebruikt'
                          : 'No address data available - using default value'}
                      </span>
                    )}
                  </div>

                  {/* FSI Input with Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 w-24">FSI:</label>
                      <input
                        type="number"
                        value={finalFSI.toFixed(1)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 6) {
                            setFsiOverride(value);
                          }
                        }}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                        max="6"
                        step="0.1"
                      />
                      <div className="flex-1">
                        {/* Custom slider with recommended range indicator */}
                        <div className="relative">
                          {/* Slider track background */}
                          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-gray-200 rounded-lg" />

                          {/* Recommended range indicator (±0.5 around calculated FSI) */}
                          {fsiResult && (
                            <>
                              {/* Recommended range band */}
                              <div
                                className="absolute top-1/2 -translate-y-1/2 h-2 bg-green-200 rounded-lg"
                                style={{
                                  left: `${Math.max(0, ((Math.max(0.2, fsiResult.calculatedFSI - 0.5) - 0.2) / 4.8) * 100)}%`,
                                  right: `${Math.max(0, 100 - ((Math.min(5, fsiResult.calculatedFSI + 0.5) - 0.2) / 4.8) * 100)}%`,
                                }}
                                title={locale === 'nl' ? `Aanbevolen bereik: ${(fsiResult.calculatedFSI - 0.5).toFixed(1)} - ${(fsiResult.calculatedFSI + 0.5).toFixed(1)}` : `Recommended range: ${(fsiResult.calculatedFSI - 0.5).toFixed(1)} - ${(fsiResult.calculatedFSI + 0.5).toFixed(1)}`}
                              />

                              {/* Calculated FSI marker (triangle pointer) */}
                              <div
                                className="absolute -top-2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
                                style={{
                                  left: `${((fsiResult.calculatedFSI - 0.2) / 4.8) * 100}%`,
                                }}
                              >
                                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-600" />
                              </div>
                            </>
                          )}

                          {/* Actual range slider */}
                          <input
                            type="range"
                            value={finalFSI}
                            onChange={(e) => setFsiOverride(parseFloat(e.target.value))}
                            className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                            min="0.2"
                            max="5"
                            step="0.1"
                          />
                        </div>

                        {/* Scale labels */}
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>0.2</span>
                          <span>1.0</span>
                          <span>2.0</span>
                          <span>3.5</span>
                          <span>5.0</span>
                        </div>

                        {/* Recommended FSI legend */}
                        {fsiResult && (
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-green-600" />
                              <span className="text-gray-600">
                                {locale === 'nl' ? `Berekend: ${fsiResult.calculatedFSI.toFixed(1)}` : `Calculated: ${fsiResult.calculatedFSI.toFixed(1)}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-2 bg-green-200 rounded" />
                              <span className="text-gray-600">
                                {locale === 'nl' ? 'Aanbevolen bereik' : 'Recommended range'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FSI Category Indicator */}
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      fsiCategory === 'low' ? 'bg-green-100 text-green-800' :
                      fsiCategory === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {fsiCategoryLabel}
                    </div>
                    <div className="text-sm text-gray-600">
                      {locale === 'nl' ? 'Woningtypologie:' : 'Housing type:'} <span className="font-medium">{housingTypeLabel}</span>
                    </div>
                  </div>

                  {/* FSI Recommendation */}
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {housingRecommendation}
                  </div>

                  {/* Reset FSI Override Button */}
                  {fsiOverride !== null && fsiResult && (
                    <button
                      onClick={() => setFsiOverride(null)}
                      className="text-sm text-primary hover:text-primary-dark underline"
                    >
                      {locale === 'nl'
                        ? `Terugzetten naar berekende waarde (${fsiResult.calculatedFSI.toFixed(1)})`
                        : `Reset to calculated value (${fsiResult.calculatedFSI.toFixed(1)})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Housing Categories Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowHousingSection(!showHousingSection)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-900">
                  {locale === 'nl' ? 'Woningcategorieën (Residentieel)' : 'Housing Categories (Residential)'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showHousingSection ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHousingSection && (
                <div className="p-4 space-y-4">
                  {/* Residential m² info */}
                  <div className="text-sm text-gray-600">
                    {locale === 'nl'
                      ? `Verdeling van het woonprogramma (totaal: ${residentialM2.toLocaleString()} m²)`
                      : `Distribution of residential program (total: ${residentialM2.toLocaleString()} m²)`}
                  </div>

                  {/* Housing Category Inputs */}
                  <div className="space-y-3">
                    {/* Social Housing */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 w-32">
                        {locale === 'nl' ? 'Sociaal' : 'Social'}:
                      </label>
                      <input
                        type="number"
                        value={housingCategories.social ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          setHousingCategories(prev => ({ ...prev, social: value }));
                        }}
                        placeholder={locale === 'nl' ? 'Niet verplicht' : 'Not required'}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      {housingCategories.social !== null && (
                        <span className="text-sm text-gray-600">
                          ({Math.round((housingCategories.social / 100) * residentialM2).toLocaleString()} m²)
                        </span>
                      )}
                    </div>

                    {/* Affordable Housing */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 w-32">
                        {locale === 'nl' ? 'Betaalbaar' : 'Affordable'}:
                      </label>
                      <input
                        type="number"
                        value={housingCategories.affordable ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          setHousingCategories(prev => ({ ...prev, affordable: value }));
                        }}
                        placeholder={locale === 'nl' ? 'Niet verplicht' : 'Not required'}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      {housingCategories.affordable !== null && (
                        <span className="text-sm text-gray-600">
                          ({Math.round((housingCategories.affordable / 100) * residentialM2).toLocaleString()} m²)
                        </span>
                      )}
                    </div>

                    {/* Luxury Housing */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700 w-32">
                        {locale === 'nl' ? 'Luxe' : 'Luxury'}:
                      </label>
                      <input
                        type="number"
                        value={housingCategories.luxury ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                          setHousingCategories(prev => ({ ...prev, luxury: value }));
                        }}
                        placeholder={locale === 'nl' ? 'Niet verplicht' : 'Not required'}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      {housingCategories.luxury !== null && (
                        <span className="text-sm text-gray-600">
                          ({Math.round((housingCategories.luxury / 100) * residentialM2).toLocaleString()} m²)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Validation Error */}
                  {!housingValidation.isValid && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {housingValidation.errors.map((error, idx) => (
                        <p key={idx}>{error}</p>
                      ))}
                    </div>
                  )}

                  {/* Visual Bar for Housing Distribution */}
                  <div className="space-y-2">
                    <div className="h-6 rounded-full overflow-hidden bg-gray-200 flex">
                      {housingCategories.social !== null && housingCategories.social > 0 && (
                        <div
                          className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${housingCategories.social}%` }}
                          title={locale === 'nl' ? `Sociaal: ${housingCategories.social}%` : `Social: ${housingCategories.social}%`}
                        >
                          {housingCategories.social >= 10 && `${housingCategories.social}%`}
                        </div>
                      )}
                      {housingCategories.affordable !== null && housingCategories.affordable > 0 && (
                        <div
                          className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${housingCategories.affordable}%` }}
                          title={locale === 'nl' ? `Betaalbaar: ${housingCategories.affordable}%` : `Affordable: ${housingCategories.affordable}%`}
                        >
                          {housingCategories.affordable >= 10 && `${housingCategories.affordable}%`}
                        </div>
                      )}
                      {housingCategories.luxury !== null && housingCategories.luxury > 0 && (
                        <div
                          className="bg-purple-500 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${housingCategories.luxury}%` }}
                          title={locale === 'nl' ? `Luxe: ${housingCategories.luxury}%` : `Luxury: ${housingCategories.luxury}%`}
                        >
                          {housingCategories.luxury >= 10 && `${housingCategories.luxury}%`}
                        </div>
                      )}
                      {unallocatedPercentage > 0 && (
                        <div
                          className="bg-gray-400 flex items-center justify-center text-xs text-white font-medium"
                          style={{ width: `${unallocatedPercentage}%` }}
                          title={locale === 'nl' ? `Vrij: ${unallocatedPercentage}%` : `Free: ${unallocatedPercentage}%`}
                        >
                          {unallocatedPercentage >= 10 && `${unallocatedPercentage}%`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs">
                      {housingCategories.social !== null && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-blue-500"></div>
                          <span>{locale === 'nl' ? 'Sociaal' : 'Social'}</span>
                        </div>
                      )}
                      {housingCategories.affordable !== null && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-green-500"></div>
                          <span>{locale === 'nl' ? 'Betaalbaar' : 'Affordable'}</span>
                        </div>
                      )}
                      {housingCategories.luxury !== null && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-purple-500"></div>
                          <span>{locale === 'nl' ? 'Luxe' : 'Luxury'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gray-400"></div>
                        <span>{locale === 'nl' ? 'Vrij in te vullen' : 'Free to allocate'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {locale === 'nl'
                          ? 'Bij de scenariogeneratie wordt per scenario aangegeven of dit aan de gestelde eisen voldoet. Lege velden kunnen vrij worden ingevuld door het systeem.'
                          : 'During scenario generation, each scenario will indicate whether it meets the specified requirements. Empty fields can be freely filled by the system.'}
                      </span>
                    </div>
                  </div>

                  {/* Reset to Defaults Button */}
                  <button
                    onClick={() => setHousingCategories(DEFAULT_HOUSING_CATEGORIES)}
                    className="text-sm text-primary hover:text-primary-dark underline"
                  >
                    {locale === 'nl' ? 'Terugzetten naar standaardwaarden' : 'Reset to default values'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PVEQuestionnaire;
