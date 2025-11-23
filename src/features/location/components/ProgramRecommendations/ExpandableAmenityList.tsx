/**
 * ExpandableAmenityList Component
 * Shows an arrow button that opens a modal to reveal all amenities in a category
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';

export interface AmenityOption {
  id: string;
  name: string;
  area_min_m2: number;
  area_max_m2: number;
  category: string;
}

export interface ExpandableAmenityListProps {
  amenities: AmenityOption[];
  locale?: 'nl' | 'en';
  className?: string;
}

export function ExpandableAmenityList({
  amenities,
  locale = 'nl',
  className,
}: ExpandableAmenityListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const translations = {
    nl: {
      viewAll: 'Bekijk alle opties',
      close: 'Sluiten',
      sizeRange: 'Grootte',
      allOptions: 'Alle Opties in Deze Categorie',
    },
    en: {
      viewAll: 'View all options',
      close: 'Close',
      sizeRange: 'Size range',
      allOptions: 'All Options in This Category',
    },
  };

  const t = translations[locale];

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (amenities.length === 0) {
    return null;
  }

  return (
    <>
      {/* Arrow Button */}
      <div className={cn('flex flex-col items-center', className)}>
        <button
          className="group cursor-pointer bg-transparent border-none p-2 m-0 focus:outline-none transition-transform duration-200 hover:scale-110"
          onClick={() => setIsOpen(true)}
          aria-label={t.viewAll}
        >
          <svg
            width="48"
            height="24"
            viewBox="0 0 48 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-all duration-200"
          >
            <path
              d="M16 8 L24 16 L16 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700 group-hover:text-gray-900"
            />
          </svg>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t.allOptions}</h2>
              <button
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-200"
                onClick={() => setIsOpen(false)}
                aria-label={t.close}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 6 L18 18 M18 6 L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {amenities.map((amenity) => (
                  <div
                    key={amenity.id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full overflow-hidden"
                  >
                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      {/* Header */}
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-900 text-sm mb-3">
                          {amenity.name}
                        </h3>

                        {/* Area banner */}
                        <div className="bg-gray-50 rounded p-2 mb-3">
                          <p className="text-xs text-gray-600 mb-1">{t.sizeRange}</p>
                          <p className="text-xs font-semibold text-gray-900">
                            {amenity.area_min_m2}m² - {amenity.area_max_m2}m²
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

ExpandableAmenityList.displayName = 'ExpandableAmenityList';

export default ExpandableAmenityList;
