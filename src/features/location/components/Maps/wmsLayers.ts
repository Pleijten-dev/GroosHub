/**
 * WMS Layer Configurations
 * Defines available WMS layers from Dutch open data sources (PDOK, RIVM, RCE)
 */

export interface FieldMapping {
  /** Display name for the field */
  displayName: string;
  /** Unit to append to value (e.g., "°C", "%", "dB") */
  unit?: string;
  /** Number of decimal places to round numeric values */
  decimals?: number;
  /** Map raw values to human-readable strings */
  valueMappings?: { [key: string]: string };
}

export interface WMSLayerConfig {
  /** WMS service URL */
  url: string;
  /** WMS layer name(s) */
  layers: string;
  /** Display title */
  title: string;
  /** Layer description */
  description: string;
  /** Attribution text */
  attribution?: string;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Recommended zoom level for optimal viewing */
  recommendedZoom?: number;
  /** Default opacity */
  opacity?: number;
  /** Field name mappings for GetFeatureInfo responses */
  fieldMappings?: {
    [fieldName: string]: FieldMapping;
  };
  /** Amenity category ID for marker-based layers */
  amenityCategoryId?: string;
  /** Marker color for amenity layers */
  markerColor?: string;
  /** Icon for amenity layers */
  icon?: string;
}

export interface WMSCategory {
  name: string;
  layers: Record<string, WMSLayerConfig>;
}

/**
 * Extract base URL and layer name from full WMS GetMap URL
 */
function parseWMSUrl(fullUrl: string): { baseUrl: string; layerName: string } {
  const url = new URL(fullUrl);
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  const layers = url.searchParams.get('LAYERS') || '';
  return { baseUrl, layerName: layers };
}

/**
 * Create WMS layer config from legacy format
 */
function createLayerConfig(
  fullUrl: string,
  title: string,
  description: string,
  minZoom: number = 7,
  maxZoom: number = 18,
  recommendedZoom: number = 14,
  fieldMappings?: { [fieldName: string]: FieldMapping }
): WMSLayerConfig {
  const { baseUrl, layerName } = parseWMSUrl(fullUrl);
  return {
    url: baseUrl,
    layers: layerName,
    title,
    description,
    minZoom,
    maxZoom,
    recommendedZoom,
    opacity: 0.7,
    fieldMappings,
  };
}

/**
 * Create amenity layer config
 */
function createAmenityLayerConfig(
  amenityCategoryId: string,
  title: string,
  description: string,
  color: string,
  icon: string,
  minZoom: number = 12,
  maxZoom: number = 18,
  recommendedZoom: number = 15
): WMSLayerConfig {
  return {
    url: 'amenity://', // Special URL to indicate this is an amenity layer
    layers: amenityCategoryId,
    title,
    description,
    minZoom,
    maxZoom,
    recommendedZoom,
    opacity: 1.0, // Markers are always fully opaque
    amenityCategoryId,
    markerColor: color,
    icon,
  };
}

/**
 * Available WMS layers organized by category
 */
export const WMS_CATEGORIES: Record<string, WMSCategory> = {
  historical: {
    name: 'Historical Maps',
    layers: {
      nl1575_stadsplattegronden: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=NL1575_stadsplattegronden',
        'Nederlandse stadsplattegronden in 1575',
        'Deze kaart toont de 16e-eeuwse stadsplattegronden van cartograaf Jacob van Deventer, gecombineerd met een gereconstrueerde landschapsondergrond en de historische wegenstructuur van Nederland uit 1575, het jaar van Van Deventer\'s overlijden.',
        7,
        18,
        14
      ),
      nl1575_paleogeografie: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=NL1575_paleogeografie',
        'Nederlandse paleogeografie in 1575',
        'Deze kaart toont de 16e-eeuwse stadsplattegronden van cartograaf Jacob van Deventer, gecombineerd met een gereconstrueerde landschapsondergrond en de historische wegenstructuur van Nederland uit 1575.',
        7,
        18,
        14
      ),
      nl1575_routenetwerk: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=NL1575_routenetwerk',
        'Nederlandse routes in 1575',
        'Deze kaart toont de historische wegenstructuur van Nederland uit 1575.',
        7,
        18,
        14
      ),
      nl_1650_landschap: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=nl_1650_landschap',
        'Het Nederlands landschap in 1650',
        'De digitale stadsplattegronden zijn gebaseerd op kaarten van Joan Blaeu, Nicolaas van Geelkercken en anderen uit dezelfde periode. De paleogeografische ondergrond is afgeleid van de Atlas van Nederland in het Holoceen.',
        7,
        18,
        14
      ),
      nl_1650_lscp_detail: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=nl_1650_lscp_detail',
        'Nederland in 1650',
        'Gedetailleerde kaart van Nederland in 1650 met stadsplattegronden gebaseerd op kaarten van Joan Blaeu en anderen.',
        7,
        18,
        14
      ),
      nl_1650_route: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=nl_1650_route',
        'Routes 1650',
        'Historische routes en wegennetwerken in Nederland rond 1650.',
        7,
        18,
        14
      ),
      groeikaart_verstedelijking_nl: createLayerConfig(
        'https://services.rce.geovoorziening.nl/verstedelijking/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=Groeikaart_verstedelijking_NL',
        'Groeikaart verstedelijking',
        'De groeikaart verstedelijking toont de verstedelijkingsgeschiedenis van Nederland vanaf 1200 tot heden. De kaart is gebaseerd op historische kaarten en luchtfoto\'s en geeft inzicht in de ontwikkeling van steden en dorpen, infrastructuur en landschap.',
        7,
        18,
        13
      ),
      rivm_pand_bouwjaar: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20181127_v_pand_bouwjaar',
        'Pand bouwjaar',
        'Deze kaart toont het bouwjaar van panden in Nederland. De data is afkomstig van de Basisregistratie Adressen en Gebouwen (BAG) en is geactualiseerd tot 2018.',
        7,
        18,
        16,
        {
          pandstatus: { displayName: 'Status' },
          bouwjaar: { displayName: 'Bouwjaar' },
        }
      ),
    },
  },
  climate: {
    name: 'Climate & Environment',
    layers: {
      stedelijk_hitte_eiland_effect: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=Stedelijk_hitte_eiland_effect_01062022_v2',
        'Stedelijk hitte eiland effect',
        'Deze kaart toont het stedelijk hitte-eiland effect in Nederland. Het stedelijk hitte-eiland effect is het verschil in temperatuur tussen stedelijk gebied en het omliggende landelijk gebied.',
        7,
        18,
        13,
        {
          GRAY_INDEX: { displayName: 'Temperatuur', decimals: 2, unit: '°C' },
        }
      ),
      rivm_dalingUHImaxmediaan: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_r59_gm_dalingUHImaxmediaan',
        'Dalingskaart UHI',
        'Deze kaart toont de dalingskaart van het Urban Heat Island (UHI) effect in Nederland. Deze kaart laat de daling van het stedelijk hitte eiland effect zien in graden Celsius.',
        7,
        18,
        13,
        {
          GRAY_INDEX: { displayName: 'Temperatuur', decimals: 2, unit: '°C' },
        }
      ),
      verkoelend_effect_groen: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=Verkoelend_effect_van_groen_bevolkingskern_01062022',
        'Verkoelend effect groen',
        'Deze kaart laat zien hoe vegetatie en water de stedelijke temperaturen beïnvloeden, vooral \'s nachts. Het helpt beleidsmakers en stedenbouwkundigen bij klimaatadaptatieplanning.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Temperatuur', decimals: 2, unit: '°C' },
        }
      ),
    },
  },
  airQuality: {
    name: 'Air Quality',
    layers: {
      mgr_tot_2020: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=mgr_tot_2020_07122022',
        'MGR tot 2020',
        'Het RIVM introduceert de MGR-tool, die milieu- en gezondheidsrisico\'s lokaal evalueert. Deze tool faciliteert beslissingen over leefomgevingsmaatregelen door risico\'s op gezondheidseffecten te kwantificeren.',
        7,
        18,
        13,
        {
          GRAY_INDEX: { displayName: 'Milieugezondheidsrisico', decimals: 1, unit: '%' },
        }
      ),
      rivm_nsl_ec2021: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_nsl_20230101_gm_EC2021',
        'NSL EC 2021',
        'Elementair koolstof (roet) in de lucht, gemeten in 2021. Roet is een belangrijk onderdeel van fijn stof en heeft gezondheidseffecten.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Roet concentratie', decimals: 1, unit: 'µg EC/m³' },
        }
      ),
      rivm_nsl_pm25_2021: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_nsl_20230101_gm_PM252021',
        'NSL PM2.5 2021',
        'Fijn stof PM2.5 concentraties in 2021. Deeltjes kleiner dan 2,5 micrometer kunnen diep in de longen doordringen.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Fijn stof concentratie', decimals: 1, unit: 'µg PM2,5/m³' },
        }
      ),
      rivm_nsl_pm10_2021: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_nsl_20230101_gm_PM102021',
        'NSL PM10 2021',
        'Fijn stof PM10 concentraties in 2021. Deeltjes kleiner dan 10 micrometer.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Fijn stof concentratie', decimals: 1, unit: 'µg PM10/m³' },
        }
      ),
      rivm_nsl_no2_2021: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_nsl_20230101_gm_NO22021',
        'NSL NO2 2021',
        'Stikstofdioxide (NO2) concentraties in 2021. NO2 is een belangrijke luchtverontreiniging door verkeer en industrie.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Stikstofdioxide concentratie', decimals: 1, unit: 'µg/m³' },
        }
      ),
    },
  },
  nature: {
    name: 'Nature & Biodiversity',
    layers: {
      bomenkaart_v2: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=20200629_gm_Bomenkaart_v2',
        'Bomenkaart',
        'Deze kaart toont de groene gebieden in Nederland, gemeten per 10x10 meter. Groene omgevingen zijn essentieel voor ontspanning en sociale activiteiten. Donkere kleuren wijzen op dicht beboste gebieden.',
        7,
        18,
        15,
        {
          GRAY_INDEX: { displayName: 'Bomen hoger dan 2,5m', unit: '%' },
        }
      ),
      graskaart_v2: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=20200629_gm_Graskaart_v2',
        'Groenkaart',
        'Grasgebieden en grasvelden in Nederland per 10x10 meter.',
        7,
        18,
        15,
        {
          GRAY_INDEX: { displayName: 'Lage vegetatie lager dan 1m', unit: '%' },
        }
      ),
      struikenkaart_v2: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=20200629_gm_Struikenkaart_v2',
        'Struikenkaart',
        'Struikgewas en heesters in Nederland per 10x10 meter.',
        7,
        18,
        15,
        {
          GRAY_INDEX: { displayName: 'Struiken lager dan 2,5m', unit: '%' },
        }
      ),
      koolstof_opslag_biomassa: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=Actuele_koolstof_opslag_biomassa_01062022',
        'Koolstof opslag biomassa',
        'De kaart visualiseert koolstofopslag in houtige biomassa per hectare, jaarlijks. De opslag is berekend op basis van jaarlijkse biomassa-groei, boomsoort-specifieke data en locatiegeschiktheid voor bosgroei.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Koolstofopslag door bomen', decimals: 3, unit: 'ton C/dam²/jaar' },
        }
      ),
      teeb_afvang_pm10: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=TEEB_Afvang_van_PM10_door_groen_01062022',
        'Afvang PM10 TEEB',
        'Groen en water verhogen de levenskwaliteit in steden. De TEEB Stadtool berekent de maatschappelijke waarde van stedelijk groen en water.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Afvang fijnstof door vegetatie', decimals: 3, unit: 'ton PM10/dam²/jaar' },
        }
      ),
      rivm_percbomenbuurt: createLayerConfig(
        'https://data.rivm.nl/geo/ank/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20190326_percbomenbuurt',
        'Bomen in de buurt',
        'Deze kaart toont het percentage bomen in een buurt in Nederland. Bomen zijn essentieel voor een gezonde leefomgeving en dragen bij aan de biodiversiteit en het welzijn van mens en dier.',
        7,
        18,
        14,
        {
          opp: { displayName: 'Oppervlakte', unit: 'm²' },
          Perc_bomen: { displayName: 'Percentage bomen', unit: '%' },
        }
      ),
    },
  },
  noise: {
    name: 'Noise Pollution',
    layers: {
      rivm_geluidkaart_lden_alle_bronnen: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20210201_g_geluidkaart_lden_alle_bronnen_v3',
        'Geluid alle bronnen',
        'Geluid beïnvloedt onze leefomgeving. Het RIVM onderzoekt en monitort geluidsniveaus en hun gezondheidseffecten in Nederland.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Geluid', unit: 'dB' },
        }
      ),
      rivm_geluid_lden_wegverkeer_2020: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20220601_Geluid_lden_wegverkeer_2020',
        'Geluid wegverkeer 2020',
        'Geluidsbelasting door wegverkeer, gemeten als Lden (day-evening-night level).',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Geluid', unit: 'dB' },
        }
      ),
      rivm_geluid_lnight_wegverkeer_2020: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20220601_Geluid_lnight_wegverkeer_2020',
        'Geluid wegverkeer nacht 2020',
        'Geluidsbelasting door wegverkeer tijdens de nacht (Lnight).',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Geluid', unit: 'dB' },
        }
      ),
      rivm_geluid_lden_treinverkeer_2020: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20220601_Geluid_lden_treinverkeer_2020',
        'Geluid treinverkeer 2020',
        'Geluidsbelasting door treinverkeer.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Geluid', unit: 'dB' },
        }
      ),
      rivm_geluid_lden_industrie_2008: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20220601_Geluid_lden_industrie_2008',
        'Geluid industrie 2008',
        'Geluidsbelasting door industriële bronnen.',
        7,
        18,
        14,
        {
          GRAY_INDEX: { displayName: 'Geluid', unit: 'dB' },
        }
      ),
      geluid_lden_vliegverkeer_2020: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rivm_20220601_Geluid_lden_vliegverkeer_2020',
        'Geluid vliegverkeer 2020',
        'Geluidsbelasting door vliegverkeer.',
        6,
        16,
        14,
        {
          GRAY_INDEX: { displayName: 'Geluid', unit: 'dB' },
        }
      ),
    },
  },
  soil: {
    name: 'Soil & Archeology',
    layers: {
      rce_ikaw3_2008: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rce_ikaw3_2008',
        'IKAW3 2008',
        'De Archeologiekaart van Nederland combineert de Archeologische Monumentenkaart en de Indicatieve Kaart Archeologische Waarden, waarop archeologische terreinen en vindkansniveaus worden weergegeven.',
        7,
        18,
        13,
        {
          PALETTE_INDEX: {
            displayName: 'Trefkans',
            valueMappings: {
              '0': 'Zeer lage trefkans',
              '1': 'Lage trefkans',
              '2': 'Middelhoge trefkans',
              '3': 'Hoge trefkans',
              '4': 'Lage trefkans (water)',
              '6': 'Middelhoge trefkans (water)',
              '7': 'Hoge trefkans (water)',
              '8': 'Water',
              '9': 'Niet gekarteerd',
            },
          },
        }
      ),
    },
  },
  topography: {
    name: 'Topography & Buildings',
    layers: {
      top10nl: createLayerConfig(
        'https://service.pdok.nl/brt/top10nl/wms/v1_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=top10nl',
        'TOP10NL',
        'De TOP10NL is het digitale topografische overzicht van Nederland, regelmatig bijgewerkt door het Kadaster.',
        7,
        18,
        15
      ),
      kadastralekaart: createLayerConfig(
        'https://service.pdok.nl/kadaster/kadastralekaart/wms/v5_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=kadastralekaart',
        'Kadastrale kaart',
        'Het Kadaster registreert rechten op vastgoed in Nederland, onderhoudt openbare registers en het Rijksdriehoeksstelsel.',
        10,
        18,
        16
      ),
      dtm_05m: createLayerConfig(
        'https://service.pdok.nl/rws/ahn/wms/v1_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=dtm_05m',
        'DTM 0.5m',
        'Een DTM (Digital Terrain Model) wordt gemaakt van geclassificeerde maaiveldpunten. Hierbij wordt voor elke 50x50 cm cel een waarde berekend.',
        10,
        18,
        15,
        {
          Value_list: { displayName: 'Hoogte', decimals: 2, unit: 'm' },
        }
      ),
      dsm_05m: createLayerConfig(
        'https://service.pdok.nl/rws/ahn/wms/v1_0?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=dsm_05m',
        'DSM 0.5m',
        'Naast maaiveld-representaties zijn er DSM-bestanden (Digital Surface Model) die alle gegevens behalve water bevatten. Deze bevatten informatie over gebouwen, kunstwerken en meer.',
        10,
        18,
        15,
        {
          Value_list: { displayName: 'Hoogte', decimals: 2, unit: 'm' },
        }
      ),
      vw_rvo_pand_energielabels: createLayerConfig(
        'https://data.rivm.nl/geo/alo/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=vw_rvo_20200101_v_pand_energielabels',
        'Energielabels pand',
        'Een energielabel toont de energie-efficiëntie van woningen. Eigenaren moeten dit label verstrekken bij verkoop, verhuur of nieuwbouw.',
        7,
        18,
        16,
        {
          Label_nieuw: { displayName: 'Label' },
          minimum: { displayName: 'Minimum' },
          maximum: { displayName: 'Maximum' },
        }
      ),
    },
  },
  voorzieningen: {
    name: 'Voorzieningen',
    layers: {
      zorg_primair: createAmenityLayerConfig(
        'zorg_primair',
        'Zorg (Huisarts & Apotheek)',
        'Huisartsen, ziekenhuizen en apotheken in de buurt. Essentiële gezondheidszorg voorzieningen binnen loopafstand.',
        '#dc2626',
        '🏥'
      ),
      zorg_paramedisch: createAmenityLayerConfig(
        'zorg_paramedisch',
        'Zorg (Paramedische voorzieningen)',
        'Fysiotherapie, chiropractors, tandheelkunde en medische laboratoria. Aanvullende gezondheidszorg voorzieningen.',
        '#dc2626',
        '🏥'
      ),
      openbaar_vervoer: createAmenityLayerConfig(
        'openbaar_vervoer',
        'Openbaar vervoer (halte)',
        'Bus-, tram-, metro- en treinstations. Toegang tot openbaar vervoer voor mobiliteit.',
        '#2563eb',
        '🚌'
      ),
      mobiliteit_parkeren: createAmenityLayerConfig(
        'mobiliteit_parkeren',
        'Mobiliteit & Parkeren',
        'Parkeerplaatsen, tankstations en laadpalen voor elektrische voertuigen. Mobiliteitsvoorzieningen.',
        '#7c3aed',
        '🚗'
      ),
      onderwijs_basisschool: createAmenityLayerConfig(
        'onderwijs_basisschool',
        'Onderwijs (Basisschool)',
        'Basisscholen in de buurt. Primair onderwijs voor kinderen van 4-12 jaar.',
        '#059669',
        '🏫'
      ),
      onderwijs_voortgezet: createAmenityLayerConfig(
        'onderwijs_voortgezet',
        'Onderwijs (Voortgezet onderwijs)',
        'Middelbare scholen, HAVO, VWO en MBO instellingen. Voortgezet onderwijs voor jongeren.',
        '#059669',
        '🎓'
      ),
      onderwijs_hoger: createAmenityLayerConfig(
        'onderwijs_hoger',
        'Onderwijs (Hoger onderwijs)',
        'Universiteiten en hogescholen. HBO en WO instellingen voor hoger onderwijs.',
        '#059669',
        '🎓'
      ),
      kinderopvang: createAmenityLayerConfig(
        'kinderopvang',
        'Kinderopvang & Opvang',
        'Kinderdagverblijven, peuterspeelzalen en buitenschoolse opvang (BSO). Kinderopvang voorzieningen.',
        '#db2777',
        '👶'
      ),
      winkels_dagelijks: createAmenityLayerConfig(
        'winkels_dagelijks',
        'Winkels (Dagelijkse boodschappen)',
        'Supermarkten, bakkers en slagers. Winkels voor dagelijkse boodschappen binnen loopafstand.',
        '#16a34a',
        '🛒'
      ),
      winkels_overig: createAmenityLayerConfig(
        'winkels_overig',
        'Winkels (Overige retail)',
        'Kledingwinkels, elektronicawinkels, boekwinkels en winkelcentra. Overige retail voorzieningen.',
        '#16a34a',
        '🛍️'
      ),
      restaurants_budget: createAmenityLayerConfig(
        'restaurants_budget',
        'Budget Restaurants (€)',
        'Goedkope restaurants, fastfood en afhaalzaken. Budget-vriendelijke eetgelegenheden.',
        '#dc2626',
        '🍽️'
      ),
      restaurants_midrange: createAmenityLayerConfig(
        'restaurants_midrange',
        'Mid-range Restaurants (€€€)',
        'Casual dining en family restaurants. Mid-range eetgelegenheden met gevarieerde keukens.',
        '#dc2626',
        '🍽️'
      ),
      restaurants_upscale: createAmenityLayerConfig(
        'restaurants_upscale',
        'Upscale Restaurants (€€€€-€€€€€)',
        'Fine dining, Michelin restaurants en haute cuisine. Luxe en upscale eetgelegenheden.',
        '#dc2626',
        '🍽️'
      ),
      cafes_uitgaan: createAmenityLayerConfig(
        'cafes_uitgaan',
        'Cafés en avond programma',
        'Cafés, bars, kroegen en nachtclubs. Uitgaansgelegenheden voor sociale activiteiten.',
        '#f59e0b',
        '🍺'
      ),
      sport_faciliteiten: createAmenityLayerConfig(
        'sport_faciliteiten',
        'Sport faciliteiten',
        'Sportcomplexen, zwembaden, stadions en sportclubs. Sportfaciliteiten voor recreatie en competitie.',
        '#ea580c',
        '⚽'
      ),
      sportschool: createAmenityLayerConfig(
        'sportschool',
        'Sportschool / Fitnesscentrum',
        'Sportscholen, fitnesscentra en yoga studio\'s. Faciliteiten voor fitness en training.',
        '#ea580c',
        '💪'
      ),
      groen_recreatie: createAmenityLayerConfig(
        'groen_recreatie',
        'Groen & Recreatie',
        'Parken, speeltuinen en recreatiegebieden. Groene ruimtes voor ontspanning en recreatie.',
        '#65a30d',
        '🌳'
      ),
      cultuur_entertainment: createAmenityLayerConfig(
        'cultuur_entertainment',
        'Cultuur & Entertainment',
        'Musea, theaters, bioscopen en bibliotheken. Culturele en entertainment voorzieningen.',
        '#7c3aed',
        '🎨'
      ),
      wellness: createAmenityLayerConfig(
        'wellness',
        'Wellness & Recreatie',
        'Kappers, wellness centra, spa\'s en massagesalons. Wellness en schoonheidszorg voorzieningen.',
        '#f97316',
        '💆'
      ),
      zakelijke_diensten: createAmenityLayerConfig(
        'zakelijke_diensten',
        'Zakelijke Dienstverlening',
        'Banken, accountants, advocaten en makelaars. Zakelijke en financiële diensten.',
        '#374151',
        '💼'
      ),
      nuts_overheid: createAmenityLayerConfig(
        'nuts_overheid',
        'Nutsvoorzieningen & Overheid',
        'Gemeentehuizen en overheidsgebouwen. Publieke diensten en overheidsvoorzieningen.',
        '#6b7280',
        '🏛️'
      ),
    },
  },
};

/**
 * Get all available categories
 */
export function getWMSCategories(): Array<{ id: string; name: string }> {
  return Object.entries(WMS_CATEGORIES).map(([id, category]) => ({
    id,
    name: category.name,
  }));
}

/**
 * Get layers for a specific category
 */
export function getLayersByCategory(categoryId: string): Record<string, WMSLayerConfig> | null {
  const category = WMS_CATEGORIES[categoryId];
  return category ? category.layers : null;
}

/**
 * Get a specific layer configuration
 */
export function getWMSLayer(categoryId: string, layerId: string): WMSLayerConfig | null {
  const category = WMS_CATEGORIES[categoryId];
  return category?.layers[layerId] || null;
}
