// src/features/location/utils/cubePatterns.ts
// Tetris shapes and gradient colors for cube visualization

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = c1.r + factor * (c2.r - c1.r);
  const g = c1.g + factor * (c2.g - c1.g);
  const b = c1.b + factor * (c2.b - c1.b);

  return rgbToHex(r, g, b);
}

/**
 * Generate 27 specific colors for the cube
 * Returns a fixed palette of green shades
 */
export function generateGradientColors(): string[] {
  return [
    '#abb474',
    '#5a714a',
    '#576e48',
    '#b5bc79',
    '#486341',
    '#6e8154',
    '#7e8e5d',
    '#718456',
    '#5e744c',
    '#4f6944',
    '#8f9c66',
    '#869561',
    '#536c46',
    '#a1ac6f',
    '#8a9864',
    '#62774e',
    '#82915f',
    '#6a7d52',
    '#a6b072',
    '#4b6643',
    '#667a50',
    '#798a5b',
    '#9ca86d',
    '#93a068',
    '#98a46b',
    '#758758',
    '#b0b877',
  ];
}

/**
 * Tetris-like shapes (4 cubes each)
 * Each shape is defined by 4 cube indices (0-26)
 */
export const TETRIS_SHAPES = [
  // Shape 1: L-Piece (Bottom Layer)
  // Forms an L shape at the bottom
  [9, 10, 19, 18],

  // Shape 2: T-Piece (Middle Layer)
  // Forms a T shape in the middle layer
  [12, 13, 14, 16],

  // Shape 3: Vertical Line
  // Vertical line going up
  [4, 7, 10, 13],

  // Shape 4: Z-Piece (Top Layer)
  // Z-like shape at the top
  [15, 16, 17, 14],

  // Shape 5: 3D Corner
  // Corner piece extending from center in 3 directions
  [13, 14, 16, 22],
];

/**
 * Get a random tetris shape
 */
export function getRandomTetrisShape(): number[] {
  const randomIndex = Math.floor(Math.random() * TETRIS_SHAPES.length);
  return TETRIS_SHAPES[randomIndex];
}

/**
 * Get colors for a specific shape (4 colors from the gradient)
 */
export function getShapeColors(shapeIndices: number[]): string[] {
  const allColors = generateGradientColors();
  return shapeIndices.map(index => allColors[index]);
}
