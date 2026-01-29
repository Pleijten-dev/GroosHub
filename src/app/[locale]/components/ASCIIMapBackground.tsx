// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

// ASCII characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

// Rotterdam coordinates
const ROTTERDAM_BBOX = {
  south: 51.85,
  west: 4.35,
  north: 52.00,
  east: 4.60,
};

// WMS configuration for Stedelijk hitte eiland effect
const WMS_CONFIG = {
  baseUrl: 'https://data.rivm.nl/geo/ank/wms',
  layer: 'Stedelijk_hitte_eiland_effect_01062022_v2',
  version: '1.3.0',
  format: 'image/png',
  crs: 'EPSG:4326',
};

// Character dimensions for monospace font at 8px
const CHAR_WIDTH = 4.8; // Approximate width of a monospace character at 8px
const CHAR_HEIGHT = 8; // Line height

interface ASCIIMapBackgroundProps {
  className?: string;
  opacity?: number;
  cols?: number; // Number of ASCII columns (if not set, auto-calculated from viewport)
}

function buildWMSUrl(bbox: typeof ROTTERDAM_BBOX, width: number, height: number): string {
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
  opacity = 0.15, // Increased default opacity for better visibility
  cols: propCols,
}) => {
  const [asciiLines, setAsciiLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ cols: propCols || 200, rows: 100 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate dimensions based on viewport
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Calculate cols and rows to fill the entire viewport
      const calculatedCols = propCols || Math.ceil(width / CHAR_WIDTH) + 20; // Extra buffer
      const calculatedRows = Math.ceil(height / CHAR_HEIGHT) + 20; // Extra buffer

      setDimensions({ cols: calculatedCols, rows: calculatedRows });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [propCols]);

  // Convert image to ASCII, scaling to fill the target dimensions
  const convertImageToASCII = useCallback((img: HTMLImageElement, targetCols: number, targetRows: number): string[] => {
    // Create canvas if not exists
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Scale the image to fill the entire target area
    // Calculate the canvas size needed based on target ASCII dimensions
    const canvasWidth = targetCols;
    const canvasHeight = targetRows;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw image scaled to fill the entire canvas
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    const lines: string[] = [];

    for (let y = 0; y < targetRows; y++) {
      let line = '';
      for (let x = 0; x < targetCols; x++) {
        // Get pixel data at each position
        const pixel = ctx.getImageData(x, y, 1, 1).data;

        // Check if pixel is transparent (no data)
        if (pixel[3] < 128) {
          line += ' ';
          continue;
        }

        // Calculate brightness (average of RGB)
        const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
        line += brightnessToASCII(brightness);
      }
      lines.push(line);
    }

    return lines;
  }, []);

  useEffect(() => {
    const fetchAndConvert = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build WMS URL for Rotterdam - fetch at higher resolution for better quality
        const wmsUrl = buildWMSUrl(ROTTERDAM_BBOX, 1024, 1024);

        // Fetch image via our proxy to avoid CORS issues
        const response = await fetch(`/api/proxy-wms?url=${encodeURIComponent(wmsUrl)}`);

        if (!response.ok) {
          // Try direct fetch as fallback (may fail due to CORS)
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Scale image to fill entire screen
              const ascii = convertImageToASCII(img, dimensions.cols, dimensions.rows);
              setAsciiLines(ascii);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load WMS image'));
            img.src = wmsUrl;
          });
        } else {
          const blob = await response.blob();
          const img = new Image();

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              // Scale image to fill entire screen
              const ascii = convertImageToASCII(img, dimensions.cols, dimensions.rows);
              setAsciiLines(ascii);
              URL.revokeObjectURL(img.src);
              resolve();
            };
            img.onerror = () => reject(new Error('Failed to load WMS image'));
            img.src = URL.createObjectURL(blob);
          });
        }
      } catch (err) {
        console.error('ASCII map error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');

        // Generate placeholder ASCII art as fallback
        const placeholderLines: string[] = [];
        for (let i = 0; i < dimensions.rows; i++) {
          let line = '';
          for (let j = 0; j < dimensions.cols; j++) {
            // Create a simple wave pattern as placeholder
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
  }, [dimensions, convertImageToASCII]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity, zIndex: 0 }}
    >
      <pre
        className="font-mono text-[8px] leading-[8px] text-gray-700 whitespace-pre select-none"
        style={{
          fontFamily: 'monospace',
          letterSpacing: '0px',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          // Loading placeholder that fills the screen
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
