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

import { useState, useMemo } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { formatRAGSourceText } from '@/lib/ai/rag/format-rag-tables';

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

  // Pre-format all source texts for better readability
  const formattedSources = useMemo(() => {
    return sources.map(source => ({
      ...source,
      formattedChunkText: formatRAGSourceText(source.chunkText),
    }));
  }, [sources]);

  const handleOpenDocument = async (fileId: string, fileName: string) => {
    try {
      // Fetch presigned URL from API
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) {
        console.error('Failed to get file URL');
        return;
      }
      const data = await response.json();
      if (data.url) {
        // Open document in new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
    }
  };

  if (!sources || sources.length === 0) return null;

  const t = {
    title: locale === 'nl' ? 'Bronnen' : 'Sources',
    showOriginal: locale === 'nl' ? 'Toon originele tekst' : 'Show original text',
    hideOriginal: locale === 'nl' ? 'Verberg' : 'Hide',
    relevance: locale === 'nl' ? 'Relevantie' : 'Relevance',
    page: locale === 'nl' ? 'Pagina' : 'Page',
    openDocument: locale === 'nl' ? 'Open document' : 'Open document',
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
        {formattedSources.map((source, i) => (
          <Card key={source.id} className="p-sm bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-start justify-between gap-sm">
              <div className="flex-1">
                <div className="flex items-center gap-sm text-sm flex-wrap">
                  {/* Source number */}
                  <span className="font-mono text-xs bg-primary text-white px-xs py-0 rounded font-semibold">
                    {i + 1}
                  </span>

                  {/* File name with link */}
                  <button
                    onClick={() => handleOpenDocument(source.fileId, source.sourceFile)}
                    className="font-medium text-primary hover:underline flex items-center gap-xs cursor-pointer transition-colors"
                    title={t.openDocument}
                  >
                    📄 {source.sourceFile}
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>

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
                  <div className="mt-sm p-sm bg-amber-50 rounded border-l-4 border-amber-400 shadow-sm">
                    <div className="flex items-center gap-xs text-xs text-amber-700 mb-xs font-semibold">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                      </svg>
                      {locale === 'nl' ? 'Directe citaat uit document:' : 'Direct quote from document:'}
                    </div>
                    <div
                      className="text-sm text-gray-800 leading-relaxed border-l-2 border-amber-300 pl-sm rag-content"
                      dangerouslySetInnerHTML={{ __html: source.formattedChunkText }}
                    />
                    <div className="mt-sm text-xs text-amber-600 flex items-center gap-xs">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      {locale === 'nl' ? 'Geverifieerde bron' : 'Verified source'}
                    </div>
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
      <div className="mt-sm p-sm bg-blue-50 border border-blue-200 rounded space-y-xs">
        <div className="flex items-start gap-xs">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div>
            <p className="text-xs text-blue-700 font-semibold">
              {locale === 'nl' ? 'Geverifieerd antwoord' : 'Verified answer'}
            </p>
            <p className="text-xs text-blue-600">
              {locale === 'nl'
                ? 'Het antwoord hierboven combineert informatie uit de getoonde bronnen. Directe citaten staan tussen de bronnen hieronder.'
                : 'The answer above combines information from the sources shown. Direct quotes are in the sources below.'
              }
            </p>
          </div>
        </div>
        <div className="flex items-start gap-xs border-t border-blue-200 pt-xs">
          <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2z"/>
          </svg>
          <p className="text-xs text-blue-600">
            {locale === 'nl'
              ? 'Klik op een bestandsnaam om het originele document te openen en de informatie te verifiëren.'
              : 'Click on a filename to open the original document and verify the information.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default MessageSources;
