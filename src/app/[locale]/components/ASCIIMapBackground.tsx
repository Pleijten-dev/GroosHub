// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';

// ASCII characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

// Dutch cities with their bounding boxes for 6 adjacent tiles
const CITIES = [
  { name: 'Rotterdam', south: 51.88, north: 51.98, westStart: 4.20, tileWidth: 0.12 },
  { name: 'Amsterdam', south: 52.34, north: 52.44, westStart: 4.75, tileWidth: 0.12 },
  { name: 'Den Haag', south: 52.03, north: 52.13, westStart: 4.15, tileWidth: 0.12 },
  { name: 'Utrecht', south: 52.04, north: 52.14, westStart: 5.00, tileWidth: 0.12 },
  { name: 'Eindhoven', south: 51.40, north: 51.50, westStart: 5.35, tileWidth: 0.12 },
  { name: 'Groningen', south: 53.18, north: 53.28, westStart: 6.45, tileWidth: 0.12 },
];

// Generate 6 adjacent tiles for a city
function generateTiles(city: typeof CITIES[0]) {
  return Array.from({ length: 6 }, (_, i) => ({
    name: `${city.name}-${i + 1}`,
    bbox: `${city.south},${city.westStart + i * city.tileWidth},${city.north},${city.westStart + (i + 1) * city.tileWidth}`,
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

function brightnessToASCII(brightness: number): string {
  const index = Math.floor((1 - brightness / 255) * (ASCII_CHARS.length - 1));
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
  // Randomize city order once on mount
  const shuffledCities = useMemo(() => shuffleArray(CITIES), []);

  const [cityIndex, setCityIndex] = useState(0);
  const [asciiTiles, setAsciiTiles] = useState<string[][]>([]);
  const [tileImages, setTileImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [panX, setPanX] = useState(0);
  const [rows, setRows] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const currentCity = shuffledCities[cityIndex];
  const tiles = useMemo(() => generateTiles(currentCity), [currentCity]);

  // Calculate rows based on viewport height
  useEffect(() => {
    const updateRows = () => {
      // 8px per character height
      setRows(Math.ceil(window.innerHeight / 8) + 5);
    };
    updateRows();
    window.addEventListener('resize', updateRows);
    return () => window.removeEventListener('resize', updateRows);
  }, []);

  // Load and convert all 6 tiles for current city
  useEffect(() => {
    const loadTiles = async () => {
      setIsLoading(true);

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Each tile is square, scaled to fill viewport height
      const tileSize = rows; // ASCII chars = pixels in our conversion
      canvas.width = tileSize;
      canvas.height = tileSize;

      const allTiles: string[][] = [];
      const allImages: string[] = [];

      for (const tile of tiles) {
        try {
          const wmsUrl = buildWMSUrl(tile.bbox, 512); // Fetch at 512px for quality
          const proxyUrl = `/api/proxy-wms?url=${encodeURIComponent(wmsUrl)}`;

          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error('Failed to fetch');

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          if (debugShowImage) {
            allImages.push(blobUrl);
          }

          // Load image and convert to ASCII
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = blobUrl;
          });

          // Draw scaled to tile size
          ctx.clearRect(0, 0, tileSize, tileSize);
          ctx.drawImage(img, 0, 0, tileSize, tileSize);

          // Convert to ASCII
          const lines: string[] = [];
          for (let y = 0; y < tileSize; y++) {
            let line = '';
            for (let x = 0; x < tileSize; x++) {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              if (pixel[3] < 128) {
                line += ' ';
              } else {
                const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
                line += brightnessToASCII(brightness);
              }
            }
            lines.push(line);
          }
          allTiles.push(lines);

          if (!debugShowImage) {
            URL.revokeObjectURL(blobUrl);
          }
        } catch (err) {
          console.error(`Failed to load tile ${tile.name}:`, err);
          // Generate placeholder
          const lines: string[] = [];
          for (let y = 0; y < tileSize; y++) {
            let line = '';
            for (let x = 0; x < tileSize; x++) {
              const val = Math.sin(y * 0.1 + x * 0.1) * 0.5 + 0.5;
              line += ASCII_CHARS[Math.floor(val * (ASCII_CHARS.length - 1))];
            }
            lines.push(line);
          }
          allTiles.push(lines);
        }
      }

      setAsciiTiles(allTiles);
      setTileImages(allImages);
      setIsLoading(false);
    };

    if (rows > 0) {
      loadTiles();
    }
  }, [rows, tiles, debugShowImage]);

  // Combine tiles into single ASCII block
  const combinedLines: string[] = [];
  if (asciiTiles.length > 0) {
    const tileHeight = asciiTiles[0].length;
    for (let y = 0; y < tileHeight; y++) {
      let line = '';
      for (const tile of asciiTiles) {
        line += tile[y] || '';
      }
      combinedLines.push(line);
    }
  }

  // Get actual content width in pixels
  const contentWidthChars = combinedLines.length > 0 ? combinedLines[0].length : 0;
  const contentWidthPx = contentWidthChars * 4.8;

  // Smooth panning animation - pan left to right in 30s, then fade and switch city
  useEffect(() => {
    if (isLoading || contentWidthPx === 0 || isFading) return;

    const screenWidth = window.innerWidth;
    const maxPan = Math.max(0, contentWidthPx - screenWidth);

    const duration = 30000; // 30 seconds to pan across
    let startTime: number | null = null;
    let completed = false;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1); // 0 to 1, stop at 1

      setPanX(progress * maxPan);

      if (progress >= 1 && !completed) {
        completed = true;
        // Start fade transition to next city
        setIsFading(true);
        setTimeout(() => {
          setPanX(0);
          setCityIndex((prev) => (prev + 1) % shuffledCities.length);
          setTimeout(() => setIsFading(false), 100); // Small delay before fade in
        }, 1000); // 1s fade out
      } else if (!completed) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLoading, contentWidthPx, isFading, shuffledCities.length]);

  // Debug mode: show actual images
  if (debugShowImage && tileImages.length > 0) {
    return (
      <div
        className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
        style={{
          opacity: isFading ? 0 : 0.5,
          zIndex: 0,
          transition: 'opacity 1s ease-in-out',
        }}
      >
        <div style={{ display: 'flex', position: 'absolute', left: -panX, height: '100vh' }}>
          {tileImages.map((src, i) => (
            <img key={i} src={src} alt={tiles[i]?.name} style={{ height: '100vh', width: 'auto' }} />
          ))}
        </div>
        <div className="absolute top-2 left-2 text-xs text-gray-700 bg-white/80 px-2 py-1 rounded z-10">
          City: {currentCity.name} | Pan: {Math.round(panX)}px | MaxPan: {Math.round(Math.max(0, contentWidthPx - window.innerWidth))}px
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        opacity: isFading ? 0 : opacity,
        zIndex: 0,
        transition: 'opacity 1s ease-in-out',
      }}
    >
      <pre
        className="font-mono text-[8px] leading-[8px] text-gray-700 whitespace-pre select-none"
        style={{
          position: 'absolute',
          top: 0,
          left: -panX,
        }}
      >
        {isLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          combinedLines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </pre>
    </div>
  );
};

export default ASCIIMapBackground;
