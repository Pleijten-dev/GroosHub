/**
 * CBS Demographics Data Parser
 *
 * Transforms raw CBS demographics data into parsed format with absolute and relative values.
 * Based on the mapping specification from CBS Kerncijfers wijken en buurten (84583NED).
 */

import type { FetchedData } from '../sources/cbs-demographics/client';
import type { ParsedDemographicsData, ParsedValue } from './types';

export class CBSDemographicsParser {
  /**
   * Parse raw CBS demographics data into structured format with absolute and relative values
   */
  parse(rawData: FetchedData): ParsedDemographicsData {
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

    // Get base values for calculations
    const totalPopulation = getNumber(rawData.Bevolking_1); // Aantal Inwoners
    const totalHouseholds = getNumber(rawData.HuishoudensTotaal_28); // Huishoudens Totaal
    const totalIncomeRecipients = getNumber(rawData.PersonenPerSoortUitkeringTotaal_56); // Aantal Inkomensontvangers
    const totalBusinesses = getNumber(rawData.BedrijfsvestigingenTotaal_69); // Bedrijfsvestigingen Totaal
    const totalCars = getNumber(rawData.PersonenautoTotaal_76); // Personenautos Totaal
    const westernTotal = getNumber(rawData.Westers_totaal_11);
    const nonWesternTotal = getNumber(rawData.Nietwesters_totaal_12);

    // Calculate native population (Autochtoon)
    const nativePopulation =
      totalPopulation !== null && westernTotal !== null && nonWesternTotal !== null
        ? totalPopulation - westernTotal - nonWesternTotal
        : null;

    // Helper to calculate relative percentage from absolute
    const calcRelative = (absolute: number | null, base: number | null): number | null => {
      if (absolute === null || base === null || base === 0) return null;
      return (absolute / base) * 100;
    };

    return {
      // Location metadata
      municipalityName: String(rawData.RegioS || ''),
      regionType: String(rawData.SoortRegio_2 || ''),
      regionCode: String(rawData.Codering_3 || ''),

      // Population
      totalPopulation: createValue(
        rawData.Bevolking_1,
        totalPopulation,
        null,
        'Aantal Inwoners',
        'people'
      ),

      // Gender distribution
      males: createValue(
        rawData.Mannen_2,
        getNumber(rawData.Mannen_2),
        calcRelative(getNumber(rawData.Mannen_2), totalPopulation),
        'Mannen',
        'people'
      ),
      females: createValue(
        rawData.Vrouwen_3,
        getNumber(rawData.Vrouwen_3),
        calcRelative(getNumber(rawData.Vrouwen_3), totalPopulation),
        'Vrouwen',
        'people'
      ),

      // Age distribution
      age0to15: createValue(
        rawData.k_0Tot15Jaar_4,
        getNumber(rawData.k_0Tot15Jaar_4),
        calcRelative(getNumber(rawData.k_0Tot15Jaar_4), totalPopulation),
        '0 Tot 15 Jaar',
        'people'
      ),
      age15to25: createValue(
        rawData.k_15Tot25Jaar_5,
        getNumber(rawData.k_15Tot25Jaar_5),
        calcRelative(getNumber(rawData.k_15Tot25Jaar_5), totalPopulation),
        '15 Tot 25 Jaar',
        'people'
      ),
      age25to45: createValue(
        rawData.k_25Tot45Jaar_6,
        getNumber(rawData.k_25Tot45Jaar_6),
        calcRelative(getNumber(rawData.k_25Tot45Jaar_6), totalPopulation),
        '25 Tot 45 Jaar',
        'people'
      ),
      age45to65: createValue(
        rawData.k_45Tot65Jaar_7,
        getNumber(rawData.k_45Tot65Jaar_7),
        calcRelative(getNumber(rawData.k_45Tot65Jaar_7), totalPopulation),
        '45 Tot 65 Jaar',
        'people'
      ),
      age65Plus: createValue(
        rawData.k_65JaarOfOuder_8,
        getNumber(rawData.k_65JaarOfOuder_8),
        calcRelative(getNumber(rawData.k_65JaarOfOuder_8), totalPopulation),
        '65 Jaar Of Ouder',
        'people'
      ),

      // Marital status
      unmarried: createValue(
        rawData.Ongehuwd_9,
        getNumber(rawData.Ongehuwd_9),
        calcRelative(getNumber(rawData.Ongehuwd_9), totalPopulation),
        'Ongehuwd',
        'people'
      ),
      married: createValue(
        rawData.Gehuwd_10,
        getNumber(rawData.Gehuwd_10),
        calcRelative(getNumber(rawData.Gehuwd_10), totalPopulation),
        'Gehuwd',
        'people'
      ),
      divorced: createValue(
        rawData.Gescheiden_11,
        getNumber(rawData.Gescheiden_11),
        calcRelative(getNumber(rawData.Gescheiden_11), totalPopulation),
        'Gescheiden',
        'people'
      ),
      widowed: createValue(
        rawData.Verweduwd_12,
        getNumber(rawData.Verweduwd_12),
        calcRelative(getNumber(rawData.Verweduwd_12), totalPopulation),
        'Verweduwd',
        'people'
      ),

      // Migration background
      native: createValue(
        nativePopulation,
        nativePopulation,
        calcRelative(nativePopulation, totalPopulation),
        'Autochtoon',
        'people'
      ),
      westernBackground: createValue(
        rawData.Westers_totaal_11,
        westernTotal,
        calcRelative(westernTotal, totalPopulation),
        'Westers Totaal',
        'people'
      ),
      nonWesternBackground: createValue(
        rawData.Nietwesters_totaal_12,
        nonWesternTotal,
        calcRelative(nonWesternTotal, totalPopulation),
        'Niet Westers Totaal',
        'people'
      ),
      morocco: createValue(
        rawData.Marokko_13,
        getNumber(rawData.Marokko_13),
        calcRelative(getNumber(rawData.Marokko_13), totalPopulation),
        'Marokko',
        'people'
      ),
      dutchCaribbean: createValue(
        rawData.NederlandseAntillenEnAruba_14,
        getNumber(rawData.NederlandseAntillenEnAruba_14),
        calcRelative(getNumber(rawData.NederlandseAntillenEnAruba_14), totalPopulation),
        'Nederlandse Antillen En Aruba',
        'people'
      ),
      suriname: createValue(
        rawData.Suriname_15,
        getNumber(rawData.Suriname_15),
        calcRelative(getNumber(rawData.Suriname_15), totalPopulation),
        'Suriname',
        'people'
      ),
      turkey: createValue(
        rawData.Turkije_16,
        getNumber(rawData.Turkije_16),
        calcRelative(getNumber(rawData.Turkije_16), totalPopulation),
        'Turkije',
        'people'
      ),
      otherNonWestern: createValue(
        rawData.OverigNietWesters_17,
        getNumber(rawData.OverigNietWesters_17),
        calcRelative(getNumber(rawData.OverigNietWesters_17), totalPopulation),
        'Overig Niet Westers',
        'people'
      ),

      // Birth and death rates
      totalBirths: createValue(
        rawData.GeboortetotaalAantalTotaal_18,
        getNumber(rawData.GeboortetotaalAantalTotaal_18),
        calcRelative(getNumber(rawData.GeboortetotaalAantalTotaal_18), totalPopulation),
        'Geboorte Totaal',
        'births'
      ),
      relativeBirthRate: createValue(
        rawData.GeboortetotaalAantalRelatief_19,
        getNumber(rawData.GeboortetotaalAantalRelatief_19),
        calcRelative(getNumber(rawData.GeboortetotaalAantalRelatief_19), totalPopulation),
        'Geboorte Relatief',
        'per 1000'
      ),
      totalDeaths: createValue(
        rawData.SterfteTotaal_20,
        getNumber(rawData.SterfteTotaal_20),
        null,
        'Sterfte Totaal',
        'deaths'
      ),
      relativeDeathRate: createValue(
        rawData.SterfteRelatief_21,
        getNumber(rawData.SterfteRelatief_21),
        null,
        'Sterfte Relatief',
        'per 1000'
      ),

      // Households
      totalHouseholds: createValue(
        rawData.HuishoudensTotaal_28,
        totalHouseholds,
        null,
        'Huishoudens Totaal',
        'households'
      ),
      singlePersonHouseholds: createValue(
        rawData.Eenpersoonshuishoudens_29,
        getNumber(rawData.Eenpersoonshuishoudens_29),
        calcRelative(getNumber(rawData.Eenpersoonshuishoudens_29), totalHouseholds),
        'Eenpersoonshuishoudens',
        'households'
      ),
      householdsWithoutChildren: createValue(
        rawData.HuishoudensZonderKinderen_30,
        getNumber(rawData.HuishoudensZonderKinderen_30),
        calcRelative(getNumber(rawData.HuishoudensZonderKinderen_30), totalHouseholds),
        'Huishoudens Zonder Kinderen',
        'households'
      ),
      householdsWithChildren: createValue(
        rawData.HuishoudensMetKinderen_31,
        getNumber(rawData.HuishoudensMetKinderen_31),
        calcRelative(getNumber(rawData.HuishoudensMetKinderen_31), totalHouseholds),
        'Huishoudens Met Kinderen',
        'households'
      ),
      averageHouseholdSize: createValue(
        rawData.GemiddeldeHuishoudensgrootte_32,
        getNumber(rawData.GemiddeldeHuishoudensgrootte_32),
        null,
        'Gemiddelde Huishoudensgrootte',
        'people'
      ),

      // Housing
      populationDensity: createValue(
        rawData.Bevolkingsdichtheid_33,
        getNumber(rawData.Bevolkingsdichtheid_33),
        null,
        'Bevolkingsdichtheid',
        'per km²'
      ),
      housingStock: createValue(
        rawData.Woningvoorraad_34,
        getNumber(rawData.Woningvoorraad_34),
        null,
        'Woningvoorraad',
        'dwellings'
      ),
      averageWOZValue: createValue(
        rawData.GemiddeldeWOZWaardeVanWoningen_35,
        getNumber(rawData.GemiddeldeWOZWaardeVanWoningen_35),
        null,
        'Gemiddelde WOZ Waarde Van Woningen',
        '×1000 EUR'
      ),
      percentageSingleFamily: createValue(
        rawData.PercentageEengezinswoning_36,
        null,
        getNumber(rawData.PercentageEengezinswoning_36),
        'Percentage Eengezinswoning',
        '%'
      ),
      percentageMultiFamily: createValue(
        rawData.PercentageMeergezinswoning_37,
        null,
        getNumber(rawData.PercentageMeergezinswoning_37),
        'Percentage Meergezinswoning',
        '%'
      ),
      percentageOccupied: createValue(
        rawData.PercentageBewoond_38,
        null,
        getNumber(rawData.PercentageBewoond_38),
        'Percentage Bewoond',
        '%'
      ),
      percentageVacant: createValue(
        rawData.PercentageOnbewoond_39,
        null,
        getNumber(rawData.PercentageOnbewoond_39),
        'Percentage Onbewoond',
        '%'
      ),
      ownerOccupied: createValue(
        rawData.Koopwoningen_40,
        null,
        getNumber(rawData.Koopwoningen_40),
        'Koopwoningen',
        '%'
      ),
      rentalTotal: createValue(
        rawData.HuurwoningenTotaal_41,
        null,
        getNumber(rawData.HuurwoningenTotaal_41),
        'Huurwoningen Totaal',
        '%'
      ),
      rentalHousingCorporation: createValue(
        rawData.InBezitWoningcorporatie_42,
        null,
        getNumber(rawData.InBezitWoningcorporatie_42),
        'In Bezit Woningcorporatie',
        '%'
      ),
      rentalOtherLandlords: createValue(
        rawData.InBezitOverigeVerhuurders_43,
        null,
        getNumber(rawData.InBezitOverigeVerhuurders_43),
        'In Bezit Overige Verhuurders',
        '%'
      ),
      ownershipUnknown: createValue(
        rawData.EigendomOnbekend_44,
        null,
        getNumber(rawData.EigendomOnbekend_44),
        'Eigendom Onbekend',
        '%'
      ),
      builtBefore2000: createValue(
        rawData.BouwjaarVoor2000_45,
        null,
        getNumber(rawData.BouwjaarVoor2000_45),
        'Bouwjaar Voor 2000',
        '%'
      ),
      builtFrom2000: createValue(
        rawData.BouwjaarVanaf2000_46,
        null,
        getNumber(rawData.BouwjaarVanaf2000_46),
        'Bouwjaar Vanaf 2000',
        '%'
      ),

      // Energy consumption
      avgElectricityTotal: createValue(
        rawData.GemiddeldElektriciteitsverbruikTotaal_47,
        null,
        getNumber(rawData.GemiddeldElektriciteitsverbruikTotaal_47),
        'Gemiddeld Elektriciteitsverbruik Totaal',
        'kWh'
      ),
      avgElectricityApartment: createValue(
        rawData.Appartement_48,
        null,
        getNumber(rawData.Appartement_48),
        'Appartement (Elektriciteit)',
        'kWh'
      ),
      avgElectricityTerrace: createValue(
        rawData.Tussenwoning_49,
        null,
        getNumber(rawData.Tussenwoning_49),
        'Tussenwoning (Elektriciteit)',
        'kWh'
      ),
      avgElectricityCorner: createValue(
        rawData.Hoekwoning_50,
        null,
        getNumber(rawData.Hoekwoning_50),
        'Hoekwoning (Elektriciteit)',
        'kWh'
      ),
      avgElectricitySemiDetached: createValue(
        rawData.TweeOnderEenKapWoning_51,
        null,
        getNumber(rawData.TweeOnderEenKapWoning_51),
        'Twee Onder Een Kap Woning (Elektriciteit)',
        'kWh'
      ),
      avgElectricityDetached: createValue(
        rawData.VrijstaandeWoning_52,
        null,
        getNumber(rawData.VrijstaandeWoning_52),
        'Vrijstaande Woning (Elektriciteit)',
        'kWh'
      ),
      avgElectricityRental: createValue(
        rawData.Huurwoning_53,
        null,
        getNumber(rawData.Huurwoning_53),
        'Huurwoning (Elektriciteit)',
        'kWh'
      ),
      avgElectricityOwned: createValue(
        rawData.EigenWoning_54,
        null,
        getNumber(rawData.EigenWoning_54),
        'Eigen Woning (Elektriciteit)',
        'kWh'
      ),
      avgGasTotal: createValue(
        rawData.GemiddeldAardgasverbruikTotaal_55,
        null,
        getNumber(rawData.GemiddeldAardgasverbruikTotaal_55),
        'Gemiddeld Aardgasverbruik Totaal',
        'm³'
      ),
      avgGasApartment: createValue(
        rawData.Appartement_56,
        null,
        getNumber(rawData.Appartement_56),
        'Appartement (Aardgas)',
        'm³'
      ),
      avgGasTerrace: createValue(
        rawData.Tussenwoning_57,
        null,
        getNumber(rawData.Tussenwoning_57),
        'Tussenwoning (Aardgas)',
        'm³'
      ),
      avgGasCorner: createValue(
        rawData.Hoekwoning_58,
        null,
        getNumber(rawData.Hoekwoning_58),
        'Hoekwoning (Aardgas)',
        'm³'
      ),
      avgGasSemiDetached: createValue(
        rawData.TweeOnderEenKapWoning_59,
        null,
        getNumber(rawData.TweeOnderEenKapWoning_59),
        'Twee Onder Een Kap Woning (Aardgas)',
        'm³'
      ),
      avgGasDetached: createValue(
        rawData.VrijstaandeWoning_60,
        null,
        getNumber(rawData.VrijstaandeWoning_60),
        'Vrijstaande Woning (Aardgas)',
        'm³'
      ),
      avgGasRental: createValue(
        rawData.Huurwoning_61,
        null,
        getNumber(rawData.Huurwoning_61),
        'Huurwoning (Aardgas)',
        'm³'
      ),
      avgGasOwned: createValue(
        rawData.EigenWoning_62,
        null,
        getNumber(rawData.EigenWoning_62),
        'Eigen Woning (Aardgas)',
        'm³'
      ),
      percentageDistrictHeating: createValue(
        rawData.PercentageWoningenMetStadsverwarming_63,
        null,
        getNumber(rawData.PercentageWoningenMetStadsverwarming_63),
        'Percentage Woningen Met Stadsverwarming',
        '%'
      ),

      // Education levels
      educationLow: createValue(
        rawData.OpleidingsniveauLaag_64,
        null,
        getNumber(rawData.OpleidingsniveauLaag_64),
        'Opleidingsniveau Laag',
        'people'
      ),
      educationMedium: createValue(
        rawData.OpleidingsniveauMiddelbaar_65,
        null,
        getNumber(rawData.OpleidingsniveauMiddelbaar_65),
        'Opleidingsniveau Middelbaar',
        'people'
      ),
      educationHigh: createValue(
        rawData.OpleidingsniveauHoog_66,
        null,
        getNumber(rawData.OpleidingsniveauHoog_66),
        'Opleidingsniveau Hoog',
        'people'
      ),

      // Employment
      netLaborParticipation: createValue(
        rawData.Nettoarbeidsparticipatie_67,
        null,
        getNumber(rawData.Nettoarbeidsparticipatie_67),
        'Nettoarbeidsparticipatie',
        '%'
      ),
      percentageEmployees: createValue(
        rawData.PercentageWerknemers_68,
        null,
        getNumber(rawData.PercentageWerknemers_68),
        'Percentage Werknemers',
        '%'
      ),
      percentageSelfEmployed: createValue(
        rawData.PercentageZelfstandigen_69,
        null,
        getNumber(rawData.PercentageZelfstandigen_69),
        'Percentage Zelfstandigen',
        '%'
      ),

      // Income
      totalIncomeRecipients: createValue(
        rawData.PersonenPerSoortUitkeringTotaal_56,
        totalIncomeRecipients,
        null,
        'Aantal Inkomensontvangers',
        'people'
      ),
      avgIncomePerRecipient: createValue(
        rawData.GemiddeldInkomenPerInkomensontvanger_71,
        null,
        getNumber(rawData.GemiddeldInkomenPerInkomensontvanger_71),
        'Gemiddeld Inkomen Per Inkomensontvanger',
        '×1000 EUR'
      ),
      avgIncomePerResident: createValue(
        rawData.GemiddeldInkomenPerInwoner_72,
        null,
        getNumber(rawData.GemiddeldInkomenPerInwoner_72),
        'Gemiddeld Inkomen Per Inwoner',
        '×1000 EUR'
      ),
      bottom40PercentIncome: createValue(
        rawData.k_40PersonenMetLaagsteInkomen_73,
        null,
        getNumber(rawData.k_40PersonenMetLaagsteInkomen_73),
        '40% Personen Met Laagste Inkomen',
        '%'
      ),
      top20PercentIncome: createValue(
        rawData.k_20PersonenMetHoogsteInkomen_74,
        null,
        getNumber(rawData.k_20PersonenMetHoogsteInkomen_74),
        '20% Personen Met Hoogste Inkomen',
        '%'
      ),
      avgStandardizedHouseholdIncome: createValue(
        rawData.GemiddeldGestandaardiseerdInkomenVanHuishouden_75,
        null,
        getNumber(rawData.GemiddeldGestandaardiseerdInkomenVanHuishouden_75),
        'Gemiddeld Gestandaardiseerd Inkomen Van Huishoudens',
        '×1000 EUR'
      ),
      bottom40PercentHouseholds: createValue(
        rawData.k_40HuishoudensMetLaagsteInkomen_76,
        null,
        getNumber(rawData.k_40HuishoudensMetLaagsteInkomen_76),
        '40% Huishoudens Met Laagste Inkomen',
        '%'
      ),
      top20PercentHouseholds: createValue(
        rawData.k_20HuishoudensMetHoogsteInkomen_77,
        null,
        getNumber(rawData.k_20HuishoudensMetHoogsteInkomen_77),
        '20% Huishoudens Met Hoogste Inkomen',
        '%'
      ),
      lowIncomeHouseholds: createValue(
        rawData.HuishoudensMetEenLaagInkomen_78,
        null,
        getNumber(rawData.HuishoudensMetEenLaagInkomen_78),
        'Huishoudens Met Een Laag Inkomen',
        '%'
      ),
      householdsAtSocialMinimum: createValue(
        rawData.HuishoudensOnderOfRondSociaalMinimum_79,
        null,
        getNumber(rawData.HuishoudensOnderOfRondSociaalMinimum_79),
        'Huishoudens Onder Of Rond Sociaal Minimum',
        '%'
      ),
      householdsTo110PercentMinimum: createValue(
        rawData.HuishoudensTot110VanSociaalMinimum_80,
        null,
        getNumber(rawData.HuishoudensTot110VanSociaalMinimum_80),
        'Huishoudens Tot 110% Van Sociaal Minimum',
        '%'
      ),
      householdsTo120PercentMinimum: createValue(
        rawData.HuishoudensTot120VanSociaalMinimum_81,
        null,
        getNumber(rawData.HuishoudensTot120VanSociaalMinimum_81),
        'Huishoudens Tot 120% Van Sociaal Minimum',
        '%'
      ),
      medianHouseholdWealth: createValue(
        rawData.MediaanVermogenVanParticuliereHuishoudens_82,
        null,
        getNumber(rawData.MediaanVermogenVanParticuliereHuishoudens_82),
        'Mediaan Vermogen Van Particuliere Huishoudens',
        '×1000 EUR'
      ),

      // Social benefits
      socialAssistance: createValue(
        rawData.PersonenPerSoortUitkeringBijstand_57,
        getNumber(rawData.PersonenPerSoortUitkeringBijstand_57),
        calcRelative(getNumber(rawData.PersonenPerSoortUitkeringBijstand_57), totalIncomeRecipients),
        'Personen Per Soort Uitkering Bijstand',
        'people'
      ),
      disabilityBenefits: createValue(
        rawData.PersonenPerSoortUitkeringAO_58,
        getNumber(rawData.PersonenPerSoortUitkeringAO_58),
        calcRelative(getNumber(rawData.PersonenPerSoortUitkeringAO_58), totalIncomeRecipients),
        'Personen Per Soort Uitkering AO',
        'people'
      ),
      unemploymentBenefits: createValue(
        rawData.PersonenPerSoortUitkeringWW_59,
        getNumber(rawData.PersonenPerSoortUitkeringWW_59),
        calcRelative(getNumber(rawData.PersonenPerSoortUitkeringWW_59), totalIncomeRecipients),
        'Personen Per Soort Uitkering WW',
        'people'
      ),
      pensionBenefits: createValue(
        rawData.PersonenPerSoortUitkeringAOW_60,
        getNumber(rawData.PersonenPerSoortUitkeringAOW_60),
        calcRelative(getNumber(rawData.PersonenPerSoortUitkeringAOW_60), totalIncomeRecipients),
        'Personen Per Soort Uitkering AOW',
        'people'
      ),
      youthCareRecipients: createValue(
        rawData.JongerenMetJeugdzorgInNatura_83,
        getNumber(rawData.JongerenMetJeugdzorgInNatura_83),
        calcRelative(getNumber(rawData.JongerenMetJeugdzorgInNatura_83), totalIncomeRecipients),
        'Jongeren Met Jeugdzorg In Natura',
        'people'
      ),
      percentageYouthCare: createValue(
        rawData.PercentageJongerenMetJeugdzorg_84,
        null,
        getNumber(rawData.PercentageJongerenMetJeugdzorg_84),
        'Percentage Jongeren Met Jeugdzorg',
        '%'
      ),
      wmoClients: createValue(
        rawData.WmoClienten_85,
        getNumber(rawData.WmoClienten_85),
        null,
        'Wmo Clienten',
        'people'
      ),
      wmoClientsRelative: createValue(
        rawData.WmoClientenRelatief_86,
        null,
        getNumber(rawData.WmoClientenRelatief_86),
        'Wmo Clienten Relatief',
        'per 1000'
      ),

      // Business establishments
      totalBusinesses: createValue(
        rawData.BedrijfsvestigingenTotaal_69,
        totalBusinesses,
        null,
        'Bedrijfsvestigingen Totaal',
        'businesses'
      ),
      agricultureForestryFishing: createValue(
        rawData.ALandbouwBosbouwEnVisserij_70,
        getNumber(rawData.ALandbouwBosbouwEnVisserij_70),
        calcRelative(getNumber(rawData.ALandbouwBosbouwEnVisserij_70), totalBusinesses),
        'A - Landbouw, Bosbouw En Visserij',
        'businesses'
      ),
      industryEnergy: createValue(
        rawData.BFNijverheidEnEnergie_71,
        getNumber(rawData.BFNijverheidEnEnergie_71),
        calcRelative(getNumber(rawData.BFNijverheidEnEnergie_71), totalBusinesses),
        'B-F - Nijverheid En Energie',
        'businesses'
      ),
      tradeHospitality: createValue(
        rawData.GIHandelEnHoreca_72,
        getNumber(rawData.GIHandelEnHoreca_72),
        calcRelative(getNumber(rawData.GIHandelEnHoreca_72), totalBusinesses),
        'G-I - Handel En Horeca',
        'businesses'
      ),
      transportInfoComm: createValue(
        rawData.HJVervoerInformatieEnCommunicatie_73,
        getNumber(rawData.HJVervoerInformatieEnCommunicatie_73),
        calcRelative(getNumber(rawData.HJVervoerInformatieEnCommunicatie_73), totalBusinesses),
        'H-J - Vervoer, Informatie En Communicatie',
        'businesses'
      ),
      financialRealEstate: createValue(
        rawData.KLFinancieleDienstenOnroerendGoed_74,
        getNumber(rawData.KLFinancieleDienstenOnroerendGoed_74),
        calcRelative(getNumber(rawData.KLFinancieleDienstenOnroerendGoed_74), totalBusinesses),
        'K-L - Financiele Diensten, Onroerend Goed',
        'businesses'
      ),
      businessServices: createValue(
        rawData.MNZakelijkeDienstverlening_75,
        getNumber(rawData.MNZakelijkeDienstverlening_75),
        calcRelative(getNumber(rawData.MNZakelijkeDienstverlening_75), totalBusinesses),
        'M-N - Zakelijke Dienstverlening',
        'businesses'
      ),
      cultureRecreationOther: createValue(
        rawData.RUCultuurRecreatieOverigeDiensten_76,
        getNumber(rawData.RUCultuurRecreatieOverigeDiensten_76),
        calcRelative(getNumber(rawData.RUCultuurRecreatieOverigeDiensten_76), totalBusinesses),
        'R-U - Cultuur, Recreatie, Overige Diensten',
        'businesses'
      ),

      // Vehicles
      totalCars: createValue(
        rawData.PersonenautoTotaal_76,
        totalCars,
        null,
        'Personenautos Totaal',
        'vehicles'
      ),
      carsPetrol: createValue(
        rawData.PersonenautosBrandstofBenzine_77,
        getNumber(rawData.PersonenautosBrandstofBenzine_77),
        calcRelative(getNumber(rawData.PersonenautosBrandstofBenzine_77), totalCars),
        'Personenautos Brandstof Benzine',
        'vehicles'
      ),
      carsOtherFuel: createValue(
        rawData.PersonenautosOverigeBrandstof_78,
        getNumber(rawData.PersonenautosOverigeBrandstof_78),
        calcRelative(getNumber(rawData.PersonenautosOverigeBrandstof_78), totalCars),
        'Personenautos Overige Brandstof',
        'vehicles'
      ),
      carsPerHousehold: createValue(
        rawData.PersonenautosPerHuishouden_79,
        null,
        getNumber(rawData.PersonenautosPerHuishouden_79),
        'Personenautos Per Huishouden',
        'vehicles'
      ),
      carsPerArea: createValue(
        rawData.PersonenautosNaarOppervlakte_80,
        getNumber(rawData.PersonenautosNaarOppervlakte_80),
        null,
        'Personenautos Naar Oppervlakte',
        'per km²'
      ),
      motorcycles: createValue(
        rawData.Motorfietsen_81,
        getNumber(rawData.Motorfietsen_81),
        null,
        'Motorfietsen',
        'vehicles'
      ),

      // Proximity to amenities
      distanceToGP: createValue(
        rawData.AfstandTotHuisartsenpraktijk_82,
        getNumber(rawData.AfstandTotHuisartsenpraktijk_82),
        null,
        'Afstand Tot Huisartsenpraktijk',
        'km'
      ),
      distanceToSupermarket: createValue(
        rawData.AfstandTotGroteSupermarkt_83,
        getNumber(rawData.AfstandTotGroteSupermarkt_83),
        null,
        'Afstand Tot Grote Supermarkt',
        'km'
      ),
      distanceToDaycare: createValue(
        rawData.AfstandTotKinderdagverblijf_84,
        getNumber(rawData.AfstandTotKinderdagverblijf_84),
        null,
        'Afstand Tot Kinderdagverblijf',
        'km'
      ),
      distanceToSchool: createValue(
        rawData.AfstandTotSchool_85,
        getNumber(rawData.AfstandTotSchool_85),
        null,
        'Afstand Tot School',
        'km'
      ),
      schoolsWithin3km: createValue(
        rawData.ScholenBinnen3Km_86,
        getNumber(rawData.ScholenBinnen3Km_86),
        null,
        'Scholen Binnen 3 Km',
        'schools'
      ),

      // Area
      totalArea: createValue(
        rawData.OppervlakteTotaal_87,
        getNumber(rawData.OppervlakteTotaal_87),
        null,
        'Oppervlakte Totaal',
        'ha'
      ),
      landArea: createValue(
        rawData.OppervlakteLand_88,
        getNumber(rawData.OppervlakteLand_88),
        null,
        'Oppervlakte Land',
        'ha'
      ),
      waterArea: createValue(
        rawData.OppervlakteWater_89,
        getNumber(rawData.OppervlakteWater_89),
        null,
        'Oppervlakte Water',
        'ha'
      ),
      urbanDensity: createValue(
        rawData.MateVanStedelijkheid_93,
        getNumber(rawData.MateVanStedelijkheid_93),
        null,
        'Mate Van Stedelijkheid',
        'score'
      ),
      addressDensity: createValue(
        rawData.Omgevingsadressendichtheid_94,
        getNumber(rawData.Omgevingsadressendichtheid_94),
        null,
        'Omgevingsadressendichtheid',
        'per km²'
      ),
    };
  }
}
