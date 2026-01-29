// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';

// ASCII characters ordered by visual density (sparse to dense)
// Characters are ordered within each group for smooth transitions
const ASCII_CHARS = ' .`·:;,\'-~"^=+il!|/\\rc*xonvzsaeu#Xkdbpqwm%@WMNBQ&$';

// Get ASCII character for heat value (0-1) with optional time-based variation
function heatToASCII(heat: number, timeNoise: number = 0): string {
  // Add subtle time-based noise for morphing effect (-0.05 to +0.05)
  const noisyHeat = Math.max(0, Math.min(1, heat + timeNoise * 0.1));
  const index = Math.floor(noisyHeat * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[index];
}

// Simple seeded pseudo-random for consistent noise per position
function seededRandom(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

// Color gradient for heat values
const GRADIENT_COLORS = [
  { r: 0xf8, g: 0xee, b: 0xe4 }, // #f8eee4 - cream (cold)
  { r: 0x8a, g: 0x97, b: 0x6b }, // #8a976b - sage
  { r: 0x47, g: 0x76, b: 0x38 }, // #477638 - green
  { r: 0x48, g: 0x80, b: 0x6a }, // #48806a - teal
  { r: 0x0c, g: 0x21, b: 0x1a }, // #0c211a - dark (hot)
];

// Interpolate color from gradient (returns RGB components)
function heatToColorRGB(heat: number): { r: number; g: number; b: number } {
  const segments = GRADIENT_COLORS.length - 1;
  const segment = Math.min(Math.floor(heat * segments), segments - 1);
  const t = (heat * segments) - segment;

  const c1 = GRADIENT_COLORS[segment];
  const c2 = GRADIENT_COLORS[segment + 1];

  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

// Dutch cities with center coordinates
const TILE_WIDTH = 0.12;
const NUM_TILES = 6;
const CHAR_HEIGHT = 16;
const CHAR_WIDTH = 9.6;

const CITIES = [
  { name: 'Rotterdam', south: 51.88, north: 51.98, centerLon: 4.48 },
  { name: 'Amsterdam', south: 52.34, north: 52.44, centerLon: 4.90 },
  { name: 'Den Haag', south: 52.03, north: 52.13, centerLon: 4.30 },
  { name: 'Utrecht', south: 52.04, north: 52.14, centerLon: 5.12 },
  { name: 'Eindhoven', south: 51.40, north: 51.50, centerLon: 5.47 },
  { name: 'Groningen', south: 53.18, north: 53.28, centerLon: 6.57 },
];

function generateTiles(city: typeof CITIES[0]) {
  const westStart = city.centerLon - (NUM_TILES / 2) * TILE_WIDTH;
  return Array.from({ length: NUM_TILES }, (_, i) => ({
    name: `${city.name}-${i + 1}`,
    bbox: `${city.south},${westStart + i * TILE_WIDTH},${city.north},${westStart + (i + 1) * TILE_WIDTH}`,
  }));
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const WMS_BASE = 'https://data.rivm.nl/geo/ank/wms';
const WMS_LAYER = 'Stedelijk_hitte_eiland_effect_01062022_v2';

function buildWMSUrl(bbox: string, size: number): string {
  return `${WMS_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${WMS_LAYER}&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${size}&HEIGHT=${size}&FORMAT=image/png&TRANSPARENT=true`;
}

function colorToHeat(r: number, g: number, b: number): number {
  if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15) return 0;
  const total = r + g + b || 1;
  const redHeat = r / total;
  const blueHeat = b / total;
  const heat = (redHeat - blueHeat + 1) / 2;
  return Math.max(0, Math.min(1, heat));
}

interface ASCIIMapBackgroundProps {
  className?: string;
  opacity?: number;
}

export const ASCIIMapBackground: React.FC<ASCIIMapBackgroundProps> = ({
  className = '',
  opacity = 0.15,
}) => {
  const shuffledCities = useMemo(() => shuffleArray(CITIES), []);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const cityIndexRef = useRef(0);
  // Store only heat values - characters are computed at render time
  const heatMapRef = useRef<number[][]>([]);
  const isLoadingRef = useRef(true);
  const isFadingRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const [, forceUpdate] = useState(0);
  const [screenDimensions, setScreenDimensions] = useState({ cols: 200, rows: 100 });

  // Update screen dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setScreenDimensions({
        cols: Math.ceil(window.innerWidth / CHAR_WIDTH) + 20,
        rows: Math.ceil(window.innerHeight / CHAR_HEIGHT) + 10,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load tiles for current city
  const loadTiles = useCallback(async () => {
    isLoadingRef.current = true;
    forceUpdate(n => n + 1);

    if (!processingCanvasRef.current) {
      processingCanvasRef.current = document.createElement('canvas');
    }
    const canvas = processingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentCity = shuffledCities[cityIndexRef.current];
    const tiles = generateTiles(currentCity);
    const tileSize = screenDimensions.rows;
    canvas.width = tileSize;
    canvas.height = tileSize;

    const allTileHeat: number[][][] = [];

    for (const tile of tiles) {
      try {
        const wmsUrl = buildWMSUrl(tile.bbox, 512);
        const proxyUrl = `/api/proxy-wms?url=${encodeURIComponent(wmsUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to fetch');

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = blobUrl;
        });

        ctx.clearRect(0, 0, tileSize, tileSize);
        ctx.drawImage(img, 0, 0, tileSize, tileSize);

        // Store only heat values - characters computed at render time
        const lines: number[][] = [];
        for (let y = 0; y < tileSize; y++) {
          const row: number[] = [];
          for (let x = 0; x < tileSize; x++) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            if (pixel[3] < 128) {
              row.push(0); // Transparent = no heat
            } else {
              row.push(colorToHeat(pixel[0], pixel[1], pixel[2]));
            }
          }
          lines.push(row);
        }
        allTileHeat.push(lines);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error(`Failed to load tile ${tile.name}:`, err);
        const lines: number[][] = [];
        for (let y = 0; y < tileSize; y++) {
          lines.push(Array(tileSize).fill(0));
        }
        allTileHeat.push(lines);
      }
    }

    // Combine all tiles horizontally
    const combined: number[][] = [];
    if (allTileHeat.length > 0) {
      const height = allTileHeat[0].length;
      for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (const tile of allTileHeat) {
          row.push(...(tile[y] || []));
        }
        combined.push(row);
      }
    }

    heatMapRef.current = combined;
    isLoadingRef.current = false;
    startTimeRef.current = null;
    forceUpdate(n => n + 1);
  }, [shuffledCities, screenDimensions.rows]);

  // Initial load
  useEffect(() => {
    if (screenDimensions.rows > 0) {
      loadTiles();
    }
  }, [loadTiles, screenDimensions.rows]);

  // Render function using Canvas 2D with smooth interpolation
  const renderFrame = useCallback((progress: number, time: number) => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    const heatMap = heatMapRef.current;
    if (heatMap.length === 0) return;

    const { cols: screenCols, rows: screenRows } = screenDimensions;
    const totalWidth = heatMap[0].length;
    const maxPanOffset = Math.max(0, totalWidth - screenCols);

    // Use fractional pan offset for smooth sub-character interpolation
    const panOffsetFloat = progress * maxPanOffset;
    const panOffsetInt = Math.floor(panOffsetFloat);
    const panFraction = panOffsetFloat - panOffsetInt;

    // Time seed for morphing effect (changes slowly)
    const timeSeed = time * 0.001; // Slow time variation

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

    // Set font for ASCII rendering
    ctx.font = '16px monospace';
    ctx.textBaseline = 'top';

    // Render visible characters with interpolation
    for (let y = 0; y < Math.min(screenRows, heatMap.length); y++) {
      const row = heatMap[y];
      for (let x = 0; x < screenCols; x++) {
        const dataX = panOffsetInt + x;

        if (dataX >= 0 && dataX < row.length - 1) {
          // Get heat values from current and next column
          const heat1 = row[dataX];
          const heat2 = row[dataX + 1];

          // Interpolate heat based on fractional pan position
          const interpolatedHeat = heat1 + (heat2 - heat1) * panFraction;

          // Add time-based noise for morphing effect
          // Noise is position-dependent and slowly changes over time
          const noise = (seededRandom(x, y, Math.floor(timeSeed)) - 0.5) *
                       Math.sin(timeSeed * 2 + x * 0.3 + y * 0.2);

          if (interpolatedHeat > 0.01) { // Skip near-zero heat (transparent areas)
            const char = heatToASCII(interpolatedHeat, noise);
            const color = heatToColorRGB(interpolatedHeat);
            ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
            ctx.fillText(char, x * CHAR_WIDTH, y * CHAR_HEIGHT);
          }
        }
      }
    }
  }, [screenDimensions]);

  // Animation loop
  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    // Size canvas to window
    displayCanvas.width = window.innerWidth;
    displayCanvas.height = window.innerHeight;

    const duration = 30000; // 30 seconds

    const animate = (time: number) => {
      if (isLoadingRef.current || isFadingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!startTimeRef.current) {
        startTimeRef.current = time;
      }

      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Render current frame with time for morphing effect
      renderFrame(progress, time);

      if (progress >= 1) {
        // Start fade and transition to next city
        isFadingRef.current = true;
        forceUpdate(n => n + 1);

        setTimeout(() => {
          cityIndexRef.current = (cityIndexRef.current + 1) % shuffledCities.length;
          loadTiles().then(() => {
            setTimeout(() => {
              isFadingRef.current = false;
              forceUpdate(n => n + 1);
            }, 100);
          });
        }, 1000);
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [renderFrame, shuffledCities.length, loadTiles]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas) {
        displayCanvas.width = window.innerWidth;
        displayCanvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        opacity: isFadingRef.current ? 0 : opacity,
        zIndex: 0,
        transition: 'opacity 1s ease-in-out',
      }}
    >
      <canvas
        ref={displayCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {isLoadingRef.current && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default ASCIIMapBackground;
