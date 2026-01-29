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

interface ASCIIMapBackgroundProps {
  className?: string;
  opacity?: number;
  cols?: number; // Number of ASCII columns
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
  opacity = 0.06,
  cols = 120,
}) => {
  const [asciiLines, setAsciiLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const convertImageToASCII = useCallback((img: HTMLImageElement, targetCols: number): string[] => {
    // Create canvas if not exists
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Set canvas size to image size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Calculate cell dimensions
    // ASCII characters are roughly 2:1 height:width ratio
    const cellWidth = img.width / targetCols;
    const cellHeight = cellWidth * 2;
    const rows = Math.floor(img.height / cellHeight);

    const lines: string[] = [];

    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < targetCols; x++) {
        // Sample pixel at center of cell
        const sampleX = Math.floor(x * cellWidth + cellWidth / 2);
        const sampleY = Math.floor(y * cellHeight + cellHeight / 2);

        // Get pixel data
        const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;

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
        // Build WMS URL for Rotterdam
        const wmsUrl = buildWMSUrl(ROTTERDAM_BBOX, 512, 512);

        // Fetch image via our proxy to avoid CORS issues
        // We'll use a data URL approach with fetch
        const response = await fetch(`/api/proxy-wms?url=${encodeURIComponent(wmsUrl)}`);

        if (!response.ok) {
          // Try direct fetch as fallback (may fail due to CORS)
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const ascii = convertImageToASCII(img, cols);
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
              const ascii = convertImageToASCII(img, cols);
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
        for (let i = 0; i < 40; i++) {
          let line = '';
          for (let j = 0; j < cols; j++) {
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
  }, [cols, convertImageToASCII]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <pre
        className="font-mono text-[8px] leading-[8px] text-gray-900 whitespace-pre select-none"
        style={{
          fontFamily: 'monospace',
          letterSpacing: '0px',
        }}
      >
        {isLoading ? (
          // Loading placeholder
          Array(40).fill(0).map((_, i) => (
            <div key={i}>{'. '.repeat(cols / 2)}</div>
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
