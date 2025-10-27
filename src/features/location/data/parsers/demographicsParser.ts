/**
 * CBS Demographics Data Parser
 *
 * Transforms raw CBS Demographics API data into structured format with both
 * absolute and relative values according to the specified mapping.
 */

import type { DataParser, ParsedDataset, ParsedValue } from './types';
import { getReadableKey } from '../normalizers/demographicsKeyNormalizer';

export class DemographicsParser implements DataParser {
  /**
   * Parse raw demographics data
   */
  parse(rawData: Record<string, unknown>): ParsedDataset {
    const indicators = new Map<string, ParsedValue>();

    // Helper to safely get numeric value
    const getNumber = (key: string): number | null => {
      const value = rawData[key];
      if (value === null || value === undefined || value === '.') return null;
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(num) ? null : num;
    };

    // Base values needed for calculations
    const aantalInwoners = getNumber('AantalInwoners_5') || 0;
    const huishoudensTotaal = getNumber('HuishoudensTotaal_28') || 0;
    const personenautosTotaal = getNumber('PersonenautoSTotaal_99') || 0;
    const bedrijfsvestigingenTotaal = getNumber('BedrijfsvestigingenTotaal_91') || 0;
    const aantalInkomensontvangers = getNumber('AantalInkomensontvangers_70') || 0;
    const westersTotaal = getNumber('WestersTotaal_17') || 0;
    const nietWestersTotaal = getNumber('NietWestersTotaal_18') || 0;

    // Process each field according to the mapping
    const mappings: Array<{
      key: string;
      title: string;
      getAbsolute: () => number | null;
      getRelative: () => number | null;
      unit?: string;
    }> = [
      // Basic info (no calculations)
      { key: 'Gemeentenaam_1', title: 'Gemeentenaam', getAbsolute: () => null, getRelative: () => null },
      { key: 'SoortRegio_2', title: 'Soort Regio', getAbsolute: () => null, getRelative: () => null },
      { key: 'Codering_3', title: 'Codering', getAbsolute: () => null, getRelative: () => null },
      { key: 'IndelingswijzigingWijkenEnBuurten_4', title: 'Indelingswijziging Wijken En Buurten', getAbsolute: () => null, getRelative: () => null },

      // Population
      {
        key: 'AantalInwoners_5',
        title: 'Aantal Inwoners',
        getAbsolute: () => getNumber('AantalInwoners_5'),
        getRelative: () => null
      },

      // Gender
      {
        key: 'Mannen_6',
        title: 'Mannen',
        getAbsolute: () => getNumber('Mannen_6'),
        getRelative: () => {
          const val = getNumber('Mannen_6');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Vrouwen_7',
        title: 'Vrouwen',
        getAbsolute: () => getNumber('Vrouwen_7'),
        getRelative: () => {
          const val = getNumber('Vrouwen_7');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },

      // Age groups
      {
        key: 'k_0Tot15Jaar_8',
        title: '0 Tot 15 Jaar',
        getAbsolute: () => getNumber('k_0Tot15Jaar_8'),
        getRelative: () => {
          const val = getNumber('k_0Tot15Jaar_8');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'k_15Tot25Jaar_9',
        title: '15 Tot 25 Jaar',
        getAbsolute: () => getNumber('k_15Tot25Jaar_9'),
        getRelative: () => {
          const val = getNumber('k_15Tot25Jaar_9');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'k_25Tot45Jaar_10',
        title: '25 Tot 45 Jaar',
        getAbsolute: () => getNumber('k_25Tot45Jaar_10'),
        getRelative: () => {
          const val = getNumber('k_25Tot45Jaar_10');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'k_45Tot65Jaar_11',
        title: '45 Tot 65 Jaar',
        getAbsolute: () => getNumber('k_45Tot65Jaar_11'),
        getRelative: () => {
          const val = getNumber('k_45Tot65Jaar_11');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'k_65JaarOfOuder_12',
        title: '65 Jaar Of Ouder',
        getAbsolute: () => getNumber('k_65JaarOfOuder_12'),
        getRelative: () => {
          const val = getNumber('k_65JaarOfOuder_12');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },

      // Marital status
      {
        key: 'Ongehuwd_13',
        title: 'Ongehuwd',
        getAbsolute: () => getNumber('Ongehuwd_13'),
        getRelative: () => {
          const val = getNumber('Ongehuwd_13');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Gehuwd_14',
        title: 'Gehuwd',
        getAbsolute: () => getNumber('Gehuwd_14'),
        getRelative: () => {
          const val = getNumber('Gehuwd_14');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Gescheiden_15',
        title: 'Gescheiden',
        getAbsolute: () => getNumber('Gescheiden_15'),
        getRelative: () => {
          const val = getNumber('Gescheiden_15');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Verweduwd_16',
        title: 'Verweduwd',
        getAbsolute: () => getNumber('Verweduwd_16'),
        getRelative: () => {
          const val = getNumber('Verweduwd_16');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },

      // Migration background - calculated Autochtoon
      {
        key: 'Autochtoon',
        title: 'Autochtoon',
        getAbsolute: () => {
          if (aantalInwoners && westersTotaal !== null && nietWestersTotaal !== null) {
            return aantalInwoners - westersTotaal - nietWestersTotaal;
          }
          return null;
        },
        getRelative: () => {
          if (aantalInwoners && westersTotaal !== null && nietWestersTotaal !== null) {
            const autochtoon = aantalInwoners - westersTotaal - nietWestersTotaal;
            return (autochtoon / aantalInwoners * 100);
          }
          return null;
        },
        unit: '%'
      },
      {
        key: 'WestersTotaal_17',
        title: 'Westers Totaal',
        getAbsolute: () => getNumber('WestersTotaal_17'),
        getRelative: () => {
          const val = getNumber('WestersTotaal_17');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'NietWestersTotaal_18',
        title: 'Niet Westers Totaal',
        getAbsolute: () => getNumber('NietWestersTotaal_18'),
        getRelative: () => {
          const val = getNumber('NietWestersTotaal_18');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Marokko_19',
        title: 'Marokko',
        getAbsolute: () => getNumber('Marokko_19'),
        getRelative: () => {
          const val = getNumber('Marokko_19');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'NederlandseAntillenEnAruba_20',
        title: 'Nederlandse Antillen En Aruba',
        getAbsolute: () => getNumber('NederlandseAntillenEnAruba_20'),
        getRelative: () => {
          const val = getNumber('NederlandseAntillenEnAruba_20');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Suriname_21',
        title: 'Suriname',
        getAbsolute: () => getNumber('Suriname_21'),
        getRelative: () => {
          const val = getNumber('Suriname_21');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'Turkije_22',
        title: 'Turkije',
        getAbsolute: () => getNumber('Turkije_22'),
        getRelative: () => {
          const val = getNumber('Turkije_22');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'OverigNietWesters_23',
        title: 'Overig Niet Westers',
        getAbsolute: () => getNumber('OverigNietWesters_23'),
        getRelative: () => {
          const val = getNumber('OverigNietWesters_23');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },

      // Birth and death
      {
        key: 'GeboorteTotaal_24',
        title: 'Geboorte Totaal',
        getAbsolute: () => getNumber('GeboorteTotaal_24'),
        getRelative: () => {
          const val = getNumber('GeboorteTotaal_24');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'GeboorteRelatief_25',
        title: 'Geboorte Relatief',
        getAbsolute: () => getNumber('GeboorteRelatief_25'),
        getRelative: () => {
          const val = getNumber('GeboorteRelatief_25');
          return val && aantalInwoners ? (val / aantalInwoners * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'SterfteTotaal_26',
        title: 'Sterfte Totaal',
        getAbsolute: () => getNumber('SterfteTotaal_26'),
        getRelative: () => null
      },
      {
        key: 'SterfteRelatief_27',
        title: 'Sterfte Relatief',
        getAbsolute: () => getNumber('SterfteRelatief_27'),
        getRelative: () => null
      },

      // Households
      {
        key: 'HuishoudensTotaal_28',
        title: 'Huishoudens Totaal',
        getAbsolute: () => getNumber('HuishoudensTotaal_28'),
        getRelative: () => null
      },
      {
        key: 'Eenpersoonshuishoudens_29',
        title: 'Eenpersoonshuishoudens',
        getAbsolute: () => getNumber('Eenpersoonshuishoudens_29'),
        getRelative: () => {
          const val = getNumber('Eenpersoonshuishoudens_29');
          return val && huishoudensTotaal ? (val / huishoudensTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'HuishoudensZonderKinderen_30',
        title: 'Huishoudens Zonder Kinderen',
        getAbsolute: () => getNumber('HuishoudensZonderKinderen_30'),
        getRelative: () => {
          const val = getNumber('HuishoudensZonderKinderen_30');
          return val && huishoudensTotaal ? (val / huishoudensTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'HuishoudensMetKinderen_31',
        title: 'Huishoudens Met Kinderen',
        getAbsolute: () => getNumber('HuishoudensMetKinderen_31'),
        getRelative: () => {
          const val = getNumber('HuishoudensMetKinderen_31');
          return val && huishoudensTotaal ? (val / huishoudensTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'GemiddeldeHuishoudensgrootte_32',
        title: 'Gemiddelde Huishoudensgrootte',
        getAbsolute: () => getNumber('GemiddeldeHuishoudensgrootte_32'),
        getRelative: () => null
      },

      // Housing
      {
        key: 'Bevolkingsdichtheid_33',
        title: 'Bevolkingsdichtheid',
        getAbsolute: () => getNumber('Bevolkingsdichtheid_33'),
        getRelative: () => null
      },
      {
        key: 'Woningvoorraad_34',
        title: 'Woningvoorraad',
        getAbsolute: () => getNumber('Woningvoorraad_34'),
        getRelative: () => null
      },
      {
        key: 'GemiddeldeWOZWaardeVanWoningen_35',
        title: 'Gemiddelde WOZ Waarde Van Woningen',
        getAbsolute: () => getNumber('GemiddeldeWOZWaardeVanWoningen_35'),
        getRelative: () => null,
        unit: 'x1000'
      },
      {
        key: 'PercentageEengezinswoning_36',
        title: 'Percentage Eengezinswoning',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageEengezinswoning_36'),
        unit: '%'
      },
      {
        key: 'PercentageMeergezinswoning_37',
        title: 'Percentage Meergezinswoning',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageMeergezinswoning_37'),
        unit: '%'
      },
      {
        key: 'PercentageBewoond_38',
        title: 'Percentage Bewoond',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageBewoond_38'),
        unit: '%'
      },
      {
        key: 'PercentageOnbewoond_39',
        title: 'Percentage Onbewoond',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageOnbewoond_39'),
        unit: '%'
      },
      {
        key: 'Koopwoningen_40',
        title: 'Koopwoningen',
        getAbsolute: () => null,
        getRelative: () => getNumber('Koopwoningen_40'),
        unit: '%'
      },
      {
        key: 'HuurwoningenTotaal_41',
        title: 'Huurwoningen Totaal',
        getAbsolute: () => null,
        getRelative: () => getNumber('HuurwoningenTotaal_41'),
        unit: '%'
      },
      {
        key: 'InBezitWoningcorporatie_42',
        title: 'In Bezit Woningcorporatie',
        getAbsolute: () => null,
        getRelative: () => getNumber('InBezitWoningcorporatie_42'),
        unit: '%'
      },
      {
        key: 'InBezitOverigeVerhuurders_43',
        title: 'In Bezit Overige Verhuurders',
        getAbsolute: () => null,
        getRelative: () => getNumber('InBezitOverigeVerhuurders_43'),
        unit: '%'
      },
      {
        key: 'EigendomOnbekend_44',
        title: 'Eigendom Onbekend',
        getAbsolute: () => null,
        getRelative: () => getNumber('EigendomOnbekend_44'),
        unit: '%'
      },
      {
        key: 'BouwjaarVoor2000_45',
        title: 'Bouwjaar Voor 2000',
        getAbsolute: () => null,
        getRelative: () => getNumber('BouwjaarVoor2000_45'),
        unit: '%'
      },
      {
        key: 'BouwjaarVanaf2000_46',
        title: 'Bouwjaar Vanaf 2000',
        getAbsolute: () => null,
        getRelative: () => getNumber('BouwjaarVanaf2000_46'),
        unit: '%'
      },

      // Energy consumption
      {
        key: 'GemiddeldElektriciteitsverbruikTotaal_47',
        title: 'Gemiddeld Elektriciteitsverbruik Totaal',
        getAbsolute: () => null,
        getRelative: () => getNumber('GemiddeldElektriciteitsverbruikTotaal_47'),
        unit: 'kWh'
      },
      {
        key: 'Appartement_48',
        title: 'Appartement (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Appartement_48'),
        unit: 'kWh'
      },
      {
        key: 'Tussenwoning_49',
        title: 'Tussenwoning (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Tussenwoning_49'),
        unit: 'kWh'
      },
      {
        key: 'Hoekwoning_50',
        title: 'Hoekwoning (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Hoekwoning_50'),
        unit: 'kWh'
      },
      {
        key: 'TweeOnderEenKapWoning_51',
        title: 'Twee Onder Een Kap Woning (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('TweeOnderEenKapWoning_51'),
        unit: 'kWh'
      },
      {
        key: 'VrijstaandeWoning_52',
        title: 'Vrijstaande Woning (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('VrijstaandeWoning_52'),
        unit: 'kWh'
      },
      {
        key: 'Huurwoning_53',
        title: 'Huurwoning (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Huurwoning_53'),
        unit: 'kWh'
      },
      {
        key: 'EigenWoning_54',
        title: 'Eigen Woning (Elektriciteit)',
        getAbsolute: () => null,
        getRelative: () => getNumber('EigenWoning_54'),
        unit: 'kWh'
      },
      {
        key: 'GemiddeldAardgasverbruikTotaal_55',
        title: 'Gemiddeld Aardgasverbruik Totaal',
        getAbsolute: () => null,
        getRelative: () => getNumber('GemiddeldAardgasverbruikTotaal_55'),
        unit: 'm³'
      },
      {
        key: 'Appartement_56',
        title: 'Appartement (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Appartement_56'),
        unit: 'm³'
      },
      {
        key: 'Tussenwoning_57',
        title: 'Tussenwoning (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Tussenwoning_57'),
        unit: 'm³'
      },
      {
        key: 'Hoekwoning_58',
        title: 'Hoekwoning (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Hoekwoning_58'),
        unit: 'm³'
      },
      {
        key: 'TweeOnderEenKapWoning_59',
        title: 'Twee Onder Een Kap Woning (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('TweeOnderEenKapWoning_59'),
        unit: 'm³'
      },
      {
        key: 'VrijstaandeWoning_60',
        title: 'Vrijstaande Woning (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('VrijstaandeWoning_60'),
        unit: 'm³'
      },
      {
        key: 'Huurwoning_61',
        title: 'Huurwoning (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('Huurwoning_61'),
        unit: 'm³'
      },
      {
        key: 'EigenWoning_62',
        title: 'Eigen Woning (Aardgas)',
        getAbsolute: () => null,
        getRelative: () => getNumber('EigenWoning_62'),
        unit: 'm³'
      },
      {
        key: 'PercentageWoningenMetStadsverwarming_63',
        title: 'Percentage Woningen Met Stadsverwarming',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageWoningenMetStadsverwarming_63'),
        unit: '%'
      },

      // Education
      {
        key: 'OpleidingsniveauLaag_64',
        title: 'Opleidingsniveau Laag',
        getAbsolute: () => null,
        getRelative: () => getNumber('OpleidingsniveauLaag_64')
      },
      {
        key: 'OpleidingsniveauMiddelbaar_65',
        title: 'Opleidingsniveau Middelbaar',
        getAbsolute: () => null,
        getRelative: () => getNumber('OpleidingsniveauMiddelbaar_65')
      },
      {
        key: 'OpleidingsniveauHoog_66',
        title: 'Opleidingsniveau Hoog',
        getAbsolute: () => null,
        getRelative: () => getNumber('OpleidingsniveauHoog_66')
      },

      // Employment
      {
        key: 'Nettoarbeidsparticipatie_67',
        title: 'Nettoarbeidsparticipatie',
        getAbsolute: () => null,
        getRelative: () => getNumber('Nettoarbeidsparticipatie_67'),
        unit: '%'
      },
      {
        key: 'PercentageWerknemers_68',
        title: 'Percentage Werknemers',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageWerknemers_68'),
        unit: '%'
      },
      {
        key: 'PercentageZelfstandigen_69',
        title: 'Percentage Zelfstandigen',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageZelfstandigen_69'),
        unit: '%'
      },

      // Income
      {
        key: 'AantalInkomensontvangers_70',
        title: 'Aantal Inkomensontvangers',
        getAbsolute: () => getNumber('AantalInkomensontvangers_70'),
        getRelative: () => null
      },
      {
        key: 'GemiddeldInkomenPerInkomensontvanger_71',
        title: 'Gemiddeld Inkomen Per Inkomensontvanger',
        getAbsolute: () => null,
        getRelative: () => getNumber('GemiddeldInkomenPerInkomensontvanger_71'),
        unit: 'x1000'
      },
      {
        key: 'GemiddeldInkomenPerInwoner_72',
        title: 'Gemiddeld Inkomen Per Inwoner',
        getAbsolute: () => null,
        getRelative: () => getNumber('GemiddeldInkomenPerInwoner_72'),
        unit: 'x1000'
      },
      {
        key: 'k_40PersonenMetLaagsteInkomen_73',
        title: '40% Personen Met Laagste Inkomen',
        getAbsolute: () => null,
        getRelative: () => getNumber('k_40PersonenMetLaagsteInkomen_73'),
        unit: '%'
      },
      {
        key: 'k_20PersonenMetHoogsteInkomen_74',
        title: '20% Personen Met Hoogste Inkomen',
        getAbsolute: () => null,
        getRelative: () => getNumber('k_20PersonenMetHoogsteInkomen_74'),
        unit: '%'
      },
      {
        key: 'GemGestandaardiseerdInkomenVanHuish_75',
        title: 'Gemiddeld Gestandaardiseerd Inkomen Van Huishoudens',
        getAbsolute: () => null,
        getRelative: () => getNumber('GemGestandaardiseerdInkomenVanHuish_75'),
        unit: 'x1000'
      },
      {
        key: 'k_40HuishoudensMetLaagsteInkomen_76',
        title: '40% Huishoudens Met Laagste Inkomen',
        getAbsolute: () => null,
        getRelative: () => getNumber('k_40HuishoudensMetLaagsteInkomen_76'),
        unit: '%'
      },
      {
        key: 'k_20HuishoudensMetHoogsteInkomen_77',
        title: '20% Huishoudens Met Hoogste Inkomen',
        getAbsolute: () => null,
        getRelative: () => getNumber('k_20HuishoudensMetHoogsteInkomen_77'),
        unit: '%'
      },
      {
        key: 'HuishoudensMetEenLaagInkomen_78',
        title: 'Huishoudens Met Een Laag Inkomen',
        getAbsolute: () => null,
        getRelative: () => getNumber('HuishoudensMetEenLaagInkomen_78'),
        unit: '%'
      },
      {
        key: 'HuishOnderOfRondSociaalMinimum_79',
        title: 'Huishoudens Onder Of Rond Sociaal Minimum',
        getAbsolute: () => null,
        getRelative: () => getNumber('HuishOnderOfRondSociaalMinimum_79'),
        unit: '%'
      },
      {
        key: 'HuishoudensTot110VanSociaalMinimum_80',
        title: 'Huishoudens Tot 110% Van Sociaal Minimum',
        getAbsolute: () => null,
        getRelative: () => getNumber('HuishoudensTot110VanSociaalMinimum_80'),
        unit: '%'
      },
      {
        key: 'HuishoudensTot120VanSociaalMinimum_81',
        title: 'Huishoudens Tot 120% Van Sociaal Minimum',
        getAbsolute: () => null,
        getRelative: () => getNumber('HuishoudensTot120VanSociaalMinimum_81'),
        unit: '%'
      },
      {
        key: 'MediaanVermogenVanParticuliereHuish_82',
        title: 'Mediaan Vermogen Van Particuliere Huishoudens',
        getAbsolute: () => null,
        getRelative: () => getNumber('MediaanVermogenVanParticuliereHuish_82'),
        unit: 'x1000'
      },

      // Benefits
      {
        key: 'PersonenPerSoortUitkeringBijstand_83',
        title: 'Personen Per Soort Uitkering Bijstand',
        getAbsolute: () => getNumber('PersonenPerSoortUitkeringBijstand_83'),
        getRelative: () => {
          const val = getNumber('PersonenPerSoortUitkeringBijstand_83');
          return val && aantalInkomensontvangers ? (val / aantalInkomensontvangers * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'PersonenPerSoortUitkeringAO_84',
        title: 'Personen Per Soort Uitkering AO',
        getAbsolute: () => getNumber('PersonenPerSoortUitkeringAO_84'),
        getRelative: () => {
          const val = getNumber('PersonenPerSoortUitkeringAO_84');
          return val && aantalInkomensontvangers ? (val / aantalInkomensontvangers * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'PersonenPerSoortUitkeringWW_85',
        title: 'Personen Per Soort Uitkering WW',
        getAbsolute: () => getNumber('PersonenPerSoortUitkeringWW_85'),
        getRelative: () => {
          const val = getNumber('PersonenPerSoortUitkeringWW_85');
          return val && aantalInkomensontvangers ? (val / aantalInkomensontvangers * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'PersonenPerSoortUitkeringAOW_86',
        title: 'Personen Per Soort Uitkering AOW',
        getAbsolute: () => getNumber('PersonenPerSoortUitkeringAOW_86'),
        getRelative: () => {
          const val = getNumber('PersonenPerSoortUitkeringAOW_86');
          return val && aantalInkomensontvangers ? (val / aantalInkomensontvangers * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'JongerenMetJeugdzorgInNatura_87',
        title: 'Jongeren Met Jeugdzorg In Natura',
        getAbsolute: () => getNumber('JongerenMetJeugdzorgInNatura_87'),
        getRelative: () => {
          const val = getNumber('JongerenMetJeugdzorgInNatura_87');
          return val && aantalInkomensontvangers ? (val / aantalInkomensontvangers * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'PercentageJongerenMetJeugdzorg_88',
        title: 'Percentage Jongeren Met Jeugdzorg',
        getAbsolute: () => null,
        getRelative: () => getNumber('PercentageJongerenMetJeugdzorg_88'),
        unit: '%'
      },
      {
        key: 'WmoClienten_89',
        title: 'Wmo Clienten',
        getAbsolute: () => getNumber('WmoClienten_89'),
        getRelative: () => null
      },
      {
        key: 'WmoClientenRelatief_90',
        title: 'Wmo Clienten Relatief',
        getAbsolute: () => null,
        getRelative: () => getNumber('WmoClientenRelatief_90'),
        unit: 'per 1000'
      },

      // Business establishments
      {
        key: 'BedrijfsvestigingenTotaal_91',
        title: 'Bedrijfsvestigingen Totaal',
        getAbsolute: () => getNumber('BedrijfsvestigingenTotaal_91'),
        getRelative: () => null
      },
      {
        key: 'ALandbouwBosbouwEnVisserij_92',
        title: 'A - Landbouw, Bosbouw En Visserij',
        getAbsolute: () => getNumber('ALandbouwBosbouwEnVisserij_92'),
        getRelative: () => {
          const val = getNumber('ALandbouwBosbouwEnVisserij_92');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'BFNijverheidEnEnergie_93',
        title: 'B-F - Nijverheid En Energie',
        getAbsolute: () => getNumber('BFNijverheidEnEnergie_93'),
        getRelative: () => {
          const val = getNumber('BFNijverheidEnEnergie_93');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'GIHandelEnHoreca_94',
        title: 'G-I - Handel En Horeca',
        getAbsolute: () => getNumber('GIHandelEnHoreca_94'),
        getRelative: () => {
          const val = getNumber('GIHandelEnHoreca_94');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'HJVervoerInformatieEnCommunicatie_95',
        title: 'H-J - Vervoer, Informatie En Communicatie',
        getAbsolute: () => getNumber('HJVervoerInformatieEnCommunicatie_95'),
        getRelative: () => {
          const val = getNumber('HJVervoerInformatieEnCommunicatie_95');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'KLFinancieleDienstenOnroerendGoed_96',
        title: 'K-L - Financiele Diensten, Onroerend Goed',
        getAbsolute: () => getNumber('KLFinancieleDienstenOnroerendGoed_96'),
        getRelative: () => {
          const val = getNumber('KLFinancieleDienstenOnroerendGoed_96');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'MNZakelijkeDienstverlening_97',
        title: 'M-N - Zakelijke Dienstverlening',
        getAbsolute: () => getNumber('MNZakelijkeDienstverlening_97'),
        getRelative: () => {
          const val = getNumber('MNZakelijkeDienstverlening_97');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'RUCultuurRecreatieOverigeDiensten_98',
        title: 'R-U - Cultuur, Recreatie, Overige Diensten',
        getAbsolute: () => getNumber('RUCultuurRecreatieOverigeDiensten_98'),
        getRelative: () => {
          const val = getNumber('RUCultuurRecreatieOverigeDiensten_98');
          return val && bedrijfsvestigingenTotaal ? (val / bedrijfsvestigingenTotaal * 100) : null;
        },
        unit: '%'
      },

      // Vehicles
      {
        key: 'PersonenautoSTotaal_99',
        title: 'Personenautos Totaal',
        getAbsolute: () => getNumber('PersonenautoSTotaal_99'),
        getRelative: () => null
      },
      {
        key: 'PersonenautoSBrandstofBenzine_100',
        title: 'Personenautos Brandstof Benzine',
        getAbsolute: () => getNumber('PersonenautoSBrandstofBenzine_100'),
        getRelative: () => {
          const val = getNumber('PersonenautoSBrandstofBenzine_100');
          return val && personenautosTotaal ? (val / personenautosTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'PersonenautoSOverigeBrandstof_101',
        title: 'Personenautos Overige Brandstof',
        getAbsolute: () => getNumber('PersonenautoSOverigeBrandstof_101'),
        getRelative: () => {
          const val = getNumber('PersonenautoSOverigeBrandstof_101');
          return val && personenautosTotaal ? (val / personenautosTotaal * 100) : null;
        },
        unit: '%'
      },
      {
        key: 'PersonenautoSPerHuishouden_102',
        title: 'Personenautos Per Huishouden',
        getAbsolute: () => null,
        getRelative: () => getNumber('PersonenautoSPerHuishouden_102')
      },
      {
        key: 'PersonenautoSNaarOppervlakte_103',
        title: 'Personenautos Naar Oppervlakte',
        getAbsolute: () => getNumber('PersonenautoSNaarOppervlakte_103'),
        getRelative: () => null
      },
      {
        key: 'Motorfietsen_104',
        title: 'Motorfietsen',
        getAbsolute: () => getNumber('Motorfietsen_104'),
        getRelative: () => null
      },

      // Distances
      {
        key: 'AfstandTotHuisartsenpraktijk_105',
        title: 'Afstand Tot Huisartsenpraktijk',
        getAbsolute: () => getNumber('AfstandTotHuisartsenpraktijk_105'),
        getRelative: () => null,
        unit: 'km'
      },
      {
        key: 'AfstandTotGroteSupermarkt_106',
        title: 'Afstand Tot Grote Supermarkt',
        getAbsolute: () => getNumber('AfstandTotGroteSupermarkt_106'),
        getRelative: () => null,
        unit: 'km'
      },
      {
        key: 'AfstandTotKinderdagverblijf_107',
        title: 'Afstand Tot Kinderdagverblijf',
        getAbsolute: () => getNumber('AfstandTotKinderdagverblijf_107'),
        getRelative: () => null,
        unit: 'km'
      },
      {
        key: 'AfstandTotSchool_108',
        title: 'Afstand Tot School',
        getAbsolute: () => getNumber('AfstandTotSchool_108'),
        getRelative: () => null,
        unit: 'km'
      },
      {
        key: 'ScholenBinnen3Km_109',
        title: 'Scholen Binnen 3 Km',
        getAbsolute: () => getNumber('ScholenBinnen3Km_109'),
        getRelative: () => null
      },

      // Area
      {
        key: 'OppervlakteTotaal_110',
        title: 'Oppervlakte Totaal',
        getAbsolute: () => getNumber('OppervlakteTotaal_110'),
        getRelative: () => null,
        unit: 'ha'
      },
      {
        key: 'OppervlakteLand_111',
        title: 'Oppervlakte Land',
        getAbsolute: () => getNumber('OppervlakteLand_111'),
        getRelative: () => null,
        unit: 'ha'
      },
      {
        key: 'OppervlakteWater_112',
        title: 'Oppervlakte Water',
        getAbsolute: () => getNumber('OppervlakteWater_112'),
        getRelative: () => null,
        unit: 'ha'
      },

      // Other
      {
        key: 'MeestVoorkomendePostcode_113',
        title: 'Meest Voorkomende Postcode',
        getAbsolute: () => null,
        getRelative: () => null
      },
      {
        key: 'Dekkingspercentage_114',
        title: 'Dekkingspercentage',
        getAbsolute: () => null,
        getRelative: () => null
      },
      {
        key: 'MateVanStedelijkheid_115',
        title: 'Mate Van Stedelijkheid',
        getAbsolute: () => getNumber('MateVanStedelijkheid_115'),
        getRelative: () => null
      },
      {
        key: 'Omgevingsadressendichtheid_116',
        title: 'Omgevingsadressendichtheid',
        getAbsolute: () => getNumber('Omgevingsadressendichtheid_116'),
        getRelative: () => null
      },
    ];

    // Apply all mappings
    for (const mapping of mappings) {
      const originalValue = rawData[mapping.key];
      const absolute = mapping.getAbsolute();
      const relative = mapping.getRelative();

      indicators.set(mapping.key, {
        title: mapping.title,
        originalValue: originalValue as string | number | null,
        absolute,
        relative,
        unit: mapping.unit,
      });
    }

    return {
      indicators,
      metadata: {
        source: 'demographics',
        fetchedAt: new Date(),
      },
    };
  }
}
