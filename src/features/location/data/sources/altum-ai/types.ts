/**
 * Altum AI API Types
 * Interactive Reference API - Housing Market Data
 * Documentation: https://api.altum.ai/interactive-reference
 */

import type { ResidentialScores } from '../../scoring/residentialScoring';

/**
 * Energy Label Information
 */
export interface EnergyLabelData {
  DefinitiveEnergyLabel: string | null;
  DefinitiveType: string | null;
  DefinitiveValidity: string | null;
}

/**
 * Given House Data (Target Property)
 */
export interface GivenHouseData {
  PostCode: string;
  HouseNumber: number;
  HouseAddition: string | null;
  ValuationDate: number; // YYYYMMDD format
  InnerSurfaceArea: number;
  OuterSurfaceArea: number;
  HouseType: string;
  BuildYear: number;
  EnergyLabel: EnergyLabelData;
  Image: string | null;
}

/**
 * API Input Parameters (echoed back in response)
 */
export interface InputParameters {
  StrictStreet: number;
  StrictBuurt: number;
  StrictWijk: number;
  StrictEnergyLabel: number;
  ComparableHouseType: number;
  ComparableInnerSurfaceArea: number;
  ComparableBuildYear: number;
  ComparableDistance: number;
  DateLimit: number;
}

/**
 * Reference House from API
 */
export interface ReferenceHouse {
  PostCode: string;
  HouseNumber: number;
  HouseAddition: string | null;
  Street: string;
  BuurtCode: string;
  WijkCode: string;
  City: string;
  HouseType: string;
  BuildYear: number;
  InnerSurfaceArea: number;
  OuterSurfaceArea: number;
  Volume: number | null;
  DefinitiveEnergyLabel: string | null;
  DefinitiveType: string | null;
  DefinitiveValidity: string | null;
  Longitude: number;
  Latitude: number;
  Transactiondate: number; // YYYYMM format
  Image: string | null;
  TransactionPrice: string; // Range format: "275000-300000"
  IndexedTransactionPrice: string; // Range format: "400000-450000"
  PriceIndex: number;
  Distance: number; // Distance in meters ⭐ KEY FIELD
  VisualSimilarityScore: number | null;
  Weight: number;
  Source: 'Kadaster' | 'Funda';
}

/**
 * Reference Data from API
 */
export interface ReferenceData {
  ReferencePriceMean: string; // Range format: "350000-375000"
  ReferenceHouses: ReferenceHouse[];
}

/**
 * Complete Altum AI API Response
 */
export interface AltumAIResponse {
  GivenHouse: GivenHouseData;
  Inputs: InputParameters;
  ReferenceData: ReferenceData;
}

/**
 * API Request Body
 */
export interface AltumAIRequest {
  postcode: string;
  housenumber: number;
  houseaddition?: string;
  valuationdate?: string; // YYYYMMDD format
  innersurfacearea?: number;
  buildyear?: number;
  housetype?: string;
  energylabel?: string;
  url?: string;
  reference_number?: number;
  strict_street?: boolean;
  strict_buurt?: boolean;
  strict_wijk?: boolean;
  strict_energylabel?: boolean;
  comparable_housetype?: number;
  comparable_innersurfacearea?: number;
  comparable_buildyear?: number;
  comparable_distance?: number;
  weight_innersurfacearea?: number;
  weight_buildyear?: number;
  weight_transactiondate?: number;
  weight_distance?: number;
  weight_visualsimilarity?: number;
  visual_similarity?: boolean;
  date_limit?: number;
  include_funda_data?: boolean;
}

/**
 * Parsed price range
 */
export interface PriceRange {
  min: number;
  max: number;
  average: number;
  formatted: string;
}

/**
 * Market Statistics (calculated from reference data)
 */
export interface MarketStatistics {
  averageDistance: number;
  closestDistance: number;
  furthestDistance: number;
  averagePrice: PriceRange;
  priceRange: {
    lowest: PriceRange;
    highest: PriceRange;
  };
  totalReferences: number;
  withinRadius: {
    oneKm: number;
    fiveKm: number;
    tenKm: number;
  };
  houseTypeDistribution: Record<string, number>;
  averageBuildYear: number;
  averageSurfaceArea: number;
}

/**
 * Property Information (normalized)
 */
export interface PropertyInfo {
  address: {
    postcode: string;
    houseNumber: number;
    houseAddition: string | null;
  };
  characteristics: {
    houseType: string;
    buildYear: number;
    innerSurfaceArea: number;
    outerSurfaceArea: number;
    energyLabel: string | null;
  };
  image: string | null;
  valuationDate: Date;
}

/**
 * Residential Data (normalized structure for frontend)
 */
export interface ResidentialData {
  targetProperty: PropertyInfo;
  referencePriceMean: PriceRange;
  referenceHouses: ReferenceHouse[];
  nearbyReferences: ReferenceHouse[]; // Filtered by distance
  marketStatistics: MarketStatistics;
  searchParameters: InputParameters;
  fetchedAt: Date;
  hasData: boolean;
  /**
   * Pre-computed residential scores (optional).
   * When saving to database, these scores are computed and stored.
   * When loading from database, these saved scores are used instead of
   * recalculating from referenceHouses (which may have serialization issues).
   */
  precomputedScores?: ResidentialScores;
}

/**
 * Multi-level residential response
 */
export interface ResidentialMultiLevelResponse {
  residential: ResidentialData | null;
}
