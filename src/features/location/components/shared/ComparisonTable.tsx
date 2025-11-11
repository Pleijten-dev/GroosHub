/**
 * Comparison Table Component
 * Shared table for displaying selected vs comparison values
 */

'use client';

import React from 'react';

export interface ComparisonTableRow {
  label: string;
  selectedValue: string;
  comparisonValue: string;
}

export interface ComparisonTableProps {
  rows: ComparisonTableRow[];
  locale: 'nl' | 'en';
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ rows, locale }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left p-2 text-sm font-semibold text-gray-700">
              {locale === 'nl' ? 'Categorie' : 'Category'}
            </th>
            <th className="text-right p-2 text-sm font-semibold text-gray-700">
              {locale === 'nl' ? 'Geselecteerd' : 'Selected'}
            </th>
            <th className="text-right p-2 text-sm font-semibold text-gray-700">
              {locale === 'nl' ? 'Vergelijking' : 'Comparison'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="p-2 text-sm text-gray-700">{row.label}</td>
              <td className="p-2 text-sm text-right text-gray-900">{row.selectedValue}</td>
              <td className="p-2 text-sm text-right text-gray-600">{row.comparisonValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
