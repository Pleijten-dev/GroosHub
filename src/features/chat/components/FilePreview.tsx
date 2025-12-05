/**
 * FilePreview Component
 *
 * Displays a preview of an uploaded file with metadata and remove button
 * Supports images (thumbnail) and PDFs (icon)
 */

'use client';

import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { formatFileSize } from '@/lib/storage/file-validation';

export interface FilePreviewProps {
  file: {
    id?: string; // Undefined during upload
    name: string;
    type: string; // 'image' or 'pdf'
    mimeType: string;
    size: number;
    previewUrl?: string; // For image thumbnails or presigned URLs
  };
  onRemove: () => void;
  uploading?: boolean;
  uploadProgress?: number; // 0-100
  error?: string;
  locale: 'nl' | 'en';
}

export function FilePreview({
  file,
  onRemove,
  uploading = false,
  uploadProgress = 0,
  error,
  locale,
}: FilePreviewProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  const translations = {
    nl: {
      uploading: 'Uploaden...',
      remove: 'Verwijderen',
      retry: 'Opnieuw proberen',
      imageLoadError: 'Afbeelding kan niet worden geladen',
    },
    en: {
      uploading: 'Uploading...',
      remove: 'Remove',
      retry: 'Retry',
      imageLoadError: 'Failed to load image',
    },
  };

  const t = translations[locale];

  const isImage = file.type === 'image';
  const isPdf = file.type === 'pdf';

  return (
    <div
      className={cn(
        'relative flex items-center gap-sm p-sm rounded-md border bg-white',
        error ? 'border-red-300 bg-red-50' : 'border-gray-200',
        uploading && 'opacity-70'
      )}
    >
      {/* File Icon/Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
        {isImage && file.previewUrl && !imageLoadError ? (
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => setImageLoadError(true)}
          />
        ) : isPdf ? (
          // PDF Icon (SVG)
          <svg
            className="w-6 h-6 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Generic File Icon
          <svg
            className="w-6 h-6 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* File Metadata */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          {uploading && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <p className="text-xs text-blue-600">{uploadProgress}%</p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}

        {/* Image Load Error */}
        {imageLoadError && (
          <p className="text-xs text-orange-600 mt-1">{t.imageLoadError}</p>
        )}
      </div>

      {/* Loading Spinner or Remove Button */}
      {uploading ? (
        <div className="flex-shrink-0">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          disabled={uploading}
          className={cn(
            'flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
          title={t.remove}
        >
          {/* X Icon */}
          <svg
            className="w-4 h-4 text-gray-500 hover:text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Success Checkmark Overlay */}
      {file.id && !uploading && !error && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default FilePreview;
