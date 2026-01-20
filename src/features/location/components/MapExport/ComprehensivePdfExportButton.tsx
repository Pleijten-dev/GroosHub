'use client';

import React, { useState } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { Button } from '../../../../shared/components/UI';
import { AlertDialog } from '@/shared/components/UI/Modal/AlertDialog';
import {
  generateComprehensivePdf,
  isValidNetherlandsCoordinate,
  type ComprehensivePdfData,
  type ComprehensivePdfOptions
} from '../../utils/comprehensivePdfExport';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { WMSGradingData } from '../../types/wms-grading';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';

interface ComprehensivePdfExportButtonProps {
  /** Current locale */
  locale: Locale;
  /** Location coordinates [lat, lng] */
  coordinates: [number, number];
  /** Address string */
  address: string;
  /** Unified location data */
  locationData: UnifiedLocationData;
  /** Persona scores for target groups */
  personaScores: PersonaScore[];
  /** Calculated scenarios */
  scenarios: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
    customScenario?: number[];
  };
  /** All personas data */
  personas: Array<{
    id: string;
    name: string;
    income_level: string;
    household_type: string;
    age_group: string;
    description: string;
    current_property_types?: string[];
    desired_property_types?: string[];
  }>;
  /** Cube colors for visualization (0-26 positions) */
  cubeColors?: string[];
  /** WMS grading data (optional) */
  wmsGradingData?: WMSGradingData | null;
  /** Amenities data (optional) */
  amenitiesData?: AmenityMultiCategoryResponse | null;
}

interface ExportOptions {
  includeWMSMaps: boolean;
  includeTargetGroups: boolean;
  includeDataTables: boolean;
  includeScoreOverview: boolean;
}

export const ComprehensivePdfExportButton: React.FC<ComprehensivePdfExportButtonProps> = ({
  locale,
  coordinates,
  address,
  locationData,
  personaScores,
  scenarios,
  personas,
  cubeColors,
  wmsGradingData,
  amenitiesData
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeWMSMaps: true,
    includeTargetGroups: true,
    includeDataTables: true,
    includeScoreOverview: true
  });
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  });

  // Check if coordinates are valid for Netherlands WMS services
  const hasValidCoordinates = isValidNetherlandsCoordinate(coordinates[0], coordinates[1]);

  const t = {
    nl: {
      title: 'Volledig PDF Rapport',
      description: 'Genereer een uitgebreid PDF rapport met alle locatiegegevens, kaarten, doelgroepen en data tabellen.',
      generate: 'Genereer Volledig Rapport',
      generating: 'Genereren...',
      options: 'Opties',
      hideOptions: 'Verberg Opties',
      includeWMSMaps: 'WMS Kaartlagen met Legenda',
      includeTargetGroups: 'Doelgroepen Analyse',
      includeDataTables: 'Data Tabellen',
      includeScoreOverview: 'Score Overzicht',
      error: 'Fout',
      errorMessage: 'PDF generatie mislukt. Probeer opnieuw.',
      progress: 'Bezig met genereren...',
      wmsNote: 'Let op: Het downloaden van kaartlagen kan enkele minuten duren.',
      contents: 'Het rapport bevat:',
      wmsContents: 'Alle WMS kaartlagen met beschrijving, legenda en gemeten waarden',
      targetGroupContents: 'Doelgroep rangschikking, scenario vergelijkingen en berekeningen',
      dataTableContents: 'Tabellen voor demografie, gezondheid, veiligheid, leefbaarheid en voorzieningen',
      scoreContents: 'Score overzicht met categorieaanduiding',
      coordWarning: 'Waarschuwing: De coördinaten zijn ongeldig of niet geladen. Kaartlagen worden niet opgenomen in het rapport. Probeer de locatie opnieuw te zoeken of een andere snapshot te laden.',
      coordInvalid: 'Coördinaten: ongeldig'
    },
    en: {
      title: 'Complete PDF Report',
      description: 'Generate a comprehensive PDF report with all location data, maps, target groups, and data tables.',
      generate: 'Generate Complete Report',
      generating: 'Generating...',
      options: 'Options',
      hideOptions: 'Hide Options',
      includeWMSMaps: 'WMS Map Layers with Legend',
      includeTargetGroups: 'Target Groups Analysis',
      includeDataTables: 'Data Tables',
      includeScoreOverview: 'Score Overview',
      error: 'Error',
      errorMessage: 'PDF generation failed. Please try again.',
      progress: 'Generating...',
      wmsNote: 'Note: Downloading map layers may take several minutes.',
      contents: 'The report includes:',
      wmsContents: 'All WMS map layers with description, legend, and measured values',
      targetGroupContents: 'Target group rankings, scenario comparisons, and calculations',
      dataTableContents: 'Tables for demographics, health, safety, livability, and amenities',
      scoreContents: 'Score overview with category breakdown',
      coordWarning: 'Warning: Coordinates are invalid or not loaded. Map layers will not be included in the report. Try searching for the location again or load a different snapshot.',
      coordInvalid: 'Coordinates: invalid'
    }
  }[locale];

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setCurrentStatus('');

    try {
      const pdfData: ComprehensivePdfData = {
        locationData,
        coordinates,
        address,
        personaScores,
        scenarios,
        personas,
        cubeColors,
        wmsGradingData,
        amenitiesData
      };

      const pdfOptions: ComprehensivePdfOptions = {
        locale,
        title: locale === 'nl' ? 'Locatie Analyse Rapport' : 'Location Analysis Report',
        filename: `locatie-rapport-${new Date().toISOString().split('T')[0]}.pdf`,
        ...exportOptions
      };

      await generateComprehensivePdf(pdfData, pdfOptions, (current, total, status) => {
        setExportProgress(current);
        setExportTotal(total);
        setCurrentStatus(status);
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      setErrorDialog({
        isOpen: true,
        message: t.errorMessage
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentStatus('');
    }
  };

  const toggleOption = (key: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{t.title}</h4>
        <p className="text-xs text-gray-600">{t.description}</p>
      </div>

      {/* Coordinate Warning */}
      {!hasValidCoordinates && exportOptions.includeWMSMaps && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-800 font-medium mb-1">{t.coordInvalid}</p>
              <p className="text-amber-700">{t.coordWarning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contents list */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-2">
        <p className="font-medium text-gray-700">{t.contents}</p>
        <ul className="space-y-1 text-gray-600 ml-3">
          {exportOptions.includeWMSMaps && (
            <li className="list-disc">{t.wmsContents}</li>
          )}
          {exportOptions.includeTargetGroups && (
            <li className="list-disc">{t.targetGroupContents}</li>
          )}
          {exportOptions.includeDataTables && (
            <li className="list-disc">{t.dataTableContents}</li>
          )}
          {exportOptions.includeScoreOverview && (
            <li className="list-disc">{t.scoreContents}</li>
          )}
        </ul>
      </div>

      {/* Options Toggle */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="text-sm text-primary hover:text-primary-dark underline"
      >
        {showOptions ? t.hideOptions : t.options}
      </button>

      {/* Export Options */}
      {showOptions && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeScoreOverview}
              onChange={() => toggleOption('includeScoreOverview')}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{t.includeScoreOverview}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeTargetGroups}
              onChange={() => toggleOption('includeTargetGroups')}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{t.includeTargetGroups}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeDataTables}
              onChange={() => toggleOption('includeDataTables')}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{t.includeDataTables}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeWMSMaps}
              onChange={() => toggleOption('includeWMSMaps')}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{t.includeWMSMaps}</span>
          </label>

          {exportOptions.includeWMSMaps && (
            <p className="text-xs text-amber-600 mt-2">{t.wmsNote}</p>
          )}
        </div>
      )}

      {/* Export Button */}
      <Button
        onClick={handleExport}
        variant="primary"
        disabled={isExporting || (!exportOptions.includeWMSMaps && !exportOptions.includeTargetGroups && !exportOptions.includeDataTables && !exportOptions.includeScoreOverview)}
        className="w-full"
      >
        {isExporting
          ? `${t.generating} ${exportProgress}/${exportTotal}`
          : t.generate
        }
      </Button>

      {/* Progress Indicator */}
      {isExporting && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">{t.progress}</span>
            <span className="text-sm text-blue-700">
              {exportProgress} / {exportTotal}
            </span>
          </div>

          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${exportTotal > 0 ? (exportProgress / exportTotal) * 100 : 0}%` }}
            />
          </div>

          {currentStatus && (
            <p className="text-xs text-blue-700 truncate">{currentStatus}</p>
          )}
        </div>
      )}

      {/* Error Alert Dialog */}
      <AlertDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
        title={t.error}
        message={errorDialog.message}
        closeText={locale === 'nl' ? 'Sluiten' : 'Close'}
        variant="error"
      />
    </div>
  );
};

export default ComprehensivePdfExportButton;
