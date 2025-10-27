/**
 * Politie Safety Data Parser
 *
 * Transforms raw Politie crime statistics into parsed format with absolute and relative values.
 * Based on the mapping specification from Politie crime data.
 *
 * Note: Politie data comes as absolute counts. We calculate percentages as relative values.
 */

import type { FetchedData } from '../sources/politie-safety/client';
import type { ParsedSafetyData, ParsedValue } from './types';

export class PolitieSafetyParser {
  /**
   * Parse raw Politie safety data into structured format with absolute and relative values
   * @param rawData Raw crime count data from Politie API
   * @param totalPopulation Total population count (from demographics data) used to calculate relative values
   */
  parse(rawData: Record<string, number>, totalPopulation: number | null): ParsedSafetyData {
    // Helper function to safely get numeric value
    const getNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) return null;
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

    // Helper to calculate relative percentage from absolute count
    const calcRelative = (absolute: number | null): number | null => {
      if (absolute === null || totalPopulation === null || totalPopulation === 0) return null;
      return (absolute / totalPopulation) * 100;
    };

    // Helper to parse a crime count field
    const parseCrimeField = (
      crimeCode: string,
      label: string
    ): ParsedValue => {
      const absolute = getNumber(rawData[crimeCode]) || 0;
      const relative = calcRelative(absolute);
      return createValue(absolute, absolute, relative, label, 'incidents');
    };

    // Extract metadata from raw data if available
    const municipalityName = String((rawData as FetchedData).RegioS || '');
    const regionCode = String((rawData as FetchedData).Codering_3 || (rawData as FetchedData).WijkenEnBuurten || '');

    return {
      // Location metadata
      municipalityName,
      regionType: 'Gemeente',
      regionCode,

      // Total crimes
      totalCrimes: parseCrimeField('0', 'Totaal misdrijven'),

      // Property crimes - Burglary
      residentialBurglary: parseCrimeField('1.1.1', 'Diefstal/inbraak woning'),
      garageStorageBurglary: parseCrimeField('1.1.2', 'Diefstal/inbraak box/garage/schuur'),
      businessBurglary: parseCrimeField('3.4.1', 'Diefstal/inbraak bedrijven enz.'),

      // Property crimes - Vehicle related
      theftFromVehicle: parseCrimeField('1.1.3', 'Diefstal uit/vanaf motorvoertuigen'),
      vehicleTheft: parseCrimeField('1.1.4', 'Diefstal van motorvoertuigen'),
      bicycleTheft: parseCrimeField('1.1.5', 'Diefstal van brom-, snor-, fietsen'),

      // Property crimes - Other theft
      pickpocketing: parseCrimeField('1.1.6', 'Zakkenrollerij'),
      theftFromOtherVehicles: parseCrimeField('1.1.7', 'Diefstal af/uit/van ov. voertuigen'),
      shoplifting: parseCrimeField('3.4.2', 'Winkeldiefstal'),
      waterTheft: parseCrimeField('2.2.1', 'Diefstallen (water)'),

      // Traffic
      trafficAccidents: parseCrimeField('1.2.1', 'Ongevallen (weg)'),

      // Violent crimes
      sexualOffenses: parseCrimeField('1.3.1', 'Zedenmisdrijf'),
      murderManslaughter: parseCrimeField('2.1.1', 'Moord, doodslag'),
      publicViolence: parseCrimeField('2.1.2', 'Openlijk geweld (persoon)'),
      threats: parseCrimeField('2.1.3', 'Bedreiging'),
      assault: parseCrimeField('2.1.4', 'Mishandeling'),
      streetRobbery: parseCrimeField('2.1.5', 'Straatroof'),
      robbery: parseCrimeField('2.1.6', 'Overval'),

      // Property crimes - Vandalism
      vandalism: parseCrimeField('3.3.1', 'Vernieling cq. zaakbeschadiging'),
      fireExplosion: parseCrimeField('2.2.2', 'Brand/ontploffing'),

      // Other property crimes
      otherPropertyCrimes: parseCrimeField('2.2.3', 'Overige vermogensdelicten'),

      // Serious crimes
      humanTrafficking: parseCrimeField('2.3.1', 'Mensenhandel'),

      // Public order
      drugAlcoholNuisance: parseCrimeField('3.1.1', 'Drugs/drankoverlast'),
      neighborDispute: parseCrimeField('3.3.2', 'Burengerucht (relatieproblemen)'),
      trespassing: parseCrimeField('3.3.3', 'Huisvredebreuk'),

      // Environmental crimes
      environmentalPermitViolation: parseCrimeField('3.5.1', 'Inrichting Wet Milieubeheer'),
      soilPollution: parseCrimeField('3.5.2', 'Bodem'),
      waterPollution: parseCrimeField('3.5.3', 'Water'),
      wasteViolation: parseCrimeField('3.5.4', 'Afval'),
      buildingMaterialsViolation: parseCrimeField('3.5.5', 'Bouwstoffen'),
      manureViolation: parseCrimeField('3.5.6', 'Mest'),
      hazardousGoodsTransport: parseCrimeField('3.5.7', 'Transport gevaarlijke stoffen'),
      fireworks: parseCrimeField('3.5.8', 'Vuurwerk'),
      pesticidesViolation: parseCrimeField('3.5.9', 'Bestrijdingsmiddelen'),
      natureConservation: parseCrimeField('3.5.10', 'Natuur en landschap'),
      spatialPlanning: parseCrimeField('3.5.11', 'Ruimtelijke ordening'),
      animalOffenses: parseCrimeField('3.5.12', 'Dieren'),
      foodSafety: parseCrimeField('3.5.13', 'Voedselveiligheid'),
      specialLaws: parseCrimeField('3.5.14', 'Bijzondere wetten'),
      livabilityOther: parseCrimeField('3.5.15', 'Leefbaarheid (overig)'),

      // Organized crime
      drugTrafficking: parseCrimeField('3.6.1', 'Drugshandel'),
      humanSmuggling: parseCrimeField('3.6.2', 'Mensensmokkel'),
      weaponsTrafficking: parseCrimeField('3.6.3', 'Wapenhandel'),
      childPornography: parseCrimeField('3.6.4', 'Kinderporno'),
      childProstitution: parseCrimeField('3.6.5', 'Kinderprostitutie'),

      // Traffic violations
      drivingUnderInfluenceAir: parseCrimeField('3.7.1', 'Onder invloed (lucht)'),
      airTrafficOther: parseCrimeField('3.7.2', 'Lucht (overig)'),
      drivingUnderInfluenceWater: parseCrimeField('3.7.3', 'Onder invloed (water)'),
      drivingUnderInfluenceRoad: parseCrimeField('3.7.4', 'Onder invloed (weg)'),
      roadTrafficOther: parseCrimeField('3.7.5', 'Weg (overig)'),

      // Social integrity
      disturbingPublicOrder: parseCrimeField('3.8.1', 'Aantasting openbare orde'),
      discrimination: parseCrimeField('3.8.2', 'Discriminatie'),
      immigrationCare: parseCrimeField('3.8.3', 'Vreemdelingenzorg'),
      socialIntegrityOther: parseCrimeField('3.8.4', 'Maatsch. integriteit (overig)'),

      // Fraud and cybercrime
      cybercrime: parseCrimeField('3.9.1', 'Cybercrime'),
      horizontalFraud: parseCrimeField('3.9.2', 'Horizontale fraude'),
      verticalFraud: parseCrimeField('3.9.3', 'Verticale fraude'),
      fraudOther: parseCrimeField('3.9.4', 'Fraude (overig)'),
    };
  }
}
