/**
 * ImageLightbox Component
 *
 * Full-screen image viewer modal
 * Features:
 * - Dark backdrop
 * - Centered image with max-width/max-height
 * - Close button (X) and backdrop click
 * - ESC key to close
 * - Download button
 * - Zoom controls (optional)
 */

'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface ImageLightboxProps {
  imageUrl: string | URL;
  isOpen: boolean;
  onClose: () => void;
  fileName?: string; // For download
  locale: 'nl' | 'en';
}

export function ImageLightbox({
  imageUrl,
  isOpen,
  onClose,
  fileName,
  locale,
}: ImageLightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrlString = typeof imageUrl === 'string' ? imageUrl : imageUrl.toString();

  const translations = {
    nl: {
      close: 'Sluiten',
      download: 'Downloaden',
      loading: 'Afbeelding laden...',
      error: 'Kan afbeelding niet laden',
      retry: 'Opnieuw proberen',
    },
    en: {
      close: 'Close',
      download: 'Download',
      loading: 'Loading image...',
      error: 'Failed to load image',
      retry: 'Retry',
    },
  };

  const t = translations[locale];

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset loading/error state when image changes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [imageUrlString, isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the image
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrlString);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[ImageLightbox] Download error:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className={cn(
          'absolute top-4 right-4 z-10',
          'p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20',
          'text-white transition-all',
          'focus:outline-none focus:ring-2 focus:ring-white'
        )}
        title={t.close}
      >
        <svg
          className="w-6 h-6"
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

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className={cn(
          'absolute top-4 right-16 z-10',
          'p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20',
          'text-white transition-all',
          'focus:outline-none focus:ring-2 focus:ring-white'
        )}
        title={t.download}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </button>

      {/* Image Container */}
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {/* Loading State */}
        {isLoading && !hasError && (
          <div className="flex items-center justify-center min-w-[200px] min-h-[200px]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">{t.loading}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="flex items-center justify-center min-w-[200px] min-h-[200px] bg-gray-800 rounded-lg p-8">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-white text-sm mb-4">{t.error}</p>
              <button
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.retry}
              </button>
            </div>
          </div>
        )}

        {/* Image */}
        <img
          src={imageUrlString}
          alt={fileName || 'Image'}
          className={cn(
            'max-w-full max-h-[90vh] object-contain rounded-lg',
            isLoading && 'hidden',
            hasError && 'hidden'
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
        />
      </div>

      {/* Keyboard Hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-white text-sm opacity-70">
          {locale === 'nl' ? 'Druk op ESC om te sluiten' : 'Press ESC to close'}
        </p>
      </div>
    </div>
  );
}

export default ImageLightbox;
