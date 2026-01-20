/**
 * ImageAttachment Component
 *
 * Displays an image attachment within a message bubble
 * Click to open in lightbox (full-screen view)
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';

export interface ImageAttachmentProps {
  imageUrl: string | URL;
  onClick: () => void;
  maxWidth?: number; // Default: 300px
  alt?: string;
}

export function ImageAttachment({
  imageUrl,
  onClick,
  maxWidth = 120,
  alt = 'Attached image',
}: ImageAttachmentProps) {
  const imageUrlString = typeof imageUrl === 'string' ? imageUrl : imageUrl.toString();

  // Detect URL type for proper handling
  const isDataUrl = imageUrlString.startsWith('data:');
  const isBlobUrl = imageUrlString.startsWith('blob:');
  const isHttpUrl = imageUrlString.startsWith('http');

  // Debug logging
  useEffect(() => {
    const urlType = isDataUrl ? 'data URL' : isBlobUrl ? 'blob URL' : isHttpUrl ? 'HTTP URL' : 'unknown';
    const urlPreview = imageUrlString.length > 100
      ? `${imageUrlString.substring(0, 100)}...`
      : imageUrlString;
    console.log(`[ImageAttachment] URL type: ${urlType}, preview: ${urlPreview}`);
  }, [imageUrlString, isDataUrl, isBlobUrl, isHttpUrl]);

  // Data URLs and blob URLs should be instantly available
  const instantLoad = isDataUrl || isBlobUrl;
  const [isLoading, setIsLoading] = useState(!instantLoad);
  const [hasError, setHasError] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  // Fallback timeout: force show image after 2 seconds if onLoad doesn't fire
  useEffect(() => {
    if (!instantLoad && isLoading) {
      const timeout = setTimeout(() => {
        console.log('[ImageAttachment] Timeout: forcing image to show');
        setIsLoading(false);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [instantLoad, isLoading]);

  // Check for empty or invalid URL
  const isValidUrl = imageUrlString && imageUrlString.length > 0 && (isDataUrl || isBlobUrl || isHttpUrl);

  if (!isValidUrl) {
    console.error('[ImageAttachment] Invalid URL provided:', imageUrlString?.substring(0, 50));
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 p-4"
        style={{ maxWidth: `${maxWidth}px`, minHeight: '60px' }}
      >
        <div className="text-center">
          <svg
            className="w-6 h-6 text-gray-400 mx-auto mb-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-gray-500">No image</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer',
        'hover:opacity-90 transition-opacity',
        'border border-gray-200 shadow-sm',
        'bg-white' // Use white background for better image visibility
      )}
      style={{ maxWidth: `${maxWidth}px`, minHeight: '60px' }}
      onClick={onClick}
    >
      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="flex items-center justify-center bg-gray-100 p-4 min-h-[100px]">
          <div className="text-center">
            <svg
              className="w-8 h-8 text-gray-400 mx-auto mb-2"
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
            <p className="text-xs text-gray-600">Failed to load</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHasError(false);
                setIsLoading(true);
              }}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Image - instant load for data/blob URLs */}
      <img
        src={imageUrlString}
        alt={alt}
        className={cn(
          'w-full h-auto block',
          isLoading && 'opacity-0 absolute',
          hasError && 'hidden'
        )}
        style={{
          minHeight: '60px',
          maxHeight: '200px',
          objectFit: 'contain',
        }}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          const dims = { width: img.naturalWidth, height: img.naturalHeight };
          console.log(`[ImageAttachment] Image loaded: ${dims.width}x${dims.height}`);
          setNaturalDimensions(dims);
          setIsLoading(false);

          // Warn if image has 0 dimensions (likely broken)
          if (dims.width === 0 || dims.height === 0) {
            console.warn('[ImageAttachment] Image has 0 dimensions - may be broken');
          }
        }}
        onError={(e) => {
          console.error('[ImageAttachment] Image failed to load:', imageUrlString.substring(0, 100));
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Click Hint Overlay */}
      {!isLoading && !hasError && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
          <div className="opacity-0 hover:opacity-100 transition-opacity">
            <svg
              className="w-8 h-8 text-white drop-shadow-lg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageAttachment;
