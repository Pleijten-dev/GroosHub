/**
 * ImageAttachment Component
 *
 * Displays an image attachment within a message bubble
 * Click to open in lightbox (full-screen view)
 */

'use client';

import { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrlString = typeof imageUrl === 'string' ? imageUrl : imageUrl.toString();

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer',
        'hover:opacity-90 transition-opacity',
        'border border-gray-200 shadow-sm',
        'bg-gray-100' // Ensure background is visible
      )}
      style={{ maxWidth: `${maxWidth}px`, minHeight: isLoading ? '100px' : 'auto' }}
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

      {/* Image - removed lazy loading for data URLs */}
      <img
        src={imageUrlString}
        alt={alt}
        className={cn(
          'w-full h-auto block',
          isLoading && 'invisible',
          hasError && 'hidden'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
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
