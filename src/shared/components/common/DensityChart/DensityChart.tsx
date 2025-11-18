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
  tooltipLabels?: string[]; // Labels for tooltips, indexed by x value
  customAxisLabels?: { start: string; end: string }; // Custom labels for x-axis start and end
  maxY?: number; // Optional fixed max Y value for consistent scales across multiple charts
}

// D3 type definitions
interface D3CurveFactory {
  // D3 curve factory type placeholder
  _brand?: 'D3CurveFactory';
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
  on: (event: string, handler: ((this: Element, event: MouseEvent, d: unknown) => void) | null) => D3Selection;
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
  curveBasis: D3CurveFactory;
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
  title,
  tooltipLabels,
  customAxisLabels,
  maxY
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
          .style('background', 'transparent');

        const chartArea = svg
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // Calculate scales
        const xExtent = [
          Math.min(...data.map(d => d.x)),
          Math.max(...data.map(d => d.x))
        ];
        // Use maxY if provided, otherwise calculate from data
        const yMax = maxY !== undefined ? maxY : Math.max(...data.map(d => d.y));
        const yExtent = [0, yMax];

        const xScale = d3.scaleLinear()
          .domain(xExtent)
          .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
          .domain(yExtent)
          .range([chartHeight, 0]);

        if (mode === 'area') {
          // Create area generator with very smooth curve
          const area = d3.area()
            .x((d: DensityChartData) => xScale(d.x))
            .y0(chartHeight)
            .y1((d: DensityChartData) => yScale(d.y))
            .curve(d3.curveBasis);

          // Create line generator with very smooth curve
          const line = d3.line()
            .x((d: DensityChartData) => xScale(d.x))
            .y((d: DensityChartData) => yScale(d.y))
            .curve(d3.curveBasis);

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
          // Histogram mode - bars with fixed spacing
          const spacing = 3; // Fixed spacing between bars in pixels
          const totalSpacing = spacing * (data.length - 1);
          const barWidth = (chartWidth - totalSpacing) / data.length;

          // Create tooltip div if tooltipLabels provided
          let tooltip: HTMLDivElement | null = null;
          if (tooltipLabels) {
            tooltip = document.createElement('div');
            tooltip.className = 'density-chart-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.padding = '8px 12px';
            tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
            tooltip.style.color = 'white';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '13px';
            tooltip.style.fontWeight = '500';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.15s ease-in-out';
            tooltip.style.zIndex = '9999';
            tooltip.style.whiteSpace = 'nowrap';
            tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            container.appendChild(tooltip);
          }

          chartArea.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', (d, i) => (i as number) * (barWidth + spacing))
            .attr('y', (d) => yScale((d as DensityChartData).y))
            .attr('width', barWidth)
            .attr('height', (d) => chartHeight - yScale((d as DensityChartData).y))
            .style('fill', '#000000')
            .style('opacity', 0.7)
            .style('stroke', 'none')
            .on('mouseenter', function(event: MouseEvent, d: unknown) {
              if (tooltip && tooltipLabels) {
                const dataPoint = d as DensityChartData;
                const index = Math.round(dataPoint.x);
                const label = tooltipLabels[index];
                if (label) {
                  tooltip.textContent = `${label}: ${dataPoint.y.toFixed(1)}%`;
                  tooltip.style.opacity = '1';
                  tooltip.style.display = 'block';

                  // Position tooltip near mouse
                  const rect = container.getBoundingClientRect();
                  tooltip.style.left = `${event.clientX - rect.left + 10}px`;
                  tooltip.style.top = `${event.clientY - rect.top - 30}px`;
                }
              }
              // Highlight bar on hover
              d3.select(this as Element).style('opacity', 1);
            })
            .on('mousemove', function(event: MouseEvent) {
              if (tooltip) {
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${event.clientX - rect.left + 10}px`;
                tooltip.style.top = `${event.clientY - rect.top - 30}px`;
              }
            })
            .on('mouseleave', function() {
              if (tooltip) {
                tooltip.style.opacity = '0';
                // Hide after transition
                setTimeout(() => {
                  if (tooltip) tooltip.style.display = 'none';
                }, 200);
              }
              // Reset bar opacity
              d3.select(this as Element).style('opacity', 0.7);
            });
        }

        // Add only first and last labels on x-axis
        if (showLabels) {
          const xDomain = xScale.domain();
          const firstValue = xDomain[0];
          const lastValue = xDomain[1];

          // Use custom labels if provided, otherwise use numeric values
          const firstLabel = customAxisLabels?.start || firstValue.toFixed(0);
          const lastLabel = customAxisLabels?.end || lastValue.toFixed(0);

          // First label (left)
          chartArea
            .append('text')
            .attr('x', 0)
            .attr('y', chartHeight + 20)
            .attr('text-anchor', 'start')
            .style('font-size', '11px')
            .style('font-family', 'Arial, sans-serif')
            .style('fill', '#666666')
            .text(firstLabel);

          // Last label (right)
          chartArea
            .append('text')
            .attr('x', chartWidth)
            .attr('y', chartHeight + 20)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('font-family', 'Arial, sans-serif')
            .style('fill', '#666666')
            .text(lastLabel);
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
      // Clean up any tooltip divs
      if (container) {
        const tooltips = container.querySelectorAll('.density-chart-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
      }
    };
  }, [data, width, height, mode, showLabels, showGrid, title, tooltipLabels, customAxisLabels, maxY]);

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
