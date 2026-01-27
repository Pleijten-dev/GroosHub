"use client";

import React, { useState, useEffect } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { convertResidentialToRows } from '../Residential/residentialDataConverter';
import { PanelInner } from '../../../../shared/components/UI/Panel';

export interface MultiLevelDataTableProps {
  data: UnifiedLocationData;
  locale: 'nl' | 'en';
  /** Default source filter to apply */
  defaultSource?: DataSource | 'all';
  /** If true, locks the source filter and hides the dropdown */
  lockSourceFilter?: boolean;
}

type GeographicLevel = 'national' | 'municipality' | 'district' | 'neighborhood';
type DataSource = 'demographics' | 'health' | 'livability' | 'safety' | 'residential' | 'amenities';

const LEVEL_LABELS = {
  national: { nl: 'Nederland (NL00)', en: 'Netherlands (NL00)' },
  municipality: { nl: 'Gemeente', en: 'Municipality' },
  district: { nl: 'Wijk', en: 'District' },
  neighborhood: { nl: 'Buurt', en: 'Neighborhood' },
};

const SOURCE_LABELS = {
  demographics: { nl: 'Demografie (CBS)', en: 'Demographics (CBS)' },
  health: { nl: 'Gezondheid (RIVM)', en: 'Health (RIVM)' },
  livability: { nl: 'Leefbaarheid (CBS)', en: 'Livability (CBS)' },
  safety: { nl: 'Veiligheid (Politie)', en: 'Safety (Police)' },
  residential: { nl: 'Woningmarkt (Altum)', en: 'Housing Market (Altum)' },
  amenities: { nl: 'Voorzieningen (Google Maps)', en: 'Amenities (Google Maps)' },
};

/**
 * Multi-level data table component
 * Displays all data across all geographic levels and sources
 */
/**
 * Get color class for a continuous score value (-1 to 1)
 */
function getScoreColor(score: number): string {
  if (score >= 0.67) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 0.33) return 'bg-green-50 text-green-700 border-green-100';
  if (score > 0) return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (score === 0) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (score > -0.33) return 'bg-orange-50 text-orange-700 border-orange-100';
  if (score > -0.67) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

/**
 * Format score for display
 */
function formatScore(score: number): string {
  const formatted = score.toFixed(2);
  if (score > 0) return `+${formatted}`;
  return formatted;
}

export const MultiLevelDataTable: React.FC<MultiLevelDataTableProps> = ({
  data,
  locale,
  defaultSource = 'all',
  lockSourceFilter = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<GeographicLevel>('municipality');
  const [selectedSource, setSelectedSource] = useState<DataSource | 'all'>(defaultSource);

  // Sync selectedSource with defaultSource prop changes
  useEffect(() => {
    setSelectedSource(defaultSource);
  }, [defaultSource]);

  /**
   * Get data rows for the selected level and source
   */
  const getFilteredRows = (): UnifiedDataRow[] => {
    const rows: UnifiedDataRow[] = [];

    // Collect rows based on selected level
    switch (selectedLevel) {
      case 'national':
        rows.push(...data.demographics.national);
        rows.push(...data.health.national);
        rows.push(...data.livability.national);
        rows.push(...data.safety.national);
        break;
      case 'municipality':
        rows.push(...data.demographics.municipality);
        rows.push(...data.health.municipality);
        rows.push(...data.livability.municipality);
        rows.push(...data.safety.municipality);
        break;
      case 'district':
        rows.push(...data.demographics.district);
        rows.push(...data.health.district);
        rows.push(...data.safety.district);
        break;
      case 'neighborhood':
        rows.push(...data.demographics.neighborhood);
        rows.push(...data.health.neighborhood);
        rows.push(...data.safety.neighborhood);
        break;
    }

    // Add residential data (appears at municipality level)
    if (data.residential && selectedLevel === 'municipality') {
      const residentialRows = convertResidentialToRows(data.residential);
      rows.push(...residentialRows);
    }

    // Add amenities data (appears at municipality level)
    if (data.amenities && data.amenities.length > 0 && selectedLevel === 'municipality') {
      rows.push(...data.amenities);
    }

    // Filter by source if not 'all'
    if (selectedSource !== 'all') {
      return rows.filter((row) => row.source === selectedSource);
    }

    return rows;
  };

  const filteredRows = getFilteredRows();

  /**
   * Get available sources for the selected level
   */
  const getAvailableSources = (): DataSource[] => {
    const sources: Set<DataSource> = new Set();

    switch (selectedLevel) {
      case 'national':
        sources.add('demographics');
        sources.add('health');
        sources.add('livability');
        sources.add('safety');
        break;
      case 'municipality':
        sources.add('demographics');
        sources.add('health');
        sources.add('livability');
        sources.add('safety');
        break;
      case 'district':
        sources.add('demographics');
        sources.add('health');
        sources.add('safety');
        break;
      case 'neighborhood':
        sources.add('demographics');
        sources.add('health');
        sources.add('safety');
        break;
    }

    // Add residential source if data is available (municipality only)
    if (selectedLevel === 'municipality' && data.residential && data.residential.hasData) {
      sources.add('residential');
    }

    // Add amenities source if data is available (municipality only)
    if (selectedLevel === 'municipality' && data.amenities && data.amenities.length > 0) {
      sources.add('amenities');
    }

    return Array.from(sources);
  };

  const availableSources = getAvailableSources();

  return (
    <div className="w-full">
      {/* Location info */}
      <PanelInner className="mb-lg">
        <h3 className="text-lg font-semibold mb-sm text-black">
          {locale === 'nl' ? 'Locatie Informatie' : 'Location Information'}
        </h3>
        <div className="grid grid-cols-2 gap-sm text-sm">
          <div>
            <span className="text-text-muted">
              {locale === 'nl' ? 'Adres' : 'Address'}:
            </span>{' '}
            <span className="font-medium">{data.location.address}</span>
          </div>
          {data.location.municipality && (
            <div>
              <span className="text-text-muted">
                {locale === 'nl' ? 'Gemeente' : 'Municipality'}:
              </span>{' '}
              <span className="font-medium">
                {data.location.municipality.statnaam} ({data.location.municipality.statcode})
              </span>
            </div>
          )}
          {data.location.district && (
            <div>
              <span className="text-text-muted">
                {locale === 'nl' ? 'Wijk' : 'District'}:
              </span>{' '}
              <span className="font-medium">
                {data.location.district.statnaam} ({data.location.district.statcode})
              </span>
            </div>
          )}
          {data.location.neighborhood && (
            <div>
              <span className="text-text-muted">
                {locale === 'nl' ? 'Buurt' : 'Neighborhood'}:
              </span>{' '}
              <span className="font-medium">
                {data.location.neighborhood.statnaam} ({data.location.neighborhood.statcode})
              </span>
            </div>
          )}
          <div>
            <span className="text-text-muted">
              {locale === 'nl' ? 'Coördinaten (WGS84)' : 'Coordinates (WGS84)'}:
            </span>{' '}
            <span className="font-medium">
              {data.location.coordinates.wgs84.latitude.toFixed(6)},{' '}
              {data.location.coordinates.wgs84.longitude.toFixed(6)}
            </span>
          </div>
          <div>
            <span className="text-text-muted">
              {locale === 'nl' ? 'Coördinaten (RD)' : 'Coordinates (RD)'}:
            </span>{' '}
            <span className="font-medium">
              {Math.round(data.location.coordinates.rd.x)},{' '}
              {Math.round(data.location.coordinates.rd.y)}
            </span>
          </div>
        </div>
      </PanelInner>

      {/* Filters */}
      <div className="mb-lg flex gap-base items-center">
        {/* Geographic level selector */}
        <div>
          <label className="block text-sm font-medium mb-xs">
            {locale === 'nl' ? 'Geografisch Niveau' : 'Geographic Level'}
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value as GeographicLevel);
              setSelectedSource('all'); // Reset source filter
            }}
            className="p-sm rounded-md border border-gray-300 bg-white text-sm"
          >
            <option value="national">{LEVEL_LABELS.national[locale]}</option>
            <option value="municipality">{LEVEL_LABELS.municipality[locale]}</option>
            {data.location.district && (
              <option value="district">{LEVEL_LABELS.district[locale]}</option>
            )}
            {data.location.neighborhood && (
              <option value="neighborhood">{LEVEL_LABELS.neighborhood[locale]}</option>
            )}
          </select>
        </div>

        {/* Data source selector - only show if not locked */}
        {!lockSourceFilter && (
          <div>
            <label className="block text-sm font-medium mb-xs">
              {locale === 'nl' ? 'Data Bron' : 'Data Source'}
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value as DataSource | 'all')}
              className="p-sm rounded-md border border-gray-300 bg-white text-sm"
            >
              <option value="all">{locale === 'nl' ? 'Alle Bronnen' : 'All Sources'}</option>
              {availableSources.map((source) => (
                <option key={source} value={source}>
                  {SOURCE_LABELS[source][locale]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Row count */}
        <div className="ml-auto text-sm text-text-muted">
          {filteredRows.length} {locale === 'nl' ? 'rijen' : 'rows'}
        </div>
      </div>

      {/* Data table */}
      <div className="card-glass overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cream">
            <tr>
              <th className="text-left p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Bron' : 'Source'}
              </th>
              <th className="text-left p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Indicator' : 'Indicator'}
              </th>
              <th className="text-right p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Origineel' : 'Original'}
              </th>
              <th className="text-right p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Absoluut' : 'Absolute'}
              </th>
              <th className="text-right p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Relatief' : 'Relative'}
              </th>
              {/* Show scoring columns only for non-national levels */}
              {selectedLevel !== 'national' && (
                <>
                  <th className="text-center p-sm text-sm font-semibold text-text-primary border-b">
                    {locale === 'nl' ? 'Score' : 'Score'}
                  </th>
                  <th className="text-center p-sm text-sm font-semibold text-text-primary border-b">
                    {locale === 'nl' ? 'Vergelijking' : 'Comparison'}
                  </th>
                  <th className="text-right p-sm text-sm font-semibold text-text-primary border-b">
                    {locale === 'nl' ? 'Marge' : 'Margin'}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={selectedLevel === 'national' ? 5 : 8} className="p-base text-center text-text-muted">
                  {locale === 'nl'
                    ? 'Geen data beschikbaar voor dit niveau en deze bron'
                    : 'No data available for this level and source'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                // Get the appropriate title based on locale
                const displayTitle =
                  locale === 'nl' && row.titleNl ? row.titleNl :
                  locale === 'en' && row.titleEn ? row.titleEn :
                  row.title || row.key;

                return (
                  <tr
                    key={`${row.source}-${row.key}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-sm text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          row.source === 'demographics'
                            ? 'bg-blue-100 text-blue-700'
                            : row.source === 'health'
                            ? 'bg-green-100 text-green-700'
                            : row.source === 'livability'
                            ? 'bg-purple-100 text-purple-700'
                            : row.source === 'safety'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {SOURCE_LABELS[row.source][locale]}
                      </span>
                    </td>
                    <td className="p-sm text-sm text-text-primary">{displayTitle}</td>
                    <td className="p-sm text-sm text-right text-text-muted">
                      {row.displayValue}
                    </td>
                    <td className="p-sm text-sm text-right font-medium text-text-primary">
                      {row.displayAbsolute}
                    </td>
                    <td className="p-sm text-sm text-right font-medium text-text-primary">
                      {row.displayRelative}
                    </td>
                    {/* Show scoring cells only for non-national levels */}
                    {selectedLevel !== 'national' && (
                      <>
                        {/* Score column with visual indicator */}
                        <td className="p-sm text-center">
                          {row.calculatedScore !== undefined && row.calculatedScore !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className={`inline-flex items-center justify-center min-w-[60px] px-2 py-1 rounded font-mono font-medium text-xs border ${getScoreColor(row.calculatedScore)}`}
                              >
                                {formatScore(row.calculatedScore)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        {/* Comparison type column */}
                        <td className="p-sm text-center">
                          {row.scoring ? (
                            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                              {row.scoring.comparisonType === 'relatief'
                                ? (locale === 'nl' ? 'Rel' : 'Rel')
                                : (locale === 'nl' ? 'Abs' : 'Abs')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        {/* Margin column */}
                        <td className="p-sm text-right text-xs text-gray-600">
                          {row.scoring ? `±${row.scoring.margin}%` : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary and Legend */}
      <div className="mt-base space-y-sm">
        {/* Scoring legend - only show for non-national levels */}
        {selectedLevel !== 'national' && (
          <div className="p-sm bg-blue-50 rounded border border-blue-200">
            <div className="text-xs font-semibold text-blue-900 mb-xs">
              {locale === 'nl' ? 'Score Uitleg' : 'Score Legend'}
            </div>

            {/* Gradient scale visualization */}
            <div className="mb-sm">
              <div className="flex items-center gap-1 text-xs mb-1">
                <span className="text-gray-700 font-medium">
                  {locale === 'nl' ? 'Score schaal:' : 'Score scale:'}
                </span>
              </div>
              <div className="flex h-6 rounded overflow-hidden border border-gray-300">
                <div className="bg-red-100 flex-1 flex items-center justify-center text-xs font-medium text-red-800">-1.0</div>
                <div className="bg-orange-100 flex-1"></div>
                <div className="bg-orange-50 flex-1"></div>
                <div className="bg-gray-100 flex-1 flex items-center justify-center text-xs font-medium text-gray-700">0.0</div>
                <div className="bg-yellow-50 flex-1"></div>
                <div className="bg-green-50 flex-1"></div>
                <div className="bg-green-100 flex-1 flex items-center justify-center text-xs font-medium text-green-800">+1.0</div>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>{locale === 'nl' ? 'Slechter' : 'Worse'}</span>
                <span>{locale === 'nl' ? 'Landelijk gemiddelde' : 'National average'}</span>
                <span>{locale === 'nl' ? 'Beter' : 'Better'}</span>
              </div>
            </div>

            {/* Score ranges explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-xs text-xs mb-xs">
              <div className="flex items-center gap-xs">
                <span className="inline-flex items-center justify-center min-w-[50px] px-2 py-1 rounded font-mono font-medium text-xs border bg-green-100 text-green-800 border-green-200">
                  +0.67
                </span>
                <span className="text-gray-700">
                  {locale === 'nl' ? 'Veel beter' : 'Much better'}
                </span>
              </div>
              <div className="flex items-center gap-xs">
                <span className="inline-flex items-center justify-center min-w-[50px] px-2 py-1 rounded font-mono font-medium text-xs border bg-gray-100 text-gray-700 border-gray-200">
                  0.00
                </span>
                <span className="text-gray-700">
                  {locale === 'nl' ? 'Gelijk aan landelijk' : 'Equal to national'}
                </span>
              </div>
              <div className="flex items-center gap-xs">
                <span className="inline-flex items-center justify-center min-w-[50px] px-2 py-1 rounded font-mono font-medium text-xs border bg-yellow-50 text-yellow-700 border-yellow-100">
                  +0.25
                </span>
                <span className="text-gray-700">
                  {locale === 'nl' ? 'Iets beter' : 'Slightly better'}
                </span>
              </div>
              <div className="flex items-center gap-xs">
                <span className="inline-flex items-center justify-center min-w-[50px] px-2 py-1 rounded font-mono font-medium text-xs border bg-orange-50 text-orange-700 border-orange-100">
                  -0.25
                </span>
                <span className="text-gray-700">
                  {locale === 'nl' ? 'Iets slechter' : 'Slightly worse'}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              {locale === 'nl'
                ? 'Scores worden continu berekend van -1.0 tot +1.0 door lineaire interpolatie binnen de marge. Waarden buiten de marge worden afgekapt op -1.0 of +1.0. "Rel" = relatieve waarde, "Abs" = absolute waarde.'
                : 'Scores are continuously calculated from -1.0 to +1.0 using linear interpolation within the margin. Values outside the margin are capped at -1.0 or +1.0. "Rel" = relative value, "Abs" = absolute value.'}
            </div>
            <div className="mt-xs pt-xs border-t border-blue-300 text-xs text-blue-800 font-medium">
              ℹ️ {locale === 'nl'
                ? 'Let op: Woningmarkt (Altum) data toont vergelijkbare woningen en heeft geen landelijke vergelijking.'
                : 'Note: Housing Market (Altum) data shows comparable properties and has no national comparison.'}
            </div>
          </div>
        )}

        {/* Data fetch timestamp */}
        <div className="p-sm bg-gray-50 rounded text-xs text-text-muted">
          {locale === 'nl' ? 'Data opgehaald op' : 'Data fetched on'}:{' '}
          {data.fetchedAt.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-US')}
        </div>
      </div>
    </div>
  );
};
