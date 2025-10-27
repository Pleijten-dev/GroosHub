/**
 * RIVM Health Data Parser
 *
 * Transforms raw RIVM Health API data into structured format
 * with both absolute and relative values
 */

import type { ParsedHealthData, ParsedIndicator } from './types';

type RawData = Record<string, unknown>;

/**
 * Parse RIVM Health data
 *
 * Note: In RIVM data, the original values are percentages,
 * and we calculate absolute counts using: round(percentage * aantalInwoners / 100)
 */
export function parseHealthData(rawData: RawData, aantalInwoners: number): ParsedHealthData {
  const metadata = {
    gemeentenaam: getString(rawData, 'RegioS') || '',
    soortRegio: 'Gemeente',
    codering: getString(rawData, 'RegioS') || '',
  };

  const indicators: ParsedIndicator[] = [];

  // Add metadata indicators
  addIndicator(indicators, 'Gemeentenaam', metadata.gemeentenaam, null, null, null);
  addIndicator(indicators, 'Soort Regio', metadata.soortRegio, null, null, null);
  addIndicator(indicators, 'Codering', metadata.codering, null, null, null);

  // Health perception and activity
  parsePercentageIndicator(
    indicators,
    rawData,
    'Ervaren Gezondheid Goed / Zeer Goed',
    'ErvarenGezondheidGoedZeerGoed_1',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Voldoet Aan Beweegrichtlijn',
    'VoldoetAanBeweegrichtlijn_2',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Wekelijkse Sporters',
    'WekelijkseSporters_3',
    aantalInwoners
  );

  // Weight categories
  parsePercentageIndicator(indicators, rawData, 'Ondergewicht', 'Ondergewicht_4', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Normaal Gewicht', 'NormaalGewicht_5', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Overgewicht', 'Overgewicht_6', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Ernstig Overgewicht', 'ErnstigOvergewicht_7', aantalInwoners);

  // Substance use
  parsePercentageIndicator(indicators, rawData, 'Roker', 'Roker_8', aantalInwoners);

  parsePercentageIndicator(
    indicators,
    rawData,
    'Voldoet Aan Alcohol Richtlijn',
    'VoldoetAanAlcoholRichtlijn_9',
    aantalInwoners
  );

  parsePercentageIndicator(indicators, rawData, 'Drinker', 'Drinker_10', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Zware Drinker', 'ZwareDrinker_11', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Overmatige Drinker', 'OvermatigeDrinker_12', aantalInwoners);

  // Health conditions
  parsePercentageIndicator(
    indicators,
    rawData,
    'Een Of Meer Langdurige Aandoeningen',
    'EenOfMeerLangdurigeAandoeningen_13',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Beperkt Vanwege Gezondheid',
    'BeperktVanwegeGezondheid_14',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Ernstig Beperkt Vanwege Gezondheid',
    'ErnstigBeperktVanwegeGezondheid_15',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Langdurig Ernstig Beperkt',
    'LangdurigErnstigBeperkt_16',
    aantalInwoners
  );

  // Mental health
  parsePercentageIndicator(indicators, rawData, 'Psychische Klachten', 'PsychischeKlachten_17', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Zeer Lage Veerkracht', 'ZeerLageVerekracht_18', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Zeer Hoge Veerkracht', 'ZeerHogeVerekracht_19', aantalInwoners);

  parsePercentageIndicator(
    indicators,
    rawData,
    'Mist Emotionele Steun',
    'MistEmotioneleSteun_20',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Suicide Gedachten Laatste 12 Maanden',
    'SuicideGedachtenLaatste12Maanden_21',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Hoog Risico Op Angst Of Depressie',
    'HoogRisicoOpAngstOfDepressie_22',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Heel Veel Stress In Afgelopen 4 Weken',
    'HeelVeelStressInAfgelopen4Weken_23',
    aantalInwoners
  );

  // Loneliness
  parsePercentageIndicator(indicators, rawData, 'Eenzaam', 'Eenzaam_24', aantalInwoners);

  parsePercentageIndicator(
    indicators,
    rawData,
    'Ernstig / Zeer Ernstig Eenzaam',
    'ErnstigZeerErnstigEenzaam_25',
    aantalInwoners
  );

  parsePercentageIndicator(indicators, rawData, 'Emotioneel Eenzaam', 'EmotioneelEenzaam_26', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Sociaal Eenzaam', 'SociaalEenzaam_27', aantalInwoners);

  // Social participation
  parsePercentageIndicator(indicators, rawData, 'Mantelzorger', 'Mantelzorger_28', aantalInwoners);

  parsePercentageIndicator(indicators, rawData, 'Vrijwilligerswerk', 'Vrijwilligerswerk_29', aantalInwoners);

  // Economic
  parsePercentageIndicator(
    indicators,
    rawData,
    'Moeite Met Rondkomen',
    'MoeiteMet Rondkomen_30',
    aantalInwoners
  );

  // Transportation (these might be n/a)
  parsePercentageIndicator(
    indicators,
    rawData,
    'Lopen En/Of Fietsen Naar School Of Werk',
    'LopenEnOfFietsenNaarSchoolOfWerk_31',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Lopen Naar School Of Werk',
    'LopenNaarSchoolOfWerk_32',
    aantalInwoners
  );

  parsePercentageIndicator(
    indicators,
    rawData,
    'Fietsen Naar School Of Werk',
    'FietsenNaarSchoolOfWerk_33',
    aantalInwoners
  );

  // Non-specific complaints
  parsePercentageIndicator(
    indicators,
    rawData,
    'Niet Specifieke Klachten',
    'NietSpecifiekeKlachten_34',
    aantalInwoners
  );

  return {
    source: 'Gezondheid (RIVM)',
    indicators,
    metadata,
  };
}

/**
 * Helper: Parse a percentage indicator and calculate absolute value
 */
function parsePercentageIndicator(
  indicators: ParsedIndicator[],
  rawData: RawData,
  indicatorName: string,
  key: string,
  aantalInwoners: number
): void {
  const percentage = getNumber(rawData, key);
  if (percentage !== null) {
    const absolute = Math.round((percentage * aantalInwoners) / 100);
    addIndicator(
      indicators,
      indicatorName,
      percentage,
      absolute,
      percentage,
      'round ( Original value x Aantal Inwoners / 100 )',
      'percentage'
    );
  } else {
    // Add as n/a
    addIndicator(indicators, indicatorName, 'n/a', null, null, 'n/a');
  }
}

/**
 * Helper: Get number value from raw data
 */
function getNumber(data: RawData, key: string): number | null {
  const value = data[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Helper: Get string value from raw data
 */
function getString(data: RawData, key: string): string | null {
  const value = data[key];
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

/**
 * Helper: Add indicator to list
 */
function addIndicator(
  indicators: ParsedIndicator[],
  indicator: string,
  originalValue: number | string | null,
  absoluteValue: number | null,
  relativeValue: number | null,
  operator: string | null,
  format?: ParsedIndicator['format']
): void {
  indicators.push({
    indicator,
    originalValue,
    absoluteValue,
    relativeValue,
    operator,
    format,
  });
}
