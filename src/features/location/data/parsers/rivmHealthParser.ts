/**
 * RIVM Health Data Parser
 *
 * Transforms raw RIVM health data into parsed format with absolute and relative values.
 * Based on the mapping specification from RIVM Gezondheid en zorggebruik (50120NED).
 *
 * Note: RIVM data comes as percentages. We calculate absolute numbers from the percentages.
 */

import type { FetchedData } from '../sources/rivm-health/client';
import type { ParsedHealthData, ParsedValue } from './types';

export class RIVMHealthParser {
  /**
   * Parse raw RIVM health data into structured format with absolute and relative values
   * @param rawData Raw data from RIVM API
   * @param totalPopulation Total population count (from demographics data) used to calculate absolute values
   */
  parse(rawData: FetchedData, totalPopulation: number | null): ParsedHealthData {
    // Helper function to safely get numeric value
    const getNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '.') return null;
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? null : num;
    };

    // Helper function to create a ParsedValue
    const createValue = (
      original: unknown,
      absolute: number | null,
      relative: number | null,
      label: string,
      unit?: string
    ): ParsedValue => ({
      original: typeof original === 'number' || typeof original === 'string' ? original : null,
      absolute,
      relative,
      label,
      unit,
    });

    // Helper to calculate absolute value from percentage
    const calcAbsolute = (relativePercent: number | null): number | null => {
      if (relativePercent === null || totalPopulation === null) return null;
      return Math.round((relativePercent * totalPopulation) / 100);
    };

    // Helper to get both relative and absolute values from a percentage field
    const parsePercentageField = (
      fieldValue: unknown,
      label: string,
      unit: string = 'people'
    ): ParsedValue => {
      const relative = getNumber(fieldValue);
      const absolute = calcAbsolute(relative);
      return createValue(fieldValue, absolute, relative, label, unit);
    };

    return {
      // Location metadata
      municipalityName: String(rawData.RegioS || ''),
      regionType: 'Gemeente', // Health data is typically at gemeente level
      regionCode: String(rawData.Codering_3 || rawData.WijkenEnBuurten || ''),

      // General health
      goodOrVeryGoodHealth: parsePercentageField(
        rawData.ErvarenGezondheidGoedZeerGoed_1,
        'Ervaren Gezondheid Goed / Zeer Goed'
      ),

      // Physical activity
      meetsExerciseGuidelines: parsePercentageField(
        rawData.VoldoetAanBeweegrichtlijn_2,
        'Voldoet Aan Beweegrichtlijn'
      ),
      weeklySportParticipants: parsePercentageField(
        rawData.WekelijkseeSporters_3,
        'Wekelijkse Sporters'
      ),

      // Weight
      underweight: parsePercentageField(rawData.Ondergewicht_4, 'Ondergewicht'),
      normalWeight: parsePercentageField(rawData.NormaalGewicht_5, 'Normaal Gewicht'),
      overweight: parsePercentageField(rawData.Overgewicht_6, 'Overgewicht'),
      severelyOverweight: parsePercentageField(rawData.ErngstigOvergewicht_7, 'Ernstig Overgewicht'),

      // Substance use
      smokers: parsePercentageField(rawData.Roker_8, 'Roker'),
      meetsAlcoholGuidelines: parsePercentageField(
        rawData.VoldoetAanAlcoholRichtlijn_9,
        'Voldoet Aan Alcohol Richtlijn'
      ),
      drinkers: parsePercentageField(rawData.Drinker_10, 'Drinker'),
      heavyDrinkers: parsePercentageField(rawData.ZwareDrinker_11, 'Zware Drinker'),
      excessiveDrinkers: parsePercentageField(rawData.OvermatigeDrinker_12, 'Overmatige Drinker'),

      // Chronic conditions and limitations
      oneOrMoreChronicConditions: parsePercentageField(
        rawData.EenOfMeerLangdurigeAandoeningen_13,
        'Een Of Meer Langdurige Aandoeningen'
      ),
      limitedByHealth: parsePercentageField(
        rawData.BeperkVanwegeGezondheid_14,
        'Beperkt Vanwege Gezondheid'
      ),
      severelyLimitedByHealth: parsePercentageField(
        rawData.ErnstigBeperkVanwegeGezondheid_15,
        'Ernstig Beperkt Vanwege Gezondheid'
      ),
      longTermSeverelyLimited: parsePercentageField(
        rawData.LangdurigErngstigBeperkt_16,
        'Langdurig Ernstig Beperkt'
      ),

      // Mental health
      psychologicalComplaints: parsePercentageField(
        rawData.PsychischeKlachten_17,
        'Psychische Klachten'
      ),
      veryLowResilience: parsePercentageField(
        rawData.ZeerLageVeerkracht_18,
        'Zeer Lage Veerkracht'
      ),
      veryHighResilience: parsePercentageField(
        rawData.ZeerHogeVeerkracht_19,
        'Zeer Hoge Veerkracht'
      ),
      lacksEmotionalSupport: parsePercentageField(
        rawData.MistEmotioneleSteun_20,
        'Mist Emotionele Steun'
      ),
      suicidalThoughtsLast12Months: parsePercentageField(
        rawData.SuicideGedachtenLaatste12Maanden_21,
        'Suicide Gedachten Laatste 12 Maanden'
      ),
      highRiskAnxietyDepression: parsePercentageField(
        rawData.HoogRisicoOpAngstOfDepressie_22,
        'Hoog Risico Op Angst Of Depressie'
      ),
      highStressLast4Weeks: parsePercentageField(
        rawData.HeelVeelStressInAfgelopen4Weken_23,
        'Heel Veel Stress In Afgelopen 4 Weken'
      ),

      // Loneliness
      lonely: parsePercentageField(rawData.Eenzaam_24, 'Eenzaam'),
      severelyOrVeryLonely: parsePercentageField(
        rawData.ErnstigZeerErnstigEenzaam_25,
        'Ernstig / Zeer Ernstig Eenzaam'
      ),
      emotionallyLonely: parsePercentageField(rawData.EmotioneelEenzaam_26, 'Emotioneel Eenzaam'),
      sociallyLonely: parsePercentageField(rawData.SociaalEenzaam_27, 'Sociaal Eenzaam'),

      // Social participation
      informalCaregivers: parsePercentageField(rawData.Mantelzorger_28, 'Mantelzorger'),
      volunteers: parsePercentageField(rawData.Vrijwilligerswerk_29, 'Vrijwilligerswerk'),

      // Financial stress
      difficultyMakingEndsMeet: parsePercentageField(
        rawData.MoeiteMetRondkomen_30,
        'Moeite Met Rondkomen'
      ),

      // Mobility
      walkOrCycleToWork: parsePercentageField(
        rawData.LopenEnOfFietsenNaarSchoolOfWerk_31,
        'Lopen En/Of Fietsen Naar School Of Werk'
      ),
      walkToWork: parsePercentageField(
        rawData.LopenNaarSchoolOfWerk_32,
        'Lopen Naar School Of Werk'
      ),
      cycleToWork: parsePercentageField(
        rawData.FietsenNaarSchoolOfWerk_33,
        'Fietsen Naar School Of Werk'
      ),

      // Non-specific complaints
      nonSpecificComplaints: parsePercentageField(
        rawData.NietSpecifiekeKlachten_34,
        'Niet Specifieke Klachten'
      ),
    };
  }
}
