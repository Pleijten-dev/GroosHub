/**
 * Comparison Table Component
 *
 * Displays a side-by-side comparison of key metrics for selected projects.
 * Highlights the best performer for each metric.
 *
 * @module features/lca/components/comparison
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import { MPGScoreBadge } from '../ui/MPGScoreBadge';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ComparisonProject {
  id: string;
  name: string;
  building_type: string;
  construction_system: string;
  gross_floor_area: number;
  study_period: number;
  total_gwp_a1_a3: number | null;
  total_gwp_a4: number | null;
  total_gwp_a5: number | null;
  total_gwp_b4: number | null;
  total_gwp_c: number | null;
  total_gwp_d: number | null;
  total_gwp_per_m2_year: number | null;
  is_compliant: boolean | null;
  mpg_reference_value: number | null;
}

export interface ComparisonTableProps {
  /** Projects to compare */
  projects: ComparisonProject[];
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
    metric: 'Metriek',
    mpgScore: 'MPG Score',
    compliance: 'Voldoet',
    gfa: 'Bruto Vloeroppervlak',
    buildingType: 'Gebouwtype',
    constructionSystem: 'Bouwsysteem',
    studyPeriod: 'Studieperiode',
    totalEmbodied: 'Totale Embodied Carbon',
    phaseA1A3: 'Productie (A1-A3)',
    phaseA4: 'Transport (A4)',
    phaseA5: 'Bouw (A5)',
    phaseB4: 'Vervanging (B4)',
    phaseC: 'Einde levensduur (C)',
    phaseD: 'Voordelen (D)',
    years: 'jaar',
    yes: 'Ja',
    no: 'Nee',
    best: 'Beste',
    notCalculated: 'Niet berekend',
    na: 'N.v.t.',
  },
  en: {
    metric: 'Metric',
    mpgScore: 'MPG Score',
    compliance: 'Compliant',
    gfa: 'Gross Floor Area',
    buildingType: 'Building Type',
    constructionSystem: 'Construction System',
    studyPeriod: 'Study Period',
    totalEmbodied: 'Total Embodied Carbon',
    phaseA1A3: 'Production (A1-A3)',
    phaseA4: 'Transport (A4)',
    phaseA5: 'Construction (A5)',
    phaseB4: 'Replacement (B4)',
    phaseC: 'End of Life (C)',
    phaseD: 'Benefits (D)',
    years: 'years',
    yes: 'Yes',
    no: 'No',
    best: 'Best',
    notCalculated: 'Not calculated',
    na: 'N/A',
  },
};

const BUILDING_TYPES: Record<string, { nl: string; en: string }> = {
  vrijstaand: { nl: 'Vrijstaand', en: 'Detached' },
  twee_onder_een_kap: { nl: 'Twee-onder-een-kap', en: 'Semi-detached' },
  rijwoning: { nl: 'Rijwoning', en: 'Terraced' },
  appartement: { nl: 'Appartement', en: 'Apartment' },
};

const CONSTRUCTION_SYSTEMS: Record<string, { nl: string; en: string }> = {
  houtskelet: { nl: 'Houtskeletbouw', en: 'Timber Frame' },
  clt: { nl: 'CLT / Massief hout', en: 'CLT' },
  metselwerk: { nl: 'Metselwerk', en: 'Masonry' },
  beton: { nl: 'Betonbouw', en: 'Concrete' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format number with locale-specific formatting
 */
function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Find the best (lowest) value among projects for a metric
 */
function findBestValue(projects: ComparisonProject[], getValue: (p: ComparisonProject) => number | null): number | null {
  const values = projects.map(getValue).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.min(...values);
}

/**
 * Check if a value is the best for its category (lower is better)
 */
function isBestValue(value: number | null, bestValue: number | null): boolean {
  if (value === null || bestValue === null) return false;
  return Math.abs(value - bestValue) < 0.001;
}

// ============================================
// COMPONENT
// ============================================

export function ComparisonTable({
  projects,
  locale = 'nl',
  className,
}: ComparisonTableProps) {
  const t = TRANSLATIONS[locale];

  if (projects.length === 0) {
    return null;
  }

  // Calculate best values for highlighting
  const bestMpg = findBestValue(projects, (p) => p.total_gwp_per_m2_year);
  const bestA1A3 = findBestValue(projects, (p) => p.total_gwp_a1_a3);
  const bestA4 = findBestValue(projects, (p) => p.total_gwp_a4);
  const bestA5 = findBestValue(projects, (p) => p.total_gwp_a5);
  const bestB4 = findBestValue(projects, (p) => p.total_gwp_b4);
  const bestC = findBestValue(projects, (p) => p.total_gwp_c);
  // For phase D, most negative is best (most benefits)
  const bestD = (() => {
    const values = projects.map((p) => p.total_gwp_d).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return Math.min(...values);
  })();

  // Calculate total embodied carbon for each project
  const getTotalEmbodied = (p: ComparisonProject) => {
    const values = [p.total_gwp_a1_a3, p.total_gwp_a4, p.total_gwp_a5, p.total_gwp_b4, p.total_gwp_c, p.total_gwp_d];
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return null;
    return validValues.reduce((sum, v) => sum + v, 0);
  };
  const bestTotal = findBestValue(projects, getTotalEmbodied);

  // Metric row renderer
  const renderMetricRow = (
    label: string,
    getValue: (p: ComparisonProject) => React.ReactNode,
    getBestCheck?: (p: ComparisonProject) => boolean
  ) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50/80 sticky left-0">
        {label}
      </td>
      {projects.map((project) => {
        const isBest = getBestCheck ? getBestCheck(project) : false;
        return (
          <td
            key={project.id}
            className={cn(
              'px-4 py-3 text-sm text-center',
              isBest && 'bg-green-50'
            )}
          >
            <div className="flex items-center justify-center gap-1">
              {getValue(project)}
              {isBest && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold" title={t.best}>
                  ✓
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-gray-200', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        {/* Header with project names */}
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
              {t.metric}
            </th>
            {projects.map((project) => (
              <th
                key={project.id}
                className="px-4 py-3 text-center min-w-[180px]"
              >
                <div className="font-semibold text-gray-900">{project.name}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-100">
          {/* MPG Score */}
          {renderMetricRow(
            t.mpgScore,
            (p) =>
              p.total_gwp_per_m2_year !== null ? (
                <MPGScoreBadge
                  score={p.total_gwp_per_m2_year}
                  isCompliant={p.is_compliant ?? false}
                  size="md"
                />
              ) : (
                <span className="text-gray-400">{t.notCalculated}</span>
              ),
            (p) => isBestValue(p.total_gwp_per_m2_year, bestMpg)
          )}

          {/* Compliance */}
          {renderMetricRow(
            t.compliance,
            (p) =>
              p.is_compliant !== null ? (
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    p.is_compliant
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  )}
                >
                  {p.is_compliant ? t.yes : t.no}
                </span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              )
          )}

          {/* Building info section header */}
          <tr className="bg-gray-100/50">
            <td colSpan={projects.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
              {locale === 'nl' ? 'Project Details' : 'Project Details'}
            </td>
          </tr>

          {/* GFA */}
          {renderMetricRow(t.gfa, (p) => (
            <span className="text-gray-900">
              {formatNumber(p.gross_floor_area, 0)} m²
            </span>
          ))}

          {/* Building Type */}
          {renderMetricRow(t.buildingType, (p) => (
            <span className="text-gray-900">
              {BUILDING_TYPES[p.building_type]?.[locale] || p.building_type}
            </span>
          ))}

          {/* Construction System */}
          {renderMetricRow(t.constructionSystem, (p) => (
            <span className="text-gray-900">
              {CONSTRUCTION_SYSTEMS[p.construction_system]?.[locale] || p.construction_system}
            </span>
          ))}

          {/* Study Period */}
          {renderMetricRow(t.studyPeriod, (p) => (
            <span className="text-gray-900">
              {p.study_period} {t.years}
            </span>
          ))}

          {/* LCA Phases section header */}
          <tr className="bg-gray-100/50">
            <td colSpan={projects.length + 1} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
              {locale === 'nl' ? 'LCA Fasen (kg CO₂-eq)' : 'LCA Phases (kg CO₂-eq)'}
            </td>
          </tr>

          {/* Total Embodied */}
          {renderMetricRow(
            t.totalEmbodied,
            (p) => {
              const total = getTotalEmbodied(p);
              return total !== null ? (
                <span className="font-semibold text-gray-900">
                  {formatNumber(total / 1000, 1)} t
                </span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              );
            },
            (p) => isBestValue(getTotalEmbodied(p), bestTotal)
          )}

          {/* Phase A1-A3 */}
          {renderMetricRow(
            t.phaseA1A3,
            (p) =>
              p.total_gwp_a1_a3 !== null ? (
                <span className="text-gray-900">{formatNumber(p.total_gwp_a1_a3 / 1000, 1)} t</span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              ),
            (p) => isBestValue(p.total_gwp_a1_a3, bestA1A3)
          )}

          {/* Phase A4 */}
          {renderMetricRow(
            t.phaseA4,
            (p) =>
              p.total_gwp_a4 !== null ? (
                <span className="text-gray-900">{formatNumber(p.total_gwp_a4 / 1000, 2)} t</span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              ),
            (p) => isBestValue(p.total_gwp_a4, bestA4)
          )}

          {/* Phase A5 */}
          {renderMetricRow(
            t.phaseA5,
            (p) =>
              p.total_gwp_a5 !== null ? (
                <span className="text-gray-900">{formatNumber(p.total_gwp_a5 / 1000, 2)} t</span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              ),
            (p) => isBestValue(p.total_gwp_a5, bestA5)
          )}

          {/* Phase B4 */}
          {renderMetricRow(
            t.phaseB4,
            (p) =>
              p.total_gwp_b4 !== null ? (
                <span className="text-gray-900">{formatNumber(p.total_gwp_b4 / 1000, 1)} t</span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              ),
            (p) => isBestValue(p.total_gwp_b4, bestB4)
          )}

          {/* Phase C */}
          {renderMetricRow(
            t.phaseC,
            (p) =>
              p.total_gwp_c !== null ? (
                <span className="text-gray-900">{formatNumber(p.total_gwp_c / 1000, 2)} t</span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              ),
            (p) => isBestValue(p.total_gwp_c, bestC)
          )}

          {/* Phase D */}
          {renderMetricRow(
            t.phaseD,
            (p) =>
              p.total_gwp_d !== null ? (
                <span className={cn('text-gray-900', p.total_gwp_d < 0 && 'text-green-600')}>
                  {formatNumber(p.total_gwp_d / 1000, 2)} t
                </span>
              ) : (
                <span className="text-gray-400">{t.na}</span>
              ),
            (p) => isBestValue(p.total_gwp_d, bestD)
          )}
        </tbody>
      </table>
    </div>
  );
}

ComparisonTable.displayName = 'ComparisonTable';

export default ComparisonTable;
