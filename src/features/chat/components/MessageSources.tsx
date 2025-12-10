/**
 * MessageSources Component
 *
 * Displays RAG sources (retrieved chunks) attached to assistant messages.
 * Shows file names, page numbers, similarity scores, and allows viewing
 * the original text for verification.
 *
 * This component prevents AI hallucinations by allowing users to verify
 * that the AI's response is grounded in the actual source documents.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

export interface RAGSource {
  id: string;
  sourceFile: string;
  pageNumber?: number | null;
  chunkText: string;
  similarity: number;
  fileId: string;
}

export interface MessageSourcesProps {
  sources: RAGSource[];
  locale: 'nl' | 'en';
}

export function MessageSources({ sources, locale }: MessageSourcesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!sources || sources.length === 0) return null;

  const t = {
    title: locale === 'nl' ? 'Bronnen' : 'Sources',
    showOriginal: locale === 'nl' ? 'Toon originele tekst' : 'Show original text',
    hideOriginal: locale === 'nl' ? 'Verberg' : 'Hide',
    relevance: locale === 'nl' ? 'Relevantie' : 'Relevance',
    page: locale === 'nl' ? 'Pagina' : 'Page',
    verifyInfo: locale === 'nl'
      ? 'Klik op "Toon originele tekst" om te verifiëren dat het antwoord correct is'
      : 'Click "Show original text" to verify the answer is accurate'
  };

  return (
    <div className="mt-base border-t border-gray-200 pt-base">
      <div className="flex items-center gap-sm mb-sm">
        <h4 className="text-sm font-semibold text-gray-700">
          📚 {t.title}
        </h4>
        <span className="text-xs text-gray-500">
          ({sources.length} {sources.length === 1 ? (locale === 'nl' ? 'bron' : 'source') : (locale === 'nl' ? 'bronnen' : 'sources')})
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-sm">
        💡 {t.verifyInfo}
      </p>

      <div className="space-y-sm">
        {sources.map((source, i) => (
          <Card key={source.id} className="p-sm bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between gap-sm">
              <div className="flex-1">
                <div className="flex items-center gap-sm text-sm flex-wrap">
                  {/* Source number */}
                  <span className="font-mono text-xs bg-primary text-white px-xs py-0 rounded font-semibold">
                    {i + 1}
                  </span>

                  {/* File name */}
                  <span className="font-medium text-gray-900">
                    📄 {source.sourceFile}
                  </span>

                  {/* Page number if available */}
                  {source.pageNumber && (
                    <span className="text-gray-600 text-xs">
                      {t.page} {source.pageNumber}
                    </span>
                  )}

                  {/* Similarity score */}
                  <span className="text-xs text-gray-500 ml-auto">
                    {t.relevance}: <span className="font-semibold text-primary">
                      {(source.similarity * 100).toFixed(0)}%
                    </span>
                  </span>
                </div>

                {/* Expanded original text */}
                {expandedId === source.id && (
                  <div className="mt-sm p-sm bg-white rounded border border-gray-300 shadow-sm">
                    <div className="text-xs text-gray-500 mb-xs font-semibold">
                      {locale === 'nl' ? 'Originele tekst uit document:' : 'Original text from document:'}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {source.chunkText}
                    </p>
                  </div>
                )}
              </div>

              {/* Toggle button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                className="flex-shrink-0"
              >
                {expandedId === source.id ? '▲' : '▼'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Footer help text */}
      <div className="mt-sm p-sm bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">
            {locale === 'nl' ? '✓ Geverifieerd antwoord' : '✓ Verified answer'}
          </span>
          {' - '}
          {locale === 'nl'
            ? 'Dit antwoord is gebaseerd op de bovenstaande documenten uit je project.'
            : 'This answer is based on the documents above from your project.'
          }
        </p>
      </div>
    </div>
  );
}

export default MessageSources;
