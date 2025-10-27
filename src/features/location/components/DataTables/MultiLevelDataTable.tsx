"use client";

import React, { useState } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';

export interface MultiLevelDataTableProps {
  data: UnifiedLocationData;
  locale: 'nl' | 'en';
}

type GeographicLevel = 'national' | 'municipality' | 'district' | 'neighborhood';
type DataSource = 'demographics' | 'health' | 'livability' | 'safety';

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
};

/**
 * Multi-level data table component
 * Displays all data across all geographic levels and sources
 */
export const MultiLevelDataTable: React.FC<MultiLevelDataTableProps> = ({
  data,
  locale,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<GeographicLevel>('municipality');
  const [selectedSource, setSelectedSource] = useState<DataSource | 'all'>('all');

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

    return Array.from(sources);
  };

  const availableSources = getAvailableSources();

  return (
    <div className="w-full">
      {/* Location info */}
      <div className="mb-lg p-base bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-sm">
          {locale === 'nl' ? 'Locatie Informatie' : 'Location Information'}
        </h3>
        <div className="grid grid-cols-2 gap-sm text-sm">
          <div>
            <span className="text-text-muted">
              {locale === 'nl' ? 'Adres' : 'Address'}:
            </span>{' '}
            <span className="font-medium">{data.location.address}</span>
          </div>
          <div>
            <span className="text-text-muted">
              {locale === 'nl' ? 'Gemeente' : 'Municipality'}:
            </span>{' '}
            <span className="font-medium">
              {data.location.municipality.statnaam} ({data.location.municipality.statcode})
            </span>
          </div>
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
      </div>

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

        {/* Data source selector */}
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

        {/* Row count */}
        <div className="ml-auto text-sm text-text-muted">
          {filteredRows.length} {locale === 'nl' ? 'rijen' : 'rows'}
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Bron' : 'Source'}
              </th>
              <th className="text-left p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Indicator' : 'Indicator'}
              </th>
              <th className="text-right p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Absoluut' : 'Absolute'}
              </th>
              <th className="text-right p-sm text-sm font-semibold text-text-primary border-b">
                {locale === 'nl' ? 'Relatief' : 'Relative'}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-base text-center text-text-muted">
                  {locale === 'nl'
                    ? 'Geen data beschikbaar voor dit niveau en deze bron'
                    : 'No data available for this level and source'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr
                  key={`${row.source}-${row.indicator}-${idx}`}
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
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {SOURCE_LABELS[row.source][locale]}
                    </span>
                  </td>
                  <td className="p-sm text-sm text-text-primary">{row.indicator}</td>
                  <td className="p-sm text-sm text-right font-medium text-text-primary">
                    {row.displayValueAbsolute}
                  </td>
                  <td className="p-sm text-sm text-right font-medium text-text-secondary">
                    {row.displayValueRelative}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary statistics */}
      <div className="mt-base p-sm bg-gray-50 rounded text-xs text-text-muted">
        {locale === 'nl' ? 'Data opgehaald op' : 'Data fetched on'}:{' '}
        {data.fetchedAt.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-US')}
      </div>
    </div>
  );
};
