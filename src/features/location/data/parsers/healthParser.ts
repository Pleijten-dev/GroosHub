/**
 * RIVM Health Data Parser
 *
 * Transforms raw RIVM Health API data into structured format with both
 * absolute and relative values according to the specified mapping.
 *
 * For health data:
 * - Original value is the relative percentage
 * - Absolute = round(Original value × populationCount / 100)
 */

import type { DataParser, ParsedDataset, ParsedValue } from './types';
import { getReadableKey } from '../normalizers/healthKeyNormalizer';

export interface HealthParserOptions {
  /** Population count needed to calculate absolute values */
  populationCount: number;
}

export class HealthParser implements DataParser {
  /**
   * Parse raw health data
   */
  parse(rawData: Record<string, unknown>, options?: HealthParserOptions): ParsedDataset {
    const indicators = new Map<string, ParsedValue>();
    const populationCount = options?.populationCount || 0;

    // Helper to safely get numeric value
    const getNumber = (key: string): number | null => {
      const value = rawData[key];
      if (value === null || value === undefined || value === 'n/a') return null;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? null : num;
    };

    // Helper to calculate absolute from relative percentage
    const calculateAbsolute = (relativePercentage: number | null): number | null => {
      if (relativePercentage === null || populationCount === 0) return null;
      return Math.round(relativePercentage * populationCount / 100);
    };

    // Health indicators mapping
    const mappings: Array<{
      key: string;
      title: string;
      unit?: string;
    }> = [
      // Basic info
      { key: 'Gemeentenaam_1', title: 'Gemeentenaam' },
      { key: 'SoortRegio_2', title: 'Soort Regio' },
      { key: 'Codering_3', title: 'Codering' },

      // Health indicators
      { key: 'ErvarenGezondheidGoedZeerGoed_4', title: 'Ervaren Gezondheid Goed / Zeer Goed', unit: '%' },
      { key: 'VoldoetAanBeweegrichtlijn_5', title: 'Voldoet Aan Beweegrichtlijn', unit: '%' },
      { key: 'WekelijkseSporters_6', title: 'Wekelijkse Sporters', unit: '%' },
      { key: 'Ondergewicht_7', title: 'Ondergewicht', unit: '%' },
      { key: 'NormaalGewicht_8', title: 'Normaal Gewicht', unit: '%' },
      { key: 'Overgewicht_9', title: 'Overgewicht', unit: '%' },
      { key: 'ErnstigOvergewicht_10', title: 'Ernstig Overgewicht', unit: '%' },
      { key: 'Roker_11', title: 'Roker', unit: '%' },
      { key: 'VoldoetAanAlcoholRichtlijn_12', title: 'Voldoet Aan Alcohol Richtlijn', unit: '%' },
      { key: 'Drinker_13', title: 'Drinker', unit: '%' },
      { key: 'ZwareDrinker_14', title: 'Zware Drinker', unit: '%' },
      { key: 'OvermatigeDrinker_15', title: 'Overmatige Drinker', unit: '%' },
      { key: 'EenOfMeerLangdurigeAandoeningen_16', title: 'Een Of Meer Langdurige Aandoeningen', unit: '%' },
      { key: 'BeperktVanwegeGezondheid_17', title: 'Beperkt Vanwege Gezondheid', unit: '%' },
      { key: 'ErnstigBeperktVanwegeGezondheid_18', title: 'Ernstig Beperkt Vanwege Gezondheid', unit: '%' },
      { key: 'LangdurigErnstigBeperkt_19', title: 'Langdurig Ernstig Beperkt', unit: '%' },
      { key: 'PsychischeKlachten_20', title: 'Psychische Klachten', unit: '%' },
      { key: 'ZeerLageVeerkracht_21', title: 'Zeer Lage Veerkracht', unit: '%' },
      { key: 'ZeerHogeVeerkracht_22', title: 'Zeer Hoge Veerkracht', unit: '%' },
      { key: 'MistEmotioneleSteun_23', title: 'Mist Emotionele Steun', unit: '%' },
      { key: 'SuicideGedachtenLaatste12Maanden_24', title: 'Suicide Gedachten Laatste 12 Maanden', unit: '%' },
      { key: 'HoogRisicoOpAngstOfDepressie_25', title: 'Hoog Risico Op Angst Of Depressie', unit: '%' },
      { key: 'HeelVeelStressInAfgelopen4Weken_26', title: 'Heel Veel Stress In Afgelopen 4 Weken', unit: '%' },
      { key: 'Eenzaam_27', title: 'Eenzaam', unit: '%' },
      { key: 'ErnstigZeerErnstigEenzaam_28', title: 'Ernstig / Zeer Ernstig Eenzaam', unit: '%' },
      { key: 'EmotioneelEenzaam_29', title: 'Emotioneel Eenzaam', unit: '%' },
      { key: 'SociaalEenzaam_30', title: 'Sociaal Eenzaam', unit: '%' },
      { key: 'Mantelzorger_31', title: 'Mantelzorger', unit: '%' },
      { key: 'Vrijwilligerswerk_32', title: 'Vrijwilligerswerk', unit: '%' },
      { key: 'MoeiteMetRondkomen_33', title: 'Moeite Met Rondkomen', unit: '%' },
      { key: 'LopenEnOfFietsenNaarSchoolOfWerk_34', title: 'Lopen En/Of Fietsen Naar School Of Werk', unit: '%' },
      { key: 'LopenNaarSchoolOfWerk_35', title: 'Lopen Naar School Of Werk', unit: '%' },
      { key: 'FietsenNaarSchoolOfWerk_36', title: 'Fietsen Naar School Of Werk', unit: '%' },
      { key: 'NietSpecifiekeKlachten_37', title: 'Niet Specifieke Klachten', unit: '%' },
    ];

    // Apply all mappings
    for (const mapping of mappings) {
      const originalValue = rawData[mapping.key];
      const relativeValue = getNumber(mapping.key);
      const absoluteValue = calculateAbsolute(relativeValue);

      // For basic info fields (Gemeentenaam, etc.), don't calculate values
      const isBasicInfo = ['Gemeentenaam_1', 'SoortRegio_2', 'Codering_3'].includes(mapping.key);

      indicators.set(mapping.key, {
        title: mapping.title,
        originalValue: originalValue as string | number | null,
        absolute: isBasicInfo ? null : absoluteValue,
        relative: isBasicInfo ? null : relativeValue,
        unit: mapping.unit,
      });
    }

    return {
      indicators,
      metadata: {
        source: 'health',
        fetchedAt: new Date(),
      },
    };
  }
}
