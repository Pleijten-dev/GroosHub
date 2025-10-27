/**
 * CBS Demographics (84583NED) Key Normalizer
 *
 * Transforms raw CBS API keys (e.g., "Gemeentenaam_1") to human-readable format (e.g., "Gemeentenaam")
 */

/**
 * Mapping from CBS API keys with suffixes to human-readable labels
 */
export const demographicsKeyMap: Record<string, string> = {
  // Geographic identifiers
  Gemeentenaam_1: 'Gemeentenaam',
  SoortRegio_2: 'Soort Regio',
  Codering_3: 'Codering',
  IndelingswijzigingWijkenEnBuurten_4: 'Indelingswijziging Wijken En Buurten',

  // Population - Total and Gender
  AantalInwoners_5: 'Aantal Inwoners',
  Mannen_6: 'Mannen',
  Vrouwen_7: 'Vrouwen',

  // Population - Age Groups
  k_0Tot15Jaar_8: '0 Tot 15 Jaar',
  k_15Tot25Jaar_9: '15 Tot 25 Jaar',
  k_25Tot45Jaar_10: '25 Tot 45 Jaar',
  k_45Tot65Jaar_11: '45 Tot 65 Jaar',
  k_65JaarOfOuder_12: '65 Jaar Of Ouder',

  // Marital Status
  Ongehuwd_13: 'Ongehuwd',
  Gehuwd_14: 'Gehuwd',
  Gescheiden_15: 'Gescheiden',
  Verweduwd_16: 'Verweduwd',

  // Migration Background
  WestersTotaal_17: 'Westers Totaal',
  NietWestersTotaal_18: 'Niet Westers Totaal',
  Marokko_19: 'Marokko',
  NederlandseAntillenEnAruba_20: 'Nederlandse Antillen En Aruba',
  Suriname_21: 'Suriname',
  Turkije_22: 'Turkije',
  OverigNietWesters_23: 'Overig Niet Westers',

  // Birth and Death
  GeboorteTotaal_24: 'Geboorte Totaal',
  GeboorteRelatief_25: 'Geboorte Relatief',
  SterfteTotaal_26: 'Sterfte Totaal',
  SterfteRelatief_27: 'Sterfte Relatief',

  // Households
  HuishoudensTotaal_28: 'Huishoudens Totaal',
  Eenpersoonshuishoudens_29: 'Eenpersoonshuishoudens',
  HuishoudensZonderKinderen_30: 'Huishoudens Zonder Kinderen',
  HuishoudensMetKinderen_31: 'Huishoudens Met Kinderen',
  GemiddeldeHuishoudensgrootte_32: 'Gemiddelde Huishoudensgrootte',

  // Housing - General
  Bevolkingsdichtheid_33: 'Bevolkingsdichtheid',
  Woningvoorraad_34: 'Woningvoorraad',
  GemiddeldeWOZWaardeVanWoningen_35: 'Gemiddelde WOZ Waarde Van Woningen',
  PercentageEengezinswoning_36: 'Percentage Eengezinswoning',
  PercentageMeergezinswoning_37: 'Percentage Meergezinswoning',
  PercentageBewoond_38: 'Percentage Bewoond',
  PercentageOnbewoond_39: 'Percentage Onbewoond',

  // Housing - Ownership
  Koopwoningen_40: 'Koopwoningen',
  HuurwoningenTotaal_41: 'Huurwoningen Totaal',
  InBezitWoningcorporatie_42: 'In Bezit Woningcorporatie',
  InBezitOverigeVerhuurders_43: 'In Bezit Overige Verhuurders',
  EigendomOnbekend_44: 'Eigendom Onbekend',

  // Housing - Construction Year
  BouwjaarVoor2000_45: 'Bouwjaar Voor 2000',
  BouwjaarVanaf2000_46: 'Bouwjaar Vanaf 2000',

  // Energy - Electricity
  GemiddeldElektriciteitsverbruikTotaal_47: 'Gemiddeld Elektriciteitsverbruik Totaal',
  Appartement_48: 'Appartement (Elektriciteit)',
  Tussenwoning_49: 'Tussenwoning (Elektriciteit)',
  Hoekwoning_50: 'Hoekwoning (Elektriciteit)',
  TweeOnderEenKapWoning_51: 'Twee Onder Een Kap Woning (Elektriciteit)',
  VrijstaandeWoning_52: 'Vrijstaande Woning (Elektriciteit)',
  Huurwoning_53: 'Huurwoning (Elektriciteit)',
  EigenWoning_54: 'Eigen Woning (Elektriciteit)',

  // Energy - Gas
  GemiddeldAardgasverbruikTotaal_55: 'Gemiddeld Aardgasverbruik Totaal',
  Appartement_56: 'Appartement (Aardgas)',
  Tussenwoning_57: 'Tussenwoning (Aardgas)',
  Hoekwoning_58: 'Hoekwoning (Aardgas)',
  TweeOnderEenKapWoning_59: 'Twee Onder Een Kap Woning (Aardgas)',
  VrijstaandeWoning_60: 'Vrijstaande Woning (Aardgas)',
  Huurwoning_61: 'Huurwoning (Aardgas)',
  EigenWoning_62: 'Eigen Woning (Aardgas)',

  // Energy - District Heating
  PercentageWoningenMetStadsverwarming_63: 'Percentage Woningen Met Stadsverwarming',

  // Education
  OpleidingsniveauLaag_64: 'Opleidingsniveau Laag',
  OpleidingsniveauMiddelbaar_65: 'Opleidingsniveau Middelbaar',
  OpleidingsniveauHoog_66: 'Opleidingsniveau Hoog',

  // Employment
  Nettoarbeidsparticipatie_67: 'Nettoarbeidsparticipatie',
  PercentageWerknemers_68: 'Percentage Werknemers',
  PercentageZelfstandigen_69: 'Percentage Zelfstandigen',

  // Income - General
  AantalInkomensontvangers_70: 'Aantal Inkomensontvangers',
  GemiddeldInkomenPerInkomensontvanger_71: 'Gemiddeld Inkomen Per Inkomensontvanger',
  GemiddeldInkomenPerInwoner_72: 'Gemiddeld Inkomen Per Inwoner',
  k_40PersonenMetLaagsteInkomen_73: '40% Personen Met Laagste Inkomen',
  k_20PersonenMetHoogsteInkomen_74: '20% Personen Met Hoogste Inkomen',

  // Income - Households
  GemGestandaardiseerdInkomenVanHuish_75: 'Gemiddeld Gestandaardiseerd Inkomen Van Huishoudens',
  k_40HuishoudensMetLaagsteInkomen_76: '40% Huishoudens Met Laagste Inkomen',
  k_20HuishoudensMetHoogsteInkomen_77: '20% Huishoudens Met Hoogste Inkomen',
  HuishoudensMetEenLaagInkomen_78: 'Huishoudens Met Een Laag Inkomen',
  HuishOnderOfRondSociaalMinimum_79: 'Huishoudens Onder Of Rond Sociaal Minimum',
  HuishoudensTot110VanSociaalMinimum_80: 'Huishoudens Tot 110% Van Sociaal Minimum',
  HuishoudensTot120VanSociaalMinimum_81: 'Huishoudens Tot 120% Van Sociaal Minimum',
  MediaanVermogenVanParticuliereHuish_82: 'Mediaan Vermogen Van Particuliere Huishoudens',

  // Social Benefits
  PersonenPerSoortUitkeringBijstand_83: 'Personen Per Soort Uitkering Bijstand',
  PersonenPerSoortUitkeringAO_84: 'Personen Per Soort Uitkering AO',
  PersonenPerSoortUitkeringWW_85: 'Personen Per Soort Uitkering WW',
  PersonenPerSoortUitkeringAOW_86: 'Personen Per Soort Uitkering AOW',

  // Youth Care
  JongerenMetJeugdzorgInNatura_87: 'Jongeren Met Jeugdzorg In Natura',
  PercentageJongerenMetJeugdzorg_88: 'Percentage Jongeren Met Jeugdzorg',

  // Social Care
  WmoClienten_89: 'Wmo Clienten',
  WmoClientenRelatief_90: 'Wmo Clienten Relatief',

  // Business Establishments
  BedrijfsvestigingenTotaal_91: 'Bedrijfsvestigingen Totaal',
  ALandbouwBosbouwEnVisserij_92: 'A - Landbouw, Bosbouw En Visserij',
  BFNijverheidEnEnergie_93: 'B-F - Nijverheid En Energie',
  GIHandelEnHoreca_94: 'G-I - Handel En Horeca',
  HJVervoerInformatieEnCommunicatie_95: 'H-J - Vervoer, Informatie En Communicatie',
  KLFinancieleDienstenOnroerendGoed_96: 'K-L - Financiele Diensten, Onroerend Goed',
  MNZakelijkeDienstverlening_97: 'M-N - Zakelijke Dienstverlening',
  RUCultuurRecreatieOverigeDiensten_98: 'R-U - Cultuur, Recreatie, Overige Diensten',

  // Vehicles
  PersonenautoSTotaal_99: 'Personenautos Totaal',
  PersonenautoSBrandstofBenzine_100: 'Personenautos Brandstof Benzine',
  PersonenautoSOverigeBrandstof_101: 'Personenautos Overige Brandstof',
  PersonenautoSPerHuishouden_102: 'Personenautos Per Huishouden',
  PersonenautoSNaarOppervlakte_103: 'Personenautos Naar Oppervlakte',
  Motorfietsen_104: 'Motorfietsen',

  // Distance to Amenities
  AfstandTotHuisartsenpraktijk_105: 'Afstand Tot Huisartsenpraktijk',
  AfstandTotGroteSupermarkt_106: 'Afstand Tot Grote Supermarkt',
  AfstandTotKinderdagverblijf_107: 'Afstand Tot Kinderdagverblijf',
  AfstandTotSchool_108: 'Afstand Tot School',
  ScholenBinnen3Km_109: 'Scholen Binnen 3 Km',

  // Geographic Area
  OppervlakteTotaal_110: 'Oppervlakte Totaal',
  OppervlakteLand_111: 'Oppervlakte Land',
  OppervlakteWater_112: 'Oppervlakte Water',

  // Other
  MeestVoorkomendePostcode_113: 'Meest Voorkomende Postcode',
  Dekkingspercentage_114: 'Dekkingspercentage',
  MateVanStedelijkheid_115: 'Mate Van Stedelijkheid',
  Omgevingsadressendichtheid_116: 'Omgevingsadressendichtheid',
};

/**
 * Normalizes CBS Demographics data by transforming keys from suffixed format to human-readable format
 *
 * @param rawData - Raw data object from CBS API
 * @returns Normalized data object with human-readable keys
 *
 * @example
 * ```typescript
 * const raw = { Gemeentenaam_1: "Amsterdam", AantalInwoners_5: 872680 };
 * const normalized = normalizeDemographicsKeys(raw);
 * // { "Gemeentenaam": "Amsterdam", "Aantal Inwoners": 872680 }
 * ```
 */
export function normalizeDemographicsKeys(
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = demographicsKeyMap[key] || key;
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Gets the human-readable label for a CBS Demographics key
 *
 * @param key - CBS API key (e.g., "Gemeentenaam_1")
 * @returns Human-readable label (e.g., "Gemeentenaam")
 *
 * @example
 * ```typescript
 * getReadableKey("AantalInwoners_5") // "Aantal Inwoners"
 * getReadableKey("Unknown_1") // "Unknown_1" (fallback)
 * ```
 */
export function getReadableKey(key: string): string {
  return demographicsKeyMap[key] || key;
}

/**
 * Checks if a key exists in the demographics key map
 *
 * @param key - CBS API key to check
 * @returns True if key exists in mapping, false otherwise
 */
export function isKnownKey(key: string): boolean {
  return key in demographicsKeyMap;
}
