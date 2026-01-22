/**
 * Export Button Component
 * Provides a button to export location data to JSON
 */

'use client';

import React, { useState } from 'react';
import { AlertDialog } from '@/shared/components/UI/Modal/AlertDialog';
import { exportLocationDataToJSON, downloadJSON, type LocationDataExport } from '../../utils/jsonExport';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from '../../utils/targetGroupScoring';

export interface ExportButtonProps {
  data: UnifiedLocationData;
  personaScores: PersonaScore[];
  scenarios: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
  };
  customScenarioPersonaIds?: string[];
  locale: 'nl' | 'en';
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  personaScores,
  scenarios,
  customScenarioPersonaIds = [],
  locale,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  const handleExport = () => {
    try {
      setIsExporting(true);

      // Generate export data
      const exportData = exportLocationDataToJSON(
        data,
        personaScores,
        scenarios,
        customScenarioPersonaIds
      );

      // Generate filename with location and date
      const locationName = data.location.neighborhood?.statnaam ||
                          data.location.district?.statnaam ||
                          data.location.municipality?.statnaam ||
                          'location';
      const date = new Date().toISOString().split('T')[0];
      const filename = `${locationName.replace(/\s+/g, '-')}-${date}.json`;

      // Download file
      downloadJSON(exportData, filename);

    } catch (error) {
      console.error('Export failed:', error);
      setErrorDialog({
        isOpen: true,
        message: locale === 'nl' ? 'Export mislukt' : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        aria-label={locale === 'nl' ? 'Exporteer data naar JSON' : 'Export data to JSON'}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>{isExporting ? (locale === 'nl' ? 'Exporteren...' : 'Exporting...') : (locale === 'nl' ? 'Export JSON' : 'Export JSON')}</span>
      </button>

      {/* Error Alert Dialog */}
      <AlertDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
        title={locale === 'nl' ? 'Fout' : 'Error'}
        message={errorDialog.message}
        closeText={locale === 'nl' ? 'Sluiten' : 'Close'}
        variant="error"
      />
    </>
  );
};
