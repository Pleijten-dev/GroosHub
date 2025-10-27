/**
 * CBS Livability (85146NED) Key Normalizer
 *
 * Transforms raw CBS Livability API keys to human-readable format
 */

/**
 * Mapping from CBS Livability API keys with suffixes to human-readable labels
 */
export const livabilityKeyMap: Record<string, string> = {
  // Physical Facilities
  OnderhoudStoepenStratenEnPleintjes_1: 'Onderhoud Stoepen, Straten En Pleintjes',
  OnderhoudVanPlantsoenenEnParken_2: 'Onderhoud Van Plantsoenen En Parken',
  Straatverlichting_3: 'Straatverlichting',
  SpeelplekkenVoorKinderen_4: 'Speelplekken Voor Kinderen',
  VoorzieningenVoorJongeren_5: 'Voorzieningen Voor Jongeren',
  FysiekeVoorzieningenSchaalscore_6: 'Fysieke Voorzieningen Schaalscore',

  // Social Cohesion
  MensenKennenElkaarNauwelijks_7: 'Mensen Kennen Elkaar Nauwelijks',
  MensenGaanPrettigMetElkaarOm_8: 'Mensen Gaan Prettig Met Elkaar Om',
  GezelligeBuurtWaarMenElkaarHelpt_9: 'Gezellige Buurt Waar Men Elkaar Helpt',
  VoelMijThuisBijMensenInDezeBuurt_10: 'Voel Mij Thuis Bij Mensen In Deze Buurt',
  VeelContactMetAndereBuurtbewoners_11: 'Veel Contact Met Andere Buurtbewoners',
  TevredenMetSamenstellingBevolking_12: 'Tevreden Met Samenstelling Bevolking',
  DurfMijnHuissleutelTeGeven_13: 'Durf Mijn Huissleutel Te Geven',
  MensenSprekenElkaarAanOpGedrag_14: 'Mensen Spreken Elkaar Aan Op Gedrag',
  SocialeCohesieSchaalscore_15: 'Sociale Cohesie Schaalscore',

  // Neighborhood Assessment
  VooruitGegaan_16: 'Vooruit Gegaan',
  AchteruitGegaan_17: 'Achteruit Gegaan',
  RapportcijferLeefbaarheidWoonbuurt_18: 'Rapportcijfer Leefbaarheid Woonbuurt',
  OordeelFunctionerenGemeenteAlgemeen_19: 'Oordeel Functioneren Gemeente Algemeen',
  OordeelFunctionerenGemeenteHandhavers_20: 'Oordeel Functioneren Gemeente Handhavers',

  // Nuisance - Physical Deterioration
  ErvaartEenOfMeerVormenVanOverlast_21: 'Ervaart Een Of Meer Vormen Van Overlast',
  RommelOpStraat_22: 'Rommel Op Straat',
  StraatmeubilairDatVernieldIs_23: 'Straatmeubilair Dat Vernield Is',
  BekladdeMurenOfGebouwen_24: 'Bekladde Muren Of Gebouwen',
  Hondenpoep_25: 'Hondenpoep',
  EenOfMeerVormenFysiekeVerloedering_26: 'Een Of Meer Vormen Fysieke Verloedering',

  // Nuisance - Social Nuisance
  DronkenMensenOpStraat_27: 'Dronken Mensen Op Straat',
  VerwardePersonen_28: 'Verwarde Personen',
  Drugsgebruik_29: 'Drugsgebruik',
  Drugshandel_30: 'Drugshandel',
  OverlastDoorBuurtbewoners_31: 'Overlast Door Buurtbewoners',
  MensenWordenOpStraatLastiggevallen_32: 'Mensen Worden Op Straat Lastiggevallen',
  RondhangendeJongeren_33: 'Rondhangende Jongeren',
  EenOfMeerVormenVanSocialeOverlast_34: 'Een Of Meer Vormen Van Sociale Overlast',

  // Nuisance - Traffic
  Parkeerproblemen_35: 'Parkeerproblemen',
  TeHardRijden_36: 'Te Hard Rijden',
  AgressiefGedragInVerkeer_37: 'Agressief Gedrag In Verkeer',
  EenOfMeerVormenVanVerkeersoverlast_38: 'Een Of Meer Vormen Van Verkeersoverlast',

  // Nuisance - Environmental
  Geluidsoverlast_39: 'Geluidsoverlast',
  Stankoverlast_40: 'Stankoverlast',
  OverlastVanHorecagelegenheden_41: 'Overlast Van Horecagelegenheden',
  EenOfMeerVormenVanMilieuoverlast_42: 'Een Of Meer Vormen Van Milieuoverlast',

  // Safety Perception - General
  VoeltZichWeleensOnveilig_43: 'Voelt Zich Weleens Onveilig',
  VoeltZichVaakOnveilig_44: 'Voelt Zich Vaak Onveilig',

  // Safety Perception - Victimization Fear
  VanZakkenrollerij_45: 'Van Zakkenrollerij',
  VanBerovingOpStraat_46: 'Van Beroving Op Straat',
  VanInbraakInWoning_47: 'Van Inbraak In Woning',
  VanMishandeling_48: 'Van Mishandeling',
  VanOplichtingViaInternet_49: 'Van Oplichting Via Internet',

  // Safety Perception - Neighborhood
  VoeltZichWeleensOnveiligInBuurt_50: "Voelt Zich Weleens Onveilig In Buurt",
  VoeltZichVaakOnveiligInBuurt_51: "Voelt Zich Vaak Onveilig In Buurt",
  SAvondsOpStraatInBuurtOnveilig_52: "'s Avonds Op Straat In Buurt Onveilig",
  SAvondsAlleenThuisOnveilig_53: "'s Avonds Alleen Thuis Onveilig",

  // Safety Behavior
  DoetSAvondsNietOpen_54: "Doet 's Avonds Niet Open",
  RijdtOfLooptOm_55: 'Rijdt Of Loopt Om',
  BangSlachtofferCriminaliteitTeWorden_56: 'Bang Slachtoffer Criminaliteit Te Worden',

  // Crime Perception
  DenktDatErVeelCriminaliteitInBuurt_57: 'Denkt Dat Er Veel Criminaliteit In Buurt',
  VindtCriminaliteitInBuurtToegenomen_58: 'Vindt Criminaliteit In Buurt Toegenomen',
  VindtCriminaliteitInBuurtAfgenomen_59: 'Vindt Criminaliteit In Buurt Afgenomen',
  RapportcijferVeiligheidInBuurt_60: 'Rapportcijfer Veiligheid In Buurt',

  // Discrimination
  DoorOnbekendenOpStraat_61: 'Door Onbekenden Op Straat',
  DoorOnbekendenInOpenbaarVervoer_62: 'Door Onbekenden In Openbaar Vervoer',
  DoorPersoneelVanWinkelsEnBedrijven_63: 'Door Personeel Van Winkels En Bedrijven',
  DoorPersoneelVanOverheidsinstanties_64: 'Door Personeel Van Overheidsinstanties',
  DoorBekendenPartnerFamilieVriend_65: 'Door Bekenden, Partner, Familie, Vriend',
  GediscrimineerdGevoeld_66: 'Gediscrimineerd Gevoeld',

  // Crime Victimization - Theft from Person
  Melding_67: 'Melding (Diefstal Uit Tas, Zak)',
  Slachtoffers_68: 'Slachtoffers (Diefstal Uit Tas, Zak)',
  HeeftHadGevolgenVoorSlachtoffer_69: 'Heeft/Had Gevolgen Voor Slachtoffer (Diefstal Uit Tas, Zak)',
  MeldingBijPolitie_70: 'Melding Bij Politie (Diefstal Uit Tas, Zak)',
  AangifteBijPolitie_71: 'Aangifte Bij Politie (Diefstal Uit Tas, Zak)',

  // Crime Victimization - Burglary
  Slachtoffers_72: 'Slachtoffers (Inbraak)',
  KendeDaderS_73: 'Kende Dader(s) (Inbraak)',
  HeeftHadGevolgenVoorSlachtoffer_74: 'Heeft/Had Gevolgen Voor Slachtoffer (Inbraak)',
  MeldingBijPolitie_75: 'Melding Bij Politie (Inbraak)',
  AangifteBijPolitie_76: 'Aangifte Bij Politie (Inbraak)',

  // Crime Victimization - Theft of Vehicle
  Slachtoffers_77: 'Slachtoffers (Diefstal Voertuig)',
  KendeDaderS_78: 'Kende Dader(s) (Diefstal Voertuig)',
  HeeftHadGevolgenVoorSlachtoffer_79: 'Heeft/Had Gevolgen Voor Slachtoffer (Diefstal Voertuig)',
  MeldingBijPolitie_80: 'Melding Bij Politie (Diefstal Voertuig)',
  AangifteBijPolitie_81: 'Aangifte Bij Politie (Diefstal Voertuig)',

  // Crime Victimization - Theft from Vehicle
  Slachtoffers_82: 'Slachtoffers (Diefstal Uit/Van Voertuig)',
  KendeDaderS_83: 'Kende Dader(s) (Diefstal Uit/Van Voertuig)',
  HeeftHadGevolgenVoorSlachtoffer_84: 'Heeft/Had Gevolgen Voor Slachtoffer (Diefstal Uit/Van Voertuig)',
  MeldingBijPolitie_85: 'Melding Bij Politie (Diefstal Uit/Van Voertuig)',
  AangifteBijPolitie_86: 'Aangifte Bij Politie (Diefstal Uit/Van Voertuig)',

  // Crime Victimization - Bicycle Theft
  Slachtoffers_87: 'Slachtoffers (Fietsdiefstal)',
  KendeDaderS_88: 'Kende Dader(s) (Fietsdiefstal)',
  HeeftHadGevolgenVoorSlachtoffer_89: 'Heeft/Had Gevolgen Voor Slachtoffer (Fietsdiefstal)',
  MeldingBijPolitie_90: 'Melding Bij Politie (Fietsdiefstal)',
  AangifteBijPolitie_91: 'Aangifte Bij Politie (Fietsdiefstal)',

  // Crime Victimization - Robbery
  Slachtoffers_92: 'Slachtoffers (Beroving)',
  HeeftHadGevolgenVoorSlachtoffer_93: 'Heeft/Had Gevolgen Voor Slachtoffer (Beroving)',
  MeldingBijPolitie_94: 'Melding Bij Politie (Beroving)',
  AangifteBijPolitie_95: 'Aangifte Bij Politie (Beroving)',

  // Crime Victimization - Vandalism Owned Vehicle
  Slachtoffers_96: 'Slachtoffers (Vernieling Eigen Voertuig)',
  HeeftHadGevolgenVoorSlachtoffer_97: 'Heeft/Had Gevolgen Voor Slachtoffer (Vernieling Eigen Voertuig)',
  MeldingBijPolitie_98: 'Melding Bij Politie (Vernieling Eigen Voertuig)',
  AangifteBijPolitie_99: 'Aangifte Bij Politie (Vernieling Eigen Voertuig)',

  // Crime Victimization - Vandalism Other Property
  Slachtoffers_100: 'Slachtoffers (Vernieling Andere Eigendommen)',
  HeeftHadGevolgenVoorSlachtoffer_101: 'Heeft/Had Gevolgen Voor Slachtoffer (Vernieling Andere Eigendommen)',
  MeldingBijPolitie_102: 'Melding Bij Politie (Vernieling Andere Eigendommen)',
  AangifteBijPolitie_103: 'Aangifte Bij Politie (Vernieling Andere Eigendommen)',

  // Crime Victimization - Assault
  Slachtoffers_104: 'Slachtoffers (Mishandeling)',
  HeeftHadGevolgenVoorSlachtoffer_105: 'Heeft/Had Gevolgen Voor Slachtoffer (Mishandeling)',
  MeldingBijPolitie_106: 'Melding Bij Politie (Mishandeling)',
  AangifteBijPolitie_107: 'Aangifte Bij Politie (Mishandeling)',

  // Crime Victimization - Sexual Offense
  Slachtoffers_108: 'Slachtoffers (Seksueel Misdrijf)',
  HeeftHadGevolgenVoorSlachtoffer_109: 'Heeft/Had Gevolgen Voor Slachtoffer (Seksueel Misdrijf)',
  MeldingBijPolitie_110: 'Melding Bij Politie (Seksueel Misdrijf)',
  AangifteBijPolitie_111: 'Aangifte Bij Politie (Seksueel Misdrijf)',

  // Crime Victimization - Consumer Fraud
  Slachtoffers_112: 'Slachtoffers (Consumentenfraude)',
  HeeftHadGevolgenVoorSlachtoffer_113: 'Heeft/Had Gevolgen Voor Slachtoffer (Consumentenfraude)',
  MeldingBijPolitie_114: 'Melding Bij Politie (Consumentenfraude)',
  AangifteBijPolitie_115: 'Aangifte Bij Politie (Consumentenfraude)',

  // Crime Victimization - Online Purchase Fraud
  Slachtoffers_116: 'Slachtoffers (Aankoop-/Verkoopfraude Internet)',
  HeeftHadGevolgenVoorSlachtoffer_117: 'Heeft/Had Gevolgen Voor Slachtoffer (Aankoop-/Verkoopfraude Internet)',
  MeldingBijPolitie_118: 'Melding Bij Politie (Aankoop-/Verkoopfraude Internet)',
  AangifteBijPolitie_119: 'Aangifte Bij Politie (Aankoop-/Verkoopfraude Internet)',

  // Crime Victimization - Lottery Fraud
  Slachtoffers_120: 'Slachtoffers (Loterijfraude)',
  HeeftHadGevolgenVoorSlachtoffer_121: 'Heeft/Had Gevolgen Voor Slachtoffer (Loterijfraude)',
  MeldingBijPolitie_122: 'Melding Bij Politie (Loterijfraude)',
  AangifteBijPolitie_123: 'Aangifte Bij Politie (Loterijfraude)',

  // Crime Victimization - Bank/Giro Card Fraud
  Slachtoffers_124: 'Slachtoffers (Bank-/Giropas Fraude)',
  HeeftHadGevolgenVoorSlachtoffer_125: 'Heeft/Had Gevolgen Voor Slachtoffer (Bank-/Giropas Fraude)',
  MeldingBijPolitie_126: 'Melding Bij Politie (Bank-/Giropas Fraude)',
  AangifteBijPolitie_127: 'Aangifte Bij Politie (Bank-/Giropas Fraude)',

  // Crime Victimization - Phishing
  Slachtoffers_128: 'Slachtoffers (Phishing)',
  HeeftHadGevolgenVoorSlachtoffer_129: 'Heeft/Had Gevolgen Voor Slachtoffer (Phishing)',
  MeldingBijPolitie_130: 'Melding Bij Politie (Phishing)',
  AangifteBijPolitie_131: 'Aangifte Bij Politie (Phishing)',

  // Crime Victimization - Identity Fraud
  Slachtoffers_132: 'Slachtoffers (Identiteitsfraude)',
  HeeftHadGevolgenVoorSlachtoffer_133: 'Heeft/Had Gevolgen Voor Slachtoffer (Identiteitsfraude)',
  Melding_134: 'Melding (Identiteitsfraude)',
  Aangifte_135: 'Aangifte (Identiteitsfraude)',

  // Crime Victimization - Scam/Fraud
  SlachtoffersOplichtingEnFraude_136: 'Slachtoffers Oplichting En Fraude',
  Slachtoffers_137: 'Slachtoffers (Oplichting/Fraude)',
  HeeftHadGevolgenVoorSlachtoffer_138: 'Heeft/Had Gevolgen Voor Slachtoffer (Oplichting/Fraude)',
  Melding_139: 'Melding (Oplichting/Fraude)',
  AangifteBijPolitie_140: 'Aangifte Bij Politie (Oplichting/Fraude)',

  // Crime Victimization - Hacking
  Slachtoffers_141: 'Slachtoffers (Hacking)',
  HeeftHadGevolgenVoorSlachtoffer_142: 'Heeft/Had Gevolgen Voor Slachtoffer (Hacking)',
  Melding_143: 'Melding (Hacking)',
  AangifteBijPolitie_144: 'Aangifte Bij Politie (Hacking)',

  // Crime Victimization - Cyberbullying
  Slachtoffers_145: 'Slachtoffers (Cyberpesten)',
  HeeftHadGevolgenVoorSlachtoffer_146: 'Heeft/Had Gevolgen Voor Slachtoffer (Cyberpesten)',
  Melding_147: 'Melding (Cyberpesten)',
  AangifteBijPolitie_148: 'Aangifte Bij Politie (Cyberpesten)',

  // Crime Victimization - Image/Video Abuse
  Slachtoffers_149: 'Slachtoffers (Beeldmateriaal)',
  HeeftHadGevolgenVoorSlachtoffer_150: 'Heeft/Had Gevolgen Voor Slachtoffer (Beeldmateriaal)',
  Melding_151: 'Melding (Beeldmateriaal)',
  AangifteBijPolitie_152: 'Aangifte Bij Politie (Beeldmateriaal)',

  // Crime Victimization - Cyber-related Sexual Offense
  Slachtoffers_153: 'Slachtoffers (Seksueel Getint Cybermisdrijf)',
  HeeftHadGevolgenVoorSlachtoffer_154: 'Heeft/Had Gevolgen Voor Slachtoffer (Seksueel Getint Cybermisdrijf)',
  Melding_155: 'Melding (Seksueel Getint Cybermisdrijf)',
  AangifteBijPolitie_156: 'Aangifte Bij Politie (Seksueel Getint Cybermisdrijf)',

  // Crime Victimization - Discrimination
  Slachtoffers_157: 'Slachtoffers (Discriminatie)',
  Slachtoffers_158: 'Slachtoffers (Discriminatie Totaal)',
  HeeftHadGevolgenVoorSlachtoffer_159: 'Heeft/Had Gevolgen Voor Slachtoffer (Discriminatie)',
  Melding_160: 'Melding (Discriminatie)',
  AangifteBijPolitie_161: 'Aangifte Bij Politie (Discriminatie)',

  // Crime Victimization - Illegal Access to Housing
  Slachtoffers_162: 'Slachtoffers (Ongewenst Toegang Woning)',
  HeeftHadGevolgenVoorSlachtoffer_163: 'Heeft/Had Gevolgen Voor Slachtoffer (Ongewenst Toegang Woning)',
  Melding_164: 'Melding (Ongewenst Toegang Woning)',
  AangifteBijPolitie_165: 'Aangifte Bij Politie (Ongewenst Toegang Woning)',

  // Crime Victimization - Threat/Intimidation
  SlachtoffersBedreigingEnIntimidatie_166: 'Slachtoffers Bedreiging En Intimidatie',
  Slachtoffers_167: 'Slachtoffers (Bedreiging/Intimidatie)',
  KendeDaderS_168: 'Kende Dader(s) (Bedreiging/Intimidatie)',
  HeeftHadGevolgenVoorSlachtoffer_169: 'Heeft/Had Gevolgen Voor Slachtoffer (Bedreiging/Intimidatie)',
  Melding_170: 'Melding (Bedreiging/Intimidatie)',
  AangifteBijPolitie_171: 'Aangifte Bij Politie (Bedreiging/Intimidatie)',

  // Crime Victimization - Stalking
  Slachtoffers_172: 'Slachtoffers (Stalking)',
  KendeDaderSVanafBegin_173: 'Kende Dader(s) Vanaf Begin (Stalking)',
  HeeftHadGevolgenVoorSlachtoffer_174: 'Heeft/Had Gevolgen Voor Slachtoffer (Stalking)',
  Melding_175: 'Melding (Stalking)',
  AangifteBijPolitie_176: 'Aangifte Bij Politie (Stalking)',

  // Crime Victimization - Cyberstalking
  Slachtoffers_177: 'Slachtoffers (Cyberstalking)',
  KendeDaderSVanafBegin_178: 'Kende Dader(s) Vanaf Begin (Cyberstalking)',
  HeeftHadGevolgenVoorSlachtoffer_179: 'Heeft/Had Gevolgen Voor Slachtoffer (Cyberstalking)',
  Melding_180: 'Melding (Cyberstalking)',
  AangifteBijPolitie_181: 'Aangifte Bij Politie (Cyberstalking)',

  // Crime Victimization - Other Online Crimes
  Slachtoffers_182: 'Slachtoffers (Overige Online Delicten)',
  KendeDaderS_183: 'Kende Dader(s) (Overige Online Delicten)',
  HeeftHadGevolgenVoorSlachtoffer_184: 'Heeft/Had Gevolgen Voor Slachtoffer (Overige Online Delicten)',
  Melding_185: 'Melding (Overige Online Delicten)',
  AangifteBijPolitie_186: 'Aangifte Bij Politie (Overige Online Delicten)',
  SlachtoffersOverigeOnlineDelicten_187: 'Slachtoffers Overige Online Delicten',

  // Police Contact
  ContactMetPolitie_188: 'Contact Met Politie',
  ContactMetPolitieInBuurt_189: 'Contact Met Politie In Buurt',
  ContactMetPolitieEldersInGemeente_190: 'Contact Met Politie Elders In Gemeente',
  ContactMetPolitieBuitenGemeente_191: 'Contact Met Politie Buiten Gemeente',

  // Reason for Police Contact
  Handhaving_192: 'Handhaving',
  AangifteMelding_193: 'Aangifte/Melding',
  Anders_194: 'Anders',
  Totaal_195: 'Totaal',

  // Reason in Neighborhood
  Handhaving_196: 'Handhaving (In Buurt)',
  AangifteMelding_197: 'Aangifte/Melding (In Buurt)',
  Anders_198: 'Anders (In Buurt)',

  // Police Satisfaction
  TevredenheidFunctionerenInBuurt_199: 'Tevredenheid Functioneren In Buurt',
  TevredenheidZichtbaarheidInBuurt_200: 'Tevredenheid Zichtbaarheid In Buurt',
  TevredenheidFunctionerenInAlgemeen_201: 'Tevredenheid Functioneren In Algemeen',

  // Prevention - Behavioral
  SAvondsLichtBrandenBijAfwezigheid_202: "'s Avonds Licht Branden Bij Afwezigheid",
  FietsInBewaakteFietsenstalling_203: 'Fiets In Bewaakte Fietsenstalling',
  WaardevolleSpullenMeenemenUitAuto_204: 'Waardevolle Spullen Meenemen Uit Auto',
  WaardevolleSpullenThuisLaten_205: 'Waardevolle Spullen Thuis Laten',
  PreventiefGedragSomscore_206: 'Preventief Gedrag Somscore',

  // Prevention - Technical
  ExtraVeiligheidsslotenOpBuitendeuren_207: 'Extra Veiligheidssloten Op Buitendeuren',
  RolluikenVoorRamenEnOfDeuren_208: 'Rolluiken Voor Ramen En/Of Deuren',
  BuitenverlichtingMetSensor_209: 'Buitenverlichting Met Sensor',
  Alarminstallatie_210: 'Alarminstallatie',
  Camerabewaking_211: 'Camerabewaking',
  RaamstickerPolitiekeurmerkVeiligWonen_212: 'Raamsticker Politiekeurmerk Veilig Wonen',
  PreventieveMaatregelenSomscore_213: 'Preventieve Maatregelen Somscore',

  // Community Safety Initiatives
  AppInBuurtAanwezig_214: 'App In Buurt Aanwezig',
  DeelnameAanApp_215: 'Deelname Aan App',
  AangemeldBijBurgernet_216: 'Aangemeld Bij Burgernet',
  BuurtOfBurgerwachtInBuurtAanwezig_217: 'Buurt- Of Burgerwacht In Buurt Aanwezig',

  // Digital Security
  SterkeMoeilijkTeRadenWachtwoorden_218: 'Sterke, Moeilijk Te Raden Wachtwoorden',
  WachtwoordenRegelmatigVeranderen_219: 'Wachtwoorden Regelmatig Veranderen',
  WachtwoordmanagerGebruiken_220: 'Wachtwoordmanager Gebruiken',
  VirusscannerGebruiken_221: 'Virusscanner Gebruiken',
  FirewallGebruiken_222: 'Firewall Gebruiken',
  UpdateUitvoerenBackUpMaken_223: 'Update Uitvoeren / Back-Up Maken',
  DigitaleGegevensbeschermingSomscore_224: 'Digitale Gegevensbescherming Somscore',
};

/**
 * Normalizes CBS Livability data by transforming keys from suffixed format to human-readable format
 *
 * @param rawData - Raw data object from CBS Livability API
 * @returns Normalized data object with human-readable keys
 */
export function normalizeLivabilityKeys(
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = livabilityKeyMap[key] || key;
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Gets the human-readable label for a CBS Livability key
 *
 * @param key - CBS Livability API key
 * @returns Human-readable label
 */
export function getReadableKey(key: string): string {
  return livabilityKeyMap[key] || key;
}

/**
 * Checks if a key exists in the livability key map
 *
 * @param key - CBS Livability API key to check
 * @returns True if key exists in mapping, false otherwise
 */
export function isKnownKey(key: string): boolean {
  return key in livabilityKeyMap;
}
