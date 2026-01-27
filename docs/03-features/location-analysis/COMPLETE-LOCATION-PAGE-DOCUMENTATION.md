# Location Page - Complete Technical Documentation

> **Last Updated**: 2025-01-27
> **Version**: 1.0.0
> **Status**: Definitive Reference
> **Supersedes**: All previous location-related documentation files

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Sources & API Clients](#3-data-sources--api-clients)
4. [Data Parsing & Normalization](#4-data-parsing--normalization)
5. [Scoring Systems](#5-scoring-systems)
6. [Caching System](#6-caching-system)
7. [UI Components & Visualization](#7-ui-components--visualization)
8. [Export System](#8-export-system)
9. [AI Integration](#9-ai-integration)
10. [State Management](#10-state-management)
11. [File Reference](#11-file-reference)
12. [API Endpoints](#12-api-endpoints)
13. [Configuration](#13-configuration)

---

## 1. Overview

### 1.1 Purpose

The Location Page is GroosHub's primary feature for urban development and location analysis. It provides comprehensive data-driven insights by aggregating multiple data sources, calculating scores, and generating reports for housing development decisions.

### 1.2 Core Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Source Data Aggregation** | CBS, RIVM, Politie, Google Places, Altum AI, WMS layers |
| **Geographic Multi-Level Analysis** | National → Municipality → District → Neighborhood |
| **Target Group Matching** | 27 housing personas scored against location characteristics |
| **Interactive Maps** | Leaflet maps with 15+ WMS environmental layers |
| **3D Visualizations** | Three.js cube animations and radial charts |
| **AI-Powered Reports** | LLM-generated building programs and recommendations |
| **Multi-Format Export** | JSON, PDF booklets, ZIP archives, cloud storage |

### 1.3 URL Structure

```
/[locale]/location                    # Main location page
/[locale]/location/housing            # Housing recommendations
/[locale]/location/community          # Community recommendations
/[locale]/location/public             # Public space recommendations
```

Supported locales: `nl` (Dutch), `en` (English)

---

## 2. Architecture

### 2.1 Component Hierarchy

```
LocationPage (page.tsx) [Client Component]
│
├── State Management Hooks
│   ├── useLocationData()           # Main data fetching & state
│   ├── useWMSGrading()             # WMS layer grading
│   ├── useSidebar()                # Sidebar collapse state
│   └── useLocationSidebarSections() # Sidebar menu structure
│
├── Memoized Calculations
│   ├── cubeColors                  # Gradient colors for visualization
│   ├── calculatedScores            # Persona scores & scenarios
│   ├── amenityScores               # Amenity category scores
│   └── coordinates                 # Map center point
│
├── Sidebar Component
│   └── Sidebar
│       ├── AddressAutocomplete     # Address search
│       ├── Navigation Menu         # Tab navigation
│       ├── SavedLocations          # Project snapshots
│       └── CacheIndicator          # Cache status
│
├── Main Content (by activeTab)
│   ├── doelgroepen → DoelgroepenResult
│   ├── score → RadialChart
│   ├── demografie → DemographicsPage
│   ├── veiligheid → SafetyPage
│   ├── gezondheid → HealthPage
│   ├── leefbaarheid → LivabilityPage
│   ├── voorzieningen → AmenitiesGrid
│   ├── woningmarkt → ResidentialPage
│   ├── kaarten → LocationMap + WMS layers
│   ├── pve → PVEQuestionnaire
│   └── genereer-rapport → Export buttons
│
└── AI Integration
    └── AIAssistantProvider + AIContextSync
```

### 2.2 Data Flow Pipeline

```
User Input (Address)
        ↓
[useLocationData Hook]
        ↓
Parallel API Calls (Promise.allSettled)
├── LocationGeocoderService → Geocoding + Area Codes
├── CBSDemographicsClient → Demographics
├── RIVMHealthClient → Health Data
├── CBSLivabilityClient → Livability
├── PolitieSafetyClient → Safety/Crime
├── searchOrchestrator → Amenities (Google Places)
└── AltumAIClient → Housing Market
        ↓
Data Transformation Pipeline
├── Parser (raw → structured)
├── Normalizer (standardize field names)
├── Scorer (calculate comparison scores)
└── Aggregator (combine all levels)
        ↓
UnifiedLocationData
        ↓
Cache (LocalStorage, 24h TTL)
        ↓
Components Render
```

### 2.3 Directory Structure

```
src/features/location/
├── components/                    # UI Components (26 directories)
│   ├── AddressAutocomplete/       # Address search with geocoding
│   ├── Amenities/                 # Amenities grid, cards, filters
│   ├── CacheStatus/               # Cache indicator & manager
│   ├── DataTables/                # Multi-level data tables
│   ├── Demographics/              # Demographics charts & data
│   ├── Doelgroepen/               # Target group grid & cards
│   ├── DoelgroepenResult/         # Cube visualization & scenarios
│   ├── ExportButton/              # All export button types
│   ├── Health/                    # Health data display
│   ├── Livability/                # Livability data display
│   ├── LoadingAnimation/          # Loading spinners
│   ├── LocationAnimation/         # 3D cube welcome animation
│   ├── LocationSidebar/           # Sidebar content & sections
│   ├── LocationWelcome/           # Welcome screen
│   ├── MapExport/                 # Map screenshot export
│   ├── Maps/                      # Leaflet map & WMS layers
│   ├── PVE/                       # Program van Eisen questionnaire
│   ├── ProgramRecommendations/    # Housing recommendations
│   ├── Residential/               # Housing market display
│   ├── Safety/                    # Safety data display
│   ├── SavedLocations/            # Save/load snapshots
│   ├── TabContent/                # Tab content router
│   └── shared/                    # Shared utility components
│
├── data/                          # Data Layer
│   ├── aggregator/                # Multi-level data aggregator
│   ├── cache/                     # Caching systems (4 types)
│   ├── normalizers/               # Field name standardization
│   ├── parsers/                   # Data transformation
│   ├── scoring/                   # Amenity & residential scoring
│   ├── services/                  # Geocoding service
│   └── sources/                   # External API clients
│       ├── altum-ai/              # Housing market API
│       ├── cbs-demographics/      # CBS demographics
│       ├── cbs-livability/        # CBS livability
│       ├── google-places/         # Google Places amenities
│       ├── politie-safety/        # Police safety data
│       ├── rivm-health/           # RIVM health data
│       └── wmsGradingConfig.ts    # WMS layer configuration
│
├── hooks/                         # Custom React Hooks
│   ├── useLocationData.ts         # Main data fetching
│   ├── useSelectedDoelgroepen.ts  # Target group selection
│   └── useWMSGrading.ts           # WMS layer grading
│
├── types/                         # TypeScript Types
│   ├── program-recommendations.ts
│   ├── saved-locations.ts
│   └── wms-grading.ts
│
└── utils/                         # Utility Functions
    ├── calculateOmgevingScores.ts # Environment score calculation
    ├── connectionCalculations.ts  # Persona connections
    ├── cubeCapture.ts             # Capture cube as image
    ├── cubePatterns.ts            # Cube pattern definitions
    ├── cubePositionMapping.ts     # Cube position utilities
    ├── extractLocationScores.ts   # Extract scores from data
    ├── jsonExport.ts              # Full JSON export
    ├── jsonExportCompact.ts       # Compact LLM export
    ├── mapExport.ts               # Map/ZIP/PDF export
    ├── pveCapture.ts              # Capture PVE chart
    ├── stagedGenerationData.ts    # LLM generation data
    ├── stagedGenerationOrchestrator.ts # LLM pipeline
    ├── targetGroupScoring.ts      # Target group scoring
    ├── unifiedRapportGenerator.ts # PDF generation (3100+ lines)
    └── voronoiSvgGenerator.ts     # Cover page generation
```

---

## 3. Data Sources & API Clients

### 3.1 External API Overview

| API | Provider | Data Type | Client File |
|-----|----------|-----------|-------------|
| CBS Open Data | Statistics Netherlands | Demographics, Livability | `cbs-demographics/`, `cbs-livability/` |
| RIVM | Dutch Health Ministry | Health indicators | `rivm-health/` |
| Politie | Dutch Police | Crime & Safety | `politie-safety/` |
| Google Places | Google | Amenities & POIs | `google-places/` |
| Altum AI | Altum | Housing market | `altum-ai/` |
| WMS Services | Various | Environmental layers | `wmsGradingConfig.ts` |

### 3.2 CBS Demographics Client

**File**: `src/features/location/data/sources/cbs-demographics/CBSDemographicsClient.ts`

**Purpose**: Fetches demographic data from CBS Open Data API

**Data Retrieved**:
- Total population
- Age distribution (0-14, 15-24, 25-44, 45-64, 65+)
- Gender distribution
- Marital status
- Immigration background (Western, Non-western)
- Household composition

**API Endpoint**: `https://opendata.cbs.nl/ODataApi/odata/85163NED/TypedDataSet`

**Geographic Levels**:
- National (NL00)
- Municipality (GM codes)
- District (WK codes)
- Neighborhood (BU codes)

**Key Methods**:
```typescript
class CBSDemographicsClient {
  async fetchMultiLevel(codes: AreaCodes): Promise<MultiLevelDemographics>
  async fetchByAreaCode(code: string): Promise<RawDemographicsData>
}
```

### 3.3 CBS Livability Client

**File**: `src/features/location/data/sources/cbs-livability/CBSLivabilityClient.ts`

**Purpose**: Fetches livability indicators from CBS

**Data Retrieved**:
- Physical environment quality
- Social cohesion
- Safety perception
- Satisfaction with area
- Youth-related indicators
- Maintenance levels

**API Endpoint**: `https://opendata.cbs.nl/ODataApi/odata/83220NED/TypedDataSet`

### 3.4 RIVM Health Client

**File**: `src/features/location/data/sources/rivm-health/RIVMHealthClient.ts`

**Purpose**: Fetches health data from RIVM health atlas

**Data Retrieved**:
- Experienced health (good/very good)
- Sports participation
- Overweight prevalence
- Alcohol consumption (excessive)
- Loneliness (emotional & social)
- Psychological distress
- Chronic conditions

**API Endpoint**: `https://statline.rivm.nl/`

### 3.5 Politie Safety Client

**File**: `src/features/location/data/sources/politie-safety/PolitieSafetyClient.ts`

**Purpose**: Fetches crime and safety statistics

**Data Retrieved**:
- Total crime count
- Burglary (residential, commercial)
- Pickpocketing
- Street robbery
- Vandalism
- Traffic accidents
- Street lighting quality

**API Endpoint**: `https://api.politie.nl/`

### 3.6 Google Places Client (Amenities)

**File**: `src/features/location/data/sources/google-places/`

**Purpose**: Searches for nearby amenities and points of interest

**Files**:
- `googlePlacesClient.ts` - Main API client
- `googlePlacesParser.ts` - Response parser
- `googlePlacesRateLimiter.ts` - Rate limiting (50 req/sec)
- `googlePlacesSearchOrchestrator.ts` - Multi-category orchestrator
- `googlePlacesTypes.ts` - Type definitions
- `amenityCategories.ts` - Category definitions (20+ categories)
- `amenityScoringConfig.ts` - Scoring configuration

**Amenity Categories**:
```typescript
const AMENITY_CATEGORIES = [
  'supermarket', 'bakery', 'butcher',
  'restaurant', 'cafe', 'bar',
  'school', 'university', 'library',
  'hospital', 'pharmacy', 'doctor',
  'gym', 'park', 'playground',
  'bus_station', 'train_station', 'subway_station',
  'bank', 'atm', 'post_office',
  // ... 20+ categories
];
```

**Key Methods**:
```typescript
class GooglePlacesSearchOrchestrator {
  async searchAllCategories(lat: number, lng: number, radius?: number): Promise<AmenityMultiCategoryResponse>
  async searchCategory(lat: number, lng: number, category: string): Promise<AmenityResult[]>
}
```

**Rate Limiting**:
- Max 50 requests per second
- Automatic retry with exponential backoff
- Request queuing

### 3.7 Altum AI Client (Housing Market)

**File**: `src/features/location/data/sources/altum-ai/`

**Purpose**: Fetches housing market data and valuations

**Files**:
- `AltumAIClient.ts` - Main API client
- `altumAIParser.ts` - Response parser
- `altumAITypes.ts` - Type definitions

**Data Retrieved**:
- WOZ values (property valuations)
- Sale prices (average, median)
- Price per square meter
- Market trends
- Housing stock composition
- Rental prices
- New construction data

**API Endpoint**: `https://mopsus.altum.ai/api/v1/`

**Authentication**: API key via `Altum_AI_Key` environment variable

### 3.8 WMS Layer Services

**File**: `src/features/location/data/sources/wmsGradingConfig.ts`

**Purpose**: Configuration for environmental WMS map layers

**Available Layers** (15+ layers):

| Category | Layers |
|----------|--------|
| **Air Quality** | NO2, PM10, PM2.5, Ozone |
| **Noise** | Road traffic, Rail, Aircraft |
| **Green Space** | Trees, Grass, Shrubs, Tree canopy |
| **Climate** | Heat stress, Rainfall, Flooding |
| **Soil** | Contamination, Groundwater |

**WMS Providers**:
- PDOK (Dutch national geo-portal)
- Atlas Leefomgeving
- Provincial services

**Layer Configuration Structure**:
```typescript
interface WMSLayerConfig {
  id: string;
  name: { nl: string; en: string };
  url: string;
  layers: string;
  category: 'air' | 'noise' | 'green' | 'climate' | 'soil';
  unit: string;
  thresholds: { good: number; moderate: number; poor: number };
  direction: 'positive' | 'negative';  // Higher is better or worse
  weight: number;  // Importance in overall grading
}
```

---

## 4. Data Parsing & Normalization

### 4.1 Parsing Pipeline

```
Raw API Response
      ↓
Parser (source-specific)
      ↓
Map<string, ParsedValue>
      ↓
Normalizer (standardize keys)
      ↓
Map<string, ParsedValue> (normalized)
      ↓
Scorer (apply comparison scoring)
      ↓
UnifiedDataRow[]
```

### 4.2 ParsedValue Structure

**File**: `src/features/location/data/parsers/types.ts`

```typescript
interface ParsedValue {
  // Original values
  originalValue: string | number;
  absolute: number | null;      // Absolute count
  relative: number | null;      // Percentage or per-capita

  // Metadata
  label: string;                // Human-readable label
  unit: string;                 // Unit of measurement
  category: string;             // Data category

  // Scoring values (added by scorer)
  comparisonType?: 'relatief' | 'absoluut';
  margin?: number;              // Default: 20%
  baseValue?: number;           // National benchmark
  direction?: 'positive' | 'negative';
  calculatedScore?: -1 | 0 | 1;
}
```

### 4.3 Demographics Parser

**File**: `src/features/location/data/parsers/DemographicsParser.ts`

**Purpose**: Transforms raw CBS demographics data

**Key Mappings**:
```typescript
const DEMOGRAPHICS_MAPPINGS = {
  'Bevolking_1': 'Totale bevolking',
  'MannenEnJongens_2': 'Mannen',
  'VrouwenEnMeisjes_3': 'Vrouwen',
  'k_0Tot15Jaar_4': '0-14 jaar',
  'k_15Tot25Jaar_5': '15-24 jaar',
  'k_25Tot45Jaar_6': '25-44 jaar',
  'k_45Tot65Jaar_7': '45-64 jaar',
  'k_65JaarOfOuder_8': '65+ jaar',
  'Ongehuwd_9': 'Ongehuwd',
  'Gehuwd_10': 'Gehuwd',
  'Gescheiden_11': 'Gescheiden',
  'Verweduwd_12': 'Verweduwd',
  // ... more mappings
};
```

### 4.4 Key Normalizers

**Files**: `src/features/location/data/normalizers/`

| Normalizer | Purpose |
|------------|---------|
| `DemographicsKeyNormalizer.ts` | Standardizes CBS demographics keys |
| `HealthKeyNormalizer.ts` | Standardizes RIVM health keys |
| `LiveabilityKeyNormalizer.ts` | Standardizes CBS livability keys |
| `SafetyKeyNormalizer.ts` | Standardizes Politie safety keys |

**Normalization Process**:
1. Map raw API keys to standardized Dutch labels
2. Apply consistent capitalization
3. Add units and categories
4. Handle missing data gracefully

### 4.5 Multi-Level Aggregator

**File**: `src/features/location/data/aggregator/multiLevelAggregator.ts`

**Purpose**: Combines data from all geographic levels into unified structure

**Input**:
```typescript
interface MultiLevelInput {
  national: ParsedDataset;
  municipality?: ParsedDataset;
  district?: ParsedDataset;
  neighborhood?: ParsedDataset;
}
```

**Output**:
```typescript
interface UnifiedLocationData {
  metadata: {
    address: string;
    coordinates: [number, number];
    codes: AreaCodes;
    timestamp: number;
  };
  demographics: {
    national: UnifiedDataRow[];
    municipality: UnifiedDataRow[];
    district: UnifiedDataRow[];
    neighborhood: UnifiedDataRow[];
  };
  health: { /* same structure */ };
  livability: { /* same structure */ };
  safety: { /* same structure */ };
  residential: ResidentialData;
}
```

**UnifiedDataRow Structure**:
```typescript
interface UnifiedDataRow {
  key: string;           // Normalized key
  label: string;         // Display label
  value: number | null;  // Primary value
  unit: string;
  category: string;
  absolute: number | null;
  relative: number | null;
  baseValue: number | null;      // National benchmark
  calculatedScore: -1 | 0 | 1;   // Comparison score
  comparisonType: 'relatief' | 'absoluut';
  direction: 'positive' | 'negative';
}
```

---

## 5. Scoring Systems

### 5.1 Overview

GroosHub uses **four complementary scoring systems**:

| System | Scale | Purpose | Used For |
|--------|-------|---------|----------|
| **Primary** | -1, 0, +1 | Compare against national benchmark | Demographics, Health, Safety, Livability |
| **Secondary (R-rank)** | 1-27 | Rank personas for location | Target group matching |
| **Amenity** | 0-100 | Score amenity availability | Voorzieningen tab |
| **Residential** | 0-100 | Score housing market | Woningmarkt tab |

### 5.2 Primary Scoring System

**File**: `src/features/location/data/parsers/scoring.ts`

**Purpose**: Compares location data points against national benchmarks

**Score Values**:
- **-1**: Below average (worse than national by >margin%)
- **0**: Average (within ±margin% of national)
- **+1**: Above average (better than national by >margin%)

**Algorithm**:
```typescript
function calculateScore(
  locationValue: number,
  baseValue: number,
  margin: number = 20,
  direction: 'positive' | 'negative' = 'positive'
): -1 | 0 | 1 {
  // Calculate bounds
  const marginValue = Math.abs(baseValue) * (margin / 100);
  const lowerBound = baseValue - marginValue;
  const upperBound = baseValue + marginValue;

  // Calculate raw score
  let score: -1 | 0 | 1;
  if (locationValue < lowerBound) {
    score = -1;
  } else if (locationValue > upperBound) {
    score = 1;
  } else {
    score = 0;
  }

  // Flip for negative direction (lower is better)
  if (direction === 'negative') {
    score = (score * -1) as -1 | 0 | 1;
  }

  return score;
}
```

**Direction Examples**:
- `positive`: Higher is better (sports participation, good health)
- `negative`: Lower is better (crime rates, air pollution)

**Configuration**:

**File**: `src/features/location/data/parsers/scoring-config.json`

```json
{
  "demographics": {
    "defaults": {
      "comparisonType": "relatief",
      "margin": 20,
      "direction": "positive"
    },
    "overrides": {
      "65+ jaar": { "direction": "negative" }
    }
  },
  "health": {
    "overrides": {
      "Overgewicht": { "direction": "negative" },
      "Eenzaamheid": { "direction": "negative" }
    }
  },
  "safety": {
    "defaults": {
      "direction": "negative"
    }
  }
}
```

### 5.3 Secondary Scoring System (Target Groups)

**File**: `src/features/location/utils/targetGroupScoring.ts`

**Purpose**: Matches locations to 27 housing personas based on location characteristics

**The 27 Personas**:
```typescript
const PERSONAS = [
  'Actieve senioren',
  'Alleenstaande ouders',
  'Ambitieuze professionals',
  'Creatieve nomaden',
  'Digital natives',
  'Eco-bewuste gezinnen',
  'Expats en internationale professionals',
  'Gepensioneerde koppels',
  'Gezinnen met jonge kinderen',
  'Grote gezinnen',
  'Jonge starters',
  'Multigenerationele huishoudens',
  'Ondernemers en ZZP\'ers',
  'Ouderen die willen doorstromen',
  'Samenwonende stellen',
  'Senioren met zorgbehoefte',
  'Starters op de woningmarkt',
  'Studenten',
  'Thuiswerkers',
  'Tweeverdieners',
  'Vitale ouderen',
  'Woongroepbewoners',
  'Zorgbehoevende gezinnen',
  // ... etc
];
```

**Scoring Process**:

1. **Extract Location Scores** (`extractLocationScores.ts`):
   - Map data categories to persona preferences
   - Create LocationScores object

2. **Calculate Persona Scores** (`targetGroupScoring.ts`):
   - Each persona has weighted preferences for location factors
   - Calculate weighted sum of matching scores
   - Normalize to 0-100 scale

3. **Generate R-Rank**:
   - Sort personas by score (highest first)
   - Assign rank 1-27

4. **Calculate Connections** (`connectionCalculations.ts`):
   - Identify complementary persona pairs
   - Calculate connection strength

**Persona Preference Example**:
```typescript
const PERSONA_PREFERENCES = {
  'Gezinnen met jonge kinderen': {
    safety: 1.5,           // Very important
    schools: 2.0,          // Critical
    playgrounds: 1.5,
    healthcare: 1.2,
    greenSpace: 1.3,
    noise: -1.0,           // Avoid noise
    affordability: 1.0
  },
  'Jonge starters': {
    publicTransport: 1.5,
    nightlife: 1.2,
    affordability: 2.0,    // Critical
    jobAccess: 1.5
  }
};
```

### 5.4 Scenario System

**Purpose**: Groups personas into 4 development scenarios

**Scenarios**:
1. **Scenario 1**: Focus on families and seniors
2. **Scenario 2**: Focus on young professionals and starters
3. **Scenario 3**: Mixed community development
4. **Custom**: User-defined persona selection

**Calculation** (`connectionCalculations.ts`):
```typescript
function calculateScenarios(
  personas: Persona[],
  sortedPersonas: PersonaScore[],
  connections: ConnectionMap
): ScenarioData[] {
  // Each scenario selects 5-7 personas based on:
  // - Top-ranked for location
  // - Internal compatibility
  // - Coverage of different life stages
}
```

### 5.5 Amenity Scoring System

**File**: `src/features/location/data/scoring/amenityScoring.ts`

**Purpose**: Scores amenity availability for a location

**Scoring Factors**:
- Distance to nearest (closer = better)
- Number within radius (more = better)
- Category importance weight
- Diversity of options

**Configuration** (`amenityScoringConfig.ts`):
```typescript
const AMENITY_WEIGHTS = {
  supermarket: { weight: 2.0, idealDistance: 500, maxDistance: 1500 },
  school: { weight: 1.5, idealDistance: 800, maxDistance: 2000 },
  pharmacy: { weight: 1.5, idealDistance: 600, maxDistance: 1500 },
  restaurant: { weight: 0.8, idealDistance: 500, maxDistance: 2000 },
  gym: { weight: 0.7, idealDistance: 1000, maxDistance: 3000 },
  // ... etc
};
```

**Score Calculation**:
```typescript
function calculateAmenityScore(
  amenities: AmenityResult[],
  config: AmenityWeightConfig
): number {
  const distanceScore = calculateDistanceScore(amenities[0]?.distance, config);
  const countScore = calculateCountScore(amenities.length, config);

  return (distanceScore * 0.6 + countScore * 0.4) * config.weight;
}
```

### 5.6 Residential Scoring System

**File**: `src/features/location/data/scoring/residentialScoring.ts`

**Purpose**: Evaluates housing market conditions

**Factors Scored**:
- Affordability (price vs income)
- Price trends (stability)
- Availability (listings)
- Value for money (price/m²)

---

## 6. Caching System

### 6.1 Cache Types

| Cache | File | Storage | TTL | Purpose |
|-------|------|---------|-----|---------|
| **Location Data** | `locationDataCache.ts` | LocalStorage | 24h | All fetched location data |
| **PVE Config** | `pveConfigCache.ts` | LocalStorage | Session | Questionnaire responses |
| **Rapport** | `rapportCache.ts` | LocalStorage | 7d | Generated LLM reports |
| **LLM Rapport** | `llmRapportCache.ts` | LocalStorage | 7d | Building program results |

### 6.2 Location Data Cache

**File**: `src/features/location/data/cache/locationDataCache.ts`

**Features**:
- 24-hour TTL (time to live)
- LRU eviction when size limit reached (5MB default)
- Address normalization for consistent keys
- Automatic cleanup of expired entries
- Statistics tracking (hits, misses, size)

**Key Structure**:
```typescript
interface CacheEntry {
  data: UnifiedLocationData;
  amenities: AmenityMultiCategoryResponse;
  timestamp: number;
  ttl: number;
}

// Key normalization
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
```

**API**:
```typescript
class LocationDataCache {
  set(address: string, data: UnifiedLocationData, amenities: AmenityMultiCategoryResponse): void
  get(address: string): CacheEntry | null
  has(address: string): boolean
  clear(): void
  getStats(): CacheStats
}
```

### 6.3 PVE Configuration Cache

**File**: `src/features/location/data/cache/pveConfigCache.ts`

**Purpose**: Stores Program van Eisen questionnaire state

**Stored Data**:
```typescript
interface PVEConfigCache {
  answers: Record<string, number>;      // Question answers
  percentages: Record<string, number>;  // Category percentages
  m2Allocations: Record<string, number>; // Square meter allocations
  timestamp: number;
}
```

### 6.4 Rapport Cache

**File**: `src/features/location/data/cache/rapportCache.ts`

**Purpose**: Caches expensive LLM-generated content

**Stored Data**:
```typescript
interface RapportCacheEntry {
  inputHash: string;              // Hash of input data (for invalidation)
  stage1Output: LLMStage1Output;  // Location analysis
  stage2Output: LLMStage2Output;  // Persona analysis
  stage3Output: LLMStage3Output;  // PVE generation
  combinedProgram: CombinedProgram;
  generatedAt: number;
}
```

**Cache Invalidation**:
- Hash of input data compared on retrieval
- If data changed, cache is invalidated
- Manual clear available

---

## 7. UI Components & Visualization

### 7.1 Component Categories

| Category | Components | Purpose |
|----------|------------|---------|
| **Charts** | RadialChart, DensityChart, BarChart | Data visualization |
| **3D** | LocationAnimation, DoelgroepenCube | Three.js visualizations |
| **Maps** | LocationMap, WMSLayerControl | Leaflet mapping |
| **Tables** | DataTables, ComparisonTable | Tabular data display |
| **Cards** | AmenityCard, PersonaCard, ScoreCard | Information cards |
| **Forms** | PVEQuestionnaire, AddressAutocomplete | User input |
| **Export** | GenerateRapportButton, MapExportButton | Data export |

### 7.2 RadialChart (3D Circular Chart)

**File**: `src/shared/components/common/RadialChart/RadialChart.tsx`

**Purpose**: 5-category environment overview on "score" tab

**Features**:
- Three.js 3D rendering
- Interactive rotation
- Click-to-navigate to category
- Color-coded segments
- Animated transitions

**Data Structure**:
```typescript
interface RadialChartData {
  label: string;
  value: number;      // 0-100
  color: string;
  onClick?: () => void;
}

// Categories shown:
const OMGEVING_CATEGORIES = [
  { key: 'betaalbaarheid', label: 'Betaalbaarheid' },
  { key: 'veiligheid', label: 'Veiligheid' },
  { key: 'gezondheid', label: 'Gezondheid' },
  { key: 'leefbaarheid', label: 'Leefbaarheid' },
  { key: 'voorzieningen', label: 'Voorzieningen' }
];
```

### 7.3 DensityChart (Distribution Charts)

**File**: `src/shared/components/common/DensityChart/DensityChart.tsx`

**Purpose**: Shows distribution comparisons (e.g., age groups)

**Features**:
- Bar chart with overlaid lines
- Multi-level comparison (location vs national)
- Animated transitions
- Responsive sizing

### 7.4 LocationAnimation (3D Cube)

**File**: `src/features/location/components/LocationAnimation/LocationAnimation.tsx`

**Purpose**: Welcome screen and loading animation with 3D cube

**Animation Stages**:
1. **welcome**: Static cube with welcome message
2. **loading**: Rotating cube with progress
3. **result**: Transitions to content

**Implementation**:
- React Three Fiber (@react-three/fiber)
- Custom shader materials
- Gradient color faces
- Smooth rotation animation

### 7.5 DoelgroepenResult (Scenario Visualization)

**File**: `src/features/location/components/DoelgroepenResult/DoelgroepenResult.tsx`

**Purpose**: Target group ranking and scenario display

**Sub-components**:
- `ScenarioCube.tsx` - 3D cube for each scenario
- `PersonaRanking.tsx` - Ranked list of personas
- `ScenarioSelector.tsx` - Scenario tab selection
- `ConnectionLines.tsx` - Persona relationship visualization

**Features**:
- 4 scenario tabs (3 preset + 1 custom)
- Interactive persona cards
- Connection strength visualization
- Cube face coloring by persona scores

### 7.6 LocationMap (Leaflet Map)

**File**: `src/features/location/components/Maps/LocationMap.tsx`

**Purpose**: Interactive map with WMS environmental layers

**Features**:
- Leaflet.js base map
- Multiple tile providers (OpenStreetMap, satellite)
- WMS layer overlay
- Opacity control
- Feature info on click
- Marker for searched location
- Sampling area circle visualization

**Sub-components**:
- `WMSLayerControl.tsx` - Layer selector dropdown
- `WMSLayerScoreCard.tsx` - Selected layer grading display
- `WMSGradingScoreCard.tsx` - Overall grading summary
- `MapLegend.tsx` - WMS legend display

### 7.7 Data Tables

**File**: `src/features/location/components/DataTables/`

**Components**:
- `MultiLevelDataTable.tsx` - Main data table with level selector
- `GeographicLevelSelector.tsx` - Level tabs (national/municipality/district/neighborhood)
- `ComparisonTable.tsx` - Side-by-side comparison view

**Features**:
- Sortable columns
- Score color coding (-1 red, 0 yellow, +1 green)
- Expandable rows
- Unit formatting
- Multi-level data switching

### 7.8 AmenitiesGrid

**File**: `src/features/location/components/Amenities/AmenitiesGrid.tsx`

**Purpose**: Display nearby amenities by category

**Sub-components**:
- `AmenityCard.tsx` - Individual amenity display
- `AmenityFilter.tsx` - Category/distance filtering
- `AmenityDetail.tsx` - Detailed modal view
- `AmenitySummary.tsx` - Category score summary

**Features**:
- 20+ amenity categories
- Distance-based filtering
- Category score display
- Google Maps links
- Photo display (when available)

### 7.9 PVE Questionnaire

**File**: `src/features/location/components/PVE/PVEQuestionnaire.tsx`

**Purpose**: Program van Eisen (Requirements Program) builder

**Features**:
- Multi-step questionnaire
- Percentage allocation sliders
- Square meter calculations
- Real-time preview
- Export to PDF
- Stacked bar visualization

**Question Categories**:
- Target groups
- Unit types
- Size requirements
- Accessibility
- Parking needs
- Common spaces

---

## 8. Export System

### 8.1 Export Formats Overview

| Format | File | Size | Use Case |
|--------|------|------|----------|
| **Full JSON** | `jsonExport.ts` | 2-5MB | Complete data archival |
| **Compact JSON** | `jsonExportCompact.ts` | 500KB-2MB | LLM processing |
| **PDF Rapport** | `unifiedRapportGenerator.ts` | 5-20MB | Client presentations |
| **PDF Map Booklet** | `mapExport.ts` | 3-15MB | Map documentation |
| **ZIP Maps** | `mapExport.ts` | 10-50MB | Raw map images |

### 8.2 Full JSON Export

**File**: `src/features/location/utils/jsonExport.ts`

**Contents**:
```typescript
interface LocationDataExport {
  metadata: {
    exportDate: string;
    address: string;
    coordinates: [number, number];
    codes: AreaCodes;
  };
  data: {
    national: {
      demographics: UnifiedDataRow[];
      health: UnifiedDataRow[];
      livability: UnifiedDataRow[];
      safety: UnifiedDataRow[];
    };
    neighborhood: { /* same structure */ };
    district: { /* same structure */ };
    municipality: { /* same structure */ };
  };
  scores: {
    location: LocationScores;
    personas: PersonaScore[];
    scenarios: ScenarioData[];
  };
  amenities: AmenityMultiCategoryResponse;
  residential: ResidentialData;
}
```

**Filename**: `{location}-{YYYY-MM-DD}.json`

### 8.3 Compact JSON Export (LLM-Optimized)

**File**: `src/features/location/utils/jsonExportCompact.ts`

**Purpose**: Streamlined export optimized for LLM token efficiency

**Contents**:
```typescript
interface CompactLocationExport {
  meta: { location, municipality, district, neighborhood, coordinates, date };
  pve: PVEFinalState;
  personas: PersonaDefinition[];  // All 27 personas
  demographics: { ageGroups, status, immigration, family };
  health: { experienced, sports, weight, alcohol, loneliness, psychological };
  safety: { crimes, burglary, pickpocketing, accidents, lighting };
  livability: { maintenance, youth, social };
  amenities: { category: { nearest, count, score } }[];
  housing: { prices, trends, availability };
  wms: WMSGradingResults;
  ranking: PersonaRanking[];
}
```

**Filename**: `{location}-compact-{YYYY-MM-DD}.json`

### 8.4 Unified Rapport PDF Generator

**File**: `src/features/location/utils/unifiedRapportGenerator.ts` (3100+ lines)

**Purpose**: Generates comprehensive PDF report with all data and visualizations

**Libraries**:
- jsPDF v3.0.3 - PDF generation
- html2canvas - DOM capture

**PDF Structure** (A4 Portrait, ~30-50 pages):

```
1. Title Page
   - Voronoi cover image (generated by voronoiSvgGenerator.ts)
   - Project name
   - Address
   - Date

2. Table of Contents
   - Clickable navigation

3. Executive Summary
   - Location overview (LLM generated)
   - SWOT analysis (LLM generated)
   - Key recommendations

4. Location Analysis
   - Address details
   - Geographic codes
   - Coordinates

5. Doelgroepen Overview
   - All 4 scenarios at a glance
   - Cube visualizations (captured from DOM)
   - Top personas per scenario

6-9. Scenario Detail Pages (x4)
   - Scenario cube visualization
   - Introduction text (LLM generated)
   - Selected personas with scores
   - PVE breakdown for scenario
   - Key insights

10. PVE Section
    - Overview chart (captured stacked bar)
    - Category breakdown
    - Square meter allocations
    - Unit type distribution

11. Environment Analysis
    - Score overview (radial chart)
    - Demographics summary
    - Safety summary
    - Health summary
    - Livability summary
    - Amenities summary

12. Maps Section
    - Aerial photo (background)
    - WMS layer overlays
    - Legends
    - Grading scores per layer

13. Appendix
    - Complete data tables
    - All 27 personas ranked
    - Detailed amenity list
    - Source references
```

**Key Functions**:
```typescript
async function generateUnifiedRapport(options: RapportOptions): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // 1. Generate cover page
  await addCoverPage(doc, options);

  // 2. Add table of contents
  addTableOfContents(doc, options);

  // 3. Add executive summary (LLM content)
  await addExecutiveSummary(doc, options.llmContent);

  // 4. Add scenario pages
  for (const scenario of options.scenarios) {
    await addScenarioPage(doc, scenario, options);
  }

  // 5. Add PVE section
  await addPVESection(doc, options.pveData, options.pveCapture);

  // 6. Add maps section
  await addMapsSection(doc, options.mapCaptures, options.wmsGrading);

  // 7. Add appendix
  addAppendix(doc, options.data);

  return doc.output('blob');
}
```

**Filename**: `{location}-rapport-{YYYY-MM-DD}.pdf`

### 8.5 Map Export (ZIP & PDF)

**File**: `src/features/location/utils/mapExport.ts`

**ZIP Export**:
```typescript
async function exportMapsAsZip(
  captures: MapCapture[],
  filename: string
): Promise<void> {
  const zip = new JSZip();

  for (const capture of captures) {
    const sanitizedName = capture.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    zip.file(`${sanitizedName}.png`, capture.blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, filename);
}
```

**ZIP Structure**:
```
kaarten-export-2025-01-27.zip
├── air_quality_no2.png
├── air_quality_pm10.png
├── air_quality_pm25.png
├── noise_road_traffic.png
├── noise_rail.png
├── green_space_trees.png
├── green_space_grass.png
├── climate_heat_stress.png
└── [... 15+ layers]
```

**PDF Booklet**:
```typescript
async function generateMapBookletPDF(
  captures: MapCapture[],
  options: BookletOptions
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

  // Title page
  doc.text('Kaarten Rapport', 105, 140, { align: 'center' });
  doc.text(options.address, 105, 160, { align: 'center' });

  // Map pages
  for (const capture of captures) {
    doc.addPage();

    // Aerial background (50% opacity)
    if (capture.aerial) {
      doc.addImage(capture.aerial, 'PNG', 10, 20, 190, 190, '', 'FAST', 0);
      doc.setGState(new doc.GState({ opacity: 0.5 }));
    }

    // WMS layer overlay (80% opacity)
    doc.addImage(capture.wms, 'PNG', 10, 20, 190, 190);

    // Title and legend
    doc.text(capture.title, 105, 15, { align: 'center' });
    if (capture.legend) {
      doc.addImage(capture.legend, 'PNG', 160, 220, 40, 40);
    }

    // Notes field
    doc.rect(10, 220, 140, 50);
    doc.text('Notities:', 15, 230);
  }

  doc.save(options.filename);
}
```

### 8.6 Export Button Components

**Directory**: `src/features/location/components/ExportButton/`

| Component | Purpose | Output |
|-----------|---------|--------|
| `ExportButton.tsx` | Full JSON download | `.json` file |
| `CompactExportButton.tsx` | LLM-optimized JSON | `.json` file |
| `GenerateProgramButton.tsx` | LLM building program | `.json` file |
| `GenerateRapportButton.tsx` | Complete PDF rapport | `.pdf` file + R2 upload |
| `MapExportButton.tsx` | Maps as ZIP or PDF | `.zip` or `.pdf` |
| `SaveSnapshotButton.tsx` | Save to database | Database record |
| `GenerationProgressModal.tsx` | Progress UI | Modal component |

### 8.7 Cloud Storage (R2)

**File**: `src/app/api/rapport/upload-pdf/route.ts`

**Purpose**: Upload generated PDFs to Cloudflare R2

**Storage Path**:
```
{environment}/projects/{projectId}/reports/{timestamp}-{filename}.pdf

Example:
production/projects/proj-123/reports/1706359200000-amsterdam-centrum-rapport-2025-01-27.pdf
```

**Features**:
- 50MB max file size
- PDF type validation
- Authentication required
- 1-hour presigned URLs
- Automatic cleanup (optional)

---

## 9. AI Integration

### 9.1 AI Integration Points

| Feature | AI Provider | Purpose |
|---------|-------------|---------|
| **Building Program Generation** | xAI Grok / OpenAI | Generate housing program from location data |
| **Location Summary** | xAI Grok / OpenAI | SWOT analysis, recommendations |
| **Scenario Descriptions** | xAI Grok / OpenAI | Narrative for each scenario |
| **Chat Assistant** | Multi-provider | Answer questions about location |

### 9.2 Building Program Generation

**Files**:
- `src/app/api/generate-building-program/route.ts` - Main endpoint
- `src/app/api/generate-building-program/stage1/route.ts` - Location analysis
- `src/app/api/generate-building-program/stage2/route.ts` - Persona analysis
- `src/app/api/generate-building-program/stage3/route.ts` - PVE generation
- `src/features/location/utils/stagedGenerationOrchestrator.ts` - Client orchestrator

**3-Stage Pipeline**:

```
Stage 1: Location Analysis
├── Input: CompactLocationExport
├── Prompt: Analyze location characteristics
├── Output: LocationSummary, SWOT, KeyInsights

Stage 2: Persona Analysis
├── Input: Stage 1 output + Persona scores
├── Prompt: Analyze persona fit for location
├── Output: PersonaRecommendations, ScenarioDescriptions

Stage 3: PVE Generation
├── Input: Stage 1 + Stage 2 + PVE config
├── Prompt: Generate building program recommendations
├── Output: BuildingProgram, UnitMix, Specifications
```

**Streaming Response**:
```typescript
// Server-Sent Events format
const encoder = new TextEncoder();

async function* generateStream(input: GenerationInput) {
  yield encoder.encode(`data: ${JSON.stringify({ stage: 1, status: 'starting' })}\n\n`);

  const stage1 = await generateStage1(input);
  yield encoder.encode(`data: ${JSON.stringify({ stage: 1, status: 'complete', data: stage1 })}\n\n`);

  // ... stages 2 and 3
}
```

### 9.3 AI Context Sync

**File**: `src/features/chat/components/AIContextSync.tsx`

**Purpose**: Sync location data with AI assistant for contextual chat

**Context Provided**:
```typescript
interface LocationAIContext {
  feature: 'location';
  projectId?: string;
  currentView: string;           // Active tab
  address: string;
  locationExport: CompactLocationExport;  // Full context
  wmsGrading?: WMSGradingData;
  pveConfig?: PVEConfigCache;
}
```

**Usage**:
```tsx
<AIAssistantProvider>
  <AIContextSync
    feature="location"
    projectId={loadedProjectId}
    context={{
      currentView: activeTab,
      address: currentAddress,
      locationExport: exportCompactForLLM(data, amenities, locale),
      wmsGrading: wmsGradingData
    }}
  />
  <LocationContent />
</AIAssistantProvider>
```

### 9.4 Chat Integration

**Features**:
- Location-aware responses
- Data citation capability
- Persona recommendation queries
- Comparison queries (vs other locations)
- Export assistance

**Example Prompts Handled**:
- "Which target groups are best for this location?"
- "What are the safety concerns here?"
- "Compare amenities to average"
- "Explain the livability score"
- "Generate a summary for stakeholders"

---

## 10. State Management

### 10.1 Main Page State

**File**: `src/app/[locale]/location/page.tsx`

```typescript
// Navigation state
const [activeTab, setActiveTab] = useState<string>('doelgroepen');
const [locale, setLocale] = useState<Locale>('nl');

// Animation state
const [animationStage, setAnimationStage] = useState<'welcome' | 'loading' | 'result'>('welcome');

// Map state
const [selectedWMSLayer, setSelectedWMSLayer] = useState<string | null>(null);
const [wmsOpacity, setWmsOpacity] = useState<number>(0.7);
const [mapZoom, setMapZoom] = useState<number>(14);
const [featureInfo, setFeatureInfo] = useState<FeatureInfo | null>(null);

// Data state
const [loadedSnapshotId, setLoadedSnapshotId] = useState<string | null>(null);
const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
const [loadedWMSGradingData, setLoadedWMSGradingData] = useState<WMSGradingData | null>(null);
```

### 10.2 useLocationData Hook

**File**: `src/features/location/hooks/useLocationData.ts`

**State**:
```typescript
interface LocationDataState {
  data: UnifiedLocationData | null;
  amenities: AmenityMultiCategoryResponse | null;
  loading: {
    geocoding: boolean;
    demographics: boolean;
    health: boolean;
    livability: boolean;
    safety: boolean;
    amenities: boolean;
    residential: boolean;
  };
  error: {
    geocoding: Error | null;
    demographics: Error | null;
    health: Error | null;
    livability: Error | null;
    safety: Error | null;
    amenities: Error | null;
    residential: Error | null;
  };
  fromCache: boolean;
  currentAddress: string | null;
}
```

**Actions**:
```typescript
interface LocationDataActions {
  fetchData: (address: string, skipCache?: boolean) => Promise<void>;
  loadSavedData: (data: UnifiedLocationData, amenities: AmenityMultiCategoryResponse, address: string) => void;
  clearData: () => void;
  clearCache: () => void;
}
```

### 10.3 useWMSGrading Hook

**File**: `src/features/location/hooks/useWMSGrading.ts`

**Purpose**: Manages WMS layer grading with polling

**State**:
```typescript
interface WMSGradingState {
  gradingData: WMSGradingData | null;
  isGrading: boolean;
  progress: number;                    // 0-100
  layersCompleted: number;
  layersTotal: number;
  error: string | null;
  isCriticalComplete: boolean;         // Required layers done
}
```

**Options**:
```typescript
interface UseWMSGradingOptions {
  snapshotId?: string;
  latitude: number;
  longitude: number;
  address: string;
  existingGradingData?: WMSGradingData;
  autoGrade?: boolean;                 // Start automatically
  pollInterval?: number;               // Default: 5000ms
}
```

### 10.4 Memoized Calculations

**In page.tsx**:
```typescript
// Cube gradient colors (static)
const cubeColors = useMemo(() => generateGradientColors(27), []);

// All calculated scores
const calculatedScores = useMemo(() => {
  if (!data) return null;

  const locationScores = extractLocationScores(data);
  const personaScores = calculatePersonaScores(PERSONAS, locationScores);
  const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);
  const connections = calculateConnections(personaScores);
  const scenarios = calculateScenarios(personaScores, sortedPersonas, connections);
  const customScenario = loadCustomScenario();

  return {
    locationScores,
    personaScores,
    sortedPersonas,
    connections,
    scenarios,
    customScenario
  };
}, [data]);

// Amenity scores
const amenityScores = useMemo(() => {
  if (!amenities) return null;
  return calculateAllAmenityScores(amenities);
}, [amenities]);

// Map coordinates
const coordinates = useMemo<[number, number]>(() => {
  if (!data?.metadata?.coordinates) return [52.3676, 4.9041]; // Amsterdam default
  return data.metadata.coordinates;
}, [data]);
```

### 10.5 LocalStorage Keys

| Key | Purpose | Scope |
|-----|---------|-------|
| `grooshub_current_address` | Last searched address | Global |
| `grooshub_location_cache_*` | Cached location data | Per address |
| `grooshub_doelgroepen_scenario_selection` | Custom scenario | Global |
| `grooshub_pve_config` | PVE questionnaire state | Global |
| `grooshub_rapport_cache_*` | Generated reports | Per address |
| `location-sidebar-collapsed` | Sidebar state | Global |

### 10.6 SessionStorage Keys

| Key | Purpose |
|-----|---------|
| `grooshub_load_snapshot` | Snapshot data to load |
| `grooshub_load_project_id` | Project ID for loaded snapshot |

---

## 11. File Reference

### 11.1 Core Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/[locale]/location/page.tsx` | Main page component | ~800 |
| `src/app/[locale]/location/layout.tsx` | Layout wrapper | ~50 |
| `src/features/location/hooks/useLocationData.ts` | Data fetching hook | ~400 |
| `src/features/location/hooks/useWMSGrading.ts` | WMS grading hook | ~200 |
| `src/features/location/utils/unifiedRapportGenerator.ts` | PDF generator | ~3100 |

### 11.2 Data Pipeline Files

| File | Purpose |
|------|---------|
| `data/sources/cbs-demographics/CBSDemographicsClient.ts` | CBS demographics API |
| `data/sources/cbs-livability/CBSLivabilityClient.ts` | CBS livability API |
| `data/sources/rivm-health/RIVMHealthClient.ts` | RIVM health API |
| `data/sources/politie-safety/PolitieSafetyClient.ts` | Police safety API |
| `data/sources/google-places/googlePlacesSearchOrchestrator.ts` | Amenities API |
| `data/sources/altum-ai/AltumAIClient.ts` | Housing market API |
| `data/aggregator/multiLevelAggregator.ts` | Data aggregation |
| `data/parsers/scoring.ts` | Score calculation |
| `data/normalizers/*.ts` | Key normalization |
| `data/cache/*.ts` | Caching systems |

### 11.3 Component Files

| Directory | Components | Count |
|-----------|------------|-------|
| `components/AddressAutocomplete/` | Address search | 2 |
| `components/Amenities/` | Amenity display | 6 |
| `components/Demographics/` | Demographics | 4 |
| `components/Doelgroepen/` | Target groups | 5 |
| `components/DoelgroepenResult/` | Scenario display | 6 |
| `components/ExportButton/` | Export buttons | 7 |
| `components/Maps/` | Map components | 8 |
| `components/PVE/` | Questionnaire | 4 |
| `components/Residential/` | Housing market | 3 |
| `components/Safety/` | Safety display | 2 |
| `components/Health/` | Health display | 2 |
| `components/Livability/` | Livability display | 2 |

### 11.4 Utility Files

| File | Purpose |
|------|---------|
| `utils/calculateOmgevingScores.ts` | Environment scores |
| `utils/connectionCalculations.ts` | Persona connections |
| `utils/cubeCapture.ts` | Capture cube image |
| `utils/cubePatterns.ts` | Cube face patterns |
| `utils/cubePositionMapping.ts` | Cube positions |
| `utils/extractLocationScores.ts` | Extract scores |
| `utils/jsonExport.ts` | Full JSON export |
| `utils/jsonExportCompact.ts` | Compact export |
| `utils/mapExport.ts` | Map/ZIP export |
| `utils/pveCapture.ts` | Capture PVE chart |
| `utils/stagedGenerationData.ts` | LLM data prep |
| `utils/stagedGenerationOrchestrator.ts` | LLM orchestration |
| `utils/targetGroupScoring.ts` | Target group scores |
| `utils/voronoiSvgGenerator.ts` | Cover generation |

---

## 12. API Endpoints

### 12.1 Location API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/location/geocode` | POST | Geocode address to coordinates |
| `/api/location/demographics` | POST | Fetch demographics data |
| `/api/location/health` | POST | Fetch health data |
| `/api/location/livability` | POST | Fetch livability data |
| `/api/location/safety` | POST | Fetch safety data |
| `/api/location/amenities` | POST | Search amenities |
| `/api/location/residential` | POST | Fetch housing market |
| `/api/location/wms-grading` | POST | Start WMS grading |
| `/api/location/wms-grading/status` | GET | Poll grading status |

### 12.2 Report API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate-building-program` | POST | Generate LLM building program |
| `/api/generate-building-program/stage1` | POST | Location analysis |
| `/api/generate-building-program/stage2` | POST | Persona analysis |
| `/api/generate-building-program/stage3` | POST | PVE generation |
| `/api/rapport/upload-pdf` | POST | Upload PDF to R2 |
| `/api/rapport-snapshots` | GET/POST | List/save snapshots |
| `/api/rapport-snapshots/[id]` | GET/DELETE | Get/delete snapshot |

### 12.3 External APIs

| API | Base URL | Auth |
|-----|----------|------|
| CBS Open Data | `https://opendata.cbs.nl/ODataApi/odata/` | None |
| RIVM Statline | `https://statline.rivm.nl/` | None |
| Politie | `https://api.politie.nl/` | None |
| Google Places | `https://maps.googleapis.com/maps/api/place/` | API Key |
| Altum AI | `https://mopsus.altum.ai/api/v1/` | API Key |
| PDOK WMS | `https://service.pdok.nl/` | None |

---

## 13. Configuration

### 13.1 Environment Variables

```bash
# Required
GOOGLE_PLACES_API_KEY=           # Google Places API
Altum_AI_Key=                    # Altum AI housing data
POSTGRES_URL=                    # Database connection
NEXTAUTH_SECRET=                 # Auth secret

# Optional AI Providers
XAI_API_KEY=                     # xAI Grok (default)
OPENAI_API_KEY=                  # OpenAI GPT
ANTHROPIC_API_KEY=               # Claude

# Cloud Storage
R2_ACCESS_KEY_ID=                # Cloudflare R2
R2_SECRET_ACCESS_KEY=            # Cloudflare R2
R2_BUCKET_NAME=                  # R2 bucket
R2_ACCOUNT_ID=                   # Cloudflare account
```

### 13.2 Scoring Configuration

**File**: `src/features/location/data/parsers/scoring-config.json`

```json
{
  "demographics": {
    "defaults": {
      "comparisonType": "relatief",
      "margin": 20,
      "direction": "positive"
    },
    "overrides": {
      "65+ jaar": { "direction": "negative" },
      "Eenpersoonshuishoudens": { "direction": "negative" }
    }
  },
  "health": {
    "defaults": {
      "comparisonType": "relatief",
      "margin": 20,
      "direction": "positive"
    },
    "overrides": {
      "Overgewicht": { "direction": "negative", "margin": 15 },
      "Rokers": { "direction": "negative" },
      "Eenzaamheid": { "direction": "negative" }
    }
  },
  "safety": {
    "defaults": {
      "comparisonType": "absoluut",
      "margin": 20,
      "direction": "negative"
    }
  },
  "livability": {
    "defaults": {
      "comparisonType": "relatief",
      "margin": 20,
      "direction": "positive"
    }
  }
}
```

### 13.3 WMS Layer Configuration

**File**: `src/features/location/data/sources/wmsGradingConfig.ts`

```typescript
export const WMS_LAYERS: WMSLayerConfig[] = [
  // Air Quality
  {
    id: 'air_no2',
    name: { nl: 'Luchtkwaliteit NO2', en: 'Air Quality NO2' },
    url: 'https://geodata.rivm.nl/geoserver/wms',
    layers: 'nsl:no2_jm_2022',
    category: 'air',
    unit: 'µg/m³',
    thresholds: { good: 20, moderate: 30, poor: 40 },
    direction: 'negative',
    weight: 1.5
  },
  // Noise
  {
    id: 'noise_road',
    name: { nl: 'Wegverkeersgeluid', en: 'Road Traffic Noise' },
    url: 'https://service.pdok.nl/rivm/geluid/wms/v1_0',
    layers: 'wegverkeer_lden',
    category: 'noise',
    unit: 'dB',
    thresholds: { good: 50, moderate: 60, poor: 70 },
    direction: 'negative',
    weight: 1.2
  },
  // Green Space
  {
    id: 'green_trees',
    name: { nl: 'Bomen', en: 'Trees' },
    url: 'https://service.pdok.nl/kadaster/brt/wms/v1_0',
    layers: 'bomen',
    category: 'green',
    unit: 'coverage %',
    thresholds: { good: 30, moderate: 15, poor: 5 },
    direction: 'positive',
    weight: 1.0
  },
  // ... 15+ more layers
];
```

### 13.4 Amenity Categories Configuration

**File**: `src/features/location/data/sources/google-places/amenityCategories.ts`

```typescript
export const AMENITY_CATEGORIES = {
  essential: [
    { type: 'supermarket', label: { nl: 'Supermarkt', en: 'Supermarket' }, weight: 2.0 },
    { type: 'pharmacy', label: { nl: 'Apotheek', en: 'Pharmacy' }, weight: 1.5 },
    { type: 'doctor', label: { nl: 'Huisarts', en: 'Doctor' }, weight: 1.5 },
  ],
  education: [
    { type: 'school', label: { nl: 'School', en: 'School' }, weight: 1.5 },
    { type: 'secondary_school', label: { nl: 'Middelbare school', en: 'High School' }, weight: 1.2 },
    { type: 'university', label: { nl: 'Universiteit', en: 'University' }, weight: 0.8 },
  ],
  transport: [
    { type: 'bus_station', label: { nl: 'Bushalte', en: 'Bus Stop' }, weight: 1.3 },
    { type: 'train_station', label: { nl: 'Treinstation', en: 'Train Station' }, weight: 1.5 },
    { type: 'subway_station', label: { nl: 'Metrostation', en: 'Subway Station' }, weight: 1.5 },
  ],
  leisure: [
    { type: 'restaurant', label: { nl: 'Restaurant', en: 'Restaurant' }, weight: 0.8 },
    { type: 'cafe', label: { nl: 'Café', en: 'Cafe' }, weight: 0.7 },
    { type: 'gym', label: { nl: 'Sportschool', en: 'Gym' }, weight: 0.9 },
    { type: 'park', label: { nl: 'Park', en: 'Park' }, weight: 1.2 },
  ],
  // ... more categories
};
```

### 13.5 Persona Definitions

**File**: `src/features/location/data/personas.ts`

Contains definitions for all 27 housing personas with:
- Name (nl/en)
- Description
- Age range
- Household composition
- Income level
- Housing preferences
- Location factor weights

---

## Appendix A: Complete File Listing

### A.1 Page & Layout Files
```
src/app/[locale]/location/
├── page.tsx                           # Main location page
├── layout.tsx                         # Layout wrapper
├── housing/page.tsx                   # Housing recommendations
├── community/page.tsx                 # Community recommendations
└── public/page.tsx                    # Public space recommendations
```

### A.2 Component Files (100+ files)
```
src/features/location/components/
├── AddressAutocomplete/
│   ├── AddressAutocomplete.tsx
│   └── index.ts
├── Amenities/
│   ├── AmenitiesGrid.tsx
│   ├── AmenityCard.tsx
│   ├── AmenityDetail.tsx
│   ├── AmenityFilter.tsx
│   ├── AmenitySummary.tsx
│   └── index.ts
├── CacheStatus/
│   ├── CacheIndicator.tsx
│   ├── CacheManager.tsx
│   └── index.ts
├── DataTables/
│   ├── ComparisonTable.tsx
│   ├── GeographicLevelSelector.tsx
│   ├── MultiLevelDataTable.tsx
│   └── index.ts
├── Demographics/
│   ├── DemographicsPage.tsx
│   ├── AgeDistributionChart.tsx
│   ├── StatusChart.tsx
│   └── index.ts
├── Doelgroepen/
│   ├── DoelgroepenGrid.tsx
│   ├── DoelgroepenCard.tsx
│   ├── DoelgroepenFilter.tsx
│   └── index.ts
├── DoelgroepenResult/
│   ├── DoelgroepenResult.tsx
│   ├── ScenarioCube.tsx
│   ├── PersonaRanking.tsx
│   ├── ScenarioSelector.tsx
│   ├── ConnectionLines.tsx
│   └── index.ts
├── ExportButton/
│   ├── ExportButton.tsx
│   ├── CompactExportButton.tsx
│   ├── GenerateProgramButton.tsx
│   ├── GenerateRapportButton.tsx
│   ├── MapExportButton.tsx
│   ├── SaveSnapshotButton.tsx
│   ├── GenerationProgressModal.tsx
│   └── index.ts
├── Health/
│   ├── HealthPage.tsx
│   └── index.ts
├── Livability/
│   ├── LivabilityPage.tsx
│   └── index.ts
├── LoadingAnimation/
│   ├── LoadingSpinner.tsx
│   └── index.ts
├── LocationAnimation/
│   ├── LocationAnimation.tsx
│   ├── AnimatedCube.tsx
│   └── index.ts
├── LocationSidebar/
│   ├── LocationSidebarContent.tsx
│   ├── useLocationSidebarSections.ts
│   └── index.ts
├── LocationWelcome/
│   ├── LocationWelcome.tsx
│   └── index.ts
├── MapExport/
│   ├── MapExportButton.tsx
│   └── index.ts
├── Maps/
│   ├── LocationMap.tsx
│   ├── WMSLayerControl.tsx
│   ├── WMSLayerScoreCard.tsx
│   ├── WMSGradingScoreCard.tsx
│   ├── MapLegend.tsx
│   ├── SamplingArea.tsx
│   ├── AmenityMarkers.tsx
│   └── index.ts
├── PVE/
│   ├── PVEQuestionnaire.tsx
│   ├── PVEQuestion.tsx
│   ├── PVEStackedBar.tsx
│   └── index.ts
├── ProgramRecommendations/
│   ├── HousingRecommendations.tsx
│   ├── CommunityRecommendations.tsx
│   └── index.ts
├── Residential/
│   ├── ResidentialPage.tsx
│   ├── MarketTable.tsx
│   └── index.ts
├── Safety/
│   ├── SafetyPage.tsx
│   └── index.ts
├── SavedLocations/
│   ├── SaveLocationToProject.tsx
│   ├── ProjectSnapshotsList.tsx
│   └── index.ts
├── TabContent/
│   ├── TabContentRouter.tsx
│   └── index.ts
└── shared/
    ├── DataSection.tsx
    ├── ScoreIndicator.tsx
    ├── UnitFormatter.tsx
    └── index.ts
```

### A.3 Data Layer Files (40+ files)
```
src/features/location/data/
├── aggregator/
│   └── multiLevelAggregator.ts
├── cache/
│   ├── locationDataCache.ts
│   ├── pveConfigCache.ts
│   ├── rapportCache.ts
│   └── llmRapportCache.ts
├── normalizers/
│   ├── DemographicsKeyNormalizer.ts
│   ├── HealthKeyNormalizer.ts
│   ├── LiveabilityKeyNormalizer.ts
│   └── SafetyKeyNormalizer.ts
├── parsers/
│   ├── DemographicsParser.ts
│   ├── HealthParser.ts
│   ├── LiveabilityParser.ts
│   ├── SafetyParser.ts
│   ├── scoring.ts
│   ├── scoring-config.json
│   └── types.ts
├── scoring/
│   ├── amenityScoring.ts
│   └── residentialScoring.ts
├── services/
│   └── LocationGeocoderService.ts
└── sources/
    ├── altum-ai/
    │   ├── AltumAIClient.ts
    │   ├── altumAIParser.ts
    │   └── altumAITypes.ts
    ├── cbs-demographics/
    │   └── CBSDemographicsClient.ts
    ├── cbs-livability/
    │   └── CBSLivabilityClient.ts
    ├── google-places/
    │   ├── googlePlacesClient.ts
    │   ├── googlePlacesParser.ts
    │   ├── googlePlacesRateLimiter.ts
    │   ├── googlePlacesSearchOrchestrator.ts
    │   ├── googlePlacesTypes.ts
    │   ├── amenityCategories.ts
    │   ├── amenityScoringConfig.ts
    │   └── index.ts
    ├── politie-safety/
    │   └── PolitieSafetyClient.ts
    ├── rivm-health/
    │   └── RIVMHealthClient.ts
    └── wmsGradingConfig.ts
```

### A.4 Utility Files (20+ files)
```
src/features/location/utils/
├── calculateOmgevingScores.ts
├── connectionCalculations.ts
├── cubeCapture.ts
├── cubePatterns.ts
├── cubePositionMapping.ts
├── extractLocationScores.ts
├── jsonExport.ts
├── jsonExportCompact.ts
├── mapExport.ts
├── pveCapture.ts
├── stagedGenerationData.ts
├── stagedGenerationOrchestrator.ts
├── targetGroupScoring.ts
├── unifiedRapportGenerator.ts
└── voronoiSvgGenerator.ts
```

### A.5 Hook Files
```
src/features/location/hooks/
├── useLocationData.ts
├── useSelectedDoelgroepen.ts
└── useWMSGrading.ts
```

### A.6 Type Files
```
src/features/location/types/
├── program-recommendations.ts
├── saved-locations.ts
└── wms-grading.ts
```

### A.7 API Route Files
```
src/app/api/
├── location/
│   ├── geocode/route.ts
│   ├── demographics/route.ts
│   ├── health/route.ts
│   ├── livability/route.ts
│   ├── safety/route.ts
│   ├── amenities/route.ts
│   ├── residential/route.ts
│   └── wms-grading/
│       ├── route.ts
│       └── status/route.ts
├── generate-building-program/
│   ├── route.ts
│   ├── stage1/route.ts
│   ├── stage2/route.ts
│   └── stage3/route.ts
├── rapport/
│   └── upload-pdf/route.ts
└── rapport-snapshots/
    ├── route.ts
    └── [id]/route.ts
```

---

## Appendix B: Data Type Reference

### B.1 Core Types

```typescript
// Geographic area codes
interface AreaCodes {
  municipality: string;    // GM0363
  district: string;        // WK036300
  neighborhood: string;    // BU03630000
}

// Coordinates
type LatLng = [number, number];  // [latitude, longitude]

// Locale
type Locale = 'nl' | 'en';

// Geographic level
type GeographicLevel = 'national' | 'municipality' | 'district' | 'neighborhood';

// Score value
type Score = -1 | 0 | 1;

// Direction
type ScoreDirection = 'positive' | 'negative';

// Comparison type
type ComparisonType = 'relatief' | 'absoluut';
```

### B.2 Data Structures

```typescript
// Unified data row (used in all data tables)
interface UnifiedDataRow {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  category: string;
  absolute: number | null;
  relative: number | null;
  baseValue: number | null;
  calculatedScore: Score;
  comparisonType: ComparisonType;
  direction: ScoreDirection;
}

// Complete location data
interface UnifiedLocationData {
  metadata: {
    address: string;
    coordinates: LatLng;
    codes: AreaCodes;
    timestamp: number;
  };
  demographics: MultiLevelData;
  health: MultiLevelData;
  livability: MultiLevelData;
  safety: MultiLevelData;
  residential: ResidentialData;
}

interface MultiLevelData {
  national: UnifiedDataRow[];
  municipality: UnifiedDataRow[];
  district: UnifiedDataRow[];
  neighborhood: UnifiedDataRow[];
}
```

### B.3 Persona Types

```typescript
interface Persona {
  id: string;
  name: { nl: string; en: string };
  description: { nl: string; en: string };
  ageRange: [number, number];
  householdType: string;
  incomeLevel: 'low' | 'medium' | 'high';
  preferences: PersonaPreferences;
}

interface PersonaPreferences {
  safety: number;
  affordability: number;
  greenSpace: number;
  publicTransport: number;
  schools: number;
  healthcare: number;
  entertainment: number;
  quietness: number;
  // ... etc
}

interface PersonaScore {
  persona: Persona;
  score: number;           // 0-100
  rRankPosition: number;   // 1-27
  zScore: number;          // Normalized score
  matchedFactors: string[];
}
```

### B.4 Amenity Types

```typescript
interface AmenityResult {
  placeId: string;
  name: string;
  types: string[];
  distance: number;        // meters
  rating?: number;
  userRatingsTotal?: number;
  vicinity: string;
  location: LatLng;
  photos?: Photo[];
}

interface AmenityMultiCategoryResponse {
  categories: {
    [category: string]: AmenityResult[];
  };
  totals: {
    [category: string]: number;
  };
  timestamp: number;
}
```

### B.5 WMS Types

```typescript
interface WMSLayerConfig {
  id: string;
  name: { nl: string; en: string };
  url: string;
  layers: string;
  category: 'air' | 'noise' | 'green' | 'climate' | 'soil';
  unit: string;
  thresholds: {
    good: number;
    moderate: number;
    poor: number;
  };
  direction: 'positive' | 'negative';
  weight: number;
}

interface WMSGradingData {
  layers: {
    [layerId: string]: {
      samples: number[];
      average: number;
      grade: 'good' | 'moderate' | 'poor';
      score: number;
    };
  };
  overall: {
    score: number;
    grade: 'good' | 'moderate' | 'poor';
  };
  progress: number;
  completed: boolean;
}
```

---

## Appendix C: Troubleshooting

### C.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No data returned | API rate limit | Wait and retry, check quotas |
| Cache not working | Storage full | Clear old cache, check storage limits |
| Map not loading | Missing API key | Verify GOOGLE_PLACES_API_KEY |
| PDF generation fails | Memory limit | Reduce image quality, paginate |
| WMS grading slow | Many layers | Increase poll interval |

### C.2 Debug Mode

Enable debug logging:
```typescript
// In useLocationData.ts
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Location data fetch:', { address, cacheHit: fromCache });
}
```

### C.3 Performance Optimization

- Use `Promise.allSettled` for parallel API calls
- Memoize expensive calculations with `useMemo`
- Implement pagination for large datasets
- Use image compression for PDF generation
- Enable caching for repeated queries

---

*End of Documentation*
