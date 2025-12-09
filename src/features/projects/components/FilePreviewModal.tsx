'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';

interface FilePreviewModalProps {
  fileId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  isOpen: boolean;
  onClose: () => void;
  locale: 'nl' | 'en';
}

const translations = {
  nl: {
    preview: 'Voorbeeld',
    download: 'Downloaden',
    close: 'Sluiten',
    loading: 'Laden...',
    errorLoading: 'Fout bij laden voorbeeld',
    noPreview: 'Geen voorbeeld beschikbaar',
    size: 'Grootte',
    type: 'Type'
  },
  en: {
    preview: 'Preview',
    download: 'Download',
    close: 'Close',
    loading: 'Loading...',
    errorLoading: 'Failed to load preview',
    noPreview: 'No preview available',
    size: 'Size',
    type: 'Type'
  }
};

export function FilePreviewModal({
  fileId,
  fileName,
  fileType,
  mimeType,
  fileSize,
  isOpen,
  onClose,
  locale
}: FilePreviewModalProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[locale];

  useEffect(() => {
    if (isOpen) {
      fetchPresignedUrl();
    }
  }, [isOpen, fileId]);

  async function fetchPresignedUrl() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/files/${fileId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.errorLoading);
      }

      const data = await res.json();
      setPresignedUrl(data.url);
    } catch (err) {
      console.error('Failed to fetch presigned URL:', err);
      setError(err instanceof Error ? err.message : t.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  const canPreview = mimeType.startsWith('image/') || mimeType === 'application/pdf';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-lg">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-base border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{fileName}</h2>
              <div className="text-sm text-gray-600 mt-xs">
                {t.size}: {formatFileSize(fileSize)} • {t.type}: {fileType}
              </div>
            </div>

            <div className="flex items-center gap-sm ml-base">
              {presignedUrl && (
                <a
                  href={presignedUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="sm">
                    <svg className="w-5 h-5 mr-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    {t.download}
                  </Button>
                </a>
              )}

              <button
                onClick={onClose}
                className="p-sm rounded hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-base">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-base text-gray-600">{t.loading}</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="w-16 h-16 text-red-400 mx-auto mb-base" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            ) : presignedUrl && canPreview ? (
              <div className="h-full flex items-center justify-center">
                {mimeType.startsWith('image/') ? (
                  <img
                    src={presignedUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : mimeType === 'application/pdf' ? (
                  <iframe
                    src={presignedUrl}
                    className="w-full h-full min-h-[600px]"
                    title={fileName}
                  />
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-base" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600">{t.noPreview}</p>
                  {presignedUrl && (
                    <a
                      href={presignedUrl}
                      download={fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-base inline-block"
                    >
                      <Button variant="primary" size="sm">
                        {t.download}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
