/**
 * Material Selector Component
 *
 * Searchable dropdown for selecting materials from the EPD database.
 * Features:
 * - Search by name (NL/EN/DE)
 * - Filter by category
 * - Display GWP value and quality rating
 * - Show material benchmarks
 *
 * @module features/lca/components/editor
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/shared/utils/cn';
import type { Material } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MaterialSelectorProps {
  /** Currently selected material */
  selectedMaterial?: Material | null;
  /** Callback when a material is selected */
  onSelectMaterial: (material: Material) => void;
  /** Category to filter by (optional) */
  categoryFilter?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
}

interface MaterialOption {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  gwp_a1_a3: number;
  quality_rating: number;
  density: number | null;
  declared_unit: string;
  is_generic: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    search: 'Zoek materiaal...',
    noResults: 'Geen materialen gevonden',
    loading: 'Materialen laden...',
    allCategories: 'Alle categorieën',
    gwp: 'GWP',
    quality: 'Kwaliteit',
    generic: 'Generiek',
    specific: 'Specifiek',
    selected: 'Geselecteerd',
    selectMaterial: 'Selecteer materiaal',
  },
  en: {
    search: 'Search material...',
    noResults: 'No materials found',
    loading: 'Loading materials...',
    allCategories: 'All categories',
    gwp: 'GWP',
    quality: 'Quality',
    generic: 'Generic',
    specific: 'Specific',
    selected: 'Selected',
    selectMaterial: 'Select material',
  },
};

const CATEGORY_TRANSLATIONS: Record<string, { nl: string; en: string }> = {
  insulation: { nl: 'Isolatie', en: 'Insulation' },
  concrete: { nl: 'Beton', en: 'Concrete' },
  timber: { nl: 'Hout', en: 'Timber' },
  masonry: { nl: 'Metselwerk', en: 'Masonry' },
  metal: { nl: 'Metaal', en: 'Metal' },
  glass: { nl: 'Glas', en: 'Glass' },
  finishes: { nl: 'Afwerking', en: 'Finishes' },
  roofing: { nl: 'Dakbedekking', en: 'Roofing' },
  hvac: { nl: 'HVAC', en: 'HVAC' },
  plaster: { nl: 'Pleisterwerk', en: 'Plaster' },
  paint: { nl: 'Verf', en: 'Paint' },
  flooring: { nl: 'Vloerbedekking', en: 'Flooring' },
  membranes: { nl: 'Membranen', en: 'Membranes' },
  adhesives: { nl: 'Lijmen', en: 'Adhesives' },
  other: { nl: 'Overig', en: 'Other' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getMaterialName(material: MaterialOption, locale: 'nl' | 'en'): string {
  // Prefer locale-specific name, fall back to others
  const m = material as unknown as Material;
  if (locale === 'nl' && m.name_nl) return m.name_nl;
  if (locale === 'en' && m.name_en) return m.name_en;
  return m.name_de || material.name || 'Unknown Material';
}

function formatGwp(gwp: number): string {
  if (gwp >= 100) return gwp.toFixed(0);
  if (gwp >= 10) return gwp.toFixed(1);
  return gwp.toFixed(2);
}

function getQualityStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ============================================
// COMPONENT
// ============================================

/**
 * Material Selector Component
 *
 * @example
 * ```tsx
 * <MaterialSelector
 *   selectedMaterial={selectedMaterial}
 *   onSelectMaterial={(material) => setSelectedMaterial(material)}
 *   categoryFilter="insulation"
 *   locale="nl"
 * />
 * ```
 */
export function MaterialSelector({
  selectedMaterial,
  onSelectMaterial,
  categoryFilter,
  placeholder,
  disabled = false,
  locale = 'nl',
  className,
}: MaterialSelectorProps) {
  const t = TRANSLATIONS[locale];
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================
  // STATE
  // ============================================

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter || '');
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // ============================================
  // DATA FETCHING
  // ============================================

  // Fetch materials based on search and category
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('limit', '50');
      params.set('dutch_only', 'true');

      const response = await fetch(`/api/lca/materials?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMaterials(data.data);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/lca/materials', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    fetchCategories();
  }, []);

  // Debounced material search
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchMaterials();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedCategory, isOpen, fetchMaterials]);

  // ============================================
  // CLICK OUTSIDE HANDLING
  // ============================================

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, materials.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && materials[highlightedIndex]) {
          onSelectMaterial(materials[highlightedIndex] as unknown as Material);
          setIsOpen(false);
          setSearchQuery('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Selected Material / Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-base border text-left',
          'transition-all',
          isOpen
            ? 'border-primary ring-1 ring-primary'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedMaterial ? (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {getMaterialName(selectedMaterial as unknown as MaterialOption, locale)}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{CATEGORY_TRANSLATIONS[selectedMaterial.category]?.[locale] || selectedMaterial.category}</span>
              <span className="text-gray-300">|</span>
              <span>GWP: {formatGwp(selectedMaterial.gwp_a1_a3)} kg CO₂-eq</span>
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder || t.selectMaterial}</span>
        )}
        <svg
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute z-50 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg',
          'max-h-[400px] overflow-hidden flex flex-col'
        )}>
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className={cn(
                  'w-full pl-9 pr-3 py-2 rounded-base border border-gray-200',
                  'text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                )}
                autoFocus
              />
            </div>
          </div>

          {/* Category Filter */}
          {!categoryFilter && categories.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={cn(
                  'w-full px-3 py-1.5 rounded-base border border-gray-200',
                  'text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              >
                <option value="">{t.allCategories}</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {CATEGORY_TRANSLATIONS[cat.category]?.[locale] || cat.category} ({cat.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Materials List */}
          <div className="flex-1 overflow-y-auto" role="listbox">
            {isLoading ? (
              <div className="flex items-center justify-center p-6 text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">{t.loading}</span>
                </div>
              </div>
            ) : materials.length === 0 ? (
              <div className="flex items-center justify-center p-6 text-gray-500 text-sm">
                {t.noResults}
              </div>
            ) : (
              <ul className="py-1">
                {materials.map((material, index) => (
                  <li
                    key={material.id}
                    role="option"
                    aria-selected={selectedMaterial?.id === material.id}
                    className={cn(
                      'px-3 py-2 cursor-pointer transition-colors',
                      index === highlightedIndex && 'bg-primary/5',
                      selectedMaterial?.id === material.id
                        ? 'bg-primary/10'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => {
                      onSelectMaterial(material as unknown as Material);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {getMaterialName(material, locale)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100">
                            {CATEGORY_TRANSLATIONS[material.category]?.[locale] || material.category}
                          </span>
                          <span>
                            {material.is_generic ? t.generic : t.specific}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatGwp(material.gwp_a1_a3)}
                        </div>
                        <div className="text-xs text-gray-500">kg CO₂-eq</div>
                        <div className="text-xs text-amber-500" title={`${t.quality}: ${material.quality_rating}/5`}>
                          {getQualityStars(material.quality_rating)}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

MaterialSelector.displayName = 'MaterialSelector';

export default MaterialSelector;
