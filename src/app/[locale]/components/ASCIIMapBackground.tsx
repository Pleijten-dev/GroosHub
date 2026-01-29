// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

// ASCII characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

// Dutch cities with extended bounding boxes for panning (wider west-east range)
// Each city has a wide bbox to allow for smooth panning
const DUTCH_CITIES = [
  {
    name: 'Rotterdam',
    bbox: { south: 51.85, west: 4.20, north: 52.00, east: 4.75 }, // Extended east-west
  },
  {
    name: 'Amsterdam',
    bbox: { south: 52.30, west: 4.70, north: 52.45, east: 5.10 },
  },
  {
    name: 'Utrecht',
    bbox: { south: 52.03, west: 5.00, north: 52.15, east: 5.25 },
  },
  {
    name: 'Den Haag',
    bbox: { south: 52.02, west: 4.20, north: 52.14, east: 4.45 },
  },
  {
    name: 'Eindhoven',
    bbox: { south: 51.40, west: 5.35, north: 51.50, east: 5.55 },
  },
  {
    name: 'Groningen',
    bbox: { south: 53.18, west: 6.50, north: 53.26, east: 6.65 },
  },
];

// WMS configuration for Stedelijk hitte eiland effect
const WMS_CONFIG = {
  baseUrl: 'https://data.rivm.nl/geo/ank/wms',
  layer: 'Stedelijk_hitte_eiland_effect_01062022_v2',
  version: '1.3.0',
  format: 'image/png',
  crs: 'EPSG:4326',
};

// Animation settings
const PAN_DURATION = 30000; // 30 seconds per city
const TRANSITION_DURATION = 1000; // 1 second fade transition

// Character dimensions for monospace font at 8px
const CHAR_WIDTH = 4.8;
const CHAR_HEIGHT = 8;

interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface ASCIIMapBackgroundProps {
  className?: string;
  opacity?: number;
  cols?: number;
  debugShowImage?: boolean;
}

function buildWMSUrl(bbox: BBox, width: number, height: number): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: WMS_CONFIG.version,
    REQUEST: 'GetMap',
    LAYERS: WMS_CONFIG.layer,
    CRS: WMS_CONFIG.crs,
    BBOX: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
    WIDTH: width.toString(),
    HEIGHT: height.toString(),
    FORMAT: WMS_CONFIG.format,
    TRANSPARENT: 'true',
  });

  return `${WMS_CONFIG.baseUrl}?${params.toString()}`;
}

function brightnessToASCII(brightness: number): string {
  // brightness is 0-255, map to ASCII_CHARS index
  // Invert so dark areas get dense characters
  const index = Math.floor((1 - brightness / 255) * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[Math.min(index, ASCII_CHARS.length - 1)];
}

export const ASCIIMapBackground: React.FC<ASCIIMapBackgroundProps> = ({
  className = '',
  opacity = 0.15,
  cols: propCols,
  debugShowImage = false,
}) => {
  const [asciiLines, setAsciiLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ cols: propCols || 200, rows: 100 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [panProgress, setPanProgress] = useState(0); // 0 to 1, west to east
  const [isTransitioning, setIsTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const currentCity = DUTCH_CITIES[currentCityIndex];

  // Calculate dimensions based on viewport
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const calculatedCols = propCols || Math.ceil(width / CHAR_WIDTH) + 20;
      const calculatedRows = Math.ceil(height / CHAR_HEIGHT) + 20;

      setDimensions({ cols: calculatedCols, rows: calculatedRows });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [propCols]);

  // Animation loop for panning
  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / PAN_DURATION, 1);

      setPanProgress(progress);

      if (progress >= 1) {
        // Start transition to next city
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentCityIndex((prev) => (prev + 1) % DUTCH_CITIES.length);
          setPanProgress(0);
          startTimeRef.current = performance.now();
          setIsTransitioning(false);
        }, TRANSITION_DURATION);
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
  }, [currentCityIndex]);

  // Convert image to ASCII, scaling to fill the target dimensions
  const convertImageToASCII = useCallback((img: HTMLImageElement, targetCols: number, targetRows: number): string[] => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const canvasWidth = targetCols;
    const canvasHeight = targetRows;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    const lines: string[] = [];

    for (let y = 0; y < targetRows; y++) {
      let line = '';
      for (let x = 0; x < targetCols; x++) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;

        if (pixel[3] < 128) {
          line += ' ';
          continue;
        }

        const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
        line += brightnessToASCII(brightness);
      }
      lines.push(line);
    }

    return lines;
  }, []);

  // Fetch and convert image for current city
  useEffect(() => {
    const fetchAndConvert = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const wmsUrl = buildWMSUrl(currentCity.bbox, 1024, 1024);

        const response = await fetch(`/api/proxy-wms?url=${encodeURIComponent(wmsUrl)}`);

        if (!response.ok) {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              if (debugShowImage) {
                setImageUrl(wmsUrl);
              }
              const ascii = convertImageToASCII(img, dimensions.cols, dimensions.rows);
              setAsciiLines(ascii);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load WMS image'));
            img.src = wmsUrl;
          });
        } else {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const img = new Image();

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              if (debugShowImage) {
                setImageUrl(blobUrl);
              } else {
                URL.revokeObjectURL(blobUrl);
              }
              const ascii = convertImageToASCII(img, dimensions.cols, dimensions.rows);
              setAsciiLines(ascii);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load WMS image'));
            img.src = blobUrl;
          });
        }
      } catch (err) {
        console.error('ASCII map error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');

        const placeholderLines: string[] = [];
        for (let i = 0; i < dimensions.rows; i++) {
          let line = '';
          for (let j = 0; j < dimensions.cols; j++) {
            const val = Math.sin(i * 0.3 + j * 0.1) * 0.5 + 0.5;
            const idx = Math.floor(val * (ASCII_CHARS.length - 1));
            line += ASCII_CHARS[idx];
          }
          placeholderLines.push(line);
        }
        setAsciiLines(placeholderLines);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndConvert();
  }, [dimensions, convertImageToASCII, debugShowImage, currentCity]);

  // Calculate pan offset (pan from showing right side to showing left side = west to east movement)
  const panOffset = panProgress * 50; // Pan 50% of width

  // Debug mode: show raw WMS image with panning
  if (debugShowImage) {
    return (
      <div
        ref={containerRef}
        className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
        style={{
          opacity: isTransitioning ? 0 : 0.5,
          zIndex: 0,
          transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="WMS Debug"
            style={{
              position: 'absolute',
              top: 0,
              left: `-${panOffset}%`,
              width: '150vw', // Wider image for panning
              height: '100vh',
              objectFit: 'cover',
              transition: 'left 0.1s linear',
            }}
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Loading WMS image...
          </div>
        )}
        {/* Debug info */}
        <div className="absolute top-2 left-2 text-xs text-gray-700 bg-white/80 px-2 py-1 rounded">
          City: {currentCity.name} | Progress: {Math.round(panProgress * 100)}%
        </div>
        {error && (
          <div className="absolute bottom-2 left-2 text-xs text-red-500 bg-white/80 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{
        opacity: isTransitioning ? 0 : opacity,
        zIndex: 0,
        transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
      }}
    >
      <pre
        className="font-mono text-[8px] leading-[8px] text-gray-700 whitespace-pre select-none"
        style={{
          fontFamily: 'monospace',
          letterSpacing: '0px',
          position: 'absolute',
          top: 0,
          left: `-${panOffset}%`,
          width: '150vw', // Wider for panning
          height: '100vh',
          overflow: 'hidden',
          transition: 'left 0.1s linear',
        }}
      >
        {isLoading ? (
          Array(dimensions.rows).fill(0).map((_, i) => (
            <div key={i}>{'. '.repeat(Math.ceil(dimensions.cols / 2))}</div>
          ))
        ) : (
          asciiLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))
        )}
      </pre>

      {error && (
        <div className="absolute bottom-2 left-2 text-xs text-red-500 bg-white/80 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ASCIIMapBackground;
