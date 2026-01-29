// src/app/[locale]/components/ASCIIMapBackground.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';

// ASCII characters from dark to light
const ASCII_CHARS = '@%#*+=-:. ';

// 4 Dutch city tiles to pan across
const TILES = [
  { name: 'Rotterdam', bbox: '51.85,4.35,51.95,4.55' },
  { name: 'Den Haag', bbox: '52.03,4.25,52.13,4.45' },
  { name: 'Amsterdam', bbox: '52.32,4.82,52.42,5.02' },
  { name: 'Utrecht', bbox: '52.05,5.05,52.15,5.25' },
];

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
  const [asciiTiles, setAsciiTiles] = useState<string[][]>([]);
  const [tileImages, setTileImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [panX, setPanX] = useState(0);
  const [rows, setRows] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

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

  // Load and convert all 4 tiles
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

      for (const tile of TILES) {
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
  }, [rows, debugShowImage]);

  // Smooth panning animation
  useEffect(() => {
    if (isLoading || asciiTiles.length === 0) return;

    const totalWidth = asciiTiles.length * rows * 4.8; // 4 tiles * tileSize * char width
    const screenWidth = window.innerWidth;
    const maxPan = totalWidth - screenWidth;

    const duration = 60000; // 60 seconds for full pan
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = (elapsed % (duration * 2)) / duration; // 0 to 2

      // Ping-pong: 0->1 then 1->0
      const easedProgress = progress <= 1 ? progress : 2 - progress;

      setPanX(easedProgress * maxPan);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLoading, asciiTiles, rows]);

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

  // Debug mode: show actual images
  if (debugShowImage && tileImages.length > 0) {
    return (
      <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`} style={{ opacity: 0.5, zIndex: 0 }}>
        <div style={{ display: 'flex', position: 'absolute', left: -panX, height: '100vh' }}>
          {tileImages.map((src, i) => (
            <img key={i} src={src} alt={TILES[i].name} style={{ height: '100vh', width: 'auto' }} />
          ))}
        </div>
        <div className="absolute top-2 left-2 text-xs text-gray-700 bg-white/80 px-2 py-1 rounded z-10">
          Pan: {Math.round(panX)}px | Tiles: {tileImages.length}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity, zIndex: 0 }}
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
