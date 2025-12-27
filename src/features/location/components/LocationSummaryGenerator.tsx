/**
 * Location Summary Generator Component
 * Demonstrates useObject hook for streaming structured data
 */

'use client';

import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

// Schema must match the API schema
const locationSummarySchema = z.object({
  overallScore: z.number().min(0).max(10),
  safetyScore: z.number().min(0).max(10),
  livabilityScore: z.number().min(0).max(10),
  amenitiesScore: z.number().min(0).max(10),

  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),

  bestFor: z.array(z.string()),
  notRecommendedFor: z.array(z.string()),

  keyHighlights: z.array(z.object({
    category: z.string(),
    highlight: z.string(),
  })),

  investmentPotential: z.enum(['Low', 'Medium', 'High']),
  investmentReasoning: z.string(),

  oneLineSummary: z.string(),
});

export interface LocationSummaryGeneratorProps {
  locationData: any;
  address: string;
  locale?: 'nl' | 'en';
}

export function LocationSummaryGenerator({
  locationData,
  address,
  locale = 'nl',
}: LocationSummaryGeneratorProps) {
  const { object, submit, isLoading, error, stop } = useObject({
    api: '/api/generate-location-summary',
    schema: locationSummarySchema,
  });

  const handleGenerate = () => {
    submit({ locationData, address });
  };

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      nl: {
        title: 'Locatie Samenvatting Genereren',
        generate: 'Genereer AI Samenvatting',
        generating: 'Genereren...',
        stop: 'Stop',
        overall: 'Algemeen',
        safety: 'Veiligheid',
        livability: 'Leefbaarheid',
        amenities: 'Voorzieningen',
        strengths: 'Sterke Punten',
        weaknesses: 'Zwakke Punten',
        bestFor: 'Geschikt Voor',
        notFor: 'Niet Geschikt Voor',
        highlights: 'Belangrijkste Punten',
        investment: 'Investerings Potentieel',
        summary: 'Samenvatting',
      },
      en: {
        title: 'Generate Location Summary',
        generate: 'Generate AI Summary',
        generating: 'Generating...',
        stop: 'Stop',
        overall: 'Overall',
        safety: 'Safety',
        livability: 'Livability',
        amenities: 'Amenities',
        strengths: 'Strengths',
        weaknesses: 'Weaknesses',
        bestFor: 'Best For',
        notFor: 'Not Recommended For',
        highlights: 'Key Highlights',
        investment: 'Investment Potential',
        summary: 'Summary',
      },
    };

    return translations[locale][key] || key;
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getInvestmentColor = (potential?: string) => {
    if (potential === 'High') return 'text-green-600';
    if (potential === 'Medium') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-base">
      <div className="space-y-base">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{t('title')}</h3>

          {!isLoading && !object && (
            <Button onClick={handleGenerate} variant="primary">
              {t('generate')}
            </Button>
          )}

          {isLoading && (
            <Button onClick={stop} variant="secondary">
              {t('stop')}
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-base bg-red-50 text-red-700 rounded-base border border-red-200">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !object && (
          <div className="flex items-center gap-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span>{t('generating')}</span>
          </div>
        )}

        {/* Generated Summary (streams in progressively) */}
        {object && (
          <div className="space-y-base">
            {/* One-line Summary */}
            {object.oneLineSummary && (
              <div className="p-base bg-primary/5 rounded-base border border-primary/20">
                <p className="text-lg font-medium text-gray-800">{object.oneLineSummary}</p>
              </div>
            )}

            {/* Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-base">
              <div className="p-sm bg-gray-50 rounded-base">
                <p className="text-sm text-gray-600">{t('overall')}</p>
                <p className={`text-2xl font-bold ${getScoreColor(object.overallScore)}`}>
                  {object.overallScore?.toFixed(1) || '-'}/10
                </p>
              </div>

              <div className="p-sm bg-gray-50 rounded-base">
                <p className="text-sm text-gray-600">{t('safety')}</p>
                <p className={`text-2xl font-bold ${getScoreColor(object.safetyScore)}`}>
                  {object.safetyScore?.toFixed(1) || '-'}/10
                </p>
              </div>

              <div className="p-sm bg-gray-50 rounded-base">
                <p className="text-sm text-gray-600">{t('livability')}</p>
                <p className={`text-2xl font-bold ${getScoreColor(object.livabilityScore)}`}>
                  {object.livabilityScore?.toFixed(1) || '-'}/10
                </p>
              </div>

              <div className="p-sm bg-gray-50 rounded-base">
                <p className="text-sm text-gray-600">{t('amenities')}</p>
                <p className={`text-2xl font-bold ${getScoreColor(object.amenitiesScore)}`}>
                  {object.amenitiesScore?.toFixed(1) || '-'}/10
                </p>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-base">
              {object.strengths && object.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-sm">{t('strengths')}</h4>
                  <ul className="space-y-xs">
                    {object.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-sm">
                        <span className="text-green-600 mt-1">✓</span>
                        <span className="text-sm text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {object.weaknesses && object.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-sm">{t('weaknesses')}</h4>
                  <ul className="space-y-xs">
                    {object.weaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-sm">
                        <span className="text-red-600 mt-1">✗</span>
                        <span className="text-sm text-gray-700">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Best For / Not For */}
            <div className="grid md:grid-cols-2 gap-base">
              {object.bestFor && object.bestFor.length > 0 && (
                <div className="p-sm bg-green-50 rounded-base border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-sm">{t('bestFor')}</h4>
                  <ul className="space-y-xs">
                    {object.bestFor.map((type, i) => (
                      <li key={i} className="text-sm text-green-700">• {type}</li>
                    ))}
                  </ul>
                </div>
              )}

              {object.notRecommendedFor && object.notRecommendedFor.length > 0 && (
                <div className="p-sm bg-red-50 rounded-base border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-sm">{t('notFor')}</h4>
                  <ul className="space-y-xs">
                    {object.notRecommendedFor.map((type, i) => (
                      <li key={i} className="text-sm text-red-700">• {type}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Key Highlights */}
            {object.keyHighlights && object.keyHighlights.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-sm">{t('highlights')}</h4>
                <div className="grid md:grid-cols-2 gap-sm">
                  {object.keyHighlights.map((highlight, i) => (
                    <div key={i} className="p-sm bg-blue-50 rounded-base border border-blue-200">
                      <p className="text-sm font-medium text-blue-900">{highlight.category}</p>
                      <p className="text-sm text-blue-700">{highlight.highlight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investment Potential */}
            {object.investmentPotential && (
              <div className="p-base bg-gray-50 rounded-base border border-gray-200">
                <div className="flex items-center justify-between mb-sm">
                  <h4 className="font-semibold text-gray-800">{t('investment')}</h4>
                  <span className={`text-lg font-bold ${getInvestmentColor(object.investmentPotential)}`}>
                    {object.investmentPotential}
                  </span>
                </div>
                {object.investmentReasoning && (
                  <p className="text-sm text-gray-700">{object.investmentReasoning}</p>
                )}
              </div>
            )}

            {/* Loading indicator for streaming */}
            {isLoading && (
              <div className="flex items-center gap-sm text-gray-500 text-sm">
                <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                <span>Streaming more details...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
