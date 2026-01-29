// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';

// ASCII characters grouped by heat level (multiple options per level for variety)
// Each group corresponds to a heat range, randomly selected for visual diversity
const ASCII_CHAR_GROUPS = [
  // 0.0 - 0.15: Very cold (dark blue) - very sparse
  [' ', ' ', ' ', '.', '.', '`', '·', ' ', ' ', ' '],
  // 0.15 - 0.30: Cold (light blue/cyan) - sparse
  [':', ';', ',', "'", '`', '.', ':', ';', ',', '.'],
  // 0.30 - 0.45: Cool - light
  ['-', '~', '"', '^', '-', '~', '=', '-', '~', '^'],
  // 0.45 - 0.60: Medium (yellow-ish) - medium
  ['=', '+', 'i', 'l', '!', '|', '/', '\\', 'r', 'c'],
  // 0.60 - 0.75: Warm - medium dense
  ['*', 'x', 'o', 'n', 'v', 'z', 's', 'a', 'e', 'u'],
  // 0.75 - 0.85: Hot (orange) - dense
  ['#', 'X', 'k', 'd', 'b', 'p', 'q', 'w', 'm', 'K'],
  // 0.85 - 1.0: Very hot (red/dark red) - very dense
  ['%', '@', 'W', 'M', 'N', 'B', 'Q', '&', '$', '#'],
];

// Get ASCII character for heat value with random selection from appropriate group
function heatToASCII(heat: number): string {
  const groupIndex = Math.min(
    Math.floor(heat * ASCII_CHAR_GROUPS.length),
    ASCII_CHAR_GROUPS.length - 1
  );
  const group = ASCII_CHAR_GROUPS[groupIndex];
  // Random selection from the group for visual variety
  return group[Math.floor(Math.random() * group.length)];
}

// Color gradient for heat values (cold to hot)
// f8eee4 (cream) -> 8a976b (sage) -> 477638 (green) -> 48806a (teal) -> 0c211a (dark)
const GRADIENT_COLORS = [
  { r: 0xf8, g: 0xee, b: 0xe4 }, // #f8eee4 - cream (cold)
  { r: 0x8a, g: 0x97, b: 0x6b }, // #8a976b - sage
  { r: 0x47, g: 0x76, b: 0x38 }, // #477638 - green
  { r: 0x48, g: 0x80, b: 0x6a }, // #48806a - teal
  { r: 0x0c, g: 0x21, b: 0x1a }, // #0c211a - dark (hot)
];

// Interpolate color from gradient based on heat (0-1)
function heatToColor(heat: number): string {
  const segments = GRADIENT_COLORS.length - 1;
  const segment = Math.min(Math.floor(heat * segments), segments - 1);
  const t = (heat * segments) - segment;

  const c1 = GRADIENT_COLORS[segment];
  const c2 = GRADIENT_COLORS[segment + 1];

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r},${g},${b})`;
}

// Dutch cities with center coordinates and tile configuration
const TILE_WIDTH = 0.12; // Longitude width per tile
const NUM_TILES = 6;

// Character size constants (16px font = 2x the original 8px)
const CHAR_HEIGHT = 16;
const CHAR_WIDTH = 9.6; // Approximate width for monospace at 16px

const CITIES = [
  { name: 'Rotterdam', south: 51.88, north: 51.98, centerLon: 4.48 },
  { name: 'Amsterdam', south: 52.34, north: 52.44, centerLon: 4.90 },
  { name: 'Den Haag', south: 52.03, north: 52.13, centerLon: 4.30 },
  { name: 'Utrecht', south: 52.04, north: 52.14, centerLon: 5.12 },
  { name: 'Eindhoven', south: 51.40, north: 51.50, centerLon: 5.47 },
  { name: 'Groningen', south: 53.18, north: 53.28, centerLon: 6.57 },
];

// Generate 6 adjacent tiles centered on the city
function generateTiles(city: typeof CITIES[0]) {
  const westStart = city.centerLon - (NUM_TILES / 2) * TILE_WIDTH;
  return Array.from({ length: NUM_TILES }, (_, i) => ({
    name: `${city.name}-${i + 1}`,
    bbox: `${city.south},${westStart + i * TILE_WIDTH},${city.north},${westStart + (i + 1) * TILE_WIDTH}`,
  }));
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// WMS configuration
const WMS_BASE = 'https://data.rivm.nl/geo/ank/wms';
const WMS_LAYER = 'Stedelijk_hitte_eiland_effect_01062022_v2';

function buildWMSUrl(bbox: string, size: number): string {
  return `${WMS_BASE}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${WMS_LAYER}&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${size}&HEIGHT=${size}&FORMAT=image/png&TRANSPARENT=true`;
}

// Convert heat map color to heat value (0 = cold/blue, 1 = hot/red)
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
  debugShowImage?: boolean;
}

export const ASCIIMapBackground: React.FC<ASCIIMapBackgroundProps> = ({
  className = '',
  opacity = 0.15,
  debugShowImage = false,
}) => {
  const shuffledCities = useMemo(() => shuffleArray(CITIES), []);

  const [cityIndex, setCityIndex] = useState(0);
  const [combinedData, setCombinedData] = useState<{ char: string; heat: number }[][]>([]);
  const [tileImages, setTileImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [panOffset, setPanOffset] = useState(0); // Pan offset in characters
  const [screenCols, setScreenCols] = useState(200);
  const [screenRows, setScreenRows] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const currentCity = shuffledCities[cityIndex];
  const tiles = useMemo(() => generateTiles(currentCity), [currentCity]);

  // Calculate screen dimensions in characters (with generous buffer)
  useEffect(() => {
    const updateDimensions = () => {
      // Add extra buffer to ensure full coverage
      setScreenCols(Math.ceil(window.innerWidth / CHAR_WIDTH) + 20);
      setScreenRows(Math.ceil(window.innerHeight / CHAR_HEIGHT) + 10);
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load all tiles and create combined ASCII data
  useEffect(() => {
    const loadTiles = async () => {
      setIsLoading(true);

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const tileSize = screenRows;
      canvas.width = tileSize;
      canvas.height = tileSize;

      const allTileData: { char: string; heat: number }[][][] = [];
      const allImages: string[] = [];

      for (const tile of tiles) {
        try {
          const wmsUrl = buildWMSUrl(tile.bbox, 512);
          const proxyUrl = `/api/proxy-wms?url=${encodeURIComponent(wmsUrl)}`;

          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('Failed to fetch');

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          if (debugShowImage) {
            allImages.push(blobUrl);
          }

          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = blobUrl;
          });

          ctx.clearRect(0, 0, tileSize, tileSize);
          ctx.drawImage(img, 0, 0, tileSize, tileSize);

          const lines: { char: string; heat: number }[][] = [];
          for (let y = 0; y < tileSize; y++) {
            const row: { char: string; heat: number }[] = [];
            for (let x = 0; x < tileSize; x++) {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              if (pixel[3] < 128) {
                row.push({ char: ' ', heat: 0 });
              } else {
                const heat = colorToHeat(pixel[0], pixel[1], pixel[2]);
                row.push({ char: heatToASCII(heat), heat });
              }
            }
            lines.push(row);
          }
          allTileData.push(lines);

          if (!debugShowImage) {
            URL.revokeObjectURL(blobUrl);
          }
        } catch (err) {
          console.error(`Failed to load tile ${tile.name}:`, err);
          const lines: { char: string; heat: number }[][] = [];
          for (let y = 0; y < tileSize; y++) {
            const row = Array(tileSize).fill({ char: ' ', heat: 0 });
            lines.push(row);
          }
          allTileData.push(lines);
        }
      }

      // Combine all tiles horizontally
      const combined: { char: string; heat: number }[][] = [];
      if (allTileData.length > 0) {
        const height = allTileData[0].length;
        for (let y = 0; y < height; y++) {
          const row: { char: string; heat: number }[] = [];
          for (const tile of allTileData) {
            row.push(...(tile[y] || []));
          }
          combined.push(row);
        }
      }

      setCombinedData(combined);
      setTileImages(allImages);
      setIsLoading(false);
    };

    if (screenRows > 0) {
      loadTiles();
    }
  }, [screenRows, tiles, debugShowImage]);

  // Calculate max pan offset
  const totalWidth = combinedData.length > 0 ? combinedData[0].length : 0;
  const maxPanOffset = Math.max(0, totalWidth - screenCols);

  // Animation: update pan offset over time
  useEffect(() => {
    if (isLoading || totalWidth === 0 || isFading) return;

    const duration = 30000; // 30 seconds
    let startTime: number | null = null;
    let completed = false;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setPanOffset(Math.floor(progress * maxPanOffset));

      if (progress >= 1 && !completed) {
        completed = true;
        setIsFading(true);
        setTimeout(() => {
          setPanOffset(0);
          setCityIndex((prev) => (prev + 1) % shuffledCities.length);
          setTimeout(() => setIsFading(false), 100);
        }, 1000);
      } else if (!completed) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLoading, totalWidth, maxPanOffset, isFading, shuffledCities.length]);

  // Get visible data slice based on pan offset (fixed grid, changing characters)
  const visibleData = useMemo(() => {
    if (combinedData.length === 0) return [];
    return combinedData.map(row => {
      const slice = row.slice(panOffset, panOffset + screenCols);
      // Pad with empty cells if needed
      while (slice.length < screenCols) {
        slice.push({ char: ' ', heat: 0 });
      }
      return slice;
    });
  }, [combinedData, panOffset, screenCols]);

  // Debug mode
  if (debugShowImage && tileImages.length > 0) {
    const panPx = panOffset * CHAR_WIDTH;
    return (
      <div
        className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
        style={{ opacity: isFading ? 0 : 0.5, zIndex: 0, transition: 'opacity 1s ease-in-out' }}
      >
        <div style={{ display: 'flex', position: 'absolute', left: -panPx, height: '100vh' }}>
          {tileImages.map((src, i) => (
            <img key={i} src={src} alt={tiles[i]?.name} style={{ height: '100vh', width: 'auto' }} />
          ))}
        </div>
        <div className="absolute top-2 left-2 text-xs text-gray-700 bg-white/80 px-2 py-1 rounded z-10">
          City: {currentCity.name} | Offset: {panOffset} chars
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity: isFading ? 0 : opacity, zIndex: 0, transition: 'opacity 1s ease-in-out' }}
    >
      <pre
        className="font-mono text-[16px] leading-[16px] whitespace-pre select-none m-0 p-0"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
        }}
      >
        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          visibleData.map((row, y) => (
            <div key={y} style={{ margin: 0, padding: 0 }}>
              {row.map((cell, x) => (
                <span key={x} style={{ color: heatToColor(cell.heat) }}>{cell.char}</span>
              ))}
            </div>
          ))
        )}
      </pre>
    </div>
  );
};

export default ASCIIMapBackground;
