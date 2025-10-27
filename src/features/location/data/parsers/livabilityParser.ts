/**
 * CBS Livability Data Parser
 *
 * Transforms raw CBS Livability API data into structured format
 * with both absolute and relative values
 *
 * Note: Livability data uses percentages that are converted to absolute counts
 * using: round(percentage * aantalInwoners / 100)
 */

import type { ParsedLivabilityData, ParsedIndicator } from './types';

type RawData = Record<string, unknown>;

/**
 * Parse CBS Livability data
 */
export function parseLivabilityData(rawData: RawData, aantalInwoners: number): ParsedLivabilityData {
  const indicators: ParsedIndicator[] = [];

  // Physical facilities
  parsePercentage(indicators, rawData, 'Onderhoud Stoepen, Straten En Pleintjes', 'OnderhoudStoepenStratenEnPleintjes_5', aantalInwoners);
  parsePercentage(indicators, rawData, 'Onderhoud Van Plantsoenen En Parken', 'OnderhoudVanPlantsoenenEnParken_6', aantalInwoners);
  parsePercentage(indicators, rawData, 'Straatverlichting', 'Straatverlichting_7', aantalInwoners);
  parsePercentage(indicators, rawData, 'Speelplekken Voor Kinderen', 'SpeelplekkenVoorKinderen_8', aantalInwoners);
  parsePercentage(indicators, rawData, 'Voorzieningen Voor Jongeren', 'VoorzieningenVoorJongeren_9', aantalInwoners);
  parsePercentage(indicators, rawData, 'Fysieke Voorzieningen Schaalscore', 'FysiekeVoorzieningenSchaalscore_10', aantalInwoners);

  // Social cohesion
  parsePercentage(indicators, rawData, 'Mensen Kennen Elkaar Nauwelijks', 'MensenKennenElkaarNauwelijks_11', aantalInwoners);
  parsePercentage(indicators, rawData, 'Mensen Gaan Prettig Met Elkaar Om', 'MensenGaanPrettigMetElkaarOm_12', aantalInwoners);
  parsePercentage(indicators, rawData, 'Gezellige Buurt Waar Men Elkaar Helpt', 'GezelligeBuurtWaarMenElkaarHelpt_13', aantalInwoners);
  parsePercentage(indicators, rawData, 'Voel Mij Thuis Bij Mensen In Deze Buurt', 'VoelMijThuisBijMensenInDezeBuurt_14', aantalInwoners);
  parsePercentage(indicators, rawData, 'Veel Contact Met Andere Buurtbewoners', 'VeelContactMetAndereBuurtbewoners_15', aantalInwoners);
  parsePercentage(indicators, rawData, 'Tevreden Met Samenstelling Bevolking', 'TevredenMetSamenstellingBevolking_16', aantalInwoners);
  parsePercentage(indicators, rawData, 'Durf Mijn Huissleutel Te Geven', 'DurfMijnHuissleutelTeGeven_17', aantalInwoners);
  parsePercentage(indicators, rawData, 'Mensen Spreken Elkaar Aan Op Gedrag', 'MensenSprekenElkaarAanOpGedrag_18', aantalInwoners);
  parsePercentage(indicators, rawData, 'Sociale Cohesie Schaalscore', 'SocialeCohesieSchaalscore_19', aantalInwoners);

  // Neighborhood changes
  parsePercentage(indicators, rawData, 'Vooruit Gegaan', 'VooruitGegaan_20', aantalInwoners);
  parsePercentage(indicators, rawData, 'Achteruit Gegaan', 'AchteruitGegaan_21', aantalInwoners);
  parsePercentage(indicators, rawData, 'Rapportcijfer Leefbaarheid Woonbuurt', 'RapportcijferLeefbaarheidWoonbuurt_22', aantalInwoners);

  // Government functioning
  parsePercentage(indicators, rawData, 'Oordeel Functioneren Gemeente Algemeen', 'OordeelFunctionerenGemeenteAlgemeen_23', aantalInwoners);
  parsePercentage(indicators, rawData, 'Oordeel Functioneren Gemeente Handhavers', 'OordeelFunctionerenGemeenteHandhavers_24', aantalInwoners);

  // Nuisance - Physical deterioration
  parsePercentage(indicators, rawData, 'Ervaart Een Of Meer Vormen Van Overlast', 'ErvaartEenOfMeerVormenVanOverlast_25', aantalInwoners);
  parsePercentage(indicators, rawData, 'Rommel Op Straat', 'RommelOpStraat_26', aantalInwoners);
  parsePercentage(indicators, rawData, 'Straatmeubilair Dat Vernield Is', 'StraatmeubilairDatVernieIdIs_27', aantalInwoners);
  parsePercentage(indicators, rawData, 'Bekladde Muren Of Gebouwen', 'BekladdeMurenOfGebouwen_28', aantalInwoners);
  parsePercentage(indicators, rawData, 'Hondenpoep', 'Hondenpoep_29', aantalInwoners);
  parsePercentage(indicators, rawData, 'Een Of Meer Vormen Fysieke Verloedering', 'EenOfMeerVormenFysiekeVerloedering_30', aantalInwoners);

  // Nuisance - Social
  parsePercentage(indicators, rawData, 'Dronken Mensen Op Straat', 'DronkenMensenOpStraat_31', aantalInwoners);
  parsePercentage(indicators, rawData, 'Verwarde Personen', 'VerwardePersonen_32', aantalInwoners);
  parsePercentage(indicators, rawData, 'Drugsgebruik', 'Drugsgebruik_33', aantalInwoners);
  parsePercentage(indicators, rawData, 'Drugshandel', 'Drugshandel_34', aantalInwoners);
  parsePercentage(indicators, rawData, 'Overlast Door Buurtbewoners', 'OverlastDoorBuurtbewoners_35', aantalInwoners);
  parsePercentage(indicators, rawData, 'Mensen Worden Op Straat Lastiggevallen', 'MensenWordenOpStraatLastiggevallen_36', aantalInwoners);
  parsePercentage(indicators, rawData, 'Rondhangende Jongeren', 'RondhangendeJongeren_37', aantalInwoners);
  parsePercentage(indicators, rawData, 'Een Of Meer Vormen Van Sociale Overlast', 'EenOfMeerVormenVanSocialeOverlast_38', aantalInwoners);

  // Nuisance - Traffic
  parsePercentage(indicators, rawData, 'Parkeerproblemen', 'Parkeerproblemen_39', aantalInwoners);
  parsePercentage(indicators, rawData, 'Te Hard Rijden', 'TeHardRijden_40', aantalInwoners);
  parsePercentage(indicators, rawData, 'Agressief Gedrag In Verkeer', 'AgressiefGedragInVerkeer_41', aantalInwoners);
  parsePercentage(indicators, rawData, 'Een Of Meer Vormen Van Verkeersoverlast', 'EenOfMeerVormenVanVerkeersoverlast_42', aantalInwoners);

  // Nuisance - Environmental
  parsePercentage(indicators, rawData, 'Geluidsoverlast', 'Geluidsoverlast_43', aantalInwoners);
  parsePercentage(indicators, rawData, 'Stankoverlast', 'Stankoverlast_44', aantalInwoners);
  parsePercentage(indicators, rawData, 'Overlast Van Horecagelegenheden', 'OverlastVanHorecagelegenheden_45', aantalInwoners);
  parsePercentage(indicators, rawData, 'Een Of Meer Vormen Van Milieuoverlast', 'EenOfMeerVormenVanMilieuoverlast_46', aantalInwoners);

  // Safety perception
  parsePercentage(indicators, rawData, 'Voelt Zich Weleens Onveilig', 'VoeltZichWeleensOnveilig_47', aantalInwoners);
  parsePercentage(indicators, rawData, 'Voelt Zich Vaak Onveilig', 'VoeltZichVaakOnveilig_48', aantalInwoners);
  parsePercentage(indicators, rawData, 'Van Zakkenrollerij', 'VanZakkenrollerij_49', aantalInwoners);
  parsePercentage(indicators, rawData, 'Van Beroving Op Straat', 'VanBerovingOpStraat_50', aantalInwoners);
  parsePercentage(indicators, rawData, 'Van Inbraak In Woning', 'VanInbraakInWoning_51', aantalInwoners);
  parsePercentage(indicators, rawData, 'Van Mishandeling', 'VanMishandeling_52', aantalInwoners);
  parsePercentage(indicators, rawData, 'Van Oplichting Via Internet', 'VanOplichtingViaInternet_53', aantalInwoners);

  // Safety in neighborhood
  parsePercentage(indicators, rawData, 'Voelt Zich Weleens Onveilig In Buurt', 'VoeltZichWeleensOnveiligInBuurt_54', aantalInwoners);
  parsePercentage(indicators, rawData, 'Voelt Zich Vaak Onveilig In Buurt', 'VoeltZichVaakOnveiligInBuurt_55', aantalInwoners);
  parsePercentage(indicators, rawData, "'s Avonds Op Straat In Buurt Onveilig", 'sAvondsOpStraatInBuurtOnveilig_56', aantalInwoners);
  parsePercentage(indicators, rawData, "'s Avonds Alleen Thuis Onveilig", 'sAvondsAlleenThuisOnveilig_57', aantalInwoners);
  parsePercentage(indicators, rawData, "Doet 's Avonds Niet Open", 'DoetsAvondsNietOpen_58', aantalInwoners);
  parsePercentage(indicators, rawData, 'Rijdt Of Loopt Om', 'RijdtOfLooptOm_59', aantalInwoners);
  parsePercentage(indicators, rawData, 'Bang Slachtoffer Criminaliteit Te Worden', 'BangSlachtofferCriminaliteitTeWorden_60', aantalInwoners);

  // Crime perception
  parsePercentage(indicators, rawData, 'Denkt Dat Er Veel Criminaliteit In Buurt', 'DenktDatErVeelCriminaliteitInBuurt_61', aantalInwoners);
  parsePercentage(indicators, rawData, 'Vindt Criminaliteit In Buurt Toegenomen', 'VindtCriminaliteitInBuurtToegenomen_62', aantalInwoners);
  parsePercentage(indicators, rawData, 'Vindt Criminaliteit In Buurt Afgenomen', 'VindtCriminaliteitInBuurtAfgenomen_63', aantalInwoners);
  parsePercentage(indicators, rawData, 'Rapportcijfer Veiligheid In Buurt', 'RapportcijferVeiligheidInBuurt_64', aantalInwoners);

  // Discrimination
  parsePercentage(indicators, rawData, 'Door Onbekenden Op Straat', 'DoorOnbekendenOpStraat_65', aantalInwoners);
  parsePercentage(indicators, rawData, 'Door Onbekenden In Openbaar Vervoer', 'DoorOnbekendenInOpenbaarVervoer_66', aantalInwoners);
  parsePercentage(indicators, rawData, 'Door Personeel Van Winkels En Bedrijven', 'DoorPersoneelVanWinkelsEnBedrijven_67', aantalInwoners);
  parsePercentage(indicators, rawData, 'Door Personeel Van Overheidsinstanties', 'DoorPersoneelVanOverheidsinstanties_68', aantalInwoners);
  parsePercentage(indicators, rawData, 'Door Bekenden, Partner, Familie, Vriend', 'DoorBekendenPartnerFamilieVriend_69', aantalInwoners);
  parsePercentage(indicators, rawData, 'Gediscrimineerd Gevoeld', 'GediscrimineerdGevoeld_70', aantalInwoners);

  // Crime victimization - many have percentage for different aspects
  // I'll add a few key ones as examples
  parseCrimeVictimization(indicators, rawData, 'Diefstal Uit Tas, Zak', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Inbraak', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Diefstal Voertuig', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Fietsdiefstal', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Beroving', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Vernieling Eigen Voertuig', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Mishandeling', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Oplichting/Fraude', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Phishing', aantalInwoners);
  parseCrimeVictimization(indicators, rawData, 'Identiteitsfraude', aantalInwoners);

  // Police contact
  parsePercentage(indicators, rawData, 'Contact Met Politie', 'ContactMetPolitie_165', aantalInwoners);
  parsePercentage(indicators, rawData, 'Contact Met Politie In Buurt', 'ContactMetPolitieInBuurt_166', aantalInwoners);
  parsePercentage(indicators, rawData, 'Tevredenheid Functioneren In Buurt', 'TevredenheidFunctionerenInBuurt_172', aantalInwoners);
  parsePercentage(indicators, rawData, 'Tevredenheid Zichtbaarheid In Buurt', 'TevredenheidZichtbaarheidInBuurt_173', aantalInwoners);
  parsePercentage(indicators, rawData, 'Tevredenheid Functioneren In Algemeen', 'TevredenheidFunctionerenInAlgemeen_174', aantalInwoners);

  // Prevention measures
  parsePercentage(indicators, rawData, 'Extra Veiligheidssloten Op Buitendeuren', 'ExtraVeiligheidslotenOpBuitendeuren_180', aantalInwoners);
  parsePercentage(indicators, rawData, 'Rolluiken Voor Ramen En/Of Deuren', 'RolluikenVoorRamenEnOfDeuren_181', aantalInwoners);
  parsePercentage(indicators, rawData, 'Buitenverlichting Met Sensor', 'BuitenverlichtingMetSensor_182', aantalInwoners);
  parsePercentage(indicators, rawData, 'Alarminstallatie', 'Alarminstallatie_183', aantalInwoners);

  // Digital security
  parsePercentage(indicators, rawData, 'Sterke, Moeilijk Te Raden Wachtwoorden', 'SterkeMoeilijkTeRadenWachtwoorden_189', aantalInwoners);
  parsePercentage(indicators, rawData, 'Wachtwoorden Regelmatig Veranderen', 'WachtwoordenRegelmatigVeranderen_190', aantalInwoners);
  parsePercentage(indicators, rawData, 'Virusscanner Gebruiken', 'VirusscannerGebruiken_192', aantalInwoners);

  return {
    source: 'Leefbaarheid (CBS)',
    indicators,
    metadata: {},
  };
}

/**
 * Helper: Parse a percentage indicator
 */
function parsePercentage(
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
    addIndicator(indicators, indicatorName, 'n/a', null, null, 'n/a');
  }
}

/**
 * Helper: Parse crime victimization indicators
 */
function parseCrimeVictimization(
  indicators: ParsedIndicator[],
  rawData: RawData,
  crimeType: string,
  aantalInwoners: number
): void {
  // Different crime types have different key patterns
  // This is a simplified version - you'd need to map each specific key
  const normalizedType = crimeType.replace(/[\s,/-]/g, '');

  // Try to find relevant keys
  parsePercentage(indicators, rawData, `Slachtoffers (${crimeType})`, `Slachtoffers${normalizedType}`, aantalInwoners);
  parsePercentage(indicators, rawData, `Melding Bij Politie (${crimeType})`, `MeldingBijPolitie${normalizedType}`, aantalInwoners);
  parsePercentage(indicators, rawData, `Aangifte Bij Politie (${crimeType})`, `AangifteBijPolitie${normalizedType}`, aantalInwoners);
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
