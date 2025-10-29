// components/common/BarChart.tsx - Reusable Bar Chart Component

import React, { useEffect, useRef } from 'react';

interface BarChartData {
  name: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
  minValue?: number;  // NEW: Allow custom minimum value (for negative ranges)
  maxValue?: number;  // NEW: Allow custom maximum value
  className?: string;
  onBarHover?: (barName: string | null) => void;
  showLabels?: boolean;
  showAverageLine?: boolean;
  barSpacing?: number;
}

// D3 type definitions specific to BarChart to avoid conflicts with RadialChart
interface D3Selection {
  selectAll: (selector: string) => D3Selection;
  data: (data: BarChartData[]) => D3Selection;
  enter: () => D3Selection;
  append: (element: string) => D3Selection;
  attr: (name: string, value: string | number | ((d: BarChartData) => string | number)) => D3Selection;
  style: (name: string, value: string | number | ((d: BarChartData) => string)) => D3Selection;
  text: (value: string | number | ((d: BarChartData) => string | number)) => D3Selection;
  on: (event: string, handler: (event: Event, d: BarChartData) => void) => D3Selection;
  select: (selector: string) => D3Selection;
  transition: () => D3Selection;
  duration: (ms: number) => D3Selection;
  each: (fn: (d: BarChartData, i: number, nodes: Element[]) => void) => D3Selection;
  filter: (fn: (d: BarChartData) => boolean) => D3Selection;
  remove: () => D3Selection;
}

interface D3Scale {
  domain: (domain: (string | number)[]) => D3Scale;
  range: (range: number[]) => D3Scale;
  padding: (padding: number) => D3Scale;
  bandwidth: () => number;
  (value: string | number): number;
}

interface D3Instance {
  select: (selector: string | Element) => D3Selection;
  scaleBand: () => D3Scale;
  scaleLinear: () => D3Scale;
  max: (data: BarChartData[], accessor: (d: BarChartData) => number) => number;
}

/**
 * BarChart - Reusable bar chart component matching RadialChart styling
 *
 * Features:
 * - Consistent styling with RadialChart component
 * - Interactive hover effects with callbacks
 * - Customizable dimensions and colors
 * - Optional average line display
 * - Responsive design with proper scaling
 * - Same label styling as RadialChart (black text, Arial font)
 *
 * @param props - Chart configuration and data
 * @returns JSX.Element The bar chart component
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 600,
  height = 400,
  minValue,
  maxValue,
  className = '',
  onBarHover,
  showLabels = true,
  showAverageLine = true,
  barSpacing = 0.02
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
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Calculate min/max values - handle negative ranges
        const dataMin = Math.min(...data.map((d: BarChartData) => d.value));
        const dataMax = Math.max(...data.map((d: BarChartData) => d.value));

        const calculatedMinValue = minValue ?? Math.min(dataMin, 0);
        const calculatedMaxValue = maxValue ?? Math.max(dataMax, 100);

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

        // Scales - handle negative to positive ranges
        const xScale = d3.scaleBand()
          .domain(data.map((d: BarChartData) => d.name))
          .range([0, chartWidth])
          .padding(barSpacing);

        const yScale = d3.scaleLinear()
          .domain([calculatedMinValue, calculatedMaxValue])
          .range([chartHeight, 0]);

        // Calculate zero line position (important for negative values)
        const zeroY = yScale(0);

        // Create bar groups for animation
        const barGroups = chartArea
          .selectAll(".bar-group")
          .data(data)
          .enter().append("g")
          .attr("class", "bar-group")
          .attr("transform", (d: BarChartData) => `translate(${xScale(d.name)}, 0)`)
          .style("transform-origin", `${xScale.bandwidth() / 2}px ${zeroY}px`)
          .style("cursor", "pointer")
          .on("mouseover", function(this: SVGGElement, event: Event, d: BarChartData) {
            // Prevent event from bubbling up
            event.stopPropagation();

            const hoveredGroup = d3.select(this);
            const hoveredIndex = data.indexOf(d);

            // Trigger hover callback
            if (onBarHover) {
              onBarHover(d.name);
            }

            // Scale up hovered bar from bottom center
            hoveredGroup
              .transition()
              .duration(200)
              .style("transform", `translate(${xScale(d.name)}px, 0px) scale(1.1, 1.1)`);

            // Move other bars outward with minimal movement
            chartArea.selectAll(".bar-group")
              .filter(function(barData: BarChartData) { return barData !== d; })
              .each(function(this: SVGGElement, barData: BarChartData) {
                const barIndex = data.indexOf(barData);
                const group = d3.select(this);

                const direction = barIndex < hoveredIndex ? -1 : 1;
                const moveDistance = direction * 4;

                group
                  .transition()
                  .duration(200)
                  .style("transform", `translate(${xScale(barData.name) + moveDistance}px, 0px) scale(1, 1)`);
              });

            // Hide average line
            if (showAverageLine) {
              chartArea.select(".average-line")
                .transition()
                .duration(200)
                .style("opacity", 0);
            }
          })
          .on("mouseout", function(this: SVGGElement) {
            // Trigger hover callback to clear
            if (onBarHover) {
              onBarHover(null);
            }

            // Reset all bars to original position and scale
            chartArea.selectAll(".bar-group")
              .transition()
              .duration(200)
              .style("transform", (barData: BarChartData) =>
                `translate(${xScale(barData.name)}px, 0px) scale(1, 1)`);

            // Show average line
            if (showAverageLine) {
              chartArea.select(".average-line")
                .transition()
                .duration(200)
                .style("opacity", 1);
            }
          });

        // Add background bars (full range) - matching RadialChart gray background
        barGroups
          .append("rect")
          .attr("class", "background-bar")
          .attr("x", 0)
          .attr("y", yScale(calculatedMaxValue))
          .attr("width", xScale.bandwidth())
          .attr("height", yScale(calculatedMinValue) - yScale(calculatedMaxValue))
          .attr("rx", 12)
          .attr("ry", 12)
          .style("fill", "#ACACAC")
          .style("opacity", 0.3);

        // Add foreground bars (difference values - can be positive or negative)
        barGroups
          .append("rect")
          .attr("class", "bar")
          .attr("x", 0)
          .attr("y", (d: BarChartData) => {
            // Clamp values to bounds for visual representation
            const clampedValue = Math.max(calculatedMinValue, Math.min(calculatedMaxValue, d.value));
            return clampedValue >= 0 ? yScale(clampedValue) : zeroY;
          })
          .attr("width", xScale.bandwidth())
          .attr("height", (d: BarChartData) => {
            // Clamp values to bounds for visual representation
            const clampedValue = Math.max(calculatedMinValue, Math.min(calculatedMaxValue, d.value));
            return Math.abs(yScale(clampedValue) - zeroY);
          })
          .attr("rx", 12)
          .attr("ry", 12)
          .style("fill", (d: BarChartData) => d.color) // Always use original color
          .style("opacity", 0.9)
          .style("stroke", "none") // Remove border
          .style("stroke-width", "0px");

        // Add out-of-bounds indicators for extreme values
        barGroups
          .filter((d: BarChartData) => d.value < calculatedMinValue || d.value > calculatedMaxValue)
          .append("text")
          .attr("class", "out-of-bounds-indicator")
          .attr("x", xScale.bandwidth() / 2)
          .attr("y", (d: BarChartData) => {
            // Position triangle above the label, not intersecting with it
            return d.value > calculatedMaxValue
              ? yScale(calculatedMaxValue) - 25  // Above max boundary and above label
              : yScale(calculatedMinValue) + 35; // Below min boundary and below label
          })
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("font-weight", "bold")
          .style("fill", "#ff9800")
          .style("pointer-events", "none")
          .text("⚠");

        // Add labels if enabled - matching RadialChart label styling exactly
        if (showLabels) {
          const labelGroups = barGroups
            .append("g")
            .attr("class", "label-group")
            .attr("transform", (d: BarChartData) => {
              // For out-of-bounds values, position labels within chart bounds
              const isOutOfBounds = d.value < calculatedMinValue || d.value > calculatedMaxValue;

              if (isOutOfBounds) {
                // Position at the clamped boundary + offset
                const labelY = d.value > calculatedMaxValue
                  ? yScale(calculatedMaxValue) - 5  // Above max boundary
                  : yScale(calculatedMinValue) + 20; // Below min boundary
                return `translate(${xScale.bandwidth() / 2}, ${labelY})`;
              } else {
                // Normal positioning - above positive bars, below negative bars
                const labelY = d.value >= 0 ? yScale(d.value) - 5 : yScale(d.value) + 20;
                return `translate(${xScale.bandwidth() / 2}, ${labelY})`;
              }
            });

          // Add score labels - matching RadialChart exactly
          labelGroups
            .append("text")
            .attr("class", "value-label")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 0)
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "#292928") // Same black color as RadialChart
            .style("font-family", "Arial, sans-serif")
            .style("pointer-events", "none")
            .text((d: BarChartData) => d.value.toFixed(1));

          // Add title labels - matching RadialChart exactly
          labelGroups
            .append("text")
            .attr("class", "label")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 6) // 6px below the score, same as RadialChart
            .style("font-size", "5.5px")
            .style("font-weight", "500")
            .style("fill", "#292928") // Same black color as RadialChart
            .style("font-family", "Arial, sans-serif")
            .style("pointer-events", "none")
            .text((d: BarChartData) => d.name);
        }

        // Add zero line (reference line at 0 for difference charts)
        if (showAverageLine) {
          chartArea
            .append("line")
            .attr("class", "average-line")
            .attr("x1", 0)
            .attr("y1", zeroY)
            .attr("x2", chartWidth)
            .attr("y2", zeroY)
            .style("stroke", "#ffffff")
            .style("stroke-width", "0.5")
            .style("stroke-opacity", "1.0")
            .style("stroke-dasharray", "15,5")
            .style("pointer-events", "none");
        }

      } catch (error) {
        console.error('Error rendering BarChart:', error);
      }
    };

    loadD3AndRender();

    // Cleanup function
    return () => {
      if (container && window.d3) {
        (window.d3 as unknown as D3Instance).select(container).selectAll("*").remove();
      }
    };
  }, [data, width, height, minValue, maxValue, onBarHover, showLabels, showAverageLine, barSpacing]);

  return (
    <div
      ref={containerRef}
      className={`bar-chart ${className}`}
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

export default BarChart;
export type { BarChartData, BarChartProps };
