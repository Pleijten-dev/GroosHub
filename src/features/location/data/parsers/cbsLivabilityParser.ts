/**
 * CBS Livability Data Parser
 *
 * Transforms raw CBS livability data into parsed format with absolute and relative values.
 * Based on the mapping specification from CBS Leefbaarheid data.
 *
 * Note: CBS Livability data comes as percentages. We calculate absolute numbers from the percentages.
 */

import type { FetchedData } from '../sources/cbs-livability/client';
import type { ParsedLivabilityData, ParsedValue } from './types';

export class CBSLivabilityParser {
  /**
   * Parse raw CBS livability data into structured format with absolute and relative values
   * @param rawData Raw data from CBS Livability API
   * @param totalPopulation Total population count (from demographics data) used to calculate absolute values
   */
  parse(rawData: FetchedData, totalPopulation: number | null): ParsedLivabilityData {
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

    // For score fields (0-10 scale), we only have absolute values
    const parseScoreField = (fieldValue: unknown, label: string): ParsedValue => {
      const value = getNumber(fieldValue);
      const absolute = value !== null && totalPopulation !== null
        ? Math.round(value * totalPopulation)
        : null;
      return createValue(fieldValue, absolute, value, label, 'score');
    };

    return {
      // Location metadata
      municipalityName: String(rawData.RegioS || ''),
      regionType: 'Gemeente',
      regionCode: String(rawData.Codering_3 || rawData.WijkenEnBuurten || ''),

      // Physical facilities
      maintenanceSidewalkStreets: parsePercentageField(
        rawData.OnderhoudStoepenStratenEnPleintjes_1,
        'Onderhoud Stoepen, Straten En Pleintjes'
      ),
      maintenanceParks: parsePercentageField(
        rawData.OnderhoudVanPlantsoenenEnParken_2,
        'Onderhoud Van Plantsoenen En Parken'
      ),
      streetLighting: parsePercentageField(
        rawData.Straatverlichting_3,
        'Straatverlichting'
      ),
      playgroundsChildren: parsePercentageField(
        rawData.SpeelplekkenVoorKinderen_4,
        'Speelplekken Voor Kinderen'
      ),
      facilitiesYouth: parsePercentageField(
        rawData.VoorzieningenVoorJongeren_5,
        'Voorzieningen Voor Jongeren'
      ),
      physicalFacilitiesScore: parseScoreField(
        rawData.FysiekVoorzieningenSchaalscore_6,
        'Fysieke Voorzieningen Schaalscore'
      ),

      // Social cohesion
      peopleHardlyKnowEachOther: parsePercentageField(
        rawData.MensenKennenElkaarNauwelijks_7,
        'Mensen Kennen Elkaar Nauwelijks'
      ),
      peopleGetAlongWell: parsePercentageField(
        rawData.MensenGaanPrettigMetElkaarOm_8,
        'Mensen Gaan Prettig Met Elkaar Om'
      ),
      pleasantHelpfulNeighborhood: parsePercentageField(
        rawData.GezelligeBuurtWaarMenElkaarHelpt_9,
        'Gezellige Buurt Waar Men Elkaar Helpt'
      ),
      feelAtHomeWithNeighbors: parsePercentageField(
        rawData.VoelMijThuisBijMensenInDezeBuurt_10,
        'Voel Mij Thuis Bij Mensen In Deze Buurt'
      ),
      contactWithNeighbors: parsePercentageField(
        rawData.VeelContactMetAndereBuurtbewoners_11,
        'Veel Contact Met Andere Buurtbewoners'
      ),
      satisfiedWithPopulationComposition: parsePercentageField(
        rawData.TevredenMetSamenstellingBevolking_12,
        'Tevreden Met Samenstelling Bevolking'
      ),
      wouldGiveHouseKey: parsePercentageField(
        rawData.DurfMijnHuissleutelTeGeven_13,
        'Durf Mijn Huissleutel Te Geven'
      ),
      peopleCorrectBehavior: parsePercentageField(
        rawData.MensenSprekenElkaarAanOpGedrag_14,
        'Mensen Spreken Elkaar Aan Op Gedrag'
      ),
      socialCohesionScore: parseScoreField(
        rawData.SocialeCohesieSchaalscore_15,
        'Sociale Cohesie Schaalscore'
      ),

      // Neighborhood development
      neighborhoodImproved: parsePercentageField(
        rawData.VooruitGegaan_16,
        'Vooruit Gegaan'
      ),
      neighborhoodDeteriorated: parsePercentageField(
        rawData.AchteruitGegaan_17,
        'Achteruit Gegaan'
      ),
      neighborhoodRating: parseScoreField(
        rawData.RapportcijferLeefbaarheidWoonbuurt_18,
        'Rapportcijfer Leefbaarheid Woonbuurt'
      ),

      // Municipal services
      municipalPerformanceGeneral: parsePercentageField(
        rawData.OordeelFunctionerenGemeenteAlgemeen_19,
        'Oordeel Functioneren Gemeente Algemeen'
      ),
      municipalPerformanceEnforcers: parsePercentageField(
        rawData.OordeelFunctionerenGemeenteHandhavers_20,
        'Oordeel Functioneren Gemeente Handhavers'
      ),

      // Nuisance - Physical
      experiencesNuisance: parsePercentageField(
        rawData.ErvaartEenOfMeerVormenVanOverlast_21,
        'Ervaart Een Of Meer Vormen Van Overlast'
      ),
      litterOnStreet: parsePercentageField(
        rawData.RommelOpStraat_22,
        'Rommel Op Straat'
      ),
      vandalizedStreetFurniture: parsePercentageField(
        rawData.StraatmeubiilairDatVernieilIsIs_23,
        'Straatmeubilair Dat Vernield Is'
      ),
      graffiti: parsePercentageField(
        rawData.BekladedMurenOfGebouwen_24,
        'Bekladde Muren Of Gebouwen'
      ),
      dogFeces: parsePercentageField(
        rawData.Hondenpoep_25,
        'Hondenpoep'
      ),
      physicalDeterioration: parsePercentageField(
        rawData.EenOfMeerVormenFysiekeVerloedering_26,
        'Een Of Meer Vormen Fysieke Verloedering'
      ),

      // Nuisance - Social
      drunkPeople: parsePercentageField(
        rawData.DronkenMensenOpStraat_27,
        'Dronken Mensen Op Straat'
      ),
      confusedPeople: parsePercentageField(
        rawData.VerwardePersonen_28,
        'Verwarde Personen'
      ),
      drugUse: parsePercentageField(
        rawData.Drugsgebruik_29,
        'Drugsgebruik'
      ),
      drugDealing: parsePercentageField(
        rawData.Drugshandel_30,
        'Drugshandel'
      ),
      nuisanceFromNeighbors: parsePercentageField(
        rawData.OverlastDoorBuurtbewoners_31,
        'Overlast Door Buurtbewoners'
      ),
      harassmentOnStreet: parsePercentageField(
        rawData.MensenWordenOpStraatLastiggevallen_32,
        'Mensen Worden Op Straat Lastiggevallen'
      ),
      loiteringYouths: parsePercentageField(
        rawData.RondhangendeJongeren_33,
        'Rondhangende Jongeren'
      ),
      socialNuisance: parsePercentageField(
        rawData.EenOfMeerVormenVanSocialeOverlast_34,
        'Een Of Meer Vormen Van Sociale Overlast'
      ),

      // Nuisance - Traffic
      parkingProblems: parsePercentageField(
        rawData.Parkeerproblemen_35,
        'Parkeerproblemen'
      ),
      speeding: parsePercentageField(
        rawData.TeHardRijden_36,
        'Te Hard Rijden'
      ),
      aggressiveDriving: parsePercentageField(
        rawData.AggressiefGedragInVerkeer_37,
        'Agressief Gedrag In Verkeer'
      ),
      trafficNuisance: parsePercentageField(
        rawData.EenOfMeerVormenVanVerkeersoverlast_38,
        'Een Of Meer Vormen Van Verkeersoverlast'
      ),

      // Nuisance - Environmental
      noiseNuisance: parsePercentageField(
        rawData.Geluidsoverlast_39,
        'Geluidsoverlast'
      ),
      odorNuisance: parsePercentageField(
        rawData.Stankoverlast_40,
        'Stankoverlast'
      ),
      nuisanceFromBars: parsePercentageField(
        rawData.OverlastVanHorecagelegenheden_41,
        'Overlast Van Horecagelegenheden'
      ),
      environmentalNuisance: parsePercentageField(
        rawData.EenOfMeerVormenVanMilieuoverlast_42,
        'Een Of Meer Vormen Van Milieuoverlast'
      ),

      // Safety perception
      sometimesFeelsUnsafe: parsePercentageField(
        rawData.VoeltZichWeleensOnveilig_43,
        'Voelt Zich Weleens Onveilig'
      ),
      oftenFeelsUnsafe: parsePercentageField(
        rawData.VoeltZichVaakOnveilig_44,
        'Voelt Zich Vaak Onveilig'
      ),
      fearOfPickpocketing: parsePercentageField(
        rawData.VanZakkenrollerij_45,
        'Van Zakkenrollerij'
      ),
      fearOfStreetRobbery: parsePercentageField(
        rawData.VanBerovingOpStraat_46,
        'Van Beroving Op Straat'
      ),
      fearOfBurglary: parsePercentageField(
        rawData.VanInbraakInWoning_47,
        'Van Inbraak In Woning'
      ),
      fearOfAssault: parsePercentageField(
        rawData.VanMishandeling_48,
        'Van Mishandeling'
      ),
      fearOfOnlineFraud: parsePercentageField(
        rawData.VanOplichtingViaInternet_49,
        'Van Oplichting Via Internet'
      ),
      sometimesFeelsUnsafeInNeighborhood: parsePercentageField(
        rawData.VoeltZichWeleensOnveiligInBuurt_50,
        'Voelt Zich Weleens Onveilig In Buurt'
      ),
      oftenFeelsUnsafeInNeighborhood: parsePercentageField(
        rawData.VoeltZichVaakOnveiligInBuurt_51,
        'Voelt Zich Vaak Onveilig In Buurt'
      ),
      unsafeOnStreetAtNight: parsePercentageField(
        rawData.sAvondsOpStraatInBuurtOnveilig_52,
        's Avonds Op Straat In Buurt Onveilig'
      ),
      unsafeAloneAtHome: parsePercentageField(
        rawData.sAvondsAlleenThuisOnveilig_53,
        's Avonds Alleen Thuis Onveilig'
      ),
      doesNotOpenDoorAtNight: parsePercentageField(
        rawData.DoetsAvondsNietOpen_54,
        'Doet 's Avonds Niet Open'
      ),
      drivesOrWalksAround: parsePercentageField(
        rawData.RijdtOfLooptOm_55,
        'Rijdt Of Loopt Om'
      ),
      afraidOfBeingVictim: parsePercentageField(
        rawData.BangSlachtofferCriminiteitTeWorden_56,
        'Bang Slachtoffer Criminaliteit Te Worden'
      ),
      perceivedHighCrime: parsePercentageField(
        rawData.DenktDatErVeelCriminaliteitInBuurt_57,
        'Denkt Dat Er Veel Criminaliteit In Buurt'
      ),
      perceivedCrimeIncrease: parsePercentageField(
        rawData.VindtCriminaliteitInBuurtToegenomen_58,
        'Vindt Criminaliteit In Buurt Toegenomen'
      ),
      perceivedCrimeDecrease: parsePercentageField(
        rawData.VindtCriminaliteitInBuurtAfgenomen_59,
        'Vindt Criminaliteit In Buurt Afgenomen'
      ),
      safetyRating: parseScoreField(
        rawData.RapportcijferVeiligheidInBuurt_60,
        'Rapportcijfer Veiligheid In Buurt'
      ),

      // Discrimination
      discriminatedByStrangers: parsePercentageField(
        rawData.DoorOnbekendenOpStraat_61,
        'Door Onbekenden Op Straat'
      ),
      discriminatedInPublicTransport: parsePercentageField(
        rawData.DoorOnbekendenInOpenbaarVervoer_62,
        'Door Onbekenden In Openbaar Vervoer'
      ),
      discriminatedByShopStaff: parsePercentageField(
        rawData.DoorPersoneelVanWinkelsEnBedrijven_63,
        'Door Personeel Van Winkels En Bedrijven'
      ),
      discriminatedByGovernmentStaff: parsePercentageField(
        rawData.DoorPersoneelVanOverheidsinstanties_64,
        'Door Personeel Van Overheidsinstanties'
      ),
      discriminatedByAcquaintances: parsePercentageField(
        rawData.DoorBekendenPartnerFamilieVriend_65,
        'Door Bekenden, Partner, Familie, Vriend'
      ),
      feltDiscriminated: parsePercentageField(
        rawData.GediscrimineerdGevoeld_66,
        'Gediscrimineerd Gevoeld'
      ),

      // Crime victimization (Theft)
      victimsTheft: parsePercentageField(
        rawData.SlachtofferssDieftalUitTasZak_67,
        'Slachtoffers (Diefstal Uit Tas, Zak)'
      ),
      victimsBurglary: parsePercentageField(
        rawData.SlachtofferssInbraak_68,
        'Slachtoffers (Inbraak)'
      ),
      victimsVehicleTheft: parsePercentageField(
        rawData.SlachtofferssDieftalVoertuig_69,
        'Slachtoffers (Diefstal Voertuig)'
      ),
      victimsTheftFromVehicle: parsePercentageField(
        rawData.SlachtofferssDieftalUitVanVoertuig_70,
        'Slachtoffers (Diefstal Uit/Van Voertuig)'
      ),
      victimsBicycleTheft: parsePercentageField(
        rawData.SlachtofferssFietsdiefstal_71,
        'Slachtoffers (Fietsdiefstal)'
      ),
      victimsRobbery: parsePercentageField(
        rawData.SlachtofferssBeroving_72,
        'Slachtoffers (Beroving)'
      ),

      // Crime victimization (Vandalism & Violence)
      victimsVandalism: parsePercentageField(
        rawData.SlachtofferssVernielingEigenVoertuig_73,
        'Slachtoffers (Vernieling Eigen Voertuig)'
      ),
      victimsAssault: parsePercentageField(
        rawData.SlachtofferssMishandeling_74,
        'Slachtoffers (Mishandeling)'
      ),
      victimsSexualOffense: parsePercentageField(
        rawData.SlachtoffersSeksueelMisdrijf_75,
        'Slachtoffers (Seksueel Misdrijf)'
      ),

      // Crime victimization (Fraud)
      victimsConsumerFraud: parsePercentageField(
        rawData.SlachtofferssConsumentenfraude_76,
        'Slachtoffers (Consumentenfraude)'
      ),
      victimsOnlineShoppingFraud: parsePercentageField(
        rawData.SlachtofferssAankoopVerkoopfraudeInternet_77,
        'Slachtoffers (Aankoop-/Verkoopfraude Internet)'
      ),
      victimsLotteryFraud: parsePercentageField(
        rawData.SlachtofferssLoterijfraude_78,
        'Slachtoffers (Loterijfraude)'
      ),
      victimsCardFraud: parsePercentageField(
        rawData.SlachtoffersBankGiropasFraude_79,
        'Slachtoffers (Bank-/Giropas Fraude)'
      ),
      victimsPhishing: parsePercentageField(
        rawData.SlachtofferssPhishing_80,
        'Slachtoffers (Phishing)'
      ),
      victimsIdentityFraud: parsePercentageField(
        rawData.SlachtofferssIdentiteitsfraude_81,
        'Slachtoffers (Identiteitsfraude)'
      ),
      victimsFraud: parsePercentageField(
        rawData.SlachtofferssOplichtingFraude_82,
        'Slachtoffers (Oplichting/Fraude)'
      ),

      // Crime victimization (Cyber)
      victimsHacking: parsePercentageField(
        rawData.SlachtofferssHacking_83,
        'Slachtoffers (Hacking)'
      ),
      victimsCyberbullying: parsePercentageField(
        rawData.SlachtofferssCyberpesten_84,
        'Slachtoffers (Cyberpesten)'
      ),
      victimsImageAbuse: parsePercentageField(
        rawData.SlachtofferssBeeldmateriaal_85,
        'Slachtoffers (Beeldmateriaal)'
      ),
      victimsSexualCybercrime: parsePercentageField(
        rawData.SlachtofferssSeksueelGetintCybermisdrijf_86,
        'Slachtoffers (Seksueel Getint Cybermisdrijf)'
      ),

      // Crime victimization (Other)
      victimsDiscrimination: parsePercentageField(
        rawData.SlachtofferssDiscriminatie_87,
        'Slachtoffers (Discriminatie)'
      ),
      victimsUnwantedAccess: parsePercentageField(
        rawData.SlachtofferssOngewenstToegangWoning_88,
        'Slachtoffers (Ongewenst Toegang Woning)'
      ),
      victimsThreatIntimidation: parsePercentageField(
        rawData.SlachtoffersBedreigingIntimidatie_89,
        'Slachtoffers (Bedreiging/Intimidatie)'
      ),
      victimsStalking: parsePercentageField(
        rawData.SlachtofferssStalking_90,
        'Slachtoffers (Stalking)'
      ),
      victimsCyberstalking: parsePercentageField(
        rawData.SlachtofferssCyberstalking_91,
        'Slachtoffers (Cyberstalking)'
      ),
      victimsOtherOnlineCrime: parsePercentageField(
        rawData.SlachtofferssOverigeOnlineDelicten_92,
        'Slachtoffers (Overige Online Delicten)'
      ),

      // Police contact
      contactWithPolice: parsePercentageField(
        rawData.ContactMetPolitie_93,
        'Contact Met Politie'
      ),
      contactInNeighborhood: parsePercentageField(
        rawData.ContactMetPolitieInBuurt_94,
        'Contact Met Politie In Buurt'
      ),
      contactElsewhere: parsePercentageField(
        rawData.ContactMetPolitieEldersInGemeente_95,
        'Contact Met Politie Elders In Gemeente'
      ),
      contactOutsideMunicipality: parsePercentageField(
        rawData.ContactMetPolitieBuitenGemeente_96,
        'Contact Met Politie Buiten Gemeente'
      ),
      contactForEnforcement: parsePercentageField(
        rawData.Handhaving_97,
        'Handhaving'
      ),
      contactForReport: parsePercentageField(
        rawData.AangifteMelding_98,
        'Aangifte/Melding'
      ),
      contactOther: parsePercentageField(
        rawData.Anders_99,
        'Anders'
      ),
      satisfactionPoliceInNeighborhood: parsePercentageField(
        rawData.TevredenheidFunctionerenInBuurt_100,
        'Tevredenheid Functioneren In Buurt'
      ),
      satisfactionPoliceVisibility: parsePercentageField(
        rawData.TevredenheidZichtbaarheidInBuurt_101,
        'Tevredenheid Zichtbaarheid In Buurt'
      ),
      satisfactionPoliceGeneral: parsePercentageField(
        rawData.TevredenheidFunctionerenInAlgemeen_102,
        'Tevredenheid Functioneren In Algemeen'
      ),

      // Prevention measures
      leaveLightsOn: parsePercentageField(
        rawData.sAvondsLichtBrandenBijAfwezigheid_103,
        's Avonds Licht Branden Bij Afwezigheid'
      ),
      securedBicycleStorage: parsePercentageField(
        rawData.FietsInBewaakteFietsenstalling_104,
        'Fiets In Bewaakte Fietsenstalling'
      ),
      removeValuablesFromCar: parsePercentageField(
        rawData.WaardevolleSpullenMeenemenUitAuto_105,
        'Waardevolle Spullen Meenemen Uit Auto'
      ),
      leaveValuablesAtHome: parsePercentageField(
        rawData.WaardevolleSpullenThuisLaten_106,
        'Waardevolle Spullen Thuis Laten'
      ),
      preventiveBehaviorScore: parseScoreField(
        rawData.PreventiefGedragSomscore_107,
        'Preventief Gedrag Somscore'
      ),
      extraSecurityLocks: parsePercentageField(
        rawData.ExtraVeiligheidslotenOpBuitendeuren_108,
        'Extra Veiligheidssloten Op Buitendeuren'
      ),
      shutters: parsePercentageField(
        rawData.RolluikenVoorRamenEnOfDeuren_109,
        'Rolluiken Voor Ramen En/Of Deuren'
      ),
      motionLighting: parsePercentageField(
        rawData.BuitenverlichtingMetSensor_110,
        'Buitenverlichting Met Sensor'
      ),
      alarmSystem: parsePercentageField(
        rawData.Alarminstallatie_111,
        'Alarminstallatie'
      ),
      cameraSurveillance: parsePercentageField(
        rawData.Camerabewaking_112,
        'Camerabewaking'
      ),
      policeQualityMarkSticker: parsePercentageField(
        rawData.RaamstickerPolitiekeurmerkVeiligWonen_113,
        'Raamsticker Politiekeurmerk Veilig Wonen'
      ),
      preventiveMeasuresScore: parseScoreField(
        rawData.PreventieveMaatregelenSomscore_114,
        'Preventieve Maatregelen Somscore'
      ),
      neighborhoodAppPresent: parsePercentageField(
        rawData.AppInBuurtAanwezig_115,
        'App In Buurt Aanwezig'
      ),
      participatesInApp: parsePercentageField(
        rawData.DeelnameAanApp_116,
        'Deelname Aan App'
      ),
      registeredWithBurgernet: parsePercentageField(
        rawData.AangemeldBijBurgernet_117,
        'Aangemeld Bij Burgernet'
      ),
      neighborhoodWatchPresent: parsePercentageField(
        rawData.BuurtOfBurgerachtInBuurtAanwezig_118,
        'Buurt- Of Burgerwacht In Buurt Aanwezig'
      ),

      // Digital security
      strongPasswords: parsePercentageField(
        rawData.SterkeMoeilijkTeRadenWachtwoorden_119,
        'Sterke, Moeilijk Te Raden Wachtwoorden'
      ),
      regularlyChangesPasswords: parsePercentageField(
        rawData.WachtwoordenRegelmatigVeranderen_120,
        'Wachtwoorden Regelmatig Veranderen'
      ),
      usesPasswordManager: parsePercentageField(
        rawData.WachtwoordmanagerGebruiken_121,
        'Wachtwoordmanager Gebruiken'
      ),
      usesVirusScanner: parsePercentageField(
        rawData.VirusscannerGebruiken_122,
        'Virusscanner Gebruiken'
      ),
      usesFirewall: parsePercentageField(
        rawData.FirewallGebruiken_123,
        'Firewall Gebruiken'
      ),
      performsUpdatesBackups: parsePercentageField(
        rawData.UpdateUitvoerenBackUpMaken_124,
        'Update Uitvoeren / Back-Up Maken'
      ),
      digitalSecurityScore: parseScoreField(
        rawData.DigitaleGegevensbeschermingSomscore_125,
        'Digitale Gegevensbescherming Somscore'
      ),
    };
  }
}
