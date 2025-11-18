/**
 * Expand Button Component
 * Shared button for expanding/collapsing sections
 */

'use client';

import React from 'react';

export interface ExpandButtonProps {
  isExpanded: boolean;
  onClick: () => void;
}

export const ExpandButton: React.FC<ExpandButtonProps> = ({ isExpanded, onClick }) => {
  return (
    <div className="flex-shrink-0 flex items-center">
      <button
        onClick={onClick}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};
