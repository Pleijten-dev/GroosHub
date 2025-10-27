/**
 * Politie Safety Data Parser
 *
 * Transforms raw Politie Safety API data (crime statistics) into structured format
 * with both absolute and relative values
 */

import type { ParsedSafetyData, ParsedIndicator } from './types';
import { normalizeSafetyKey } from '../normalizers/safetyKeyNormalizer';

type RawData = Record<string, number>;

/**
 * Parse Politie Safety data
 *
 * Safety data from Politie contains absolute crime counts.
 * We calculate relative percentages using: (count / aantalInwoners) * 100
 */
export function parseSafetyData(rawData: RawData, aantalInwoners: number): ParsedSafetyData {
  const indicators: ParsedIndicator[] = [];

  // Safety data is structured as crime type code => count
  // We need to parse each crime type according to the mapping

  Object.entries(rawData).forEach(([crimeCode, count]) => {
    // Get human-readable crime type name
    const crimeTypeName = normalizeSafetyKey(`Crime_${crimeCode}`);

    // Calculate relative percentage
    const relativePercentage = aantalInwoners > 0 ? (count / aantalInwoners) * 100 : 0;

    addIndicator(
      indicators,
      crimeTypeName,
      count,
      count,
      relativePercentage,
      'Original value / Aantal Inwoners * 100',
      'count'
    );
  });

  // Sort by crime type name for better readability
  indicators.sort((a, b) => a.indicator.localeCompare(b.indicator));

  return {
    source: 'Veiligheid (Politie)',
    indicators,
    metadata: {},
  };
}

/**
 * Parse specific crime types from the mapping
 * This function provides explicit parsing for all crime types in the mapping
 */
export function parseSafetyDataExplicit(rawData: RawData, aantalInwoners: number): ParsedSafetyData {
  const indicators: ParsedIndicator[] = [];

  // Total crimes
  parseCrimeType(indicators, rawData, 'Totaal misdrijven', 'TotaalGeregistreerdeMisdrijven_1', aantalInwoners);

  // Property crimes - Theft/Burglary
  parseCrimeType(indicators, rawData, 'Diefstal/inbraak woning', 'DiefstalinbraakWoning_2', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Diefstal/inbraak box/garage/schuur', 'DiefstalinbraakBoxgarageschuur_3', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Diefstal uit/vanaf motorvoertuigen', 'DiefstaluitvafMotorvoertuigen_4', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Diefstal van motorvoertuigen', 'DiefastalvanMotorvoertuigen_5', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Diefstal van brom-, snor-, fietsen', 'DiefastalvanBromsnorfietsen_6', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Zakkenrollerij', 'Zakkenrollerij_7', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Diefstal af/uit/van ov. voertuigen', 'DiefastalafuitvanOvVoertuigen_8', aantalInwoners);

  // Traffic
  parseCrimeType(indicators, rawData, 'Ongevallen (weg)', 'Ongevallenweg_9', aantalInwoners);

  // Violent crimes
  parseCrimeType(indicators, rawData, 'Zedenmisdrijf', 'Zedenmisdrijf_10', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Moord, doodslag', 'Moorddoodslag_11', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Openlijk geweld (persoon)', 'OpenlijkGeweldpersoon_12', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Bedreiging', 'Bedreiging_13', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Mishandeling', 'Mishandeling_14', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Straatroof', 'Straatroof_15', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Overval', 'Overval_16', aantalInwoners);

  // Other property crimes
  parseCrimeType(indicators, rawData, 'Diefstallen (water)', 'Diefastallenwater_17', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Brand/ontploffing', 'Brandontploffing_18', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Overige vermogensdelicten', 'OverigeVermogensdelicten_19', aantalInwoners);

  // Organized crime
  parseCrimeType(indicators, rawData, 'Mensenhandel', 'Mensenhandel_20', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Drugs/drankoverlast', 'Drugsdrankoverlast_21', aantalInwoners);

  // Vandalism
  parseCrimeType(indicators, rawData, 'Vernieling cq. zaakbeschadiging', 'VernielingCqZaakbeschadiging_22', aantalInwoners);

  // Social disturbance
  parseCrimeType(indicators, rawData, 'Burengerucht (relatieproblemen)', 'Burengeruchtrelatieproblemen_23', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Huisvredebreuk', 'Huisvredebreuk_24', aantalInwoners);

  // Business crimes
  parseCrimeType(indicators, rawData, 'Diefstal/inbraak bedrijven enz.', 'DiefstalinbraakBedrijvenEnz_25', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Winkeldiefstal', 'Winkeldiefstal_26', aantalInwoners);

  // Environmental crimes
  parseCrimeType(indicators, rawData, 'Inrichting Wet Milieubeheer', 'InrichtingWetMilieubeheer_27', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Bodem', 'Bodem_28', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Water', 'Water_29', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Afval', 'Afval_30', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Transport gevaarlijke stoffen', 'TransportGevaarlijkeStoffen_35', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Vuurwerk', 'Vuurwerk_36', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Dieren', 'Dieren_40', aantalInwoners);

  // Special laws
  parseCrimeType(indicators, rawData, 'Bijzondere wetten', 'BijzondereWetten_42', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Leefbaarheid (overig)', 'Leefbaarheidoverig_43', aantalInwoners);

  // Trade crimes
  parseCrimeType(indicators, rawData, 'Drugshandel', 'Drugshandel_44', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Mensensmokkel', 'Mensensmokkel_45', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Wapenhandel', 'Wapenhandel_46', aantalInwoners);

  // Traffic violations
  parseCrimeType(indicators, rawData, 'Onder invloed (weg)', 'Onderinvloedweg_51', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Weg (overig)', 'Wegoverig_52', aantalInwoners);

  // Public order
  parseCrimeType(indicators, rawData, 'Aantasting openbare orde', 'Aantastingopenbareorde_53', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Discriminatie', 'Discriminatie_54', aantalInwoners);

  // Fraud and cybercrime
  parseCrimeType(indicators, rawData, 'Cybercrime', 'Cybercrime_57', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Horizontale fraude', 'Horizontalefraude_58', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Verticale fraude', 'Verticalefraude_59', aantalInwoners);
  parseCrimeType(indicators, rawData, 'Fraude (overig)', 'Fraudeoverig_60', aantalInwoners);

  return {
    source: 'Veiligheid (Politie)',
    indicators,
    metadata: {},
  };
}

/**
 * Helper: Parse a specific crime type
 */
function parseCrimeType(
  indicators: ParsedIndicator[],
  rawData: RawData,
  crimeTypeName: string,
  key: string,
  aantalInwoners: number
): void {
  const count = rawData[key];
  if (count !== undefined && count !== null) {
    const relativePercentage = aantalInwoners > 0 ? (count / aantalInwoners) * 100 : 0;
    addIndicator(
      indicators,
      crimeTypeName,
      count,
      count,
      relativePercentage,
      'Original value / Aantal Inwoners * 100',
      'count'
    );
  }
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
