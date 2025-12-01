/**
 * RadialProgressBar Component
 * Displays progress as a circular bar around the circumference (not from center outward)
 * Useful for showing percentages and scores as a circular progress indicator
 */

'use client';

import React from 'react';

export interface RadialProgressData {
  name: string;
  value: number;
  maxValue?: number;
  color?: string;
}

export interface RadialProgressBarProps {
  data: RadialProgressData[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  showPercentage?: boolean;
  className?: string;
}

const DEFAULT_COLOR = '#477638';
const BACKGROUND_COLOR = '#e5e7eb';

export function RadialProgressBar({
  data,
  width = 300,
  height = 300,
  strokeWidth = 20,
  showLabels = true,
  showPercentage = true,
  className = '',
}: RadialProgressBarProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - strokeWidth / 2 - 10;

  // Calculate total value for percentage
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const totalMaxValue = data.reduce((sum, item) => sum + (item.maxValue || item.value), 0);
  const percentage = totalMaxValue > 0 ? (totalValue / totalMaxValue) * 100 : 0;

  // Calculate circumference
  const circumference = 2 * Math.PI * radius;

  // Create progress rings for each data item
  const rings = data.map((item, index) => {
    const maxValue = item.maxValue || item.value;
    const progress = maxValue > 0 ? item.value / maxValue : 0;
    const strokeDashoffset = circumference * (1 - progress);
    const color = item.color || DEFAULT_COLOR;

    // Stack rings from inside out
    const ringRadius = radius - index * (strokeWidth + 5);
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringStrokeDashoffset = ringCircumference * (1 - progress);

    return {
      ...item,
      radius: ringRadius,
      circumference: ringCircumference,
      strokeDashoffset: ringStrokeDashoffset,
      progress,
      color,
    };
  });

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      style={{ width: 'fit-content' }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="transform -rotate-90"
      >
        {/* Background circles for each ring */}
        {rings.map((ring, index) => (
          <circle
            key={`bg-${index}`}
            cx={centerX}
            cy={centerY}
            r={ring.radius}
            stroke={BACKGROUND_COLOR}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {/* Progress circles for each ring */}
        {rings.map((ring, index) => (
          <circle
            key={`progress-${index}`}
            cx={centerX}
            cy={centerY}
            r={ring.radius}
            stroke={ring.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={ring.circumference}
            strokeDashoffset={ring.strokeDashoffset}
            className="transition-all duration-500 ease-out"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
            }}
          />
        ))}

        {/* Center percentage text */}
        {showPercentage && (
          <g className="transform rotate-90" style={{ transformOrigin: `${centerX}px ${centerY}px` }}>
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-bold text-gray-900"
              style={{ fontSize: `${Math.min(width, height) / 6}px` }}
            >
              {percentage.toFixed(0)}%
            </text>
          </g>
        )}
      </svg>

      {/* Labels below the chart */}
      {showLabels && data.length > 0 && (
        <div className="mt-4 space-y-2" style={{ width: `${width}px` }}>
          {data.map((item, index) => {
            const itemMaxValue = item.maxValue || item.value;
            const itemPercentage = itemMaxValue > 0 ? (item.value / itemMaxValue) * 100 : 0;

            return (
              <div
                key={index}
                className="flex items-center justify-between text-sm gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color || DEFAULT_COLOR }}
                  />
                  <span className="text-gray-700 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900 flex-shrink-0">
                  {itemPercentage.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

RadialProgressBar.displayName = 'RadialProgressBar';

export default RadialProgressBar;
