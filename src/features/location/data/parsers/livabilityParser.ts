/**
 * CBS Livability Data Parser
 *
 * Transforms raw CBS Livability API data into structured format with both
 * absolute and relative values according to the specified mapping.
 *
 * For livability data:
 * - Original value is the relative percentage
 * - Absolute = round(Original value × populationCount / 100)
 */

import type { DataParser, ParsedDataset, ParsedValue } from './types';
import { getReadableKey } from '../normalizers/livabilityKeyNormalizer';

export interface LivabilityParserOptions {
  /** Population count needed to calculate absolute values */
  populationCount: number;
}

export class LivabilityParser implements DataParser {
  /**
   * Parse raw livability data
   */
  parse(rawData: Record<string, unknown>, options?: LivabilityParserOptions): ParsedDataset {
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

    // All livability indicators follow the same pattern
    const mappings: Array<{
      key: string;
      title: string;
    }> = [
      // Physical facilities
      { key: 'OnderhoudStoepenStratenEnPleintjes_1', title: 'Onderhoud Stoepen, Straten En Pleintjes' },
      { key: 'OnderhoudVanPlantsoenenEnParken_2', title: 'Onderhoud Van Plantsoenen En Parken' },
      { key: 'Straatverlichting_3', title: 'Straatverlichting' },
      { key: 'SpeelplekkenVoorKinderen_4', title: 'Speelplekken Voor Kinderen' },
      { key: 'VoorzieningenVoorJongeren_5', title: 'Voorzieningen Voor Jongeren' },
      { key: 'FysiekeVoorzieningenSchaalscore_6', title: 'Fysieke Voorzieningen Schaalscore' },

      // Social cohesion
      { key: 'MensenKennenElkaarNauwelijks_7', title: 'Mensen Kennen Elkaar Nauwelijks' },
      { key: 'MensenGaanPrettigMetElkaarOm_8', title: 'Mensen Gaan Prettig Met Elkaar Om' },
      { key: 'GezelligeBuurtWaarMenElkaarHelpt_9', title: 'Gezellige Buurt Waar Men Elkaar Helpt' },
      { key: 'VoelMijThuisBijMensenInDezeBuurt_10', title: 'Voel Mij Thuis Bij Mensen In Deze Buurt' },
      { key: 'VeelContactMetAndereBuurtbewoners_11', title: 'Veel Contact Met Andere Buurtbewoners' },
      { key: 'TevredenMetSamenstellingBevolking_12', title: 'Tevreden Met Samenstelling Bevolking' },
      { key: 'DurfMijnHuissleutelTeGeven_13', title: 'Durf Mijn Huissleutel Te Geven' },
      { key: 'MensenSprekenElkaarAanOpGedrag_14', title: 'Mensen Spreken Elkaar Aan Op Gedrag' },
      { key: 'SocialeCohesieSchaalscore_15', title: 'Sociale Cohesie Schaalscore' },

      // Neighborhood development
      { key: 'VooruitGegaan_16', title: 'Vooruit Gegaan' },
      { key: 'AchteruitGegaan_17', title: 'Achteruit Gegaan' },
      { key: 'RapportcijferLeefbaarheidWoonbuurt_18', title: 'Rapportcijfer Leefbaarheid Woonbuurt' },

      // Municipal function
      { key: 'OordeelFunctionerenGemeenteAlgemeen_19', title: 'Oordeel Functioneren Gemeente Algemeen' },
      { key: 'OordeelFunctionerenGemeenteHandhavers_20', title: 'Oordeel Functioneren Gemeente Handhavers' },

      // Nuisance
      { key: 'ErvaartEenOfMeerVormenVanOverlast_21', title: 'Ervaart Een Of Meer Vormen Van Overlast' },
      { key: 'RommelOpStraat_22', title: 'Rommel Op Straat' },
      { key: 'StraatmeubilairDatVernieldIs_23', title: 'Straatmeubilair Dat Vernield Is' },
      { key: 'BekladdeMurenOfGebouwen_24', title: 'Bekladde Muren Of Gebouwen' },
      { key: 'Hondenpoep_25', title: 'Hondenpoep' },
      { key: 'EenOfMeerVormenFysiekeVerloedering_26', title: 'Een Of Meer Vormen Fysieke Verloedering' },
      { key: 'DronkenMensenOpStraat_27', title: 'Dronken Mensen Op Straat' },
      { key: 'VerwardePersonen_28', title: 'Verwarde Personen' },
      { key: 'Drugsgebruik_29', title: 'Drugsgebruik' },
      { key: 'Drugshandel_30', title: 'Drugshandel' },
      { key: 'OverlastDoorBuurtbewoners_31', title: 'Overlast Door Buurtbewoners' },
      { key: 'MensenWordenOpStraatLastiggevallen_32', title: 'Mensen Worden Op Straat Lastiggevallen' },
      { key: 'RondhangendeJongeren_33', title: 'Rondhangende Jongeren' },
      { key: 'EenOfMeerVormenVanSocialeOverlast_34', title: 'Een Of Meer Vormen Van Sociale Overlast' },
      { key: 'Parkeerproblemen_35', title: 'Parkeerproblemen' },
      { key: 'TeHardRijden_36', title: 'Te Hard Rijden' },
      { key: 'AgressiefGedragInVerkeer_37', title: 'Agressief Gedrag In Verkeer' },
      { key: 'EenOfMeerVormenVanVerkeersoverlast_38', title: 'Een Of Meer Vormen Van Verkeersoverlast' },
      { key: 'Geluidsoverlast_39', title: 'Geluidsoverlast' },
      { key: 'Stankoverlast_40', title: 'Stankoverlast' },
      { key: 'OverlastVanHorecagelegenheden_41', title: 'Overlast Van Horecagelegenheden' },
      { key: 'EenOfMeerVormenVanMilieuoverlast_42', title: 'Een Of Meer Vormen Van Milieuoverlast' },

      // Safety perception
      { key: 'VoeltZichWeleensOnveilig_43', title: 'Voelt Zich Weleens Onveilig' },
      { key: 'VoeltZichVaakOnveilig_44', title: 'Voelt Zich Vaak Onveilig' },
      { key: 'VanZakkenrollerij_45', title: 'Van Zakkenrollerij' },
      { key: 'VanBerovingOpStraat_46', title: 'Van Beroving Op Straat' },
      { key: 'VanInbraakInWoning_47', title: 'Van Inbraak In Woning' },
      { key: 'VanMishandeling_48', title: 'Van Mishandeling' },
      { key: 'VanOplichtingViaInternet_49', title: 'Van Oplichting Via Internet' },
      { key: 'VoeltZichWeleensOnveiligInBuurt_50', title: 'Voelt Zich Weleens Onveilig In Buurt' },
      { key: 'VoeltZichVaakOnveiligInBuurt_51', title: 'Voelt Zich Vaak Onveilig In Buurt' },
      { key: 'SAvondsOpStraatInBuurtOnveilig_52', title: 's Avonds Op Straat In Buurt Onveilig' },
      { key: 'SAvondsAlleenThuisOnveilig_53', title: 's Avonds Alleen Thuis Onveilig' },
      { key: 'DoetSAvondsNietOpen_54', title: 'Doet \'s Avonds Niet Open' },
      { key: 'RijdtOfLooptOm_55', title: 'Rijdt Of Loopt Om' },
      { key: 'BangSlachtofferCriminaliteitTeWorden_56', title: 'Bang Slachtoffer Criminaliteit Te Worden' },
      { key: 'DenktDatErVeelCriminaliteitInBuurt_57', title: 'Denkt Dat Er Veel Criminaliteit In Buurt' },
      { key: 'VindtCriminaliteitInBuurtToegenomen_58', title: 'Vindt Criminaliteit In Buurt Toegenomen' },
      { key: 'VindtCriminaliteitInBuurtAfgenomen_59', title: 'Vindt Criminaliteit In Buurt Afgenomen' },
      { key: 'RapportcijferVeiligheidInBuurt_60', title: 'Rapportcijfer Veiligheid In Buurt' },

      // Discrimination
      { key: 'DoorOnbekendenOpStraat_61', title: 'Door Onbekenden Op Straat' },
      { key: 'DoorOnbekendenInOpenbaarVervoer_62', title: 'Door Onbekenden In Openbaar Vervoer' },
      { key: 'DoorPersoneelVanWinkelsEnBedrijven_63', title: 'Door Personeel Van Winkels En Bedrijven' },
      { key: 'DoorPersoneelVanOverheidsinstanties_64', title: 'Door Personeel Van Overheidsinstanties' },
      { key: 'DoorBekendenPartnerFamilieVriend_65', title: 'Door Bekenden, Partner, Familie, Vriend' },
      { key: 'GediscrimineerdGevoeld_66', title: 'Gediscrimineerd Gevoeld' },

      // Crime victimization - Diefstal Uit Tas, Zak
      { key: 'Melding_67', title: 'Melding (Diefstal Uit Tas, Zak)' },
      { key: 'Slachtoffers_68', title: 'Slachtoffers (Diefstal Uit Tas, Zak)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_69', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Diefstal Uit Tas, Zak)' },
      { key: 'MeldingBijPolitie_70', title: 'Melding Bij Politie (Diefstal Uit Tas, Zak)' },
      { key: 'AangifteBijPolitie_71', title: 'Aangifte Bij Politie (Diefstal Uit Tas, Zak)' },

      // Crime victimization - Inbraak
      { key: 'Slachtoffers_72', title: 'Slachtoffers (Inbraak)' },
      { key: 'KendeDaderS_73', title: 'Kende Dader(s) (Inbraak)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_74', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Inbraak)' },
      { key: 'MeldingBijPolitie_75', title: 'Melding Bij Politie (Inbraak)' },
      { key: 'AangifteBijPolitie_76', title: 'Aangifte Bij Politie (Inbraak)' },

      // Crime victimization - Diefstal Voertuig
      { key: 'Slachtoffers_77', title: 'Slachtoffers (Diefstal Voertuig)' },
      { key: 'KendeDaderS_78', title: 'Kende Dader(s) (Diefstal Voertuig)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_79', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Diefstal Voertuig)' },
      { key: 'MeldingBijPolitie_80', title: 'Melding Bij Politie (Diefstal Voertuig)' },
      { key: 'AangifteBijPolitie_81', title: 'Aangifte Bij Politie (Diefstal Voertuig)' },

      // Crime victimization - Diefstal Uit/Van Voertuig
      { key: 'Slachtoffers_82', title: 'Slachtoffers (Diefstal Uit/Van Voertuig)' },
      { key: 'KendeDaderS_83', title: 'Kende Dader(s) (Diefstal Uit/Van Voertuig)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_84', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Diefstal Uit/Van Voertuig)' },
      { key: 'MeldingBijPolitie_85', title: 'Melding Bij Politie (Diefstal Uit/Van Voertuig)' },
      { key: 'AangifteBijPolitie_86', title: 'Aangifte Bij Politie (Diefstal Uit/Van Voertuig)' },

      // Crime victimization - Fietsdiefstal
      { key: 'Slachtoffers_87', title: 'Slachtoffers (Fietsdiefstal)' },
      { key: 'KendeDaderS_88', title: 'Kende Dader(s) (Fietsdiefstal)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_89', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Fietsdiefstal)' },
      { key: 'MeldingBijPolitie_90', title: 'Melding Bij Politie (Fietsdiefstal)' },
      { key: 'AangifteBijPolitie_91', title: 'Aangifte Bij Politie (Fietsdiefstal)' },

      // Crime victimization - Beroving
      { key: 'Slachtoffers_92', title: 'Slachtoffers (Beroving)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_93', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Beroving)' },
      { key: 'MeldingBijPolitie_94', title: 'Melding Bij Politie (Beroving)' },
      { key: 'AangifteBijPolitie_95', title: 'Aangifte Bij Politie (Beroving)' },

      // Crime victimization - Vernieling Eigen Voertuig
      { key: 'Slachtoffers_96', title: 'Slachtoffers (Vernieling Eigen Voertuig)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_97', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Vernieling Eigen Voertuig)' },
      { key: 'MeldingBijPolitie_98', title: 'Melding Bij Politie (Vernieling Eigen Voertuig)' },
      { key: 'AangifteBijPolitie_99', title: 'Aangifte Bij Politie (Vernieling Eigen Voertuig)' },

      // Crime victimization - Vernieling Andere Eigendommen
      { key: 'Slachtoffers_100', title: 'Slachtoffers (Vernieling Andere Eigendommen)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_101', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Vernieling Andere Eigendommen)' },
      { key: 'MeldingBijPolitie_102', title: 'Melding Bij Politie (Vernieling Andere Eigendommen)' },
      { key: 'AangifteBijPolitie_103', title: 'Aangifte Bij Politie (Vernieling Andere Eigendommen)' },

      // Crime victimization - Mishandeling
      { key: 'Slachtoffers_104', title: 'Slachtoffers (Mishandeling)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_105', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Mishandeling)' },
      { key: 'MeldingBijPolitie_106', title: 'Melding Bij Politie (Mishandeling)' },
      { key: 'AangifteBijPolitie_107', title: 'Aangifte Bij Politie (Mishandeling)' },

      // Crime victimization - Seksueel Misdrijf
      { key: 'Slachtoffers_108', title: 'Slachtoffers (Seksueel Misdrijf)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_109', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Seksueel Misdrijf)' },
      { key: 'MeldingBijPolitie_110', title: 'Melding Bij Politie (Seksueel Misdrijf)' },
      { key: 'AangifteBijPolitie_111', title: 'Aangifte Bij Politie (Seksueel Misdrijf)' },

      // Crime victimization - Consumentenfraude
      { key: 'Slachtoffers_112', title: 'Slachtoffers (Consumentenfraude)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_113', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Consumentenfraude)' },
      { key: 'MeldingBijPolitie_114', title: 'Melding Bij Politie (Consumentenfraude)' },
      { key: 'AangifteBijPolitie_115', title: 'Aangifte Bij Politie (Consumentenfraude)' },

      // Crime victimization - Aankoop-/Verkoopfraude Internet
      { key: 'Slachtoffers_116', title: 'Slachtoffers (Aankoop-/Verkoopfraude Internet)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_117', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Aankoop-/Verkoopfraude Internet)' },
      { key: 'MeldingBijPolitie_118', title: 'Melding Bij Politie (Aankoop-/Verkoopfraude Internet)' },
      { key: 'AangifteBijPolitie_119', title: 'Aangifte Bij Politie (Aankoop-/Verkoopfraude Internet)' },

      // Crime victimization - Loterijfraude
      { key: 'Slachtoffers_120', title: 'Slachtoffers (Loterijfraude)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_121', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Loterijfraude)' },
      { key: 'MeldingBijPolitie_122', title: 'Melding Bij Politie (Loterijfraude)' },
      { key: 'AangifteBijPolitie_123', title: 'Aangifte Bij Politie (Loterijfraude)' },

      // Crime victimization - Bank-/Giropas Fraude
      { key: 'Slachtoffers_124', title: 'Slachtoffers (Bank-/Giropas Fraude)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_125', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Bank-/Giropas Fraude)' },
      { key: 'MeldingBijPolitie_126', title: 'Melding Bij Politie (Bank-/Giropas Fraude)' },
      { key: 'AangifteBijPolitie_127', title: 'Aangifte Bij Politie (Bank-/Giropas Fraude)' },

      // Crime victimization - Phishing
      { key: 'Slachtoffers_128', title: 'Slachtoffers (Phishing)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_129', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Phishing)' },
      { key: 'MeldingBijPolitie_130', title: 'Melding Bij Politie (Phishing)' },
      { key: 'AangifteBijPolitie_131', title: 'Aangifte Bij Politie (Phishing)' },

      // Crime victimization - Identiteitsfraude
      { key: 'Slachtoffers_132', title: 'Slachtoffers (Identiteitsfraude)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_133', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Identiteitsfraude)' },
      { key: 'Melding_134', title: 'Melding (Identiteitsfraude)' },
      { key: 'Aangifte_135', title: 'Aangifte (Identiteitsfraude)' },

      // Crime victimization - Oplichting/Fraude
      { key: 'SlachtoffersOplichtingEnFraude_136', title: 'Slachtoffers Oplichting En Fraude' },
      { key: 'Slachtoffers_137', title: 'Slachtoffers (Oplichting/Fraude)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_138', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Oplichting/Fraude)' },
      { key: 'Melding_139', title: 'Melding (Oplichting/Fraude)' },
      { key: 'AangifteBijPolitie_140', title: 'Aangifte Bij Politie (Oplichting/Fraude)' },

      // Crime victimization - Hacking
      { key: 'Slachtoffers_141', title: 'Slachtoffers (Hacking)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_142', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Hacking)' },
      { key: 'Melding_143', title: 'Melding (Hacking)' },
      { key: 'AangifteBijPolitie_144', title: 'Aangifte Bij Politie (Hacking)' },

      // Crime victimization - Cyberpesten
      { key: 'Slachtoffers_145', title: 'Slachtoffers (Cyberpesten)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_146', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Cyberpesten)' },
      { key: 'Melding_147', title: 'Melding (Cyberpesten)' },
      { key: 'AangifteBijPolitie_148', title: 'Aangifte Bij Politie (Cyberpesten)' },

      // Crime victimization - Beeldmateriaal
      { key: 'Slachtoffers_149', title: 'Slachtoffers (Beeldmateriaal)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_150', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Beeldmateriaal)' },
      { key: 'Melding_151', title: 'Melding (Beeldmateriaal)' },
      { key: 'AangifteBijPolitie_152', title: 'Aangifte Bij Politie (Beeldmateriaal)' },

      // Crime victimization - Seksueel Getint Cybermisdrijf
      { key: 'Slachtoffers_153', title: 'Slachtoffers (Seksueel Getint Cybermisdrijf)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_154', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Seksueel Getint Cybermisdrijf)' },
      { key: 'Melding_155', title: 'Melding (Seksueel Getint Cybermisdrijf)' },
      { key: 'AangifteBijPolitie_156', title: 'Aangifte Bij Politie (Seksueel Getint Cybermisdrijf)' },

      // Crime victimization - Discriminatie
      { key: 'Slachtoffers_157', title: 'Slachtoffers (Discriminatie)' },
      { key: 'Slachtoffers_158', title: 'Slachtoffers (Discriminatie Totaal)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_159', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Discriminatie)' },
      { key: 'Melding_160', title: 'Melding (Discriminatie)' },
      { key: 'AangifteBijPolitie_161', title: 'Aangifte Bij Politie (Discriminatie)' },

      // Crime victimization - Ongewenst Toegang Woning
      { key: 'Slachtoffers_162', title: 'Slachtoffers (Ongewenst Toegang Woning)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_163', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Ongewenst Toegang Woning)' },
      { key: 'Melding_164', title: 'Melding (Ongewenst Toegang Woning)' },
      { key: 'AangifteBijPolitie_165', title: 'Aangifte Bij Politie (Ongewenst Toegang Woning)' },

      // Crime victimization - Bedreiging/Intimidatie
      { key: 'SlachtoffersBedreigingEnIntimidatie_166', title: 'Slachtoffers Bedreiging En Intimidatie' },
      { key: 'Slachtoffers_167', title: 'Slachtoffers (Bedreiging/Intimidatie)' },
      { key: 'KendeDaderS_168', title: 'Kende Dader(s) (Bedreiging/Intimidatie)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_169', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Bedreiging/Intimidatie)' },
      { key: 'Melding_170', title: 'Melding (Bedreiging/Intimidatie)' },
      { key: 'AangifteBijPolitie_171', title: 'Aangifte Bij Politie (Bedreiging/Intimidatie)' },

      // Crime victimization - Stalking
      { key: 'Slachtoffers_172', title: 'Slachtoffers (Stalking)' },
      { key: 'KendeDaderSVanafBegin_173', title: 'Kende Dader(s) Vanaf Begin (Stalking)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_174', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Stalking)' },
      { key: 'Melding_175', title: 'Melding (Stalking)' },
      { key: 'AangifteBijPolitie_176', title: 'Aangifte Bij Politie (Stalking)' },

      // Crime victimization - Cyberstalking
      { key: 'Slachtoffers_177', title: 'Slachtoffers (Cyberstalking)' },
      { key: 'KendeDaderSVanafBegin_178', title: 'Kende Dader(s) Vanaf Begin (Cyberstalking)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_179', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Cyberstalking)' },
      { key: 'Melding_180', title: 'Melding (Cyberstalking)' },
      { key: 'AangifteBijPolitie_181', title: 'Aangifte Bij Politie (Cyberstalking)' },

      // Crime victimization - Overige Online Delicten
      { key: 'Slachtoffers_182', title: 'Slachtoffers (Overige Online Delicten)' },
      { key: 'KendeDaderS_183', title: 'Kende Dader(s) (Overige Online Delicten)' },
      { key: 'HeeftHadGevolgenVoorSlachtoffer_184', title: 'Heeft/Had Gevolgen Voor Slachtoffer (Overige Online Delicten)' },
      { key: 'Melding_185', title: 'Melding (Overige Online Delicten)' },
      { key: 'AangifteBijPolitie_186', title: 'Aangifte Bij Politie (Overige Online Delicten)' },
      { key: 'SlachtoffersOverigeOnlineDelicten_187', title: 'Slachtoffers Overige Online Delicten' },

      // Police contact
      { key: 'ContactMetPolitie_188', title: 'Contact Met Politie' },
      { key: 'ContactMetPolitieInBuurt_189', title: 'Contact Met Politie In Buurt' },
      { key: 'ContactMetPolitieEldersInGemeente_190', title: 'Contact Met Politie Elders In Gemeente' },
      { key: 'ContactMetPolitieBuitenGemeente_191', title: 'Contact Met Politie Buiten Gemeente' },
      { key: 'Handhaving_192', title: 'Handhaving' },
      { key: 'AangifteMelding_193', title: 'Aangifte/Melding' },
      { key: 'Anders_194', title: 'Anders' },
      { key: 'Totaal_195', title: 'Totaal' },
      { key: 'Handhaving_196', title: 'Handhaving (In Buurt)' },
      { key: 'AangifteMelding_197', title: 'Aangifte/Melding (In Buurt)' },
      { key: 'Anders_198', title: 'Anders (In Buurt)' },
      { key: 'TevredenheidFunctionerenInBuurt_199', title: 'Tevredenheid Functioneren In Buurt' },
      { key: 'TevredenheidZichtbaarheidInBuurt_200', title: 'Tevredenheid Zichtbaarheid In Buurt' },
      { key: 'TevredenheidFunctionerenInAlgemeen_201', title: 'Tevredenheid Functioneren In Algemeen' },

      // Prevention measures
      { key: 'SAvondsLichtBrandenBijAfwezigheid_202', title: 's Avonds Licht Branden Bij Afwezigheid' },
      { key: 'FietsInBewaakteFietsenstalling_203', title: 'Fiets In Bewaakte Fietsenstalling' },
      { key: 'WaardevolleSpullenMeenemenUitAuto_204', title: 'Waardevolle Spullen Meenemen Uit Auto' },
      { key: 'WaardevolleSpullenThuisLaten_205', title: 'Waardevolle Spullen Thuis Laten' },
      { key: 'PreventiefGedragSomscore_206', title: 'Preventief Gedrag Somscore' },
      { key: 'ExtraVeiligheidsslotenOpBuitendeuren_207', title: 'Extra Veiligheidssloten Op Buitendeuren' },
      { key: 'RolluikenVoorRamenEnOfDeuren_208', title: 'Rolluiken Voor Ramen En/Of Deuren' },
      { key: 'BuitenverlichtingMetSensor_209', title: 'Buitenverlichting Met Sensor' },
      { key: 'Alarminstallatie_210', title: 'Alarminstallatie' },
      { key: 'Camerabewaking_211', title: 'Camerabewaking' },
      { key: 'RaamstickerPolitiekeurmerkVeiligWonen_212', title: 'Raamsticker Politiekeurmerk Veilig Wonen' },
      { key: 'PreventieveMaatregelenSomscore_213', title: 'Preventieve Maatregelen Somscore' },
      { key: 'AppInBuurtAanwezig_214', title: 'App In Buurt Aanwezig' },
      { key: 'DeelnameAanApp_215', title: 'Deelname Aan App' },
      { key: 'AangemeldBijBurgernet_216', title: 'Aangemeld Bij Burgernet' },
      { key: 'BuurtOfBurgerwachtInBuurtAanwezig_217', title: 'Buurt- Of Burgerwacht In Buurt Aanwezig' },
      { key: 'SterkeMoeilijkTeRadenWachtwoorden_218', title: 'Sterke, Moeilijk Te Raden Wachtwoorden' },
      { key: 'WachtwoordenRegelmatigVeranderen_219', title: 'Wachtwoorden Regelmatig Veranderen' },
      { key: 'WachtwoordmanagerGebruiken_220', title: 'Wachtwoordmanager Gebruiken' },
      { key: 'VirusscannerGebruiken_221', title: 'Virusscanner Gebruiken' },
      { key: 'FirewallGebruiken_222', title: 'Firewall Gebruiken' },
      { key: 'UpdateUitvoerenBackUpMaken_223', title: 'Update Uitvoeren / Back-Up Maken' },
      { key: 'DigitaleGegevensbeschermingSomscore_224', title: 'Digitale Gegevensbescherming Somscore' },
    ];

    // Apply all mappings
    for (const mapping of mappings) {
      const originalValue = rawData[mapping.key];
      const relativeValue = getNumber(mapping.key);
      const absoluteValue = calculateAbsolute(relativeValue);

      indicators.set(mapping.key, {
        title: mapping.title,
        originalValue: originalValue as string | number | null,
        absolute: absoluteValue,
        relative: relativeValue,
        unit: '%',
      });
    }

    return {
      indicators,
      metadata: {
        source: 'livability',
        fetchedAt: new Date(),
      },
    };
  }
}
