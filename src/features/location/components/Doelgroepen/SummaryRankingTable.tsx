'use client';

import React, { useState, useMemo } from 'react';
import { PersonaScore } from '../../utils/targetGroupScoring';

export interface SummaryRankingTableProps {
  scores: PersonaScore[];
  locale?: 'nl' | 'en';
  onRowClick?: (personaId: string) => void;
  selectedIds?: string[];
  highlightedIds?: string[]; // IDs to highlight in blue (e.g., current scenario)
}

type SortColumn = 'rRank' | 'zRank' | 'name';
type SortDirection = 'asc' | 'desc';

/**
 * Summary Ranking Table
 * Shows ranking positions, persona names, and R-rank/Z-rank scores
 * with sortable columns
 */
export const SummaryRankingTable: React.FC<SummaryRankingTableProps> = ({
  scores,
  locale = 'nl',
  onRowClick,
  selectedIds = [],
  highlightedIds = [],
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('rRank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const translations = {
    nl: {
      title: 'Totale Score Tabel',
      subtitle: 'Ranking van doelgroepen op basis van R-rank en Z-rank',
      selectHint: 'Klik op een rij om de doelgroep te selecteren/deselecteren voor de 3D visualisatie',
      rRankPosition: 'R-Rank Positie',
      zRankPosition: 'Z-Rank Positie',
      targetGroup: 'Doelgroep',
      rRankScore: 'R-Rank Score',
      zRankScore: 'Z-Rank Score',
      weightedTotal: 'Gewogen Totaal',
      noData: 'Geen scoringsgegevens beschikbaar',
      sortBy: 'Sorteer op',
    },
    en: {
      title: 'Total Scoring Table',
      subtitle: 'Ranking of target groups based on R-rank and Z-rank',
      selectHint: 'Click on a row to select/deselect target groups for 3D visualization',
      rRankPosition: 'R-Rank Position',
      zRankPosition: 'Z-Rank Position',
      targetGroup: 'Target Group',
      rRankScore: 'R-Rank Score',
      zRankScore: 'Z-Rank Score',
      weightedTotal: 'Weighted Total',
      noData: 'No scoring data available',
      sortBy: 'Sort by',
    },
  };

  const t = translations[locale];

  // Sort scores based on selected column
  const sortedScores = useMemo(() => {
    const sorted = [...scores];

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortColumn) {
        case 'rRank':
          compareValue = a.rRank - b.rRank;
          break;
        case 'zRank':
          compareValue = a.zRank - b.zRank;
          break;
        case 'name':
          compareValue = a.personaName.localeCompare(b.personaName);
          break;
      }

      return sortDirection === 'desc' ? -compareValue : compareValue;
    });

    return sorted;
  }, [scores, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for scores, ascending for names
      setSortColumn(column);
      setSortDirection(column === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (scores.length === 0) {
    return (
      <div className="w-full p-base bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.title}</h3>
        <p className="text-sm text-gray-600 mb-base">{t.subtitle}</p>
        <div className="text-center py-lg">
          <p className="text-gray-500">{t.noData}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200">
      <div className="p-base border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.title}</h3>
        <p className="text-sm text-gray-600">{t.subtitle}</p>
        {onRowClick && (
          <p className="text-xs text-blue-600 mt-1">{t.selectHint}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                <button
                  onClick={() => handleSort('rRank')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  {t.rRankPosition}
                  {getSortIcon('rRank')}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                <button
                  onClick={() => handleSort('zRank')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  {t.zRankPosition}
                  {getSortIcon('zRank')}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  {t.targetGroup}
                  {getSortIcon('name')}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b border-gray-200">
                {t.rRankScore}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b border-gray-200">
                {t.zRankScore}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b border-gray-200">
                {t.weightedTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map((score, index) => {
              const isHighlighted = highlightedIds.includes(score.personaId);
              const isSelected = selectedIds.includes(score.personaId);
              const bgClass = isSelected
                ? 'bg-blue-200'
                : isHighlighted
                ? 'bg-blue-50'
                : index % 2 === 0
                ? 'bg-white'
                : 'bg-gray-50';

              return (
                <tr
                  key={score.personaId}
                  onClick={() => onRowClick?.(score.personaId)}
                  className={`${bgClass} hover:bg-blue-100 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {onRowClick && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      )}
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          score.rRankPosition === 1
                            ? 'bg-yellow-400 text-yellow-900'
                            : score.rRankPosition === 2
                            ? 'bg-gray-300 text-gray-900'
                            : score.rRankPosition === 3
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {score.rRankPosition}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                          score.zRankPosition === 1
                            ? 'bg-yellow-400 text-yellow-900'
                            : score.zRankPosition === 2
                            ? 'bg-gray-300 text-gray-900'
                            : score.zRankPosition === 3
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {score.zRankPosition}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 border-b border-gray-200">
                    {score.personaName}
                  </td>
                  <td className="px-4 py-3 text-right border-b border-gray-200">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${getRRankColorClass(score.rRank)}`}>
                      {(score.rRank * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right border-b border-gray-200">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${getZRankColorClass(score.zRank)}`}>
                      {score.zRank.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 border-b border-gray-200">
                    {score.weightedTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-base bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 font-semibold text-xs">
              1
            </span>
            <span>{locale === 'nl' ? '1e Plaats' : '1st Place'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-gray-900 font-semibold text-xs">
              2
            </span>
            <span>{locale === 'nl' ? '2e Plaats' : '2nd Place'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-400 text-orange-900 font-semibold text-xs">
              3
            </span>
            <span>{locale === 'nl' ? '3e Plaats' : '3rd Place'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get color class for R-rank score (percentage)
 */
function getRRankColorClass(rRank: number): string {
  const percentage = rRank * 100;
  if (percentage >= 80) return 'bg-green-100 text-green-800';
  if (percentage >= 60) return 'bg-green-50 text-green-700';
  if (percentage >= 40) return 'bg-yellow-100 text-yellow-800';
  if (percentage >= 20) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Get color class for Z-rank score (-1 to 1)
 */
function getZRankColorClass(zRank: number): string {
  if (zRank >= 0.5) return 'bg-green-100 text-green-800';
  if (zRank >= 0) return 'bg-green-50 text-green-700';
  if (zRank >= -0.5) return 'bg-orange-50 text-orange-700';
  return 'bg-red-100 text-red-800';
}
