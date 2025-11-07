'use client';

import React, { useMemo } from 'react';
import { PersonaScore } from '../../utils/targetGroupScoring';

export interface DetailedScoringTableProps {
  scores: PersonaScore[];
  locale?: 'nl' | 'en';
}

interface CategoryRow {
  category: string;
  subcategory: string;
  scores: Record<string, number>;
}

/**
 * Detailed Scoring Table
 * Shows all target groups as columns and all data categories as rows
 * with individual scores for each combination
 */
export const DetailedScoringTable: React.FC<DetailedScoringTableProps> = ({
  scores,
  locale = 'nl',
}) => {
  const translations = {
    nl: {
      title: 'Gedetailleerde Score Tabel',
      subtitle: 'Scores per categorie voor elke doelgroep',
      category: 'Categorie',
      subcategory: 'Subcategorie',
      noData: 'Geen scoringsgegevens beschikbaar',
    },
    en: {
      title: 'Detailed Scoring Table',
      subtitle: 'Scores per category for each target group',
      category: 'Category',
      subcategory: 'Subcategory',
      noData: 'No scoring data available',
    },
  };

  const t = translations[locale];

  // Organize data into rows
  const tableData = useMemo(() => {
    if (scores.length === 0) return [];

    // Collect all unique subcategories
    const subcategoriesSet = new Set<string>();
    scores.forEach(score => {
      score.detailedScores.forEach(detail => {
        subcategoriesSet.add(`${detail.category}|${detail.subcategory}`);
      });
    });

    const rows: CategoryRow[] = [];

    // Build rows for each subcategory
    subcategoriesSet.forEach(catSubcat => {
      const [category, subcategory] = catSubcat.split('|');
      const row: CategoryRow = {
        category,
        subcategory,
        scores: {},
      };

      // Get score for each persona
      scores.forEach(score => {
        const detail = score.detailedScores.find(
          d => d.category === category && d.subcategory === subcategory
        );
        row.scores[score.personaId] = detail ? detail.weightedScore : 0;
      });

      rows.push(row);
    });

    // Sort rows by category and subcategory
    return rows.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category);
      if (catCompare !== 0) return catCompare;
      return a.subcategory.localeCompare(b.subcategory);
    });
  }, [scores]);

  // Group rows by category
  const groupedData = useMemo(() => {
    const groups: Record<string, CategoryRow[]> = {};
    tableData.forEach(row => {
      if (!groups[row.category]) {
        groups[row.category] = [];
      }
      groups[row.category].push(row);
    });
    return groups;
  }, [tableData]);

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
      </div>

      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-30 min-w-[120px]">
                {t.category}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200 bg-gray-50 sticky left-[120px] z-30 min-w-[200px]">
                {t.subcategory}
              </th>
              {scores.map(score => (
                <th
                  key={score.personaId}
                  className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-200 bg-gray-50 min-w-[100px]"
                  title={score.personaName}
                >
                  <div className="truncate">{score.personaName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedData).map(([category, rows], catIndex) => (
              <React.Fragment key={category}>
                {rows.map((row, rowIndex) => {
                  const isFirstInCategory = rowIndex === 0;
                  return (
                    <tr
                      key={`${row.category}-${row.subcategory}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {isFirstInCategory && (
                        <td
                          rowSpan={rows.length}
                          className="px-3 py-2 font-medium text-gray-900 border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-10 align-top"
                        >
                          {row.category}
                        </td>
                      )}
                      <td className="px-3 py-2 text-gray-700 border-b border-r border-gray-200 bg-white sticky left-[120px] z-10">
                        {row.subcategory}
                      </td>
                      {scores.map(score => {
                        const value = row.scores[score.personaId] || 0;
                        const colorClass = getScoreColorClass(value);
                        return (
                          <td
                            key={score.personaId}
                            className={`px-3 py-2 text-center border-b border-gray-200 ${colorClass}`}
                          >
                            {value.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Get color class for score value
 */
function getScoreColorClass(score: number): string {
  if (score >= 2.5) return 'bg-green-100 text-green-800';
  if (score >= 2.0) return 'bg-green-50 text-green-700';
  if (score >= 1.5) return 'bg-yellow-50 text-yellow-700';
  if (score >= 1.0) return 'bg-orange-50 text-orange-700';
  if (score > 0) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-50 text-gray-600';
}
