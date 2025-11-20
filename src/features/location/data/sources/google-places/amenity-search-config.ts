/**
 * Amenity Search Configuration
 * Dutch amenity categories mapped to Google Places API types
 */

import type {
  AmenityCategory,
  SearchConfig
} from './types';
import { PRICE_LEVELS } from './types';

// Dutch amenity categories mapped to Google Places API types
export const DUTCH_AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    id: 'zorg_primair',
    name: 'zorg_primair',
    displayName: 'Zorg (Huisarts & Apotheek)',
    priority: 'essential',
    searchStrategy: 'both',
    placeTypes: ['doctor', 'hospital', 'pharmacy'],
    keywords: ['huisarts', 'dokter', 'apotheek', 'ziekenhuis'],
    defaultRadius: 1000,
    color: '#dc2626',
    icon: '🏥'
  },
  {
    id: 'zorg_paramedisch',
    name: 'zorg_paramedisch',
    displayName: 'Zorg (Paramedische voorzieningen)',
    priority: 'high',
    searchStrategy: 'both',
    placeTypes: ['physiotherapist', 'chiropractor', 'dental_clinic', 'medical_lab', 'dentist'],
    keywords: ['fysiotherapie', 'chiropractor', 'tandheelkunde', 'medisch laboratorium', 'tandarts'],
    defaultRadius: 1000,
    color: '#dc2626',
    icon: '🏥'
  },
  {
    id: 'openbaar_vervoer',
    name: 'openbaar_vervoer',
    displayName: 'Openbaar vervoer (halte)',
    priority: 'essential',
    searchStrategy: 'both',
    placeTypes: [
      'bus_station', 'light_rail_station', 'subway_station', 'taxi_stand',
      'train_station', 'transit_station', 'airport', 'bus_stop', 'ferry_terminal'
    ],
    keywords: ['bushalte', 'tramhalte', 'metro', 'trein', 'bus'],
    defaultRadius: 500,
    color: '#2563eb',
    icon: '🚌'
  },
  {
    id: 'mobiliteit_parkeren',
    name: 'mobiliteit_parkeren',
    displayName: 'Mobiliteit & Parkeren',
    priority: 'high',
    searchStrategy: 'both',
    placeTypes: [
      'gas_station', 'parking', 'electric_vehicle_charging_station'
    ],
    keywords: ['parkeren', 'garage', 'benzinestation', 'tankstation', 'chargingstation'],
    defaultRadius: 500,
    color: '#7c3aed',
    icon: '🚗'
  },
  {
    id: 'onderwijs_basisschool',
    name: 'onderwijs_basisschool',
    displayName: 'Onderwijs (Basisschool)',
    priority: 'essential',
    searchStrategy: 'both',
    placeTypes: ['primary_school', 'school'],
    keywords: ['basisschool', 'lagere school', 'school'],
    defaultRadius: 1000,
    color: '#059669',
    icon: '🏫'
  },
  {
    id: 'onderwijs_voortgezet',
    name: 'onderwijs_voortgezet',
    displayName: 'Onderwijs (Voortgezet onderwijs)',
    priority: 'high',
    searchStrategy: 'both',
    placeTypes: ['secondary_school', 'school'],
    keywords: ['middelbare school', 'voortgezet onderwijs', 'havo', 'vwo', 'mbo'],
    defaultRadius: 2000,
    color: '#059669',
    icon: '🎓'
  },
  {
    id: 'onderwijs_hoger',
    name: 'onderwijs_hoger',
    displayName: 'Onderwijs (Hoger onderwijs)',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: ['university', 'school'],
    keywords: ['universiteit', 'hogeschool', 'hbo', 'wo'],
    defaultRadius: 3000,
    color: '#059669',
    icon: '🎓'
  },
  {
    id: 'kinderopvang',
    name: 'kinderopvang',
    displayName: 'Kinderopvang & Opvang',
    priority: 'high',
    searchStrategy: 'both',
    placeTypes: ['child_care_agency'],
    keywords: ['kinderopvang', 'kinderdagverblijf', 'peuterspeelzaal', 'naschoolse opvang', 'bso'],
    defaultRadius: 1000,
    color: '#db2777',
    icon: '👶'
  },
  {
    id: 'winkels_dagelijks',
    name: 'winkels_dagelijks',
    displayName: 'Winkels (Dagelijkse boodschappen)',
    priority: 'essential',
    searchStrategy: 'both',
    placeTypes: [
      'supermarket', 'convenience_store', 'liquor_store',
      'bakery', 'butcher_shop'
    ],
    keywords: ['supermarkt', 'boodschappen', 'albert heijn', 'jumbo', 'bakker', 'slager'],
    defaultRadius: 1000,
    color: '#16a34a',
    icon: '🛒'
  },
  {
    id: 'winkels_overig',
    name: 'winkels_overig',
    displayName: 'Winkels (Overige retail)',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: [
      'clothing_store', 'shoe_store', 'furniture_store', 'home_goods_store',
      'electronics_store', 'book_store', 'bicycle_store', 'pet_store',
      'pharmacy', 'florist', 'jewelry_store', 'shopping_mall'
    ],
    keywords: ['winkelcentrum', 'kleding', 'schoenen', 'electronica', 'boekwinkel'],
    defaultRadius: 2000,
    color: '#16a34a',
    icon: '🛍️'
  },

  // Price-filtered restaurant categories (Text Search only)
  {
    id: 'restaurants_budget',
    name: 'restaurants_budget',
    displayName: 'Budget Restaurants (€)',
    priority: 'high',
    searchStrategy: 'text', // Only text search supports price filtering
    placeTypes: [
      'restaurant', 'fast_food_restaurant', 'meal_takeaway', 'food_court',
      'cafeteria', 'sandwich_shop', 'pizza_restaurant', 'hamburger_restaurant',
      'breakfast_restaurant', 'coffee_shop', 'ice_cream_shop'
    ],
    keywords: ['restaurant', 'eten', 'goedkoop eten', 'budget restaurant', 'fastfood', 'snackbar', 'afhaal'],
    defaultRadius: 1000,
    color: '#dc2626',
    icon: '🍽️',
    priceLevels: [PRICE_LEVELS.INEXPENSIVE], // Only inexpensive (2), not including free
    textQuery: 'budget restaurant fast food goedkoop eten takeaway snackbar', // Original budget query
    // Note: Sends priceLevels=[2] to Google API to find budget restaurants
  },
  {
    id: 'restaurants_midrange',
    name: 'restaurants_midrange',
    displayName: 'Mid-range Restaurants (€€€)',
    priority: 'high',
    searchStrategy: 'text', // Only text search supports price filtering
    placeTypes: [
      'restaurant', 'chinese_restaurant', 'italian_restaurant', 'indian_restaurant',
      'thai_restaurant', 'mexican_restaurant', 'mediterranean_restaurant',
      'japanese_restaurant', 'korean_restaurant', 'turkish_restaurant',
      'greek_restaurant', 'spanish_restaurant', 'vietnamese_restaurant',
      'lebanese_restaurant', 'middle_eastern_restaurant'
    ],
    keywords: ['restaurant', 'diner', 'casual dining', 'family restaurant', 'ethnic food'],
    defaultRadius: 1000,
    color: '#dc2626',
    icon: '🍽️',
    priceLevels: [PRICE_LEVELS.MODERATE],
    textQuery: 'restaurant', // Simple generic query to get all restaurants
    // Note: Does NOT send price filter to Google API (gets all restaurants), then post-filters to EXCLUDE budget (1,2) and expensive (4,5)
    // This ensures restaurants without price data in Google Maps are captured and default to mid-range
  },
  {
    id: 'restaurants_upscale',
    name: 'restaurants_upscale',
    displayName: 'Upscale Restaurants (€€€€-€€€€€)',
    priority: 'medium',
    searchStrategy: 'text', // Only text search supports price filtering
    placeTypes: [
      'restaurant', 'fine_dining_restaurant', 'steak_house', 'seafood_restaurant',
      'french_restaurant', 'sushi_restaurant', 'brazilian_restaurant'
    ],
    keywords: ['fine dining', 'upscale restaurant', 'michelin', 'gourmet', 'haute cuisine', 'duur restaurant'],
    defaultRadius: 2000,
    color: '#dc2626',
    icon: '🍽️',
    priceLevels: [PRICE_LEVELS.EXPENSIVE, PRICE_LEVELS.VERY_EXPENSIVE], // Include expensive (4) and very expensive (5)
    textQuery: 'fine dining expensive restaurant upscale gourmet michelin duur', // Upscale-specific query to get different results from Google
    // Note: Sends priceLevels=[4,5] to Google API to find upscale restaurants, uses upscale-focused keywords for better targeting
  },

  {
    id: 'cafes_uitgaan',
    name: 'cafes_uitgaan',
    displayName: 'Cafés en avond programma',
    priority: 'low',
    searchStrategy: 'both',
    placeTypes: [
      'bar', 'night_club', 'cafe', 'pub', 'wine_bar',
    ],
    keywords: ['cafe', 'bar', 'kroeg', 'pub', 'uitgaan', 'nachtleven'],
    defaultRadius: 2000,
    color: '#f59e0b',
    icon: '🍺'
  },
  {
    id: 'sport_faciliteiten',
    name: 'sport_faciliteiten',
    displayName: 'Sport faciliteiten',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: [
      'stadium', 'swimming_pool', 'sports_complex', 'sports_activity_location',
      'sports_coaching', 'ice_skating_rink', 'golf_course', 'fishing_pond',
      'arena', 'athletic_field', 'fishing_charter', 'sports_club',
      'adventure_sports_center', 'cycling_park'
    ],
    keywords: ['sportclub', 'voetbalclub', 'tennisclub', 'zwembad', 'sporthal'],
    defaultRadius: 2000,
    color: '#ea580c',
    icon: '⚽'
  },
  {
    id: 'sportschool',
    name: 'sportschool',
    displayName: 'Sportschool / Fitnesscentrum',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: ['gym', 'fitness_center', 'yoga_studio'],
    keywords: ['sportschool', 'fitness', 'gym', 'yoga'],
    defaultRadius: 2000,
    color: '#ea580c',
    icon: '💪'
  },
  {
    id: 'groen_recreatie',
    name: 'groen_recreatie',
    displayName: 'Groen & Recreatie',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: [
      'park', 'amusement_park', 'aquarium', 'zoo', 'tourist_attraction',
      'rv_park', 'campground'
    ],
    keywords: ['park', 'speeltuin', 'recreatie', 'natuur'],
    defaultRadius: 2000,
    color: '#65a30d',
    icon: '🌳'
  },
  {
    id: 'cultuur_entertainment',
    name: 'cultuur_entertainment',
    displayName: 'Cultuur & Entertainment',
    priority: 'low',
    searchStrategy: 'both',
    placeTypes: [
      'art_gallery', 'museum', 'movie_theater', 'library', 'casino',
      'bowling_alley', 'amusement_center', 'performing_arts_theater',
      'concert_hall', 'convention_center', 'opera_house', 'philharmonic_hall', 'planetarium'
    ],
    keywords: ['museum', 'theater', 'bioscoop', 'bibliotheek', 'cultuur'],
    defaultRadius: 2000,
    color: '#7c3aed',
    icon: '🎨'
  },
  {
    id: 'wellness',
    name: 'wellness',
    displayName: 'Wellness & Recreatie',
    priority: 'low',
    searchStrategy: 'both',
    placeTypes: [
      'beauty_salon', 'hair_care', 'spa', 'massage', 'wellness_center',
      'tanning_studio', 'sauna', 'skin_care_clinic', 'public_bath',
      'makeup_artist', 'nail_salon', 'beautician', 'barber_shop',
      'beauty_salon', 'foot_care', 'hair_salon'
    ],
    keywords: ['kapper', 'wellness', 'spa', 'massage', 'schoonheid'],
    defaultRadius: 2000,
    color: '#f97316',
    icon: '💆'
  },
  {
    id: 'zakelijke_diensten',
    name: 'zakelijke_diensten',
    displayName: 'Zakelijke Dienstverlening',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: [
      'accounting', 'bank', 'courthouse', 'embassy', 'local_government_office',
      'insurance_agency', 'lawyer', 'post_office',
      'real_estate_agency', 'travel_agency', 'corporate_office'
    ],
    keywords: ['bank', 'accountant', 'advocaat', 'verzekering', 'makelaar'],
    defaultRadius: 2000,
    color: '#374151',
    icon: '💼'
  },
  {
    id: 'nuts_overheid',
    name: 'nuts_overheid',
    displayName: 'Nutsvoorzieningen & Overheid',
    priority: 'medium',
    searchStrategy: 'both',
    placeTypes: ['city_hall'],
    keywords: ['gemeentehuis', 'overheid'],
    defaultRadius: 2000,
    color: '#6b7280',
    icon: '🏛️'
  }
];

// Default search configuration
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  useNearbySearch: true,
  useTextSearch: true,
  maxRadius: 3000,
  searchRadiusSteps: [300, 500, 1000, 1500, 2000],
  includeInactiveBusinesses: false,
  maxResults: 20,
  languageCode: 'nl',
  region: 'nl'
};

// Price level configuration for restaurants
// NOTE: NEW Google Places API uses values 1-5 (not 0-4 like legacy API)
export const RESTAURANT_PRICE_CONFIG = {
  budget: {
    levels: [PRICE_LEVELS.INEXPENSIVE],  // NEW API: 2=INEXPENSIVE
    description: 'Budget-friendly options (€)',
    maxResults: 20
  },
  midrange: {
    levels: [PRICE_LEVELS.MODERATE],     // NEW API: 3 = MODERATE (+ undefined via post-filter)
    description: 'Mid-range dining (€€€)',
    maxResults: 20
  },
  upscale: {
    levels: [PRICE_LEVELS.EXPENSIVE, PRICE_LEVELS.VERY_EXPENSIVE],  // NEW API: 4, 5
    description: 'Fine dining and upscale (€€€€-€€€€€)',
    maxResults: 20
  }
} as const;

// Search strategy configuration
export const SEARCH_STRATEGY_CONFIG = {
  nearby: {
    supportsPriceFiltering: false,
    maxResults: 20,
    apiEndpoint: '/api/location/nearby-places-new'
  },
  text: {
    supportsPriceFiltering: true,
    maxResults: 20,
    apiEndpoint: '/api/location/text-search'
  }
} as const;

// Quota limits
export const QUOTA_LIMITS = {
  text_search: 1000,        // Free tier: 1,000 requests/month (all users combined)
  nearby_search: 999999,    // Effectively unlimited
  warning_threshold: 0.8    // Show warning at 80% usage
} as const;
