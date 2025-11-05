/**
 * Residential Data Scoring System
 *
 * Scores residential properties based on typologie, size, and price categories.
 * Uses reference houses from Altum AI to calculate category scores.
 */

import type { ReferenceHouse } from '../sources/altum-ai/types';

/**
 * House type mappings for typologie categories
 */
const TYPOLOGIE_MAPPINGS = {
  laagStedelijk: [
    'Eengezinswoning',
    'Vrijstaande woning',
    'Vrijstaande doelgroepwoning',
    'Vrijstaande recreatiewoning',
    '2 onder 1 kap woning',
    'Geschakelde 2 onder 1 kapwoning',
    'Geschakelde woning',
    'Tussen/rijwoning',
    'Tussen/rij doelgroepwoning',
    'Hoekwoning',
    'Eindwoning'
  ],
  randStedelijk: [
    'Tussen/rijwoning',
    'Tussen/rij doelgroepwoning',
    'Hoekwoning',
    'Eindwoning',
    'Meergezinswoning',
    'Benedenwoning',
    'Bovenwoning',
    'Portiekwoning',
    'Galerijflat',
    'Maisonnette'
  ],
  hoogStedelijk: [
    'Portiekwoning',
    'Galerijflat',
    'Maisonnette',
    'Portiekflat',
    'Corridorflat'
  ]
};

/**
 * Residential category score
 */
export interface ResidentialCategoryScore {
  /** Category name */
  category: string;
  /** Count of properties in category */
  count: number;
  /** Score: -1 to 1 */
  score: number;
}

/**
 * Residential scoring result
 */
export interface ResidentialScores {
  /** Typologie scores */
  typologie: {
    laagStedelijk: ResidentialCategoryScore;
    randStedelijk: ResidentialCategoryScore;
    hoogStedelijk: ResidentialCategoryScore;
  };
  /** Size (Woonoppervlak) scores */
  woonoppervlak: {
    klein: ResidentialCategoryScore;    // < 60m²
    midden: ResidentialCategoryScore;   // 60-110m²
    groot: ResidentialCategoryScore;    // > 110m²
  };
  /** Price (Transactieprijs) scores */
  transactieprijs: {
    laag: ResidentialCategoryScore;     // < €350,000
    midden: ResidentialCategoryScore;   // €350,000-€525,000
    hoog: ResidentialCategoryScore;     // > €525,000
  };
  /** Calculated averages (display only, no scoring) */
  averages: {
    bouwjaar: number | null;
    woonoppervlakte: number | null;
    perceeloppervlakte: number | null;
    inhoud: number | null;
    transactieprijs: number | null;
    geindexeerdeTransactieprijs: number | null;
  };
}

/**
 * Calculate residential category score
 *
 * Formula: min(1, max(-1, (count - 10) / 10))
 * - 0 properties → -1
 * - 10 properties → 0
 * - 20+ properties → 1
 * - Linear interpolation between
 *
 * @param count Number of properties in category
 * @returns Score from -1 to 1
 */
export function calculateResidentialCategoryScore(count: number): number {
  return Math.min(1, Math.max(-1, (count - 10) / 10));
}

/**
 * Parse transaction price range to get midpoint
 *
 * @param priceRange Price range string (e.g., "350000-400000")
 * @returns Midpoint value or null
 */
function parseTransactionPrice(priceRange: string): number | null {
  try {
    const parts = priceRange.split('-');
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const max = parseInt(parts[1], 10);
      if (!isNaN(min) && !isNaN(max)) {
        return (min + max) / 2;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Calculate typologie scores
 *
 * @param houses Reference houses
 * @returns Typologie scores
 */
function calculateTypologieScores(houses: ReferenceHouse[]): ResidentialScores['typologie'] {
  const counts = {
    laagStedelijk: 0,
    randStedelijk: 0,
    hoogStedelijk: 0
  };

  houses.forEach(house => {
    const houseType = house.HouseType;

    // Note: A house can be counted in multiple categories
    if (TYPOLOGIE_MAPPINGS.laagStedelijk.includes(houseType)) {
      counts.laagStedelijk++;
    }
    if (TYPOLOGIE_MAPPINGS.randStedelijk.includes(houseType)) {
      counts.randStedelijk++;
    }
    if (TYPOLOGIE_MAPPINGS.hoogStedelijk.includes(houseType)) {
      counts.hoogStedelijk++;
    }
  });

  return {
    laagStedelijk: {
      category: 'Laag stedelijk',
      count: counts.laagStedelijk,
      score: calculateResidentialCategoryScore(counts.laagStedelijk)
    },
    randStedelijk: {
      category: 'Rand stedelijk',
      count: counts.randStedelijk,
      score: calculateResidentialCategoryScore(counts.randStedelijk)
    },
    hoogStedelijk: {
      category: 'Hoog stedelijk',
      count: counts.hoogStedelijk,
      score: calculateResidentialCategoryScore(counts.hoogStedelijk)
    }
  };
}

/**
 * Calculate woonoppervlak (size) scores
 *
 * @param houses Reference houses
 * @returns Woonoppervlak scores
 */
function calculateWoonoppervlakScores(houses: ReferenceHouse[]): ResidentialScores['woonoppervlak'] {
  const counts = {
    klein: 0,    // < 60m²
    midden: 0,   // 60-110m²
    groot: 0     // > 110m²
  };

  houses.forEach(house => {
    const area = house.InnerSurfaceArea;
    if (area < 60) {
      counts.klein++;
    } else if (area <= 110) {
      counts.midden++;
    } else {
      counts.groot++;
    }
  });

  return {
    klein: {
      category: 'Klein (< 60m²)',
      count: counts.klein,
      score: calculateResidentialCategoryScore(counts.klein)
    },
    midden: {
      category: 'Midden (60-110m²)',
      count: counts.midden,
      score: calculateResidentialCategoryScore(counts.midden)
    },
    groot: {
      category: 'Groot (> 110m²)',
      count: counts.groot,
      score: calculateResidentialCategoryScore(counts.groot)
    }
  };
}

/**
 * Calculate transactieprijs (price) scores
 *
 * @param houses Reference houses
 * @returns Transactieprijs scores
 */
function calculateTransactieprijsScores(houses: ReferenceHouse[]): ResidentialScores['transactieprijs'] {
  const counts = {
    laag: 0,     // < €350,000
    midden: 0,   // €350,000-€525,000
    hoog: 0      // > €525,000
  };

  houses.forEach(house => {
    const price = parseTransactionPrice(house.TransactionPrice);
    if (price !== null) {
      if (price < 350000) {
        counts.laag++;
      } else if (price <= 525000) {
        counts.midden++;
      } else {
        counts.hoog++;
      }
    }
  });

  return {
    laag: {
      category: 'Laag (< €350k)',
      count: counts.laag,
      score: calculateResidentialCategoryScore(counts.laag)
    },
    midden: {
      category: 'Midden (€350k-€525k)',
      count: counts.midden,
      score: calculateResidentialCategoryScore(counts.midden)
    },
    hoog: {
      category: 'Hoog (> €525k)',
      count: counts.hoog,
      score: calculateResidentialCategoryScore(counts.hoog)
    }
  };
}

/**
 * Calculate averages for various metrics
 *
 * @param houses Reference houses
 * @returns Calculated averages
 */
function calculateAverages(houses: ReferenceHouse[]): ResidentialScores['averages'] {
  if (houses.length === 0) {
    return {
      bouwjaar: null,
      woonoppervlakte: null,
      perceeloppervlakte: null,
      inhoud: null,
      transactieprijs: null,
      geindexeerdeTransactieprijs: null
    };
  }

  // Build year
  const bouwjaren = houses.map(h => h.BuildYear).filter(y => y > 0);
  const avgBouwjaar = bouwjaren.length > 0
    ? Math.round(bouwjaren.reduce((sum, y) => sum + y, 0) / bouwjaren.length)
    : null;

  // Inner surface area
  const woonoppervlaktes = houses.map(h => h.InnerSurfaceArea).filter(a => a > 0);
  const avgWoonoppervlakte = woonoppervlaktes.length > 0
    ? Math.round(woonoppervlaktes.reduce((sum, a) => sum + a, 0) / woonoppervlaktes.length)
    : null;

  // Outer surface area
  const perceeloppervlaktes = houses.map(h => h.OuterSurfaceArea).filter(a => a > 0);
  const avgPerceeloppervlakte = perceeloppervlaktes.length > 0
    ? Math.round(perceeloppervlaktes.reduce((sum, a) => sum + a, 0) / perceeloppervlaktes.length)
    : null;

  // Volume
  const inhouden = houses.map(h => h.Volume).filter(v => v !== null && v > 0) as number[];
  const avgInhoud = inhouden.length > 0
    ? Math.round(inhouden.reduce((sum, v) => sum + v, 0) / inhouden.length)
    : null;

  // Transaction price
  const transactieprijzen = houses
    .map(h => parseTransactionPrice(h.TransactionPrice))
    .filter(p => p !== null) as number[];
  const avgTransactieprijs = transactieprijzen.length > 0
    ? Math.round(transactieprijzen.reduce((sum, p) => sum + p, 0) / transactieprijzen.length)
    : null;

  // Indexed transaction price
  const geindexeerdePrijzen = houses
    .map(h => parseTransactionPrice(h.IndexedTransactionPrice))
    .filter(p => p !== null) as number[];
  const avgGeindexeerdeTransactieprijs = geindexeerdePrijzen.length > 0
    ? Math.round(geindexeerdePrijzen.reduce((sum, p) => sum + p, 0) / geindexeerdePrijzen.length)
    : null;

  return {
    bouwjaar: avgBouwjaar,
    woonoppervlakte: avgWoonoppervlakte,
    perceeloppervlakte: avgPerceeloppervlakte,
    inhoud: avgInhoud,
    transactieprijs: avgTransactieprijs,
    geindexeerdeTransactieprijs: avgGeindexeerdeTransactieprijs
  };
}

/**
 * Calculate all residential scores
 *
 * @param houses Reference houses from Altum AI
 * @returns Complete residential scores
 */
export function calculateResidentialScores(houses: ReferenceHouse[]): ResidentialScores {
  return {
    typologie: calculateTypologieScores(houses),
    woonoppervlak: calculateWoonoppervlakScores(houses),
    transactieprijs: calculateTransactieprijsScores(houses),
    averages: calculateAverages(houses)
  };
}
