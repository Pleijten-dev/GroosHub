'use client';

import React from 'react';
import type { CategoryScore, MetricBreakdown } from '../../utils/scoreCalculation';

interface ScoreBreakdownTooltipProps {
  category: CategoryScore | null;
  locale: 'nl' | 'en';
}

/**
 * Get color based on grade
 */
function getGradeColor(grade: number | null): string {
  if (grade === null) return 'text-gray-400';
  if (grade >= 7) return 'text-green-600';
  if (grade >= 5.5) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get background color based on grade
 */
function getGradeBgColor(grade: number | null): string {
  if (grade === null) return 'bg-gray-50';
  if (grade >= 7) return 'bg-green-50';
  if (grade >= 5.5) return 'bg-yellow-50';
  return 'bg-red-50';
}

/**
 * Format a numeric value for display
 */
function formatValue(value: number | null, isCount: boolean = false): string {
  if (value === null) return '-';
  if (isCount) return Math.round(value).toString();
  return value.toFixed(1);
}

/**
 * ScoreBreakdownTooltip - Shows detailed metric breakdown as a fixed side panel
 * Always visible and shows the last hovered category's information
 */
export const ScoreBreakdownTooltip: React.FC<ScoreBreakdownTooltipProps> = ({
  category,
  locale,
}) => {
  if (!category) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-[400px]">
        <div className="text-center text-gray-400 py-8">
          {locale === 'nl'
            ? 'Beweeg over een categorie om details te zien'
            : 'Hover over a category to see details'}
        </div>
      </div>
    );
  }

  const categoryName = locale === 'nl' ? category.nameNl : category.nameEn;
  const isVoorzieningen = category.id === 'voorzieningen';
  const isResidential = category.id === 'betaalbaarheid';

  // Sort breakdown: metrics with data first, sorted by weight
  const sortedBreakdown = [...category.breakdown].sort((a, b) => {
    if (a.hasData && !b.hasData) return -1;
    if (!a.hasData && b.hasData) return 1;
    return b.weight - a.weight;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-[400px]">
      {/* Insufficient data warning */}
      {category.insufficientData && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          {locale === 'nl'
            ? `⚠️ Onvoldoende data beschikbaar (${category.metricsUsed}/${category.metricsTotal} metrieken). Score is niet betrouwbaar.`
            : `⚠️ Insufficient data available (${category.metricsUsed}/${category.metricsTotal} metrics). Score is not reliable.`}
        </div>
      )}

      {/* Data source note */}
      {category.dataNote === 'municipal' && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          {locale === 'nl'
            ? 'ℹ️ Data is gebaseerd op gemeentelijke gegevens, niet buurt-specifiek.'
            : 'ℹ️ Data is based on municipal data, not neighborhood-specific.'}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">{categoryName}</h3>
        <div className="text-right">
          <div className={`text-2xl font-bold ${category.insufficientData ? 'text-gray-400' : getGradeColor(category.grade)}`}>
            {category.insufficientData ? '-' : category.grade.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">
            {locale === 'nl' ? 'Eindscore' : 'Final Score'}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center text-xs text-gray-500 mb-2 px-1">
        <div className="flex-1">{locale === 'nl' ? 'Metriek' : 'Metric'}</div>
        <div className="w-14 text-right">{locale === 'nl' ? 'Lokaal' : 'Local'}</div>
        <div className="w-14 text-right">{locale === 'nl' ? 'NL Gem.' : 'NL Avg.'}</div>
        <div className="w-12 text-right">{locale === 'nl' ? 'Score' : 'Score'}</div>
        <div className="w-12 text-right">{locale === 'nl' ? 'Gewicht' : 'Weight'}</div>
      </div>

      {/* Breakdown list - scrollable */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {sortedBreakdown.map((metric) => (
          <MetricRow
            key={metric.key}
            metric={metric}
            locale={locale}
            isVoorzieningen={isVoorzieningen}
          />
        ))}
      </div>

      {/* Footer with summary */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className={`${category.metricsUsed < category.metricsTotal * 0.3 ? 'text-amber-600' : 'text-gray-600'}`}>
            {locale === 'nl'
              ? `${category.metricsUsed}/${category.metricsTotal} metrieken beschikbaar`
              : `${category.metricsUsed}/${category.metricsTotal} metrics available`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              {locale === 'nl' ? 'Eindscore:' : 'Final:'}
            </span>
            <span className={`text-lg font-bold ${category.insufficientData ? 'text-gray-400' : getGradeColor(category.grade)}`}>
              {category.insufficientData ? '-' : category.grade.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {locale === 'nl' ? '5.5 = Nederlands gemiddelde' : '5.5 = Dutch average'}
        </div>
      </div>
    </div>
  );
};

/**
 * Individual metric row in the breakdown
 */
interface MetricRowProps {
  metric: MetricBreakdown;
  locale: 'nl' | 'en';
  isVoorzieningen: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ metric, locale, isVoorzieningen }) => {
  const name = locale === 'nl' ? metric.nameNl : metric.nameEn;

  return (
    <div
      className={`flex items-center py-1.5 px-1 rounded text-sm ${
        metric.hasData ? getGradeBgColor(metric.grade) : 'bg-gray-50'
      }`}
    >
      {/* Metric name with direction indicator */}
      <div className="flex-1 flex items-center gap-1 min-w-0">
        <span
          className={`text-xs flex-shrink-0 ${
            metric.direction === 'positive' ? 'text-green-500' : 'text-red-500'
          }`}
          title={
            metric.direction === 'positive'
              ? locale === 'nl' ? 'Hoger is beter' : 'Higher is better'
              : locale === 'nl' ? 'Lager is beter' : 'Lower is better'
          }
        >
          {metric.direction === 'positive' ? '↑' : '↓'}
        </span>
        <span
          className={`truncate ${metric.hasData ? 'text-gray-700' : 'text-gray-400'}`}
          title={name}
        >
          {name}
        </span>
      </div>

      {/* Local value */}
      <div className={`w-14 text-right ${metric.hasData ? 'text-gray-700' : 'text-gray-300'}`}>
        {metric.hasData && metric.localValue !== null
          ? isVoorzieningen
            ? formatValue(metric.localValue, true)
            : `${formatValue(metric.localValue)}%`
          : '-'}
      </div>

      {/* Comparison value (NL average) */}
      <div className={`w-14 text-right ${metric.hasData ? 'text-gray-500' : 'text-gray-300'}`}>
        {metric.hasData && metric.comparisonValue !== null
          ? `${formatValue(metric.comparisonValue)}%`
          : isVoorzieningen ? '-' : '-'}
      </div>

      {/* Grade */}
      <div className={`w-12 text-right font-semibold ${metric.hasData ? getGradeColor(metric.grade) : 'text-gray-300'}`}>
        {metric.hasData && metric.grade !== null ? metric.grade.toFixed(1) : '-'}
      </div>

      {/* Weight */}
      <div className="w-12 text-right text-gray-400">
        {metric.weightPercent}%
      </div>
    </div>
  );
};

export default ScoreBreakdownTooltip;
