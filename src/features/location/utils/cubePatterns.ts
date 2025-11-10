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
 * Each color corresponds to a specific persona based on their cube position.
 * Cube positions are calculated as: (x+1) + (y+1)*3 + (z+1)*9
 * Where: X=Income (-1=Low, 0=Mid, 1=High), Y=Age (-1=20-35, 0=35-55, 1=55+), Z=Household (-1=Single, 0=Couple, 1=Family)
 *
 * Mapping (cube_position: persona -> color):
 * 0: Jonge Starters (Low, 20-35, Single) -> cls-1
 * 1: Ambitieuze Singles (Mid, 20-35, Single) -> cls-10
 * 2: Carrièrestarters (High, 20-35, Single) -> cls-19
 * 3: Zelfstandige Doorzetters (Low, 35-55, Single) -> cls-2
 * 4: Zelfbewuste Solisten (Mid, 35-55, Single) -> cls-11
 * 5: Succesvolle Singles (High, 35-55, Single) -> cls-20
 * 6: Senioren op Budget (Low, 55+, Single) -> cls-3
 * 7: Actieve Senioren (Mid, 55+, Single) -> cls-12
 * 8: Onafhankelijke Levensgenieters (High, 55+, Single) -> cls-21
 * 9: Praktische Duo's (Low, 20-35, Couple) -> cls-4
 * 10: Gevestigde Duo's (Mid, 20-35, Couple) -> cls-13
 * 11: Stedelijke Trendsetters (High, 20-35, Couple) -> cls-22
 * 12: Bescheiden Stellen (Low, 35-55, Couple) -> cls-5
 * 13: Comfortabele Koppels (Mid, 35-55, Couple) -> cls-14
 * 14: Comfortabele Professionals (High, 35-55, Couple) -> cls-23
 * 15: Zuinig Genieten (Low, 55+, Couple) -> cls-6
 * 16: Stabiele Duogenieters (Mid, 55+, Couple) -> cls-15
 * 17: Welvarende Levensgenieters (High, 55+, Couple) -> cls-24
 * 18: Jonge Gezinnen in Groei (Low, 20-35, Family) -> cls-7
 * 19: Groeiende Gezinnen (Mid, 20-35, Family) -> cls-16
 * 20: Jonge Gezinnen met Ambitie (High, 20-35, Family) -> cls-25
 * 21: Pragmatische Gezinnen (Low, 35-55, Family) -> cls-8
 * 22: Gezinnen in Balans (Mid, 35-55, Family) -> cls-17
 * 23: Succesvolle Gezinnen (High, 35-55, Family) -> cls-26
 * 24: Senioren met Thuiswonende Kinderen (Low, 55+, Family) -> cls-9
 * 25: Lege-Nesters (Mid, 55+, Family) -> cls-18
 * 26: Welgestelde Nestblijvers (High, 55+, Family) -> cls-27
 */
export function generateGradientColors(): string[] {
  return [
    '#abb474',  // Index 0: Jonge Starters (cls-1)
    '#4f6944',  // Index 1: Ambitieuze Singles (cls-10)
    '#a6b072',  // Index 2: Carrièrestarters (cls-19)
    '#5a714a',  // Index 3: Zelfstandige Doorzetters (cls-2)
    '#8f9c66',  // Index 4: Zelfbewuste Solisten (cls-11)
    '#4b6643',  // Index 5: Succesvolle Singles (cls-20)
    '#576e48',  // Index 6: Senioren op Budget (cls-3)
    '#869561',  // Index 7: Actieve Senioren (cls-12)
    '#667a50',  // Index 8: Onafhankelijke Levensgenieters (cls-21)
    '#b5bc79',  // Index 9: Praktische Duo's (cls-4)
    '#536c46',  // Index 10: Gevestigde Duo's (cls-13)
    '#798a5b',  // Index 11: Stedelijke Trendsetters (cls-22)
    '#486341',  // Index 12: Bescheiden Stellen (cls-5)
    '#a1ac6f',  // Index 13: Comfortabele Koppels (cls-14)
    '#9ca86d',  // Index 14: Comfortabele Professionals (cls-23)
    '#6e8154',  // Index 15: Zuinig Genieten (cls-6)
    '#8a9864',  // Index 16: Stabiele Duogenieters (cls-15)
    '#93a068',  // Index 17: Welvarende Levensgenieters (cls-24)
    '#7e8e5d',  // Index 18: Jonge Gezinnen in Groei (cls-7)
    '#62774e',  // Index 19: Groeiende Gezinnen (cls-16)
    '#98a46b',  // Index 20: Jonge Gezinnen met Ambitie (cls-25)
    '#718456',  // Index 21: Pragmatische Gezinnen (cls-8)
    '#82915f',  // Index 22: Gezinnen in Balans (cls-17)
    '#758758',  // Index 23: Succesvolle Gezinnen (cls-26)
    '#5e744c',  // Index 24: Senioren met Thuiswonende Kinderen (cls-9)
    '#6a7d52',  // Index 25: Lege-Nesters (cls-18)
    '#b0b877',  // Index 26: Welgestelde Nestblijvers (cls-27)
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
