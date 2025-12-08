# Target Group Scoring System - Implementation Status

**Last Updated**: 2025-11-06
**Status**: ✅ COMPLETE

## Overview

The secondary scoring system for housing personas (target groups) is fully implemented and operational. This system extracts real location data and calculates how well each location matches different housing personas using R-rank and Z-rank algorithms.

## Implementation Summary

### ✅ Completed Features

1. **Scoring Map (65 unique data points)**
   - 95 total scoring mappings (some data points map to multiple characteristics)
   - Category weights: Voorzieningen (1.0), Leefbaarheid (1.0), Woningvooraad (0.8), Demografie (0.8)
   - Importance multipliers: Most (×3), Average (×2), Least (×1)

2. **Data Extraction System**
   - Extracts scores from all geographic levels (neighborhood → district → municipality)
   - Prioritizes more specific geographic levels when available
   - Uses `calculatedScore` when available, falls back to normalized relative percentages
   - Dual amenity scoring (both "Aantal" and "Nabijheid" as separate scores)
   - Income bracket splitting (3 brackets based on Dutch median: 36k)
   - Residential data conversion to scored rows

3. **Scoring Calculation**
   - Persona-specific maximum scores (each persona has unique max based on their characteristics)
   - R-rank: Percentage of persona-specific maximum possible score
   - Z-rank: Standardized score using tanh normalization (-1 to +1 range)
   - Proper handling of negative scores (amplified by importance multipliers)

4. **User Interface**
   - Tab navigation: "Doelgroepen Overzicht" (persona cards) and "Score Tabellen" (ranking tables)
   - Summary Ranking Table: Shows R-rank and Z-rank positions with sortable columns
   - Detailed Scoring Table: Shows all categories and scores per persona with color coding
   - Empty state when no location data available (no dummy data)

## Data Point Coverage (65 subcategories)

### Demographics (11 points)
- ✅ Aandeel 0 tot 15 jaar
- ✅ Aandeel 15 tot 25 jaar
- ✅ Aandeel 25 tot 45 jaar
- ✅ Aandeel 45 tot 65 jaar
- ✅ Aandeel 65 jaar of ouder
- ✅ Aandeel eenpersoonshuishoudens
- ✅ Aandeel huishoudens met kinderen
- ✅ Aandeel huishoudens zonder kinderen
- ✅ Gemiddeld Inkomen (low <80% of mediaan)
- ✅ Gemiddeld Inkomen (medium >80% <120% of mediaan)
- ✅ Gemiddeld Inkomen (high >120% of mediaan)

### Housing Stock (5 points)
- ✅ Percentage eengezinswoning
- ✅ Percentage meergezinswoning
- ✅ Koopwoningen
- ✅ In Bezit Woningcorporatie
- ✅ In Bezit Overige Verhuurders

### Residential (9 points)
- ✅ Woningtype - Hoogstedelijk
- ✅ Woningtype - Randstedelijk
- ✅ Woningtype - Laagstedelijk
- ✅ Woonoppervlak - Klein (< 60m²)
- ✅ Woonoppervlak - Midden (60-110m²)
- ✅ Woonoppervlak - Groot (> 110m²)
- ✅ Transactieprijs - Laag (< €350k)
- ✅ Transactieprijs - Midden (€350k-€525k)
- ✅ Transactieprijs - Hoog (> €525k)

### Livability (2 points)
- ✅ Speelplekken Voor Kinderen
- ✅ Voorzieningen Voor Jongeren

### Amenities (38 points - dual scoring)
Each amenity has TWO scores: "Aantal" and "Nabijheid (250m)"

- ✅ Budget Restaurants (€)
- ✅ Mid-range Restaurants (€€€)
- ✅ Upscale Restaurants (€€€€-€€€€€)
- ✅ Cafés en avond programma
- ✅ Cultuur & Entertainment
- ✅ Groen & Recreatie
- ✅ Kinderopvang & Opvang
- ✅ Mobiliteit & Parkeren
- ✅ Onderwijs (Basisschool)
- ✅ Onderwijs (Voortgezet onderwijs)
- ✅ Onderwijs (Hoger onderwijs)
- ✅ Openbaar vervoer (halte)
- ✅ Sport faciliteiten
- ✅ Sportschool / Fitnesscentrum
- ✅ Wellness & Recreatie
- ✅ Winkels (Dagelijkse boodschappen)
- ✅ Winkels (Overige retail)
- ✅ Zorg (Huisarts & Apotheek)
- ✅ Zorg (Paramedische voorzieningen)

## File Structure

```
src/features/location/
├── components/
│   └── Doelgroepen/
│       ├── DoelgroepenGrid.tsx          (Modified - tab navigation, no dummy data)
│       ├── DetailedScoringTable.tsx     (New - shows all scores)
│       ├── SummaryRankingTable.tsx      (New - shows rankings)
│       └── index.ts                     (Updated exports)
├── data/
│   └── sources/
│       └── target-group-scoring-map.json (New - 95 mappings, 65 unique subcategories)
└── utils/
    ├── extractLocationScores.ts         (New - extracts scores from location data)
    └── targetGroupScoring.ts            (New - calculates R-rank and Z-rank)
```

## Key Technical Details

### Score Extraction Logic

1. **Priority Order**: Neighborhood → District → Municipality
2. **Score Preference**: calculatedScore → normalized relative percentage
3. **Income Splitting**: Single income value → 3 bracket scores (binary 1/-1)
4. **Residential Conversion**: Uses `convertResidentialToRows()` to extract housing data
5. **Title Mapping**: 37 mappings to ensure data fields match scoring map subcategories

### Ranking Calculations

**R-Rank Formula**:
```
R-rank = (Actual Score / Persona-Specific Max Score) × 100%
```

**Z-Rank Formula**:
```
z-score = (score - mean) / standard_deviation
Z-rank = tanh(z-score / 2)  // Normalized to -1 to +1
```

### Importance Multiplier Logic

For each data point, the system checks persona characteristics:
- **Most important (×3)**: Characteristic exactly matches
- **Average important (×2)**: Characteristic partially matches
- **Least important (×1)**: Characteristic doesn't match

Example:
- "Zorg (Huisarts & Apotheek)" for age 55+ → Most (×3)
- "Zorg (Huisarts & Apotheek)" for age 35-55 → Average (×2)
- "Zorg (Huisarts & Apotheek)" for age 20-35 → Least (×1)

## Testing the System

1. Navigate to a location page with an address searched
2. Click the "Doelgroepen" tab
3. Click the "Score Tabellen" sub-tab
4. Verify:
   - Summary Ranking Table shows R-rank and Z-rank positions
   - Detailed Scoring Table shows individual scores for each persona
   - Scores reflect real location data (may include negative values)
   - Personas that value location's weak areas rank lower

## Known Behaviors

1. **Negative R-ranks are possible**: If a location has more penalties than benefits for a persona, R-rank can be negative, indicating unsuitability
2. **Z-ranks always sum to ~0**: By design, Z-ranks are standardized across all personas for comparison
3. **Empty state when no data**: Tables don't appear until an address is searched (no dummy data)
4. **Dual amenity scoring**: Each amenity generates TWO scores, not averaged

## Recent Fixes

- ✅ Fixed R-rank to use persona-specific maximum scores (not shared maximum)
- ✅ Removed all dummy data per user request
- ✅ Implemented dual amenity scoring (38 separate scores, not 19 averaged)
- ✅ Added title mapping for 37 data fields to ensure correct key matching
- ✅ Fixed income bracket splitting logic
- ✅ Fixed residential data extraction import path
- ✅ Added proper residential data conversion with all housing categories

## Documentation

- `SECONDARY_SCORING_SYSTEM.md` - Detailed system architecture and usage
- `HOW_SCORING_WORKS.md` - User-friendly explanation with examples
- `TARGET_GROUP_SCORING_STATUS.md` - This file (implementation status)

## Next Steps (Optional Future Enhancements)

- [ ] Add income bracket rows to main aggregated table (currently only in scoring)
- [ ] Export rankings to PDF/Excel
- [ ] Compare rankings across multiple locations
- [ ] Add visualization charts (radar charts, bar charts)
- [ ] Allow users to adjust category weights in UI
- [ ] Track ranking changes over time
