# Secondary Scoring System for Target Groups

## Overview

This document describes the secondary scoring system implemented for target groups (housing personas) in the location analysis page. The system calculates two types of rankings (R-rank and Z-rank) based on how well a location matches each target group's characteristics.

## System Architecture

### 1. Scoring Mapping (`target-group-scoring-map.json`)

**Location**: `src/features/location/data/sources/target-group-scoring-map.json`

This JSON file contains:

- **Category Weights**: Multipliers applied to each data category
  - `voorzieningen`: 1.0
  - `leefbaarheid`: 1.0
  - `woningvooraad`: 0.8
  - `demografie`: 0.8

- **Scoring Mappings**: Maps each data point to persona characteristics with importance levels
  - `most`: Multiplier of 3 - Most important for this characteristic
  - `average`: Multiplier of 2 - Moderately important
  - `least`: Multiplier of 1 - Least important

### 2. Scoring Calculation Logic (`targetGroupScoring.ts`)

**Location**: `src/features/location/utils/targetGroupScoring.ts`

**Key Functions**:

- `calculatePersonaScores()`: Main function that calculates R-rank and Z-rank for all personas
- `normalizeCharacteristic()`: Normalizes persona characteristics to match scoring map format
- `getMultiplier()`: Returns the appropriate multiplier (3, 2, or 1) based on characteristic match
- `calculateCategoryScore()`: Calculates the score for a single category
- `calculateZRanks()`: Computes Z-rank using standard deviation normalization
- `calculateRankPositions()`: Assigns ranking positions based on scores

**Calculation Process**:

1. For each persona, iterate through all scoring mappings
2. Check if the persona's characteristics match the mapping
3. Apply the appropriate multiplier (3, 2, or 1) to the base score
4. Sum scores by category
5. Apply category weights
6. Calculate R-rank as: `(actual score / max possible score)`
7. Calculate Z-rank by normalizing scores using standard deviation
8. Assign ranking positions

### 3. User Interface Components

#### A. Summary Ranking Table (`SummaryRankingTable.tsx`)

**Location**: `src/features/location/components/Doelgroepen/SummaryRankingTable.tsx`

**Features**:
- Shows ranking positions for both R-rank and Z-rank
- Displays persona names and scores
- Sortable columns (click header to sort)
- Color-coded badges for top 3 positions
- Medal-style indicators (gold, silver, bronze)

**Columns**:
1. R-Rank Position
2. Z-Rank Position
3. Target Group Name
4. R-Rank Score (as percentage)
5. Z-Rank Score (-1 to 1)
6. Weighted Total

#### B. Detailed Scoring Table (`DetailedScoringTable.tsx`)

**Location**: `src/features/location/components/Doelgroepen/DetailedScoringTable.tsx`

**Features**:
- Shows all personas as columns
- Shows all data categories and subcategories as rows
- Displays individual weighted scores for each combination
- Color-coded cells based on score values
- Sticky headers and category columns for easy navigation
- Groups rows by category for better organization

#### C. Updated Doelgroepen Grid (`DoelgroepenGrid.tsx`)

**Location**: `src/features/location/components/Doelgroepen/DoelgroepenGrid.tsx`

**New Features**:
- Added tab navigation to switch between views:
  - **Doelgroepen Overzicht**: Original persona cards view
  - **Score Tabellen**: New scoring tables view
- Integrated scoring calculation with dummy data for demonstration
- Passes location scores to calculate real-time rankings

## How Rankings Work

### R-Rank (Relative Rank)

**Definition**: Percentage of maximum possible score achieved

**Formula**: `R-rank = (Achieved Score / Maximum Possible Score) × 100%`

**Interpretation**:
- 80-100%: Excellent match
- 60-80%: Good match
- 40-60%: Moderate match
- 20-40%: Poor match
- 0-20%: Very poor match

**Example**:
If a persona could theoretically score 300 points maximum and scores 240 points:
```
R-rank = 240 / 300 = 0.80 = 80%
```

### Z-Rank (Z-Score Normalized Rank)

**Definition**: Standardized score showing how many standard deviations a persona's score is from the mean

**Formula**:
1. Calculate z-score: `z = (score - mean) / standard_deviation`
2. Normalize using tanh: `Z-rank = tanh(z / 2)`

**Interpretation**:
- +0.5 to +1.0: Well above average
- 0 to +0.5: Above average
- 0 to -0.5: Below average
- -0.5 to -1.0: Well below average

**Why Normalize?**:
The tanh function maps the z-score to a -1 to +1 range, making it easier to interpret and compare across different locations.

## Data Flow

```
1. Location Data → MultiLevelDataTable
                ↓
2. Extract relevant scores for subcategories
                ↓
3. Pass to calculatePersonaScores()
                ↓
4. For each persona:
   - Match characteristics to scoring mappings
   - Apply multipliers (3, 2, or 1)
   - Sum category scores
   - Apply category weights
                ↓
5. Calculate R-ranks (percentage of max)
                ↓
6. Calculate Z-ranks (standardized distribution)
                ↓
7. Assign ranking positions
                ↓
8. Display in SummaryRankingTable and DetailedScoringTable
```

## Usage Example

### In the Location Page

```typescript
import { DoelgroepenGrid } from '@/features/location/components/Doelgroepen';

// With location data
const locationScores = {
  'Zorg (Huisarts & Apotheek)': 0.8,
  'Openbaar vervoer (halte)': 0.9,
  // ... more scores
};

<DoelgroepenGrid locale="nl" locationScores={locationScores} />
```

### Without location data (uses dummy data)

```typescript
<DoelgroepenGrid locale="nl" />
```

## Customization

### Adjusting Category Weights

Edit `src/features/location/data/sources/target-group-scoring-map.json`:

```json
{
  "categoryWeights": {
    "voorzieningen": 1.2,    // Increase importance
    "leefbaarheid": 1.0,
    "woningvooraad": 0.6,    // Decrease importance
    "demografie": 0.8
  }
}
```

### Adding New Scoring Mappings

Add to the `scoringMappings` array in the same file:

```json
{
  "category": "Voorzieningen",
  "subcategory": "Nieuwe Voorziening",
  "characteristicType": "Leeftijd",
  "most": "20-35",
  "average": "35-55",
  "least": "55+"
}
```

### Modifying Color Schemes

Edit the color functions in the table components:

**SummaryRankingTable.tsx**:
- `getRRankColorClass()`: Colors for R-rank scores
- `getZRankColorClass()`: Colors for Z-rank scores

**DetailedScoringTable.tsx**:
- `getScoreColorClass()`: Colors for individual cell scores

## Testing

The system includes dummy data for testing without actual location data. The dummy data covers all required subcategories and provides realistic score distributions.

To test:
1. Navigate to Location page
2. Go to "Doelgroepen" tab
3. Click "Score Tabellen" tab
4. Observe the two tables with calculated rankings

## File Structure

```
src/
├── features/
│   └── location/
│       ├── components/
│       │   └── Doelgroepen/
│       │       ├── DoelgroepenGrid.tsx          (Updated)
│       │       ├── DetailedScoringTable.tsx     (New)
│       │       ├── SummaryRankingTable.tsx      (New)
│       │       └── index.ts                     (Updated)
│       ├── data/
│       │   └── sources/
│       │       ├── housing-personas.json        (Existing)
│       │       └── target-group-scoring-map.json (New)
│       └── utils/
│           └── targetGroupScoring.ts            (New)
```

## Future Enhancements

Potential improvements:

1. **Real-time Data Integration**: Connect to actual location scoring data
2. **Exportable Reports**: Add PDF/Excel export functionality
3. **Comparison Mode**: Compare rankings across multiple locations
4. **Visualization Charts**: Add bar charts or radar charts for visual comparison
5. **Custom Weights**: Allow users to adjust category weights in the UI
6. **Filter by Rank**: Add filters to show only top-N ranked personas
7. **Historical Tracking**: Track ranking changes over time

## Troubleshooting

### No scores showing
- Check that locationScores prop contains data
- Verify scoring map subcategory names match exactly

### Incorrect rankings
- Verify persona characteristics in housing-personas.json
- Check characteristic normalization in targetGroupScoring.ts
- Ensure category weights are correctly applied

### TypeScript errors
- Ensure all types are properly imported
- Check PersonaScore interface matches usage
- Verify component props match interface definitions
