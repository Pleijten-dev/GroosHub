/**
 * Voronoi SVG Generator for PDF Export
 *
 * Generates a voronoi gradient SVG pattern based on PVE percentages,
 * suitable for use as a cover image in PDF reports.
 */

import type { PVEAllocations } from '../data/cache/pveConfigCache';

// Category colors (matching PVE questionnaire)
const CATEGORIES = [
  { id: 'apartments', nl: 'Woningen', en: 'Apartments', color: '#8a976b' },
  { id: 'commercial', nl: 'Commercieel', en: 'Commercial', color: '#778a5e' },
  { id: 'hospitality', nl: 'Horeca', en: 'Hospitality', color: '#476938' },
  { id: 'social', nl: 'Sociaal', en: 'Social', color: '#638351' },
  { id: 'communal', nl: 'Gemeenschappelijk', en: 'Communal', color: '#778a5e' },
  { id: 'offices', nl: 'Kantoren', en: 'Offices', color: '#8a976b' }
] as const;

// Grayscale values for Voronoi (will be recolored by filter)
const VORONOI_GRAYSCALE: Record<keyof PVEAllocations, string> = {
  apartments: '#ffffff',
  commercial: '#cccccc',
  hospitality: '#999999',
  social: '#666666',
  communal: '#333333',
  offices: '#0c211a'
};

interface VoronoiConfig {
  width: number;
  height: number;
  percentages: PVEAllocations;
  blurAmount?: number;
}

/**
 * Generate a voronoi SVG string for use in PDF
 */
export function generateVoronoiSvgString(config: VoronoiConfig): string {
  const { width, height, percentages, blurAmount = 70 } = config;
  const padding = blurAmount * 3;
  const cellSize = 5;

  const extendedWidth = width + padding * 2;
  const extendedHeight = height + padding * 2;
  const cols = Math.floor(extendedWidth / cellSize);
  const rows = Math.floor(extendedHeight / cellSize);

  // Get active categories with their percentages
  const activeCategories = CATEGORIES.filter(cat => percentages[cat.id as keyof PVEAllocations] > 0);

  if (activeCategories.length === 0) {
    // Return a simple gradient if no categories
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#778a5e"/>
    </svg>`;
  }

  // Create seed points positioned at edges of ellipse
  const angleStep = (2 * Math.PI) / activeCategories.length;
  const centerX = extendedWidth / 2;
  const centerY = extendedHeight / 2;
  const radiusX = width * 0.6;
  const radiusY = height * 0.6;

  const seeds: { x: number; y: number; color: string; weight: number }[] = [];

  activeCategories.forEach((cat, idx) => {
    const angle = idx * angleStep;
    const percentage = percentages[cat.id as keyof PVEAllocations];

    seeds.push({
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      color: VORONOI_GRAYSCALE[cat.id as keyof PVEAllocations],
      weight: percentage
    });
  });

  // Generate cells as SVG rects
  let cellsSvg = '';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize + cellSize / 2;
      const y = row * cellSize + cellSize / 2;

      let minWeightedDist = Infinity;
      let nearestColor = VORONOI_GRAYSCALE[activeCategories[0]?.id as keyof PVEAllocations] || '#666666';

      seeds.forEach(seed => {
        const dist = Math.sqrt((x - seed.x) ** 2 + (y - seed.y) ** 2);
        const weightedDist = dist / Math.sqrt(seed.weight);

        if (weightedDist < minWeightedDist) {
          minWeightedDist = weightedDist;
          nearestColor = seed.color;
        }
      });

      cellsSvg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${nearestColor}"/>`;
    }
  }

  // Build complete SVG with filter
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="overflow:hidden">
    <defs>
      <filter id="voronoi-mute" x="-50%" y="-50%" width="200%" height="200%">
        <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray"/>
        <feComponentTransfer in="gray" result="colorized">
          <feFuncR type="table" tableValues="0.047 0.282 0.278 0.388 0.467 0.541"/>
          <feFuncG type="table" tableValues="0.129 0.502 0.463 0.514 0.541 0.592"/>
          <feFuncB type="table" tableValues="0.102 0.416 0.220 0.298 0.369 0.420"/>
        </feComponentTransfer>
        <feGaussianBlur in="colorized" stdDeviation="${blurAmount}" result="blurred"/>
      </filter>
    </defs>
    <g transform="translate(-${padding}, -${padding})" filter="url(#voronoi-mute)">
      ${cellsSvg}
    </g>
  </svg>`;

  return svg;
}

/**
 * Convert SVG string to data URL (base64)
 */
export function svgToDataUrl(svgString: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Convert SVG to PNG data URL using canvas
 * This is needed because jsPDF doesn't handle complex SVG filters well
 */
export async function svgToPngDataUrl(
  svgString: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
}

/**
 * Generate voronoi cover image for PDF
 * Returns a PNG data URL suitable for jsPDF addImage
 */
export async function generateVoronoiCoverImage(
  percentages: PVEAllocations,
  widthMm: number = 190,
  heightMm: number = 257
): Promise<string> {
  // Convert mm to pixels (assuming 96 DPI, and accounting for print quality)
  // Use higher resolution for better print quality
  const dpi = 150;
  const mmToPixel = dpi / 25.4;
  const widthPx = Math.round(widthMm * mmToPixel);
  const heightPx = Math.round(heightMm * mmToPixel);

  const svgString = generateVoronoiSvgString({
    width: widthPx,
    height: heightPx,
    percentages,
    blurAmount: Math.round(70 * (widthPx / 1200)) // Scale blur with size
  });

  return svgToPngDataUrl(svgString, widthPx, heightPx);
}

// Default percentages for when no PVE data is available
export const DEFAULT_PVE_PERCENTAGES: PVEAllocations = {
  apartments: 70,
  commercial: 15,
  hospitality: 5,
  social: 5,
  communal: 3,
  offices: 2
};
