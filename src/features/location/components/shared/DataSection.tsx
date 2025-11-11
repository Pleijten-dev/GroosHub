/**
 * Data Section Component
 * Shared layout for sections displaying title, description, and content
 */

'use client';

import React from 'react';

export interface DataSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  expandButton?: React.ReactNode;
  className?: string;
}

export const DataSection: React.FC<DataSectionProps> = ({
  title,
  description,
  children,
  expandButton,
  className = ''
}) => {
  return (
    <div className={`flex gap-4 py-6 border-b border-gray-200 last:border-b-0 ${className}`}>
      {/* Title - 25% width */}
      <div className="w-1/4 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>

      {/* Description - 20% width */}
      <div className="w-1/5 flex-shrink-0">
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Content area - remaining space */}
      {children}

      {/* Optional expand button */}
      {expandButton}
    </div>
  );
};
