// components/common/DensityChart.tsx - Distribution Chart Component

import React, { useEffect, useRef } from 'react';

interface DensityChartData {
  x: number;
  y: number;
}

interface DensityChartProps {
  data: DensityChartData[];
  width?: number;
  height?: number;
  mode?: 'area' | 'histogram'; // area = smooth line with fill, histogram = thin bars
  className?: string;
  showLabels?: boolean;
  showGrid?: boolean;
  title?: string;
}

// D3 type definitions
interface D3CurveFactory {
  // D3 curve factory type placeholder
  _brand?: 'D3CurveFactory';
}

interface D3CurveCardinal {
  tension: (tension: number) => D3CurveFactory;
}

interface D3Selection {
  selectAll: (selector: string) => D3Selection;
  data: (data: DensityChartData[] | number[][] | number[]) => D3Selection;
  enter: () => D3Selection;
  append: (element: string) => D3Selection;
  attr: (name: string, value: string | number | ((d: DensityChartData | number, i?: number) => string | number)) => D3Selection;
  style: (name: string, value: string | number) => D3Selection;
  text: (value: string | number | ((d: DensityChartData | number) => string | number)) => D3Selection;
  select: (selector: string) => D3Selection;
  remove: () => D3Selection;
  transition: () => D3Selection;
  duration: (ms: number) => D3Selection;
  call: (fn: (selection: D3Selection, ...args: unknown[]) => void, ...args: unknown[]) => D3Selection;
  datum: (data: DensityChartData[]) => D3Selection;
}

interface D3Scale {
  domain: {
    (): number[];
    (domain: number[]): D3Scale;
  };
  range: (range: number[]) => D3Scale;
  ticks: (count?: number) => number[];
  (value: number): number;
}

interface D3Line {
  x: (fn: (d: DensityChartData) => number) => D3Line;
  y: (fn: (d: DensityChartData) => number) => D3Line;
  curve: (curve: D3CurveFactory) => D3Line;
  (data: DensityChartData[]): string;
}

interface D3Area {
  x: (fn: (d: DensityChartData) => number) => D3Area;
  y0: (y: number) => D3Area;
  y1: (fn: (d: DensityChartData) => number) => D3Area;
  curve: (curve: D3CurveFactory) => D3Area;
  (data: DensityChartData[]): string;
}

interface D3Axis {
  (selection: D3Selection): void;
  scale: (scale: D3Scale) => D3Axis;
  ticks: (count: number) => D3Axis;
  tickFormat: (format: (d: number) => string) => D3Axis;
  tickSize: (size: number) => D3Axis;
}

interface D3Instance {
  select: (selector: string | Element) => D3Selection;
  scaleLinear: () => D3Scale;
  line: () => D3Line;
  area: () => D3Area;
  max: (data: DensityChartData[], accessor: (d: DensityChartData) => number) => number;
  axisBottom: (scale: D3Scale) => D3Axis;
  axisLeft: (scale: D3Scale) => D3Axis;
  curveMonotoneX: D3CurveFactory;
  curveCardinal: D3CurveCardinal;
}

/**
 * DensityChart - Distribution visualization component
 *
 * Features:
 * - Area mode: Smooth line with filled area below
 * - Histogram mode: Thin bars with no spacing
 * - Black and white styling for clarity
 * - Optional grid and labels
 * - Clean, minimal design focused on distribution
 *
 * @param props - Chart configuration and data
 * @returns JSX.Element The density chart component
 */
const DensityChart: React.FC<DensityChartProps> = ({
  data,
  width = 500,
  height = 300,
  mode = 'area',
  className = '',
  showLabels = true,
  showGrid = true,
  title
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data || data.length === 0) return;

    // D3 Loading with error handling
    const loadD3AndRender = async (): Promise<void> => {
      try {
        // Load D3 if not already loaded
        if (!window.d3) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
          script.async = true;

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load D3'));
            document.head.appendChild(script);
          });
        }

        // Clear previous render
        const d3 = window.d3 as unknown as D3Instance;
        d3.select(container).selectAll("*").remove();

        // Chart dimensions and margins
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Create SVG
        const svg = d3
          .select(container)
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('background', '#ffffff');

        const chartArea = svg
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Calculate scales
        const xExtent = [
          Math.min(...data.map(d => d.x)),
          Math.max(...data.map(d => d.x))
        ];
        const yExtent = [0, Math.max(...data.map(d => d.y))];

        const xScale = d3.scaleLinear()
          .domain(xExtent)
          .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
          .domain(yExtent)
          .range([chartHeight, 0]);

        // Add grid lines if enabled
        if (showGrid) {
          // Horizontal grid lines
          const yTicks = yScale.ticks(5);
          chartArea.selectAll('.grid-line-horizontal')
            .data(yTicks)
            .enter()
            .append('line')
            .attr('class', 'grid-line-horizontal')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', (d) => yScale(d as number))
            .attr('y2', (d) => yScale(d as number))
            .style('stroke', '#e5e5e5')
            .style('stroke-width', '1')
            .style('stroke-dasharray', '3,3');

          // Vertical grid lines
          const xTicks = xScale.ticks(8);
          chartArea.selectAll('.grid-line-vertical')
            .data(xTicks)
            .enter()
            .append('line')
            .attr('class', 'grid-line-vertical')
            .attr('x1', (d) => xScale(d as number))
            .attr('x2', (d) => xScale(d as number))
            .attr('y1', 0)
            .attr('y2', chartHeight)
            .style('stroke', '#e5e5e5')
            .style('stroke-width', '1')
            .style('stroke-dasharray', '3,3');
        }

        if (mode === 'area') {
          // Create area generator with smoother curve
          const area = d3.area()
            .x((d: DensityChartData) => xScale(d.x))
            .y0(chartHeight)
            .y1((d: DensityChartData) => yScale(d.y))
            .curve(d3.curveCardinal.tension(0.5));

          // Create line generator with smoother curve
          const line = d3.line()
            .x((d: DensityChartData) => xScale(d.x))
            .y((d: DensityChartData) => yScale(d.y))
            .curve(d3.curveCardinal.tension(0.5));

          // Add filled area
          chartArea
            .append('path')
            .datum(data)
            .attr('class', 'area')
            .attr('d', area(data))
            .style('fill', '#000000')
            .style('opacity', 0.15);

          // Add line
          chartArea
            .append('path')
            .datum(data)
            .attr('class', 'line')
            .attr('d', line(data))
            .style('fill', 'none')
            .style('stroke', '#000000')
            .style('stroke-width', '2')
            .style('stroke-linejoin', 'round')
            .style('stroke-linecap', 'round');
        } else {
          // Histogram mode - thin bars with no spacing
          const barWidth = chartWidth / data.length;

          chartArea.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d) => xScale((d as DensityChartData).x) - barWidth / 2)
            .attr('y', (d) => yScale((d as DensityChartData).y))
            .attr('width', barWidth)
            .attr('height', (d) => chartHeight - yScale((d as DensityChartData).y))
            .style('fill', '#000000')
            .style('opacity', 0.7)
            .style('stroke', 'none');
        }

        // Add only first and last labels on x-axis
        if (showLabels) {
          const xDomain = xScale.domain();
          const firstValue = xDomain[0];
          const lastValue = xDomain[1];

          // First label (left)
          chartArea
            .append('text')
            .attr('x', 0)
            .attr('y', chartHeight + 20)
            .attr('text-anchor', 'start')
            .style('font-size', '11px')
            .style('font-family', 'Arial, sans-serif')
            .style('fill', '#666666')
            .text(firstValue.toFixed(0));

          // Last label (right)
          chartArea
            .append('text')
            .attr('x', chartWidth)
            .attr('y', chartHeight + 20)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('font-family', 'Arial, sans-serif')
            .style('fill', '#666666')
            .text(lastValue.toFixed(0));
        }

        // Add title if provided
        if (title) {
          svg
            .append('text')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('font-family', 'Arial, sans-serif')
            .style('fill', '#000000')
            .text(title);
        }

      } catch (error) {
        console.error('Error rendering DensityChart:', error);
      }
    };

    loadD3AndRender();

    // Cleanup function
    return () => {
      if (container && window.d3) {
        (window.d3 as unknown as D3Instance).select(container).selectAll("*").remove();
      }
    };
  }, [data, width, height, mode, showLabels, showGrid, title]);

  return (
    <div
      ref={containerRef}
      className={`density-chart ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: width,
        height: height,
        overflow: 'visible',
        position: 'relative'
      }}
    />
  );
};

export default DensityChart;
export type { DensityChartData, DensityChartProps };
