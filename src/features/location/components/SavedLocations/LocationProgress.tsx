// src/features/location/components/SavedLocations/LocationProgress.tsx
'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import type { CompletionStatus } from '../../types/saved-locations';
import type { Locale } from '@/lib/i18n/config';

interface LocationProgressProps {
  completionStatus: CompletionStatus;
  locale: Locale;
  variant?: 'full' | 'compact';
}

interface ProgressStep {
  key: string;
  label: { nl: string; en: string };
  icon: string;
  completed: boolean;
}

/**
 * Visual progress indicator for saved location workflow
 */
export const LocationProgress: React.FC<LocationProgressProps> = ({
  completionStatus,
  locale,
  variant = 'full',
}) => {
  // Calculate progress percentage
  const progressMap: Record<CompletionStatus, number> = {
    location_only: 25,
    with_personas: 50,
    with_pve: 50,
    with_personas_pve: 75,
    complete: 100,
  };

  const percentage = progressMap[completionStatus] || 0;

  // Define workflow steps
  const steps: ProgressStep[] = [
    {
      key: 'location',
      label: { nl: 'Locatie', en: 'Location' },
      icon: '📍',
      completed: true, // Always completed if saved
    },
    {
      key: 'personas',
      label: { nl: 'Personas', en: 'Personas' },
      icon: '👥',
      completed: completionStatus === 'with_personas' ||
                 completionStatus === 'with_personas_pve' ||
                 completionStatus === 'complete',
    },
    {
      key: 'pve',
      label: { nl: 'PVE', en: 'PVE' },
      icon: '📋',
      completed: completionStatus === 'with_pve' ||
                 completionStatus === 'with_personas_pve' ||
                 completionStatus === 'complete',
    },
    {
      key: 'rapport',
      label: { nl: 'Rapport', en: 'Report' },
      icon: '📄',
      completed: completionStatus === 'complete',
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;

  if (variant === 'compact') {
    return (
      <div className="space-y-xs">
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute top-0 left-0 h-full rounded-full transition-all duration-normal',
              percentage === 100 ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Step Counter */}
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>
            {completedSteps}/{totalSteps} {locale === 'nl' ? 'voltooid' : 'complete'}
          </span>
          <span className={cn(
            'font-medium',
            percentage === 100 ? 'text-green-600' : 'text-primary'
          )}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  }

  // Full variant with step icons
  return (
    <div className="space-y-sm">
      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'absolute top-0 left-0 h-full rounded-full transition-all duration-normal',
            percentage === 100
              ? 'bg-gradient-to-r from-green-400 to-green-600'
              : 'bg-gradient-to-r from-primary to-secondary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-xs">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className="flex flex-col items-center flex-1 min-w-0"
          >
            {/* Icon Circle */}
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-fast mb-xs',
                step.completed
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-200 text-gray-400'
              )}
            >
              {step.completed ? '✓' : step.icon}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[9px] text-center truncate w-full',
                step.completed ? 'text-text-primary font-medium' : 'text-text-muted'
              )}
            >
              {step.label[locale]}
            </span>
          </div>
        ))}
      </div>

      {/* Percentage Display */}
      <div className="text-center">
        <span
          className={cn(
            'text-xs font-semibold',
            percentage === 100 ? 'text-green-600' : 'text-primary'
          )}
        >
          {percentage === 100
            ? locale === 'nl'
              ? '✓ Voltooid'
              : '✓ Complete'
            : `${percentage}% ${locale === 'nl' ? 'voltooid' : 'complete'}`}
        </span>
      </div>
    </div>
  );
};

export default LocationProgress;
