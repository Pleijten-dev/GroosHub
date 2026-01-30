/**
 * Layer Row Component
 *
 * Single row representing a material layer in an element.
 * Features:
 * - Drag handle for reordering
 * - Material name and GWP display
 * - Thickness and coverage inputs
 * - Delete button
 *
 * @module features/lca/components/editor
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import type { LayerWithMaterial, Material } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LayerRowProps {
  /** Layer data with material information */
  layer: LayerWithMaterial;
  /** Position index (for display) */
  index: number;
  /** Whether this row is being dragged */
  isDragging?: boolean;
  /** Callback when thickness changes */
  onThicknessChange: (layerId: string, thickness: number) => void;
  /** Callback when coverage changes */
  onCoverageChange: (layerId: string, coverage: number) => void;
  /** Callback when delete button is clicked */
  onDelete: (layerId: string) => void;
  /** Callback when material should be changed */
  onChangeMaterial: (layerId: string) => void;
  /** Whether the row is disabled */
  disabled?: boolean;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Drag handle props from dnd-kit or similar */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    layer: 'Laag',
    thickness: 'Dikte',
    thicknessMm: 'mm',
    coverage: 'Dekking',
    coveragePercent: '%',
    gwp: 'GWP',
    changeMaterial: 'Materiaal wijzigen',
    deleteLayer: 'Laag verwijderen',
    dragToReorder: 'Sleep om te herordenen',
  },
  en: {
    layer: 'Layer',
    thickness: 'Thickness',
    thicknessMm: 'mm',
    coverage: 'Coverage',
    coveragePercent: '%',
    gwp: 'GWP',
    changeMaterial: 'Change material',
    deleteLayer: 'Delete layer',
    dragToReorder: 'Drag to reorder',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMaterialName(material: Material, locale: 'nl' | 'en'): string {
  if (locale === 'nl' && material.name_nl) return material.name_nl;
  if (locale === 'en' && material.name_en) return material.name_en;
  return material.name_de || 'Unknown Material';
}

function formatGwp(gwp: number): string {
  if (gwp >= 100) return gwp.toFixed(0);
  if (gwp >= 10) return gwp.toFixed(1);
  return gwp.toFixed(2);
}

// ============================================
// COMPONENT
// ============================================

/**
 * Layer Row Component
 *
 * @example
 * ```tsx
 * <LayerRow
 *   layer={layerData}
 *   index={0}
 *   onThicknessChange={(id, value) => handleThicknessChange(id, value)}
 *   onCoverageChange={(id, value) => handleCoverageChange(id, value)}
 *   onDelete={(id) => handleDeleteLayer(id)}
 *   onChangeMaterial={(id) => handleChangeMaterial(id)}
 *   locale="nl"
 * />
 * ```
 */
export function LayerRow({
  layer,
  index,
  isDragging = false,
  onThicknessChange,
  onCoverageChange,
  onDelete,
  onChangeMaterial,
  disabled = false,
  locale = 'nl',
  dragHandleProps,
}: LayerRowProps) {
  const t = TRANSLATIONS[locale];
  const material = layer.material;

  // Convert thickness from meters to mm for display
  const thicknessMm = Math.round(layer.thickness * 1000);
  const coveragePercent = Math.round(layer.coverage * 100);

  // ============================================
  // HANDLERS
  // ============================================

  function handleThicknessChange(e: React.ChangeEvent<HTMLInputElement>) {
    const mm = parseFloat(e.target.value);
    if (!isNaN(mm) && mm >= 0) {
      onThicknessChange(layer.id, mm / 1000); // Convert mm to meters
    }
  }

  function handleCoverageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const percent = parseFloat(e.target.value);
    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
      onCoverageChange(layer.id, percent / 100); // Convert percent to 0-1
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border p-3 transition-all',
        isDragging
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className={cn(
          'flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded',
          'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
          'transition-colors'
        )}
        title={t.dragToReorder}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Layer Number */}
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
        {index + 1}
      </div>

      {/* Material Info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => !disabled && onChangeMaterial(layer.id)}
        title={t.changeMaterial}
      >
        <div className="font-medium text-gray-900 truncate hover:text-primary transition-colors">
          {getMaterialName(material, locale)}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{material.category}</span>
          {material.is_generic && (
            <>
              <span className="text-gray-300">|</span>
              <span className="px-1 py-0.5 rounded bg-gray-100">Generic</span>
            </>
          )}
        </div>
      </div>

      {/* GWP Value */}
      <div className="flex-shrink-0 text-right w-20">
        <div className="text-sm font-semibold text-gray-900">
          {formatGwp(material.gwp_a1_a3)}
        </div>
        <div className="text-xs text-gray-500">kg CO₂-eq</div>
      </div>

      {/* Thickness Input */}
      <div className="flex-shrink-0 w-24">
        <label className="sr-only">{t.thickness}</label>
        <div className="relative">
          <input
            type="number"
            value={thicknessMm}
            onChange={handleThicknessChange}
            min={0}
            step={1}
            disabled={disabled}
            className={cn(
              'w-full pr-8 pl-2 py-1.5 text-sm text-right rounded-base border border-gray-200',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              'transition-colors'
            )}
            title={t.thickness}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {t.thicknessMm}
          </span>
        </div>
      </div>

      {/* Coverage Input */}
      <div className="flex-shrink-0 w-20">
        <label className="sr-only">{t.coverage}</label>
        <div className="relative">
          <input
            type="number"
            value={coveragePercent}
            onChange={handleCoverageChange}
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            className={cn(
              'w-full pr-6 pl-2 py-1.5 text-sm text-right rounded-base border border-gray-200',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              'transition-colors'
            )}
            title={t.coverage}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {t.coveragePercent}
          </span>
        </div>
      </div>

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => onDelete(layer.id)}
        disabled={disabled}
        className={cn(
          'flex-shrink-0 p-1.5 rounded-base',
          'text-gray-400 hover:text-red-600 hover:bg-red-50',
          'opacity-0 group-hover:opacity-100',
          'transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50'
        )}
        title={t.deleteLayer}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

LayerRow.displayName = 'LayerRow';

export default LayerRow;
