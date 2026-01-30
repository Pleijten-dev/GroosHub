// components/common/RadialChart.tsx - Complete Implementation with Hover Callbacks

import React, { useEffect, useRef } from 'react';

interface RadialChartData {
  name: string;
  value: number;
  color: string;
}

interface RadialChartProps {
  data: RadialChartData[];
  width?: number;
  height?: number;
  isSimple?: boolean;
  showLabels?: boolean;
  className?: string;
  onSliceHover?: (sliceName: string | null) => void;
  onSliceClick?: (sliceName: string) => void;
  /** Custom average value for the reference circle. If not provided, uses maxValue/2 */
  averageValue?: number;
  /** Minimum value for the scale. Defaults to 0 */
  minValue?: number;
}

// D3 type declarations
interface D3Selection {
  selectAll: (selector: string) => D3Selection;
  data: (data: RadialChartData[]) => D3Selection;
  enter: () => D3Selection;
  append: (element: string) => D3Selection;
  attr: (name: string, value: string | number | ((d: RadialChartData) => string | number)) => D3Selection;
  style: (name: string, value: string | number | ((d: RadialChartData) => string)) => D3Selection;
  text: (value: string | number | ((d: RadialChartData) => string | number)) => D3Selection;
  on: (event: string, handler: (event: Event, d: RadialChartData) => void) => D3Selection;
  select: (selector: string) => D3Selection;
  transition: () => D3Selection;
  duration: (ms: number) => D3Selection;
  each: (fn: (d: RadialChartData, i: number, nodes: Element[]) => void) => D3Selection;
  filter: (fn: (d: RadialChartData) => boolean) => D3Selection;
  remove: () => D3Selection;
}

interface D3Scale {
  domain: (domain: (string | number)[]) => D3Scale;
  range: (range: number[]) => D3Scale;
  padding: (padding: number) => D3Scale;
  bandwidth: () => number;
  (value: string | number): number;
}

interface D3Arc {
  innerRadius: (radius: number | ((d: RadialChartData) => number)) => D3Arc;
  outerRadius: (radius: number | ((d: RadialChartData) => number)) => D3Arc;
  startAngle: (angle: number | ((d: RadialChartData) => number)) => D3Arc;
  endAngle: (angle: number | ((d: RadialChartData) => number)) => D3Arc;
  cornerRadius: (radius: number) => D3Arc;
  (d: RadialChartData): string;
}

declare global {
  interface Window {
    d3: {
      select: (selector: string | Element) => D3Selection;
      scaleBand: () => D3Scale;
      scaleLinear: () => D3Scale;
      arc: () => D3Arc;
      max: (data: RadialChartData[], accessor: (d: RadialChartData) => number) => number;
    };
  }
}

/**
 * RadialChart - Complete implementation with hover callbacks
 *
 * Features:
 * - Working D3 loading logic
 * - Reference-based scaling (hovered: 1.1x, others: 0.95x)
 * - Individual arc generator scaling
 * - Hover callbacks for parent components
 * - Proper error checking and D3 loading
 *
 * @param props - Chart configuration and data
 * @returns JSX.Element The radial chart component
 */
const RadialChart: React.FC<RadialChartProps> = ({
  data,
  width = 500,
  height = 400,
  isSimple = false,
  showLabels = true,
  className = '',
  onSliceHover,
  onSliceClick,
  averageValue,
  minValue = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data.length || typeof window === 'undefined') return;

    // Load D3 if not available (RESTORED working logic)
    const loadD3AndRender = () => {
      if (window.d3) {
        renderChart();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
        script.onload = renderChart;
        script.onerror = () => console.error('Failed to load D3.js');
        document.head.appendChild(script);
      }
    };

    const renderChart = () => {
      if (!container) return;

      // Clear previous chart
      const d3 = window.d3;
      d3.select(container).selectAll("*").remove();

      // Chart setup - SIMPLIFIED to actually fill the SVG
      const maxValue = Math.max(...data.map(d => d.value));
      const isDenseChart = data.length > 12;

      // MINIMAL padding - just enough for labels to not get cut off
      const labelPadding = showLabels ? 25 : 10;

      // Calculate chart to fill ~90% of SVG dimensions
      const availableWidth = width - (labelPadding * 2);
      const availableHeight = height - (labelPadding * 2);
      const chartRadius = Math.min(availableWidth, availableHeight) / 1.6;

      const centerX = width / 2;
      const centerY = height / 2;

      // Use much more of the available radius (80-90% instead of 50-60%)
      const innerRadius = isSimple ? chartRadius * 0.35 : chartRadius * 0.45;
      const maxRadius = chartRadius * 0.9; // Use 90% of available radius!
      const cornerRadius = isDenseChart ? 8 : 12;

      // ─────────────────────────────────────────────────────────────────────────────
      // Controls (bigger blobs ⇢ smaller value; finer texture ⇢ larger value)
      const NOISE_SCALE = 0.001; // try 0.006 … 0.04
      // Controls
      const NOISE_BLACK  = 0.3;   // 0..1  (raise to crush shadows / darker overall)
      const NOISE_WHITE  = 0.8;   // 0..1  (lower to clip highlights / brighter overall)
      const NOISE_GAMMA  = 1.0;    // >1 = darker mids, <1 = brighter mids

      // ─────────────────────────────────────────────────────────────────────────────

      // Minimal viewBox padding - just enough for hover effects
      const viewBoxPadding = 50;
      const viewBoxWidth = width + (viewBoxPadding * 2);
      const viewBoxHeight = height + (viewBoxPadding * 2);

      const svg = d3
        .select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `-${viewBoxPadding} -${viewBoxPadding} ${viewBoxWidth} ${viewBoxHeight}`)
        .attr('data-slice-count', data.length)
        .style('background', 'transparent')
        .style('overflow', 'visible')
        .style('position', 'relative');

      // Helpers for ids + stable randomness
      const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const seeded = (seed: string) => {
        let h = 2166136261;
        for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
        return (mod: number, off = 0) => ((Math.abs(Math.sin(h++)) % 1) * mod) + off;
      };

      // ── Per-slice noise → grayscale → 5-color gradient map, clipped to arc
      const defs = svg.append('defs');

      defs.selectAll('filter.noiseHeat')
        .data(data)
        .enter()
        .append('filter')
        .attr('class', 'noiseHeat')
        .attr('id', (d: RadialChartData) => `noise-heat-${slug(d.name)}`)
        // tie the texture space to the element bounds so it scales on hover
        .attr('filterUnits', 'objectBoundingBox')
        .attr('primitiveUnits', 'objectBoundingBox')
        .attr('x', -0.2).attr('y', -0.2)
        .attr('width', 1.4).attr('height', 1.4)
        .each((d: RadialChartData, i: number, nodes: Element[]) => {
          const f = window.d3.select(nodes[i] as SVGFilterElement);
          const rnd = seeded(`${i}-${d.name}`);

          // 1) procedural noise
          f.append('feTurbulence')
            .attr('type', 'fractalNoise')
            .attr('baseFrequency', NOISE_SCALE * (0.9 + rnd(0.2))) // slight per-slice variance
            .attr('numOctaves', 3)
            .attr('seed', Math.floor(rnd(10000)))
            .attr('result', 'noise');

          // 1b) soften a touch (values are relative due to primitiveUnits=objectBoundingBox)
          f.append('feGaussianBlur')
            .attr('in', 'noise')
            .attr('stdDeviation', 0.015) // increase for bloomier blobs
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
            .attr('result', 'leveled'); // overwrite

          curve.append('feFuncR').attr('type', 'gamma')
            .attr('amplitude', 1).attr('exponent', NOISE_GAMMA).attr('offset', 0);
          curve.append('feFuncG').attr('type', 'gamma')
            .attr('amplitude', 1).attr('exponent', NOISE_GAMMA).attr('offset', 0);
          curve.append('feFuncB').attr('type', 'gamma')
            .attr('amplitude', 1).attr('exponent', NOISE_GAMMA).attr('offset', 0);

          // 3) gradient-map to your palette (use 'leveled' now)
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

          map.append('feFuncR').attr('type', 'table')
            .attr('tableValues', '0.047 0.282 0.278 0.541 0.973');
          map.append('feFuncG').attr('type', 'table')
            .attr('tableValues', '0.129 0.502 0.463 0.592 0.933');
          map.append('feFuncB').attr('type', 'table')
            .attr('tableValues', '0.102 0.416 0.220 0.420 0.894');

          // 4) clip to the slice alpha
          f.append('feComposite')
            .attr('in', 'colorized')
            .attr('in2', 'SourceAlpha')
            .attr('operator', 'in')
            .attr('result', 'final');
        });

        const graphArea = svg
          .append('g')
          .attr('transform', `translate(${centerX}, ${centerY})`)
          .style('overflow', 'visible');

        // Scales
        const paddingValue = isDenseChart ? 0.015 : 0.04;
        const angleScale = d3.scaleBand()
          .domain(data.map(d => d.name))
          .range([0, 2 * Math.PI])
          .padding(paddingValue);

        const radiusScale = d3.scaleLinear()
          .domain([minValue, maxValue])
          .range([innerRadius, maxRadius]);

        // Arcs
        const arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius((d: RadialChartData) => radiusScale(d.value))
          .startAngle((d: RadialChartData) => angleScale(d.name) || 0)
          .endAngle((d: RadialChartData) => (angleScale(d.name) || 0) + angleScale.bandwidth())
          .cornerRadius(cornerRadius);

        const backgroundArc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(maxRadius)
          .startAngle((d: RadialChartData) => angleScale(d.name) || 0)
          .endAngle((d: RadialChartData) => (angleScale(d.name) || 0) + angleScale.bandwidth())
          .cornerRadius(cornerRadius);

        // Groups
        const sliceGroups = graphArea
          .selectAll(".slice-group")
          .data(data)
          .enter()
          .append("g")
          .attr("class", "slice-group")
          .style("cursor", "pointer");

      // Click handler
      sliceGroups
        .on("click", function(this: SVGGElement, event: Event, d: RadialChartData) {
          if (onSliceClick) {
            onSliceClick(d.name);
          }
        });

      // Enhanced hover effects with callbacks
      sliceGroups
        .on("mouseover", function(this: SVGGElement, event: Event, d: RadialChartData) {
          const hoveredGroup = d3.select(this);

          // Call parent callback with slice name
          if (onSliceHover) {
            onSliceHover(d.name);
          }

          // HOVERED SLICE: 1.1x scaling (EXACT from reference)
          const hoveredBackgroundArc = d3.arc()
            .innerRadius(innerRadius * 1.05)
            .outerRadius(maxRadius * 1.1)
            .startAngle(angleScale(d.name) || 0)
            .endAngle((angleScale(d.name) || 0) + angleScale.bandwidth())
            .cornerRadius(cornerRadius);

          const hoveredArc = d3.arc()
            .innerRadius(innerRadius * 1.05)
            .outerRadius(radiusScale(d.value) * 1.1)
            .startAngle(angleScale(d.name) || 0)
            .endAngle((angleScale(d.name) || 0) + angleScale.bandwidth())
            .cornerRadius(cornerRadius);

          // OTHER SLICES: 0.95x scaling (EXACT from reference)
          const otherBackgroundArc = d3.arc()
            .innerRadius(innerRadius * 0.95)
            .outerRadius(maxRadius * 0.95)
            .startAngle((sliceData: RadialChartData) => angleScale(sliceData.name) || 0)
            .endAngle((sliceData: RadialChartData) => (angleScale(sliceData.name) || 0) + angleScale.bandwidth())
            .cornerRadius(cornerRadius);

          const otherArc = d3.arc()
            .innerRadius(innerRadius * 0.95)
            .outerRadius((sliceData: RadialChartData) => radiusScale(sliceData.value) * 0.95)
            .startAngle((sliceData: RadialChartData) => angleScale(sliceData.name) || 0)
            .endAngle((sliceData: RadialChartData) => (angleScale(sliceData.name) || 0) + angleScale.bandwidth())
            .cornerRadius(cornerRadius);

          // Animate HOVERED slice (200ms like reference)
          hoveredGroup.select(".background-bar")
            .transition()
            .duration(200)
            .attr("d", hoveredBackgroundArc(d));

          hoveredGroup.select(".bar")
            .transition()
            .duration(200)
            .attr("d", hoveredArc(d));

          // Scale and reposition HOVERED slice labels
          if (showLabels) {
            const angle = (angleScale(d.name) || 0) + angleScale.bandwidth() / 2;
            const scaledLabelRadius = (maxRadius * 1.1) - 25;
            const scaledX = Math.sin(angle) * scaledLabelRadius;
            const scaledY = -Math.cos(angle) * scaledLabelRadius;

            hoveredGroup.select(".label-group")
              .transition()
              .duration(200)
              .attr("transform", `translate(${scaledX}, ${scaledY}) scale(1.5)`);
          }

          // Animate OTHER slices
          graphArea.selectAll(".slice-group")
            .filter(function(sliceData: RadialChartData) { return sliceData !== d; })
            .each(function(this: SVGGElement, sliceData: RadialChartData) {
              const otherGroup = d3.select(this);

              otherGroup.select(".background-bar")
                .transition()
                .duration(200)
                .attr("d", otherBackgroundArc(sliceData));

              otherGroup.select(".bar")
                .transition()
                .duration(200)
                .attr("d", otherArc(sliceData));

              // Scale down OTHER slice labels
              if (showLabels) {
                const otherAngle = (angleScale(sliceData.name) || 0) + angleScale.bandwidth() / 2;
                const otherLabelRadius = (maxRadius * 0.95) - 25;
                const otherX = Math.sin(otherAngle) * otherLabelRadius;
                const otherY = -Math.cos(otherAngle) * otherLabelRadius;

                otherGroup.select(".label-group")
                  .transition()
                  .duration(200)
                  .attr("transform", `translate(${otherX}, ${otherY}) scale(1.1)`);
              }
            });

          // Hide average circle during hover
          graphArea.select(".average-circle")
            .transition()
            .duration(200)
            .style("opacity", 0);
        })
        .on("mouseout", function(this: SVGGElement) {
          // Call parent callback to clear hover state
          if (onSliceHover) {
            onSliceHover(null);
          }

          // Reset all animations
          graphArea.selectAll(".slice-group")
            .each(function(this: SVGGElement, d: RadialChartData) {
              const group = d3.select(this);

              group.select(".background-bar")
                .transition()
                .duration(200)
                .attr("d", backgroundArc(d));

              group.select(".bar")
                .transition()
                .duration(200)
                .attr("d", arc(d));

              // Reset labels
              if (showLabels) {
                const angle = (angleScale(d.name) || 0) + angleScale.bandwidth() / 2;
                const labelRadius = maxRadius - 25;
                const x = Math.sin(angle) * labelRadius;
                const y = -Math.cos(angle) * labelRadius;

                group.select(".label-group")
                  .transition()
                  .duration(200)
                  .attr("transform", `translate(${x}, ${y}) scale(1)`);
              }
            });

          // Show average circle
          graphArea.select(".average-circle")
            .transition()
            .duration(200)
            .style("opacity", 0.7);
        });

      // Background bars (keep your outline if you like)
      sliceGroups
        .append('path')
        .attr('class', 'background-bar')
        .attr('d', backgroundArc)
        .style('fill', '#f0f0f0')
        .style('opacity', 1)
        .style('stroke', '#d4d4d4')
        .style('stroke-width', 0.75)
        .style('stroke-opacity', 0.3)
        .style('stroke-linejoin', 'round')
        .style('stroke-linecap', 'round')
        .style('vector-effect', 'non-scaling-stroke');

      // Data bars — use per-slice noise/gradient filter (scales with hover)
      // Gray slices (insufficient data) get plain gray fill without noise filter
      const INSUFFICIENT_DATA_COLOR = '#9ca3af';

      sliceGroups
        .append('path')
        .attr('class', 'bar')
        .attr('d', arc)
        .style('fill', (d: RadialChartData) => d.color === INSUFFICIENT_DATA_COLOR ? INSUFFICIENT_DATA_COLOR : '#fff')
        .style('opacity', (d: RadialChartData) => d.color === INSUFFICIENT_DATA_COLOR ? '0.6' : '0.98')
        .style('filter', (d: RadialChartData) => d.color === INSUFFICIENT_DATA_COLOR ? 'none' : `url(#noise-heat-${slug(d.name)})`);

      // Add labels if enabled
      if (showLabels) {
        const labelGroups = sliceGroups
          .append("g")
          .attr("class", "label-group")
          .attr("transform", (d: RadialChartData) => {
            const angle = (angleScale(d.name) || 0) + angleScale.bandwidth() / 2;
            const labelRadius = maxRadius - 25;
            const x = Math.sin(angle) * labelRadius;
            const y = -Math.cos(angle) * labelRadius;
            return `translate(${x}, ${y})`;
          });

        // Value labels
        labelGroups
          .append("text")
          .attr("class", "value-label")
          .attr("text-anchor", "middle")
          .attr("x", 0)
          .attr("y", isDenseChart ? -2 : -3)
          .style("font-size", isDenseChart ? "9px" : "12px")
          .style("font-weight", "bold")
          .style("fill", "#ffffff")
          .style("text-shadow", "0 0 4px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.6)")
          .style("pointer-events", "none")
          .text((d: RadialChartData) => d.value);

        // Category labels
        labelGroups
          .append("text")
          .attr("class", "label")
          .attr("text-anchor", "middle")
          .attr("x", 0)
          .attr("y", isDenseChart ? 4 : 6)
          .style("font-size", isDenseChart ? "4px" : "5.5px")
          .style("font-weight", "500")
          .style("fill", "#ffffff")
          .style("text-shadow", "0 0 3px rgba(0,0,0,0.8), 1px 1px 1px rgba(0,0,0,0.6)")
          .style("pointer-events", "none")
          .text((d: RadialChartData) => {
            if (isDenseChart && d.name.length > 8) {
              return d.name.substring(0, 6) + '...';
            }
            return d.name;
          });
      }

      // Add average circle
      // Use custom averageValue if provided, otherwise default to midpoint
      const avgValue = averageValue !== undefined ? averageValue : (maxValue + minValue) / 2;
      const middleRadius = radiusScale(avgValue);
      graphArea
        .append("circle")
        .attr("class", "average-circle")
        .attr("r", middleRadius)
        .attr("cx", 0)
        .attr("cy", 0)
        .style("fill", "none")
        .style("stroke", "#ffffff")
        .style("stroke-width", "1")
        .style("stroke-opacity", "0.7")
        .style("stroke-dasharray", isDenseChart ? "8,4" : "12,6")
        .style("pointer-events", "none");
    };

    loadD3AndRender();

    // Cleanup function
    return () => {
      if (container && window.d3) {
        window.d3.select(container).selectAll("*").remove();
      }
    };
  }, [data, width, height, isSimple, showLabels, onSliceHover, onSliceClick, averageValue, minValue]);

  return (
    <div
      ref={containerRef}
      className={`radial-chart ${className}`}
      data-slice-count={data.length}
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

export default RadialChart;
export type { RadialChartData, RadialChartProps };
