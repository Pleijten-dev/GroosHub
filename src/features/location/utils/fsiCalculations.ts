/**
 * FSI (Floor Space Index) Calculations
 *
 * Calculates FSI from CBS address density (Omgevingsadressendichtheid)
 * and provides housing typology recommendations based on the result.
 *
 * Reference data points used for calibration:
 * - Aa en Hunze (village): 280 addresses/km² → FSI ~0.4
 * - Netherlands average: 1994 addresses/km² → FSI ~1.5
 * - Rotterdam: 3945 addresses/km² → FSI ~2.8
 * - Blijdorp: 5135 addresses/km² → FSI ~3.5
 * - Rotterdam Centrum: 6141 addresses/km² → FSI ~4.2
 */

import type { Locale } from '../../../lib/i18n/config';

/**
 * FSI category based on building intensity
 */
export type FSICategory = 'low' | 'medium' | 'high';

/**
 * FSI calculation result with all metadata
 */
export interface FSIResult {
  calculatedFSI: number;
  category: FSICategory;
  addressDensity: number;
}

/**
 * Housing category percentages for residential allocation
 * null means "not specified" - can be any value in generation
 * a number means "minimum required percentage"
 */
export interface HousingCategoryPercentages {
  social: number | null;      // Sociaal (default: 30)
  affordable: number | null;  // Betaalbaar (default: null)
  luxury: number | null;      // Luxe (default: null)
}

/**
 * Default housing category percentages
 */
export const DEFAULT_HOUSING_CATEGORIES: HousingCategoryPercentages = {
  social: 30,
  affordable: null,
  luxury: null,
};

/**
 * Breakpoints for FSI calculation based on address density
 * Uses linear interpolation between points
 */
const FSI_BREAKPOINTS = [
  { density: 0, fsi: 0.2 },
  { density: 280, fsi: 0.4 },    // Aa en Hunze (village)
  { density: 500, fsi: 0.6 },
  { density: 1000, fsi: 1.0 },
  { density: 2000, fsi: 1.5 },   // ~Netherlands average
  { density: 3000, fsi: 2.2 },
  { density: 4000, fsi: 2.8 },   // ~Rotterdam
  { density: 5000, fsi: 3.5 },   // ~Blijdorp
  { density: 6000, fsi: 4.0 },   // ~Rotterdam Centrum
  { density: 8000, fsi: 5.0 },   // Maximum
];

/**
 * FSI category thresholds
 */
const FSI_CATEGORY_THRESHOLDS = {
  low: 0.8,     // < 0.8 = low (ground-bound only)
  medium: 2.0,  // 0.8 - 2.0 = medium (mix)
  // > 2.0 = high (apartments only)
};

/**
 * Calculate FSI from address density using linear interpolation
 */
export function calculateFSIFromDensity(addressDensity: number): number {
  if (addressDensity <= 0) return FSI_BREAKPOINTS[0].fsi;
  if (addressDensity >= FSI_BREAKPOINTS[FSI_BREAKPOINTS.length - 1].density) {
    return FSI_BREAKPOINTS[FSI_BREAKPOINTS.length - 1].fsi;
  }

  // Find the two breakpoints to interpolate between
  for (let i = 0; i < FSI_BREAKPOINTS.length - 1; i++) {
    const lower = FSI_BREAKPOINTS[i];
    const upper = FSI_BREAKPOINTS[i + 1];

    if (addressDensity >= lower.density && addressDensity <= upper.density) {
      // Linear interpolation
      const t = (addressDensity - lower.density) / (upper.density - lower.density);
      const fsi = lower.fsi + t * (upper.fsi - lower.fsi);
      return Math.round(fsi * 10) / 10; // Round to 1 decimal
    }
  }

  return FSI_BREAKPOINTS[0].fsi;
}

/**
 * Get FSI category based on FSI value
 */
export function getFSICategory(fsi: number): FSICategory {
  if (fsi < FSI_CATEGORY_THRESHOLDS.low) return 'low';
  if (fsi < FSI_CATEGORY_THRESHOLDS.medium) return 'medium';
  return 'high';
}

/**
 * Calculate full FSI result from address density
 */
export function calculateFSI(addressDensity: number): FSIResult {
  const calculatedFSI = calculateFSIFromDensity(addressDensity);
  const category = getFSICategory(calculatedFSI);

  return {
    calculatedFSI,
    category,
    addressDensity,
  };
}

/**
 * Get housing typology recommendation based on FSI category
 */
export function getHousingRecommendation(fsi: number, locale: Locale): string {
  const category = getFSICategory(fsi);

  const recommendations: Record<FSICategory, Record<Locale, string>> = {
    low: {
      nl: 'Bij deze lage FSI is grondgebonden woningbouw het meest geschikt: eengezinswoningen, rijtjeshuizen, twee-onder-één-kap woningen. Geen hoogbouw of appartementen aanbevolen.',
      en: 'At this low FSI, ground-bound housing is most suitable: single-family homes, row houses, semi-detached houses. No high-rise or apartments recommended.',
    },
    medium: {
      nl: 'Bij deze gemiddelde FSI is een mix van woningtypes geschikt: 60-70% grondgebonden woningen en 30-40% laagbouw appartementen (max 4 lagen). Flexibiliteit in woningmix mogelijk.',
      en: 'At this medium FSI, a mix of housing types is suitable: 60-70% ground-bound housing and 30-40% low-rise apartments (max 4 floors). Flexibility in housing mix possible.',
    },
    high: {
      nl: 'Bij deze hoge FSI is gestapelde bouw (appartementen) het meest geschikt. Hoogbouw mogelijk waar stedenbouwkundig passend. Grondgebonden woningen zijn niet haalbaar.',
      en: 'At this high FSI, stacked construction (apartments) is most suitable. High-rise possible where urbanistically appropriate. Ground-bound housing is not feasible.',
    },
  };

  return recommendations[category][locale];
}

/**
 * Get short housing typology label
 */
export function getHousingTypeLabel(fsi: number, locale: Locale): string {
  const category = getFSICategory(fsi);

  const labels: Record<FSICategory, Record<Locale, string>> = {
    low: {
      nl: 'Grondgebonden',
      en: 'Ground-bound',
    },
    medium: {
      nl: 'Gemengd',
      en: 'Mixed',
    },
    high: {
      nl: 'Gestapeld',
      en: 'Stacked',
    },
  };

  return labels[category][locale];
}

/**
 * Get FSI category label for display
 */
export function getFSICategoryLabel(fsi: number, locale: Locale): string {
  const category = getFSICategory(fsi);

  const labels: Record<FSICategory, Record<Locale, string>> = {
    low: {
      nl: 'Laag',
      en: 'Low',
    },
    medium: {
      nl: 'Gemiddeld',
      en: 'Medium',
    },
    high: {
      nl: 'Hoog',
      en: 'High',
    },
  };

  return labels[category][locale];
}

/**
 * Validate housing category percentages
 * Returns validation result with any errors
 */
export function validateHousingCategories(
  categories: HousingCategoryPercentages
): { isValid: boolean; errors: string[]; total: number } {
  const errors: string[] = [];

  // Calculate total of specified percentages
  const total =
    (categories.social ?? 0) +
    (categories.affordable ?? 0) +
    (categories.luxury ?? 0);

  // Check if total exceeds 100%
  if (total > 100) {
    errors.push(`Total housing categories (${total}%) exceeds 100%`);
  }

  // Check for negative values
  if (categories.social !== null && categories.social < 0) {
    errors.push('Social housing percentage cannot be negative');
  }
  if (categories.affordable !== null && categories.affordable < 0) {
    errors.push('Affordable housing percentage cannot be negative');
  }
  if (categories.luxury !== null && categories.luxury < 0) {
    errors.push('Luxury housing percentage cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
    total,
  };
}

/**
 * Calculate unallocated percentage (free to assign)
 */
export function getUnallocatedPercentage(categories: HousingCategoryPercentages): number {
  const total =
    (categories.social ?? 0) +
    (categories.affordable ?? 0) +
    (categories.luxury ?? 0);

  return Math.max(0, 100 - total);
}

/**
 * Normalize housing categories to ensure they sum to <= 100%
 * Used when user ignores validation errors
 */
export function normalizeHousingCategories(
  categories: HousingCategoryPercentages
): HousingCategoryPercentages {
  const total =
    (categories.social ?? 0) +
    (categories.affordable ?? 0) +
    (categories.luxury ?? 0);

  if (total <= 100) {
    return categories;
  }

  // Scale down proportionally
  const scale = 100 / total;

  return {
    social: categories.social !== null ? Math.round(categories.social * scale) : null,
    affordable: categories.affordable !== null ? Math.round(categories.affordable * scale) : null,
    luxury: categories.luxury !== null ? Math.round(categories.luxury * scale) : null,
  };
}

/**
 * Get housing category descriptions for LLM export
 */
export function getHousingCategoryDescriptions(locale: Locale): Record<keyof HousingCategoryPercentages, string> {
  return {
    social: locale === 'nl'
      ? 'Sociale huurwoningen - Woningen met een maximale huurprijs onder de liberalisatiegrens (ca. €879/maand), bestemd voor huishoudens met een lager inkomen.'
      : 'Social rental housing - Homes with a maximum rent below the liberalization limit (approx. €879/month), intended for lower-income households.',
    affordable: locale === 'nl'
      ? 'Betaalbare woningen - Middenhuur of betaalbare koopwoningen, bedoeld voor middeninkomens die niet in aanmerking komen voor sociale huur maar ook geen dure woningen kunnen betalen.'
      : 'Affordable housing - Mid-range rental or affordable purchase homes, intended for middle incomes who do not qualify for social housing but cannot afford expensive homes.',
    luxury: locale === 'nl'
      ? 'Vrije sector / Luxe woningen - Duurdere huur- of koopwoningen zonder prijsrestricties, gericht op hogere inkomens.'
      : 'Private sector / Luxury housing - More expensive rental or purchase homes without price restrictions, aimed at higher incomes.',
  };
}
