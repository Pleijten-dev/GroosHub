/**
 * Data Parsers Index
 *
 * Exports all data parsers for transforming raw API data into structured formats
 * with both absolute and relative values.
 */

export { CBSDemographicsParser } from './cbsDemographicsParser';
export { RIVMHealthParser } from './rivmHealthParser';
export { CBSLivabilityParser } from './cbsLivabilityParser';
export { PolitieSafetyParser } from './politieSafetyParser';

export type {
  ParsedValue,
  ParsedDemographicsData,
  ParsedHealthData,
  ParsedLivabilityData,
  ParsedSafetyData,
} from './types';
