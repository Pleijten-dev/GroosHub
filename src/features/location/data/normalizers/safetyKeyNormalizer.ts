/**
 * Politie Safety (47018NED) Key Normalizer
 *
 * Transforms raw Politie API keys (e.g., "Crime_0.0.0", "Crime_1.1.1") to human-readable crime type names
 */

/**
 * Crime type metadata from CBS/Politie
 */
interface CrimeType {
  key: string;
  title: string;
  description: string | null;
}

/**
 * Complete crime type mapping from Politie/CBS SoortMisdrijf dimension
 * Source: https://dataderden.cbs.nl/ODataApi/OData/47018NED/$metadata#Cbs.OData.WebAPI.SoortMisdrijf
 */
export const crimeTypeMap: Record<string, CrimeType> = {
  '0.0.0': {
    key: '0.0.0',
    title: 'Totaal misdrijven',
    description: null,
  },
  '1.1.1': {
    key: '1.1.1',
    title: 'Diefstal/inbraak woning',
    description:
      'A20 Gekwal. Diefstal in/uit woning\r\nA30 Diefstal in/uit woning (niet gekwal.)\r\nB20 Gekwal. Diefstal met geweld in/uit woning\r\nB30 Diefstal met geweld in/uit woning (niet gekwal.)',
  },
  '1.1.2': {
    key: '1.1.2',
    title: 'Diefstal/inbraak box/garage/schuur',
    description:
      'A21 Gekwal. Diefstal in/uit box/garage/schuur\r\nA34 Diefstal in/uit box/garage/schuur/erf (niet gekwal.)\r\nB21 Gekwal. Diefstal met geweld in/uit box/garage/schuur\r\nB34 Diefstal met geweld in/uit box/garage/schuur (niet gekwal.)',
  },
  '1.2.1': {
    key: '1.2.1',
    title: 'Diefstal uit/vanaf motorvoertuigen',
    description:
      'A10 Diefstal uit/vanaf personenauto\r\nB10 Diefstal met geweld uit/vanaf personenauto',
  },
  '1.2.2': {
    key: '1.2.2',
    title: 'Diefstal van motorvoertuigen',
    description:
      'A70 Diefstal personenauto\r\nA71 Diefstal motor\r\nA76 Diefstal vrachtauto/bestelauto\r\nB60 Diefstal van personenauto met geweld\r\nB61 Diefstal met geweld motor\r\nB66 Diefstal met geweld vrachtauto/bestelauto',
  },
  '1.2.3': {
    key: '1.2.3',
    title: 'Diefstal van brom-, snor-, fietsen',
    description:
      'A72 Diefstal fiets\r\nA73 Diefstal bromfiets/snorfiets\r\nB62 Diefstal met geweld fiets\r\nB63 Diefstal met geweld bromfiets/snorfiets',
  },
  '1.2.4': {
    key: '1.2.4',
    title: 'Zakkenrollerij',
    description: 'A40 Zakkenrollerij/tassenrollerij',
  },
  '1.2.5': {
    key: '1.2.5',
    title: 'Diefstal af/uit/van ov. voertuigen',
    description:
      'A12 Diefstal uit/vanaf andere vervoermiddelen\r\nA74 Diefstal ander vervoermiddel\r\nB12 Diefstal met geweld uit/vanaf ander vervoermiddel\r\nB64 Diefstal met geweld ander vervoermiddel',
  },
  '1.3.1': {
    key: '1.3.1',
    title: 'Ongevallen (weg)',
    description:
      'D11 Verkeersongeval met letsel\r\nD12 Verkeersongeval met dodelijke afloop\r\nD13 Verlaten plaats na verkeersongeval',
  },
  '1.4.1': {
    key: '1.4.1',
    title: 'Zedenmisdrijf',
    description:
      'F520 Openbare schennis der eerbaarheid\r\nF521 Verkrachting\r\nF522 Aanranding\r\nF523 Overige zedenmisdrijven\r\nF525 Pornografie\r\nF526 Incest/afhankelijkheid/wilsonbekwame\r\nF527 Seksueel misbruik kinderen (geen incest)\r\nF5295 Sexting\r\nF5296 Grooming',
  },
  '1.4.2': {
    key: '1.4.2',
    title: 'Moord, doodslag',
    description:
      'F540 Doodslag/moord\r\nF541 Euthanasie\r\nF542 Overige misdrijven tegen het leven\r\nF543 Illegale abortus\r\nF544 Behulpzaam bij zelfmoord',
  },
  '1.4.3': {
    key: '1.4.3',
    title: 'Openlijk geweld (persoon)',
    description: 'F12 Openlijke geweldpleging tegen personen',
  },
  '1.4.4': {
    key: '1.4.4',
    title: 'Bedreiging',
    description:
      'F530 Bedreiging\r\nF531 Overige misdrijven tegen de persoonlijke vrijheid\r\nF532 Gijzeling/ontvoering\r\nF533 Stalking',
  },
  '1.4.5': {
    key: '1.4.5',
    title: 'Mishandeling',
    description: 'F550 Eenvoudige mishandeling\r\nF551 Zware mishandeling',
  },
  '1.4.6': {
    key: '1.4.6',
    title: 'Straatroof',
    description: 'B70 Straatroof',
  },
  '1.4.7': {
    key: '1.4.7',
    title: 'Overval',
    description:
      'B72 Overval in woning\r\nB73 Overval op overige objecten\r\nB74 Overval op geld- en waardetransport',
  },
  '1.5.2': {
    key: '1.5.2',
    title: 'Diefstallen (water)',
    description:
      'A11 Diefstal uit/vanaf vaartuig\r\nA75 Diefstal vaartuig\r\nB11 Diefstal met geweld uit/vanaf vaartuig\r\nB65 Diefstal met geweld vaartuig',
  },
  '1.6.1': {
    key: '1.6.1',
    title: 'Brand/ontploffing',
    description: 'F13 Brandstichting\r\nF14 Bomaanslag',
  },
  '1.6.2': {
    key: '1.6.2',
    title: 'Overige vermogensdelicten',
    description:
      'A27 Gekwal. Diefstal in/uit andere gebouwen\r\nA36 Diefstal in/uit andere gebouwen (niet gekwal.)\r\nA60 Diefstal van een dier\r\nA80 Verduistering (evt. In dienstbetrekking)\r\nA81 Heling\r\nA82 Chantage / afpersing\r\nA90 Overige (eenvoudige) diefstal\r\nA95 Overige gekwal. Diefstal\r\nB27 Gekwal. Diefstal met geweld in/uit andere gebouwen\r\nB36 Diefstal met geweld in/uit andere gebouwen (niet gekwal.)\r\nB95 Overige diefstallen met geweld',
  },
  '1.6.3': {
    key: '1.6.3',
    title: 'Mensenhandel',
    description:
      'F5293 Mensenhandel\r\nF563 Mensenhandel uitbuiting in strafbare activiteiten\r\nF564 Mensenhandel gedwongen orgaanverwijdering\r\nF562 Mensenhandel arbeidsuitbuiting\r\nF565 Mensenhandel overige vormen van uitbuiting\r\nF561 Mensenhandel sexuele uitbuiting',
  },
  '2.1.1': {
    key: '2.1.1',
    title: 'Drugs/drankoverlast',
    description: 'F47 Overige drugsdelicten',
  },
  '2.2.1': {
    key: '2.2.1',
    title: 'Vernieling cq. zaakbeschadiging',
    description:
      'C20 Vernieling van/aan openbaar vervoer/abri\r\nC30 Vernieling van/aan openbaar gebouw\r\nC40 Vernieling overige objecten\r\nF11 Openlijke geweldpleging tegen goederen',
  },
  '2.4.1': {
    key: '2.4.1',
    title: 'Burengerucht (relatieproblemen)',
    description: 'F95 Overtreding huisverbod',
  },
  '2.4.2': {
    key: '2.4.2',
    title: 'Huisvredebreuk',
    description: 'F15 Huisvredebreuk',
  },
  '2.5.1': {
    key: '2.5.1',
    title: 'Diefstal/inbraak bedrijven enz.',
    description:
      'A22 Gekwal. Diefstal in/uit winkel\r\nA23 Gekwal. Diefstal in/uit bedrijf/kantoor\r\nA24 Gekwal. Diefstal in/uit sportcomplex\r\nA25 Gekwal. Diefstal in/uit hotel/pension\r\nA26 Gekwal. Diefstal in/uit school\r\nA31 Diefstal in/uit school (niet gekwal.)\r\nA32 Diefstal in/uit bedrijf/kantoor (niet gekwal.)\r\nA33 Diefstal in/uit hotel/pension (niet gekwal.)\r\nA35 Diefstal in/uit sportcomplex (niet gekwal.)\r\nB22 Gekwal. Diefstal met geweld in/uit winkel\r\nB23 Gekwal. Diefstal met geweld in/uit bedrijf/kantoor\r\nB24 Gekwal. Diefstal met geweld in/uit sportcomplex\r\nB25 Gekwal. Diefstal met geweld in/uit hotel/pension\r\nB26 Gekwal. Diefstal met geweld in/uit school\r\nB31 Diefstal met geweld in/uit school (niet gekwal.)\r\nB32 Diefstal met geweld in/uit bedrijf/kantoor (niet gekwal.)\r\nB33 Diefstal met geweld in/uit hotel/pension (niet gekwal.)\r\nB35 Diefstal met geweld in/uit sportcomplex (niet gekwal.)',
  },
  '2.5.2': {
    key: '2.5.2',
    title: 'Winkeldiefstal',
    description: 'A50 Winkeldiefstal\r\nB50 Winkeldiefstal met geweld',
  },
  '2.6.1': {
    key: '2.6.1',
    title: 'Inrichting Wet Milieubeheer',
    description: 'M08 Inrichtingen wet milieubeheer\r\nM135 Inrichtingen vuurwerk',
  },
  '2.6.2': {
    key: '2.6.2',
    title: 'Bodem',
    description:
      'M011 Op/in bodem brengen afvalstoffen\r\nM0111 Afval drugslab\r\nM031 Bodembescherming\r\nM032 Ontgrondingen\r\nM033 Ondergrondse tanks\r\nM034 Bodemsanering',
  },
  '2.6.3': {
    key: '2.6.3',
    title: 'Water',
    description: 'M141 Verontreinigingen oppervlaktewater\r\nM144 Slootdemping',
  },
  '2.6.4': {
    key: '2.6.4',
    title: 'Afval',
    description:
      'M012 Afvaltransport\r\nM013 Huishoudelijk afval aanbieden/doorzoeke/inzamelen\r\nM014 Afval verbranden\r\nM015 Autowrak (milieu)\r\nM016 Afvallozing in riool\r\nM017 Afvalstoffen inzamelen\r\nM019 Asbest',
  },
  '2.6.5': {
    key: '2.6.5',
    title: 'Bouwstoffen',
    description:
      'M018 Bouw- en sloopafval\r\nM041 Bouwstoffen op of in de bodem\r\nM042 Bouwstoffen in oppervlaktewater',
  },
  '2.6.7': {
    key: '2.6.7',
    title: 'Mest',
    description: 'M091 Uitrijden mest\r\nM092 Opslag mest\r\nM093 Vervoer mest',
  },
  '2.6.8': {
    key: '2.6.8',
    title: 'Transport gevaarlijke stoffen',
    description:
      'M071 Transport gevaarlijke stoffen over de weg\r\nM072 Transport gevaarlijke stoffen over binnenwater\r\nM073 Transport gevaarlijke stoffen over de rijn\r\nM074 Transport gevaarlijke stoffen over zee\r\nM075 Transport gevaarlijke stoffen over het spoor\r\nM076 Transport gevaarlijke stoffen door de lucht\r\nM077 Cfk (handel, in-/uitvoer, vullen)\r\nM078 Koelinstallatie',
  },
  '2.6.9': {
    key: '2.6.9',
    title: 'Vuurwerk',
    description:
      'M132 Transport vuurwerk\r\nM134 Bezitten/vervaardigen/voorhanden hebben/afleveren vuurwerk',
  },
  '2.6.10': {
    key: '2.6.10',
    title: 'Bestrijdingsmiddelen',
    description:
      'M021 Gebruik bestrijdingsmiddelen\r\nM022 Opslag en voorhanden hebben bestrijdingsmiddelen',
  },
  '2.6.11': {
    key: '2.6.11',
    title: 'Natuur en landschap',
    description: 'M23 Wet inzake luchtverontreiniging',
  },
  '2.6.12': {
    key: '2.6.12',
    title: 'Ruimtelijke ordening',
    description: 'M11 Ruimtelijke ordening',
  },
  '2.6.13': {
    key: '2.6.13',
    title: 'Dieren',
    description:
      'M051 Gezondheid en welzijn dieren en dierenvervoer\r\n M102 Cites (uitheemse planten en dieren)',
  },
  '2.6.14': {
    key: '2.6.14',
    title: 'Voedselveiligheid',
    description: 'M12 Voedselveiligheid en slacht',
  },
  '2.7.2': {
    key: '2.7.2',
    title: 'Bijzondere wetten',
    description:
      'F91 Misdrijven wet op de kansspelen\r\nF92 Telecommunicatiewet\r\nF93 Misdrijven anders\r\nF94 Witwassen',
  },
  '2.7.3': {
    key: '2.7.3',
    title: 'Leefbaarheid (overig)',
    description: 'F16 Lokaalvredebreuk',
  },
  '3.1.1': {
    key: '3.1.1',
    title: 'Drugshandel',
    description:
      'F40 Bezit hard-drugs (lijst 1)\r\nF41 Bezit softdrugs (lijst 2)\r\nF42 Handel e.d. hard-drugs (lijst 1)\r\nF43 Handel e.d. softdrugs (lijst 2)\r\nF44 Vervaardigen hard-drugs (lijst 1)\r\nF45 Vervaardigen softdrugs (lijst 2)',
  },
  '3.1.2': {
    key: '3.1.2',
    title: 'Mensensmokkel',
    description: 'F5294 Mensensmokkel',
  },
  '3.1.3': {
    key: '3.1.3',
    title: 'Wapenhandel',
    description:
      'F70 Bezit vuurwapens\r\nF71 Handel vuurwapens\r\nF72 Bezit overige wapens\r\nF73 Handel overige wapens',
  },
  '3.2.1': {
    key: '3.2.1',
    title: 'Kinderporno',
    description: 'F5291 Kinderpornografie',
  },
  '3.2.2': {
    key: '3.2.2',
    title: 'Kinderprostitutie',
    description: 'F5292 Kinderprostitutie',
  },
  '3.3.2': {
    key: '3.3.2',
    title: 'Onder invloed (lucht)',
    description:
      'L90 Vliegen onder invloed drugs/medicijnen\r\nL91 Vliegen onder invloed alcohol',
  },
  '3.3.5': {
    key: '3.3.5',
    title: 'Lucht (overig)',
    description: 'L21 Luchtvaartwet',
  },
  '3.4.2': {
    key: '3.4.2',
    title: 'Onder invloed (water)',
    description:
      'L80 Varen onder invloed drugs/medicijnen\r\nL81 Varen onder invloed alcohol\r\nL83 Weigeren ademanalyse (varen)',
  },
  '3.5.2': {
    key: '3.5.2',
    title: 'Onder invloed (weg)',
    description:
      'D20 Rijden onder invloed drugs/medicijnen\r\nD21 Rijden onder invloed alcohol\r\nD23 Weigeren ademanalyse\r\nD24 Weigeren bloedproef\r\nD25 Weigeren vervangend (urine)onderzoek',
  },
  '3.5.5': {
    key: '3.5.5',
    title: 'Weg (overig)',
    description:
      'D40 Rijden tijdens rijverbod\r\nD41 Rijden terwijl rijbewijs is ingevorderd\r\nD42 Rijden tijdens ontzegging rijbevoegdheid\r\nD44 Rijden met ongeldig verklaard rijbewijs\r\nD50 Joyriding\r\nD51 Vals kenteken/kentekenplaten\r\nD52 Overig verkeersmisdrijf',
  },
  '3.6.4': {
    key: '3.6.4',
    title: 'Aantasting openbare orde',
    description:
      'F10 Overige delicten openbare orde\r\nF17 Wederspannigheid (verzet)\r\nF18 Niet voldoen aan bevel/vordering\r\nF19 Overige misdrijven tegen het openbaar gezag\r\nF30 Valse identiteit opgeven',
  },
  '3.7.1': {
    key: '3.7.1',
    title: 'Discriminatie',
    description: 'F50 Discriminatie',
  },
  '3.7.2': {
    key: '3.7.2',
    title: 'Vreemdelingenzorg',
    description: 'F0064 Zich als ongewenst verklaarde vreemdeling in NL bevinden',
  },
  '3.7.3': {
    key: '3.7.3',
    title: 'Maatsch. integriteit (overig)',
    description: 'F51 Belediging\r\nF5231 Ontucht met dieren / dierenporno',
  },
  '3.7.4': {
    key: '3.7.4',
    title: 'Cybercrime',
    description: 'F90 Cybercrime',
  },
  '3.9.1': {
    key: '3.9.1',
    title: 'Horizontale fraude',
    description:
      'F614 Fraude met betaalproducten\r\nF616 Ie-fraude/namaakgoederen\r\nF617 Identiteitsfraude\r\nF620 Overige horizontale fraude\r\nF622 Verzekerings en assurantiefraude\r\nF625 Faillissementsfraude\r\nF631 Krediet-,hypotheek- en depotfraude\r\nF632 Aquisitiefraude\r\nF633 Vastgoedfraude\r\nF634 Fraude met kilometertellers\r\nF635 Fraude in de zorg\r\nF636 Fraude met onlinehandel\r\nF637 Voorschotfraude\r\nF638 Telecomfraude\r\nF639 Beleggingsfraude',
  },
  '3.9.2': {
    key: '3.9.2',
    title: 'Verticale fraude',
    description:
      'F621 Uitkeringsfraude\r\nF623 Subsidiefraude\r\nF649 Overige verticale fraude',
  },
  '3.9.3': {
    key: '3.9.3',
    title: 'Fraude (overig)',
    description:
      'F600 Oplichting\r\nF601 Flessentrekkerij\r\nF602 Overig bedrog\r\nF610 Vals geld aanmaken\r\nF611 Vals geld uitgeven\r\nF612 Vervalsingen overig\r\nF613 Vervalsen paspoort/identiteitskaart/reisdocument\r\nF614 Vervalsing bankpas/giropas/cheques\r\nF615 Vervalsen rijbewijs\r\nF624 Valse aangifte',
  },
};

/**
 * Normalizes crime code keys to human-readable crime type names
 *
 * @param crimeCode - Crime code (e.g., "Crime_0.0.0", "Crime_1.1.1")
 * @returns Human-readable crime type title
 *
 * @example
 * ```typescript
 * normalizeSafetyKey("Crime_0.0.0") // "Totaal misdrijven"
 * normalizeSafetyKey("Crime_1.1.1") // "Diefstal/inbraak woning"
 * normalizeSafetyKey("Unknown") // "Unknown" (fallback)
 * ```
 */
export function normalizeSafetyKey(crimeCode: string): string {
  // Extract the crime code from keys like "Crime_0.0.0" or "0.0.0"
  const codeMatch = crimeCode.match(/(\d+\.\d+\.\d+)/);
  if (!codeMatch) {
    return crimeCode; // Return original if no pattern match
  }

  const code = codeMatch[1].trim();
  const crimeType = crimeTypeMap[code];

  return crimeType ? crimeType.title : crimeCode;
}

/**
 * Normalizes Politie Safety data by transforming crime code keys to crime type names
 *
 * @param rawData - Raw data object from Politie API
 * @returns Normalized data object with crime type names as keys
 *
 * @example
 * ```typescript
 * const raw = { "Crime_0.0.0": 1234, "Crime_1.1.1": 56 };
 * const normalized = normalizeSafetyKeys(raw);
 * // { "Totaal misdrijven": 1234, "Diefstal/inbraak woning": 56 }
 * ```
 */
export function normalizeSafetyKeys(
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = normalizeSafetyKey(key);
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Gets crime type metadata by crime code
 *
 * @param crimeCode - Crime code (e.g., "0.0.0", "1.1.1")
 * @returns Crime type metadata or undefined if not found
 */
export function getCrimeType(crimeCode: string): CrimeType | undefined {
  const code = crimeCode.replace('Crime_', '').trim();
  return crimeTypeMap[code];
}

/**
 * Checks if a crime code exists in the crime type map
 *
 * @param crimeCode - Crime code to check
 * @returns True if crime code exists in mapping, false otherwise
 */
export function isKnownCrimeCode(crimeCode: string): boolean {
  const code = crimeCode.replace('Crime_', '').trim();
  return code in crimeTypeMap;
}

/**
 * Gets all crime types
 *
 * @returns Array of all crime type metadata
 */
export function getAllCrimeTypes(): CrimeType[] {
  return Object.values(crimeTypeMap);
}
