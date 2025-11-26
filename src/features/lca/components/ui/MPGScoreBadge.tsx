/**
 * MPG Score Badge Component
 *
 * Displays the MPG (Milieuprestatie Gebouwen) score with visual compliance indicator.
 * Shows three states: compliant (green), warning (yellow), or non-compliant (red).
 *
 * The MPG score represents the environmental impact in kg CO₂-eq/m²/year.
 * Lower scores are better.
 *
 * @module features/lca/components/ui
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MPGScoreBadgeProps {
  /** MPG value in kg CO₂-eq/m²/year */
  score: number;
  /** MPG reference limit for the building type */
  limit: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show text label */
  showLabel?: boolean;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show detailed tooltip */
  showTooltip?: boolean;
}

export type ComplianceStatus = 'compliant' | 'warning' | 'non-compliant';

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    compliant: 'Voldoet',
    warning: 'Grensgeval',
    nonCompliant: 'Voldoet niet',
    mpgScore: 'MPG-score',
    limit: 'Grenswaarde',
    tooltip: {
      compliant: 'Dit project voldoet aan de MPG-eis',
      warning: 'Dit project benadert de MPG-grenswaarde',
      nonCompliant: 'Dit project voldoet niet aan de MPG-eis',
    },
  },
  en: {
    compliant: 'Compliant',
    warning: 'Warning',
    nonCompliant: 'Non-compliant',
    mpgScore: 'MPG Score',
    limit: 'Limit',
    tooltip: {
      compliant: 'This project meets the MPG requirement',
      warning: 'This project is approaching the MPG limit',
      nonCompliant: 'This project does not meet the MPG requirement',
    },
  },
};

// Warning threshold: 90% of limit
const WARNING_THRESHOLD = 0.90;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determines compliance status based on score and limit
 *
 * @param score - The MPG score
 * @param limit - The MPG limit
 * @returns ComplianceStatus
 */
function getComplianceStatus(score: number, limit: number): ComplianceStatus {
  if (score <= limit * WARNING_THRESHOLD) {
    return 'compliant';
  } else if (score <= limit) {
    return 'warning';
  }
  return 'non-compliant';
}

/**
 * Calculates percentage of limit used
 *
 * @param score - The MPG score
 * @param limit - The MPG limit
 * @returns Percentage (0-100+)
 */
function calculatePercentage(score: number, limit: number): number {
  return Math.round((score / limit) * 100);
}

// ============================================
// COMPONENT
// ============================================

/**
 * MPG Score Badge Component
 *
 * @example
 * ```tsx
 * <MPGScoreBadge
 *   score={0.45}
 *   limit={0.60}
 *   size="md"
 *   showLabel={true}
 *   locale="nl"
 * />
 * ```
 */
export function MPGScoreBadge({
  score,
  limit,
  size = 'md',
  showLabel = true,
  locale = 'nl',
  className,
  showTooltip = true,
}: MPGScoreBadgeProps) {
  const status = getComplianceStatus(score, limit);
  const percentage = calculatePercentage(score, limit);
  const t = TRANSLATIONS[locale];

  // ============================================
  // STATUS-BASED STYLES
  // ============================================

  const statusStyles = {
    compliant: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: t.compliant,
      tooltip: t.tooltip.compliant,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
      label: t.warning,
      tooltip: t.tooltip.warning,
    },
    'non-compliant': {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: t.nonCompliant,
      tooltip: t.tooltip.nonCompliant,
    },
  };

  const currentStatus = statusStyles[status];

  // ============================================
  // SIZE-BASED STYLES
  // ============================================

  const sizeStyles = {
    sm: {
      container: 'px-2 py-1 gap-1.5',
      score: 'text-sm font-semibold',
      label: 'text-xs',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      container: 'px-3 py-1.5 gap-2',
      score: 'text-base font-semibold',
      label: 'text-sm',
      dot: 'w-2 h-2',
    },
    lg: {
      container: 'px-4 py-2 gap-2.5',
      score: 'text-lg font-bold',
      label: 'text-base',
      dot: 'w-2.5 h-2.5',
    },
  };

  const currentSize = sizeStyles[size];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={cn(
        // Base styles
        'inline-flex items-center rounded-base border transition-all',

        // Status-based colors
        currentStatus.bg,
        currentStatus.border,
        currentStatus.text,

        // Size-based spacing
        currentSize.container,

        // Custom className
        className
      )}
      title={showTooltip ? currentStatus.tooltip : undefined}
      role="status"
      aria-label={`${t.mpgScore}: ${score.toFixed(2)} / ${t.limit}: ${limit.toFixed(2)} - ${currentStatus.label}`}
    >
      {/* Status indicator dot */}
      <div
        className={cn(
          'rounded-full',
          currentStatus.dot,
          currentSize.dot
        )}
        aria-hidden="true"
      />

      {/* Score value */}
      <div className="flex items-baseline gap-1">
        <span className={currentSize.score}>
          {score.toFixed(2)}
        </span>
        <span className={cn(currentSize.label, 'opacity-75')}>
          / {limit.toFixed(2)}
        </span>
      </div>

      {/* Status label */}
      {showLabel && (
        <>
          <div className="h-4 w-px bg-current opacity-20" aria-hidden="true" />
          <span className={currentSize.label}>
            {currentStatus.label}
          </span>
        </>
      )}

      {/* Percentage badge (for large size) */}
      {size === 'lg' && (
        <div
          className={cn(
            'ml-1 px-2 py-0.5 rounded-sm text-xs font-medium',
            status === 'compliant' && 'bg-green-100 text-green-800',
            status === 'warning' && 'bg-yellow-100 text-yellow-800',
            status === 'non-compliant' && 'bg-red-100 text-red-800'
          )}
        >
          {percentage}%
        </div>
      )}
    </div>
  );
}

MPGScoreBadge.displayName = 'MPGScoreBadge';

export default MPGScoreBadge;
