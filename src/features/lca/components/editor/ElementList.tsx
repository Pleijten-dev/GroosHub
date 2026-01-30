/**
 * Element List Component
 *
 * Displays all building elements in an LCA project with:
 * - Category icons with color coding
 * - Element name and area (m²)
 * - Carbon totals per element
 * - Edit/delete actions
 * - Add new element button
 *
 * @module features/lca/components/editor
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { ElementCategoryIcon } from '@/features/lca/components/ui';
import type { ElementWithLayers, ElementCategory } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ElementListProps {
  /** List of elements with their layers */
  elements: ElementWithLayers[];
  /** Currently selected element ID */
  selectedElementId?: string;
  /** Callback when an element is selected */
  onSelectElement: (elementId: string) => void;
  /** Callback when add element button is clicked */
  onAddElement: () => void;
  /** Callback when edit element button is clicked */
  onEditElement: (elementId: string) => void;
  /** Callback when delete element button is clicked */
  onDeleteElement: (elementId: string) => void;
  /** Whether the list is in loading state */
  isLoading?: boolean;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    title: 'Bouwelementen',
    addElement: 'Element toevoegen',
    noElements: 'Geen elementen',
    noElementsDescription: 'Voeg een eerste element toe aan dit project.',
    edit: 'Bewerken',
    delete: 'Verwijderen',
    layers: 'lagen',
    layer: 'laag',
    totalCarbon: 'Totaal CO₂',
    loading: 'Elementen laden...',
    confirmDelete: 'Weet je zeker dat je dit element wilt verwijderen?',
  },
  en: {
    title: 'Building Elements',
    addElement: 'Add Element',
    noElements: 'No elements',
    noElementsDescription: 'Add a first element to this project.',
    edit: 'Edit',
    delete: 'Delete',
    layers: 'layers',
    layer: 'layer',
    totalCarbon: 'Total CO₂',
    loading: 'Loading elements...',
    confirmDelete: 'Are you sure you want to delete this element?',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate total GWP for an element (sum of all phases)
 */
function calculateElementTotalGwp(element: ElementWithLayers): number {
  const a1a3 = element.total_gwp_a1_a3 || 0;
  const a4 = element.total_gwp_a4 || 0;
  const a5 = element.total_gwp_a5 || 0;
  const b4 = element.total_gwp_b4 || 0;
  const c = element.total_gwp_c || 0;
  const d = element.total_gwp_d || 0;

  return a1a3 + a4 + a5 + b4 + c + d;
}

/**
 * Format number with appropriate precision
 */
function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(1);
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface ElementRowProps {
  element: ElementWithLayers;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  locale: 'nl' | 'en';
}

function ElementRow({
  element,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  locale,
}: ElementRowProps) {
  const t = TRANSLATIONS[locale];
  const [showActions, setShowActions] = useState(false);
  const totalGwp = calculateElementTotalGwp(element);
  const layerCount = element.layers?.length || 0;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
        'hover:border-primary/50 hover:bg-gray-50',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-gray-200 bg-white'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-selected={isSelected}
    >
      {/* Category Icon */}
      <div className="flex-shrink-0">
        <ElementCategoryIcon
          category={element.category as ElementCategory}
          size="md"
          colorVariant={isSelected ? 'accent' : 'default'}
        />
      </div>

      {/* Element Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {element.name}
          </span>
          {element.sfb_code && (
            <span className="text-xs text-gray-400 font-mono">
              [{element.sfb_code}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
          <span>
            {element.quantity} {element.quantity_unit}
          </span>
          <span className="text-gray-300">|</span>
          <span>
            {layerCount} {layerCount === 1 ? t.layer : t.layers}
          </span>
        </div>
      </div>

      {/* Carbon Total */}
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-semibold text-gray-900">
          {formatNumber(totalGwp)}
        </div>
        <div className="text-xs text-gray-500">kg CO₂-eq</div>
      </div>

      {/* Action Buttons (visible on hover) */}
      <div
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 transition-opacity',
          showActions ? 'opacity-100' : 'opacity-0'
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={cn(
            'p-1.5 rounded-base text-gray-400 hover:text-primary hover:bg-primary/10',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50'
          )}
          aria-label={t.edit}
          title={t.edit}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t.confirmDelete)) {
              onDelete();
            }
          }}
          className={cn(
            'p-1.5 rounded-base text-gray-400 hover:text-red-600 hover:bg-red-50',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50'
          )}
          aria-label={t.delete}
          title={t.delete}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * Element List Component
 *
 * @example
 * ```tsx
 * <ElementList
 *   elements={projectElements}
 *   selectedElementId={selectedId}
 *   onSelectElement={(id) => setSelectedId(id)}
 *   onAddElement={() => setShowAddModal(true)}
 *   onEditElement={(id) => handleEdit(id)}
 *   onDeleteElement={(id) => handleDelete(id)}
 *   locale="nl"
 * />
 * ```
 */
export function ElementList({
  elements,
  selectedElementId,
  onSelectElement,
  onAddElement,
  onEditElement,
  onDeleteElement,
  isLoading = false,
  locale = 'nl',
  className,
}: ElementListProps) {
  const t = TRANSLATIONS[locale];

  // ============================================
  // RENDER - LOADING
  // ============================================

  if (isLoading) {
    return (
      <div className={cn('rounded-lg bg-white shadow', className)}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">{t.title}</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-2 h-6 w-6 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{t.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - EMPTY STATE
  // ============================================

  if (elements.length === 0) {
    return (
      <div className={cn('rounded-lg bg-white shadow', className)}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold text-gray-900">{t.title}</h3>
          <button
            type="button"
            onClick={onAddElement}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-base px-3 py-1.5',
              'text-sm font-medium text-white bg-primary hover:bg-primary/90',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t.addElement}
          </button>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h4 className="mb-1 font-medium text-gray-900">{t.noElements}</h4>
          <p className="mb-4 text-sm text-gray-500">{t.noElementsDescription}</p>
          <button
            type="button"
            onClick={onAddElement}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-base px-4 py-2',
              'text-sm font-medium text-white bg-primary hover:bg-primary/90',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t.addElement}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - ELEMENT LIST
  // ============================================

  // Calculate total carbon for all elements
  const totalProjectCarbon = elements.reduce(
    (sum, el) => sum + calculateElementTotalGwp(el),
    0
  );

  return (
    <div className={cn('rounded-lg bg-white shadow', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="font-semibold text-gray-900">{t.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.totalCarbon}: {formatNumber(totalProjectCarbon)} kg CO₂-eq
          </p>
        </div>
        <button
          type="button"
          onClick={onAddElement}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-base px-3 py-1.5',
            'text-sm font-medium text-white bg-primary hover:bg-primary/90',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t.addElement}
        </button>
      </div>

      {/* Element List */}
      <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
        {elements.map((element) => (
          <ElementRow
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            onSelect={() => onSelectElement(element.id)}
            onEdit={() => onEditElement(element.id)}
            onDelete={() => onDeleteElement(element.id)}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

ElementList.displayName = 'ElementList';

export default ElementList;
