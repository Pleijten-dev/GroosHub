/**
 * Project Picker Component
 *
 * Multi-select dropdown for choosing projects to compare.
 * Allows selecting 2-4 projects from the user's project list.
 *
 * @module features/lca/components/comparison
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
import { MPGScoreBadge } from '../ui/MPGScoreBadge';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ProjectOption {
  id: string;
  name: string;
  building_type: string;
  construction_system: string;
  gross_floor_area: number;
  total_gwp_per_m2_year: number | null;
  is_compliant: boolean | null;
  updated_at: string;
}

export interface ProjectPickerProps {
  /** Available projects to choose from */
  projects: ProjectOption[];
  /** Currently selected project IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (ids: string[]) => void;
  /** Minimum number of projects to select */
  minSelection?: number;
  /** Maximum number of projects to select */
  maxSelection?: number;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Is loading projects */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    selectProjects: 'Selecteer projecten',
    selected: 'geselecteerd',
    search: 'Zoek projecten...',
    noProjects: 'Geen projecten gevonden',
    loading: 'Projecten laden...',
    minSelection: 'Selecteer minimaal',
    maxSelection: 'Maximaal',
    projects: 'projecten',
    clear: 'Wissen',
    notCalculated: 'Niet berekend',
    gfa: 'BVO',
  },
  en: {
    selectProjects: 'Select projects',
    selected: 'selected',
    search: 'Search projects...',
    noProjects: 'No projects found',
    loading: 'Loading projects...',
    minSelection: 'Select at least',
    maxSelection: 'Maximum',
    projects: 'projects',
    clear: 'Clear',
    notCalculated: 'Not calculated',
    gfa: 'GFA',
  },
};

const BUILDING_TYPES: Record<string, { nl: string; en: string }> = {
  vrijstaand: { nl: 'Vrijstaand', en: 'Detached' },
  twee_onder_een_kap: { nl: 'Twee-onder-een-kap', en: 'Semi-detached' },
  rijwoning: { nl: 'Rijwoning', en: 'Terraced' },
  appartement: { nl: 'Appartement', en: 'Apartment' },
};

// ============================================
// COMPONENT
// ============================================

export function ProjectPicker({
  projects,
  selectedIds,
  onSelectionChange,
  minSelection = 2,
  maxSelection = 4,
  locale = 'nl',
  isLoading = false,
  className,
}: ProjectPickerProps) {
  const t = TRANSLATIONS[locale];
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter projects based on search
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected projects
  const selectedProjects = projects.filter((p) => selectedIds.includes(p.id));

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    if (selectedIds.includes(projectId)) {
      // Remove if already selected
      onSelectionChange(selectedIds.filter((id) => id !== projectId));
    } else if (selectedIds.length < maxSelection) {
      // Add if under max
      onSelectionChange([...selectedIds, projectId]);
    }
  };

  // Clear all selections
  const clearSelection = () => {
    onSelectionChange([]);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg border text-left',
          'transition-all bg-white',
          isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <div className="flex-1">
          {selectedIds.length === 0 ? (
            <span className="text-gray-500">{t.selectProjects}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedProjects.map((project) => (
                <span
                  key={project.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm"
                >
                  {project.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProject(project.id);
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <span className="text-xs text-gray-500">
              {selectedIds.length}/{maxSelection} {t.selected}
            </span>
          )}
          <svg
            className={cn('w-5 h-5 text-gray-400 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-100">
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
                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          {/* Selection info */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {t.minSelection} {minSelection}, {t.maxSelection.toLowerCase()} {maxSelection} {t.projects}
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {t.clear}
              </button>
            )}
          </div>

          {/* Projects list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-6 text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">{t.loading}</span>
                </div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex items-center justify-center p-6 text-gray-500 text-sm">
                {t.noProjects}
              </div>
            ) : (
              <ul className="py-1">
                {filteredProjects.map((project) => {
                  const isSelected = selectedIds.includes(project.id);
                  const isDisabled = !isSelected && selectedIds.length >= maxSelection;

                  return (
                    <li
                      key={project.id}
                      onClick={() => !isDisabled && toggleProject(project.id)}
                      className={cn(
                        'px-3 py-2.5 cursor-pointer transition-colors',
                        isSelected && 'bg-primary/5',
                        !isSelected && !isDisabled && 'hover:bg-gray-50',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div
                          className={cn(
                            'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-gray-300'
                          )}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Project info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{project.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span>{BUILDING_TYPES[project.building_type]?.[locale] || project.building_type}</span>
                            <span className="text-gray-300">|</span>
                            <span>{t.gfa}: {project.gross_floor_area.toLocaleString()} m²</span>
                          </div>
                        </div>

                        {/* MPG Score */}
                        <div className="flex-shrink-0">
                          {project.total_gwp_per_m2_year !== null ? (
                            <MPGScoreBadge
                              score={project.total_gwp_per_m2_year}
                              isCompliant={project.is_compliant ?? false}
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">{t.notCalculated}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ProjectPicker.displayName = 'ProjectPicker';

export default ProjectPicker;
