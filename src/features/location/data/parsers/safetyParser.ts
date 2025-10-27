/**
 * Politie Safety Data Parser
 *
 * Transforms raw Politie Safety API data into structured format with both
 * absolute and relative values according to the specified mapping.
 *
 * For safety data:
 * - Original value is the absolute count of crimes
 * - Absolute = Original value
 * - Relative = Original value / populationCount * 100
 */

import type { DataParser, ParsedDataset, ParsedValue } from './types';
import { normalizeSafetyKey } from '../normalizers/safetyKeyNormalizer';

export interface SafetyParserOptions {
  /** Population count needed to calculate relative values */
  populationCount: number;
}

export class SafetyParser implements DataParser {
  /**
   * Parse raw safety data (crime statistics)
   */
  parse(rawData: Record<string, unknown>, options?: SafetyParserOptions): ParsedDataset {
    const indicators = new Map<string, ParsedValue>();
    const populationCount = options?.populationCount || 0;

    // Helper to safely get numeric value
    const getNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? null : num;
    };

    // Helper to calculate relative percentage from absolute count
    const calculateRelative = (absoluteCount: number | null): number | null => {
      if (absoluteCount === null || populationCount === 0) return null;
      return (absoluteCount / populationCount * 100);
    };

    // Crime type mappings (from the specification)
    const crimeTitles: Record<string, string> = {
      'Crime_0.0.0': 'Totaal misdrijven',
      'Crime_1.1.1': 'Diefstal/inbraak woning',
      'Crime_1.1.2': 'Diefstal/inbraak box/garage/schuur',
      'Crime_1.2.1': 'Diefstal uit/vanaf motorvoertuigen',
      'Crime_1.2.2': 'Diefstal van motorvoertuigen',
      'Crime_1.2.3': 'Diefstal van brom-, snor-, fietsen',
      'Crime_1.2.4': 'Zakkenrollerij',
      'Crime_1.2.5': 'Diefstal af/uit/van ov. voertuigen',
      'Crime_1.3.1': 'Ongevallen (weg)',
      'Crime_1.4.1': 'Zedenmisdrijf',
      'Crime_1.4.2': 'Moord, doodslag',
      'Crime_1.4.3': 'Openlijk geweld (persoon)',
      'Crime_1.4.4': 'Bedreiging',
      'Crime_1.4.5': 'Mishandeling',
      'Crime_1.4.6': 'Straatroof',
      'Crime_1.4.7': 'Overval',
      'Crime_1.5.2': 'Diefstallen (water)',
      'Crime_1.6.1': 'Brand/ontploffing',
      'Crime_1.6.2': 'Overige vermogensdelicten',
      'Crime_1.6.3': 'Mensenhandel',
      'Crime_2.1.1': 'Drugs/drankoverlast',
      'Crime_2.2.1': 'Vernieling cq. zaakbeschadiging',
      'Crime_2.4.1': 'Burengerucht (relatieproblemen)',
      'Crime_2.4.2': 'Huisvredebreuk',
      'Crime_2.5.1': 'Diefstal/inbraak bedrijven enz.',
      'Crime_2.5.2': 'Winkeldiefstal',
      'Crime_2.6.1': 'Inrichting Wet Milieubeheer',
      'Crime_2.6.2': 'Bodem',
      'Crime_2.6.3': 'Water',
      'Crime_2.6.4': 'Afval',
      'Crime_2.6.5': 'Bouwstoffen',
      'Crime_2.6.7': 'Mest',
      'Crime_2.6.8': 'Transport gevaarlijke stoffen',
      'Crime_2.6.9': 'Vuurwerk',
      'Crime_2.6.10': 'Bestrijdingsmiddelen',
      'Crime_2.6.11': 'Natuur en landschap',
      'Crime_2.6.12': 'Ruimtelijke ordening',
      'Crime_2.6.13': 'Dieren',
      'Crime_2.6.14': 'Voedselveiligheid',
      'Crime_2.7.2': 'Bijzondere wetten',
      'Crime_2.7.3': 'Leefbaarheid (overig)',
      'Crime_3.1.1': 'Drugshandel',
      'Crime_3.1.2': 'Mensensmokkel',
      'Crime_3.1.3': 'Wapenhandel',
      'Crime_3.2.1': 'Kinderporno',
      'Crime_3.2.2': 'Kinderprostitutie',
      'Crime_3.3.2': 'Onder invloed (lucht)',
      'Crime_3.3.5': 'Lucht (overig)',
      'Crime_3.4.2': 'Onder invloed (water)',
      'Crime_3.5.2': 'Onder invloed (weg)',
      'Crime_3.5.5': 'Weg (overig)',
      'Crime_3.6.4': 'Aantasting openbare orde',
      'Crime_3.7.1': 'Discriminatie',
      'Crime_3.7.2': 'Vreemdelingenzorg',
      'Crime_3.7.3': 'Maatsch. integriteit (overig)',
      'Crime_3.7.4': 'Cybercrime',
      'Crime_3.9.1': 'Horizontale fraude',
      'Crime_3.9.2': 'Verticale fraude',
      'Crime_3.9.3': 'Fraude (overig)',
    };

    // Process each crime type in the raw data
    Object.entries(rawData).forEach(([key, value]) => {
      // The data comes as crime type codes (e.g., "0.0.0", "1.1.1")
      // We need to construct the full Crime_x.x.x key
      const crimeKey = key.startsWith('Crime_') ? key : `Crime_${key}`;
      const absoluteCount = getNumber(value);
      const relativePercentage = calculateRelative(absoluteCount);

      // Get human-readable title
      const title = crimeTitles[crimeKey] || normalizeSafetyKey(crimeKey);

      indicators.set(crimeKey, {
        title,
        originalValue: value as string | number | null,
        absolute: absoluteCount,
        relative: relativePercentage,
        unit: '%',
      });
    });

    return {
      indicators,
      metadata: {
        source: 'safety',
        fetchedAt: new Date(),
      },
    };
  }
}
