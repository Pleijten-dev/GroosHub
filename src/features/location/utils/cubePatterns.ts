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
 * Generate 27 specific colors mapped to cube positions
 *
 * Colors are mapped sequentially to cube indices (0-26):
 * Index 0 -> cls-1, Index 1 -> cls-2, ... Index 26 -> cls-27
 *
 * Cube positions are calculated as: (x+1) + (y+1)*3 + (z+1)*9
 * Where: X=Income (-1=Low, 0=Mid, 1=High), Y=Age (-1=20-35, 0=35-55, 1=55+), Z=Household (-1=Single, 0=Couple, 1=Family)
 */
export function generateGradientColors(): string[] {
  return [
    '#abb474',  // Index 0 -> cls-1
    '#5a714a',  // Index 1 -> cls-2
    '#576e48',  // Index 2 -> cls-3
    '#b5bc79',  // Index 3 -> cls-4
    '#486341',  // Index 4 -> cls-5
    '#6e8154',  // Index 5 -> cls-6
    '#7e8e5d',  // Index 6 -> cls-7
    '#718456',  // Index 7 -> cls-8
    '#5e744c',  // Index 8 -> cls-9
    '#4f6944',  // Index 9 -> cls-10
    '#8f9c66',  // Index 10 -> cls-11
    '#869561',  // Index 11 -> cls-12
    '#536c46',  // Index 12 -> cls-13
    '#a1ac6f',  // Index 13 -> cls-14
    '#8a9864',  // Index 14 -> cls-15
    '#62774e',  // Index 15 -> cls-16
    '#82915f',  // Index 16 -> cls-17
    '#6a7d52',  // Index 17 -> cls-18
    '#a6b072',  // Index 18 -> cls-19
    '#4b6643',  // Index 19 -> cls-20
    '#667a50',  // Index 20 -> cls-21
    '#798a5b',  // Index 21 -> cls-22
    '#9ca86d',  // Index 22 -> cls-23
    '#93a068',  // Index 23 -> cls-24
    '#98a46b',  // Index 24 -> cls-25
    '#758758',  // Index 25 -> cls-26
    '#b0b877',  // Index 26 -> cls-27
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
