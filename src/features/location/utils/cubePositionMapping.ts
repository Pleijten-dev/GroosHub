/**
 * Utility for mapping housing personas to 3D cube positions
 *
 * The 3x3x3 cube represents:
 * - X-axis (horizontal): Income level (left to right: Low, Medium, High)
 * - Y-axis (vertical): Age group (bottom to top: Young, Middle, Senior)
 * - Z-axis (depth): Household type (back to front: Single, Couple, Family)
 *
 * Example: "Jonge Gezinnen in Groei" (Low income, 20-35 years, Family)
 *   -> Position: (-1, -1, 1) -> Index: 18
 *
 * Cube organization (27 positions, indices 0-26):
 * - Each persona has a unique fixed position based on its characteristics
 * - Selecting a persona will always light up the same cube
 * - Position is independent of score or ranking
 */

export interface PersonaCharacteristics {
  income_level: string;
  age_group: string;
  household_type: string;
}

/**
 * Map income level to X coordinate (-1, 0, 1)
 */
function getIncomeX(incomeLevel: string): number {
  switch (incomeLevel) {
    case 'Laag inkomen':
    case 'Low income':
      return -1; // Left
    case 'Gemiddeld inkomen':
    case 'Average income':
      return 0; // Center
    case 'Hoog inkomen':
    case 'High income':
      return 1; // Right
    default:
      console.warn(`Unknown income level: ${incomeLevel}`);
      return 0;
  }
}

/**
 * Map age group to Y coordinate (-1, 0, 1)
 */
function getAgeY(ageGroup: string): number {
  switch (ageGroup) {
    case '20-35 jaar':
    case '20-35 years':
      return -1; // Bottom
    case '35-55 jaar':
    case '35-55 years':
      return 0; // Middle
    case '55+ jaar':
    case '55+ years':
      return 1; // Top
    default:
      console.warn(`Unknown age group: ${ageGroup}`);
      return 0;
  }
}

/**
 * Map household type to Z coordinate (-1, 0, 1)
 */
function getHouseholdZ(householdType: string): number {
  switch (householdType) {
    case '1-persoonshuishouden':
    case '1-person household':
      return -1; // Back
    case '2-persoonshuishouden':
    case '2-person household':
      return 0; // Middle
    case 'met kinderen':
    case 'with children':
      return 1; // Front
    default:
      console.warn(`Unknown household type: ${householdType}`);
      return 0;
  }
}

/**
 * Convert (x, y, z) coordinates to cube index (0-26)
 * The cube is organized as a 3x3x3 grid
 */
export function coordsToCubeIndex(x: number, y: number, z: number): number {
  // Convert from (-1, 0, 1) to (0, 1, 2)
  const xi = x + 1;
  const yi = y + 1;
  const zi = z + 1;

  // Calculate index: x varies fastest, then y, then z
  // This matches the position generation in CubeVisualization
  return xi + yi * 3 + zi * 9;
}

/**
 * Get the cube position (x, y, z) and index for a persona
 */
export function getPersonaCubePosition(
  characteristics: PersonaCharacteristics
): {
  x: number;
  y: number;
  z: number;
  index: number;
} {
  const x = getIncomeX(characteristics.income_level);
  const y = getAgeY(characteristics.age_group);
  const z = getHouseholdZ(characteristics.household_type);
  const index = coordsToCubeIndex(x, y, z);

  return { x, y, z, index };
}

/**
 * Axis labels for the cube dimensions
 */
export const CUBE_AXIS_LABELS = {
  nl: {
    x: {
      axis: 'Inkomen',
      negative: 'Laag',
      center: 'Gemiddeld',
      positive: 'Hoog',
    },
    y: {
      axis: 'Leeftijd',
      negative: '20-35 jr',
      center: '35-55 jr',
      positive: '55+ jr',
    },
    z: {
      axis: 'Huishouden',
      negative: '1-pers',
      center: '2-pers',
      positive: 'Gezin',
    },
  },
  en: {
    x: {
      axis: 'Income',
      negative: 'Low',
      center: 'Medium',
      positive: 'High',
    },
    y: {
      axis: 'Age',
      negative: '20-35 yrs',
      center: '35-55 yrs',
      positive: '55+ yrs',
    },
    z: {
      axis: 'Household',
      negative: 'Single',
      center: 'Couple',
      positive: 'Family',
    },
  },
} as const;
