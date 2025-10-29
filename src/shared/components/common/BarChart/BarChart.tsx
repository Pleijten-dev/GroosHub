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

        // Helpers for ids + stable randomness (same as RadialChart)
        const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const seeded = (seed: string) => {
          let h = 2166136261;
          for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
          return (mod: number, off = 0) => ((Math.abs(Math.sin(h++)) % 1) * mod) + off;
        };

        // Noise texture controls (same as RadialChart)
        const NOISE_SCALE = 0.001;
        const NOISE_BLACK = 0.3;
        const NOISE_WHITE = 0.8;
        const NOISE_GAMMA = 1.0;

        // ── Per-bar noise → grayscale → 5-color gradient map, clipped to bar
        const defs = svg.append('defs');

        defs.selectAll('filter.noiseHeat')
          .data(data)
          .enter()
          .append('filter')
          .attr('class', 'noiseHeat')
          .attr('id', (d: BarChartData) => `noise-heat-bar-${slug(d.name)}`)
          .attr('filterUnits', 'objectBoundingBox')
          .attr('primitiveUnits', 'objectBoundingBox')
          .attr('x', -0.2).attr('y', -0.2)
          .attr('width', 1.4).attr('height', 1.4)
          .each((d: BarChartData, i: number, nodes: Element[]) => {
            const f = d3.select(nodes[i] as SVGFilterElement);
            const rnd = seeded(`${i}-${d.name}`);

            // 1) procedural noise
            f.append('feTurbulence')
              .attr('type', 'fractalNoise')
              .attr('baseFrequency', NOISE_SCALE * (0.9 + rnd(0.2)))
              .attr('numOctaves', 3)
              .attr('seed', Math.floor(rnd(10000)))
              .attr('result', 'noise');

            // 1b) soften
            f.append('feGaussianBlur')
              .attr('in', 'noise')
              .attr('stdDeviation', 0.015)
              .attr('edgeMode', 'duplicate')
              .attr('result', 'soft');

            // 2) ensure grayscale
            f.append('feColorMatrix')
              .attr('in', 'soft')
              .attr('type', 'saturate')
              .attr('values', 0)
              .attr('result', 'gray');

            // 2b) LEVELS (black/white points)
            const bp = Math.min(Math.max(NOISE_BLACK, 0), 0.98);
            const wp = Math.min(Math.max(NOISE_WHITE, bp + 0.01), 1);
            const slope = 1 / (wp - bp);
            const intercept = -bp * slope;

            const levels = f.append('feComponentTransfer')
              .attr('in', 'gray')
              .attr('result', 'leveled');

            levels.append('feFuncR').attr('type', 'linear')
              .attr('slope', slope).attr('intercept', intercept);
            levels.append('feFuncG').attr('type', 'linear')
              .attr('slope', slope).attr('intercept', intercept);
            levels.append('feFuncB').attr('type', 'linear')
              .attr('slope', slope).attr('intercept', intercept);

            // 2c) optional mid-tone curve (gamma)
            const curve = f.append('feComponentTransfer')
              .attr('in', 'leveled')
              .attr('result', 'leveled');

            curve.append('feFuncR').attr('type', 'gamma')
              .attr('amplitude', 1).attr('exponent', NOISE_GAMMA).attr('offset', 0);
            curve.append('feFuncG').attr('type', 'gamma')
              .attr('amplitude', 1).attr('exponent', NOISE_GAMMA).attr('offset', 0);
            curve.append('feFuncB').attr('type', 'gamma')
              .attr('amplitude', 1).attr('exponent', NOISE_GAMMA).attr('offset', 0);

            // 3) gradient-map to palette
            const map = f.append('feComponentTransfer')
              .attr('in', 'leveled')
              .attr('result', 'colorized');

            // #0c211a, #48806a, #477638, #8a976b, #f8eee4
            map.append('feFuncR').attr('type', 'table')
              .attr('tableValues', '0.047 0.282 0.278 0.541 0.973');
            map.append('feFuncG').attr('type', 'table')
              .attr('tableValues', '0.129 0.502 0.463 0.592 0.933');
            map.append('feFuncB').attr('type', 'table')
              .attr('tableValues', '0.102 0.416 0.220 0.420 0.894');

            // 4) clip to the bar alpha
            f.append('feComposite')
              .attr('in', 'colorized')
              .attr('in2', 'SourceAlpha')
              .attr('operator', 'in')
              .attr('result', 'final');
          });

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

        // Add foreground bars with noise texture (same as RadialChart)
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
          .style("fill", '#fff') // Base fill (color comes from filter)
          .style("opacity", 0.98)
          .style("filter", (d: BarChartData) => `url(#noise-heat-bar-${slug(d.name)})`);

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
