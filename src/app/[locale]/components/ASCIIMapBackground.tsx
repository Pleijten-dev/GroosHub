// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';

// ASCII characters from sparse to dense (cold to hot)
const ASCII_CHARS = ' .:-=+*#%@';

// Dutch cities with center coordinates and tile configuration
const TILE_WIDTH = 0.12; // Longitude width per tile
const NUM_TILES = 6;

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

function heatToASCII(heat: number): string {
  const index = Math.floor(heat * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[Math.min(index, ASCII_CHARS.length - 1)];
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
  const [combinedAscii, setCombinedAscii] = useState<string[]>([]);
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
      setScreenCols(Math.ceil(window.innerWidth / 4.8) + 20);
      setScreenRows(Math.ceil(window.innerHeight / 8) + 10);
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

      const allTileAscii: string[][] = [];
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

          const lines: string[] = [];
          for (let y = 0; y < tileSize; y++) {
            let line = '';
            for (let x = 0; x < tileSize; x++) {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              if (pixel[3] < 128) {
                line += ' ';
              } else {
                const heat = colorToHeat(pixel[0], pixel[1], pixel[2]);
                line += heatToASCII(heat);
              }
            }
            lines.push(line);
          }
          allTileAscii.push(lines);

          if (!debugShowImage) {
            URL.revokeObjectURL(blobUrl);
          }
        } catch (err) {
          console.error(`Failed to load tile ${tile.name}:`, err);
          const lines: string[] = [];
          for (let y = 0; y < tileSize; y++) {
            lines.push(' '.repeat(tileSize));
          }
          allTileAscii.push(lines);
        }
      }

      // Combine all tiles horizontally
      const combined: string[] = [];
      if (allTileAscii.length > 0) {
        const height = allTileAscii[0].length;
        for (let y = 0; y < height; y++) {
          let line = '';
          for (const tile of allTileAscii) {
            line += tile[y] || '';
          }
          combined.push(line);
        }
      }

      setCombinedAscii(combined);
      setTileImages(allImages);
      setIsLoading(false);
    };

    if (screenRows > 0) {
      loadTiles();
    }
  }, [screenRows, tiles, debugShowImage]);

  // Calculate max pan offset
  const totalWidth = combinedAscii.length > 0 ? combinedAscii[0].length : 0;
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

  // Get visible ASCII slice based on pan offset (fixed grid, changing characters)
  const visibleLines = useMemo(() => {
    if (combinedAscii.length === 0) return [];
    return combinedAscii.map(line =>
      line.slice(panOffset, panOffset + screenCols).padEnd(screenCols, ' ')
    );
  }, [combinedAscii, panOffset, screenCols]);

  // Debug mode
  if (debugShowImage && tileImages.length > 0) {
    const panPx = panOffset * 4.8;
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
        className="font-mono text-[8px] leading-[8px] text-gray-700 whitespace-pre select-none m-0 p-0"
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
          visibleLines.map((line, i) => <div key={i} style={{ margin: 0, padding: 0 }}>{line}</div>)
        )}
      </pre>
    </div>
  );
};

export default ASCIIMapBackground;
