/**
 * RIVM Health (50120NED) Key Normalizer
 *
 * Transforms raw RIVM API keys (e.g., "ErvarenGezondheidGoedZeerGoed_4") to human-readable format
 */

/**
 * Mapping from RIVM API keys with suffixes to human-readable labels
 */
export const healthKeyMap: Record<string, string> = {
  // Geographic identifiers
  Gemeentenaam_1: 'Gemeentenaam',
  SoortRegio_2: 'Soort Regio',
  Codering_3: 'Codering',

  // Perceived Health
  ErvarenGezondheidGoedZeerGoed_4: 'Ervaren Gezondheid Goed / Zeer Goed',

  // Physical Activity & Sports
  VoldoetAanBeweegrichtlijn_5: 'Voldoet Aan Beweegrichtlijn',
  WekelijkseSporters_6: 'Wekelijkse Sporters',

  // Weight
  Ondergewicht_7: 'Ondergewicht',
  NormaalGewicht_8: 'Normaal Gewicht',
  Overgewicht_9: 'Overgewicht',
  ErnstigOvergewicht_10: 'Ernstig Overgewicht',

  // Smoking & Alcohol
  Roker_11: 'Roker',
  VoldoetAanAlcoholRichtlijn_12: 'Voldoet Aan Alcohol Richtlijn',
  Drinker_13: 'Drinker',
  ZwareDrinker_14: 'Zware Drinker',
  OvermatigeDrinker_15: 'Overmatige Drinker',

  // Chronic Conditions & Limitations
  EenOfMeerLangdurigeAandoeningen_16: 'Een Of Meer Langdurige Aandoeningen',
  BeperktVanwegeGezondheid_17: 'Beperkt Vanwege Gezondheid',
  ErnstigBeperktVanwegeGezondheid_18: 'Ernstig Beperkt Vanwege Gezondheid',
  LangdurigErnstigBeperkt_19: 'Langdurig Ernstig Beperkt',

  // Mental Health - Complaints & Resilience
  PsychischeKlachten_20: 'Psychische Klachten',
  ZeerLageVeerkracht_21: 'Zeer Lage Veerkracht',
  ZeerHogeVeerkracht_22: 'Zeer Hoge Veerkracht',

  // Social Support
  MistEmotioneleSteun_23: 'Mist Emotionele Steun',

  // Mental Health - Serious Issues
  SuicideGedachtenLaatste12Maanden_24: 'Suicide Gedachten Laatste 12 Maanden',
  HoogRisicoOpAngstOfDepressie_25: 'Hoog Risico Op Angst Of Depressie',
  HeelVeelStressInAfgelopen4Weken_26: 'Heel Veel Stress In Afgelopen 4 Weken',

  // Loneliness
  Eenzaam_27: 'Eenzaam',
  ErnstigZeerErnstigEenzaam_28: 'Ernstig / Zeer Ernstig Eenzaam',
  EmotioneelEenzaam_29: 'Emotioneel Eenzaam',
  SociaalEenzaam_30: 'Sociaal Eenzaam',

  // Social Participation
  Mantelzorger_31: 'Mantelzorger',
  Vrijwilligerswerk_32: 'Vrijwilligerswerk',

  // Financial Well-being
  MoeiteMetRondkomen_33: 'Moeite Met Rondkomen',

  // Active Transportation
  LopenEnOfFietsenNaarSchoolOfWerk_34: 'Lopen En/Of Fietsen Naar School Of Werk',
  LopenNaarSchoolOfWerk_35: 'Lopen Naar School Of Werk',
  FietsenNaarSchoolOfWerk_36: 'Fietsen Naar School Of Werk',

  // Other Complaints
  NietSpecifiekeKlachten_37: 'Niet Specifieke Klachten',
};

/**
 * Normalizes RIVM Health data by transforming keys from suffixed format to human-readable format
 *
 * @param rawData - Raw data object from RIVM API
 * @returns Normalized data object with human-readable keys
 *
 * @example
 * ```typescript
 * const raw = { Gemeentenaam_1: "Amsterdam", Roker_11: 18.5 };
 * const normalized = normalizeHealthKeys(raw);
 * // { "Gemeentenaam": "Amsterdam", "Roker": 18.5 }
 * ```
 */
export function normalizeHealthKeys(
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = healthKeyMap[key] || key;
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Gets the human-readable label for a RIVM Health key
 *
 * @param key - RIVM API key (e.g., "ErvarenGezondheidGoedZeerGoed_4")
 * @returns Human-readable label (e.g., "Ervaren Gezondheid Goed / Zeer Goed")
 *
 * @example
 * ```typescript
 * getReadableKey("Roker_11") // "Roker"
 * getReadableKey("Unknown_1") // "Unknown_1" (fallback)
 * ```
 */
export function getReadableKey(key: string): string {
  return healthKeyMap[key] || key;
}

/**
 * Checks if a key exists in the health key map
 *
 * @param key - RIVM API key to check
 * @returns True if key exists in mapping, false otherwise
 */
export function isKnownKey(key: string): boolean {
  return key in healthKeyMap;
}
