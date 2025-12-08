# Location Scoring System - Complete Guide

> **Last Updated**: 2025-12-08
> **Consolidates**: SCORING_SYSTEM.md, HOW_SCORING_WORKS.md, SECONDARY_SCORING_SYSTEM.md, RESIDENTIAL_SCORING_ANALYSIS.md

---

## Table of Contents

1. [Overview](#overview)
2. [Primary Scoring System](#primary-scoring-system)
3. [Secondary Scoring System (Target Groups)](#secondary-scoring-system-target-groups)
4. [Special Cases](#special-cases)
5. [Implementation Reference](#implementation-reference)

---

## Overview

GroosHub uses **two complementary scoring systems** to analyze locations:

### 1. Primary Scoring System (-1, 0, +1)
**Purpose**: Compares location data against national benchmarks
**Output**: Score of -1 (below average), 0 (average), or +1 (above average)
**Used for**: Demographics, Health, Safety, Livability data

### 2. Secondary Scoring System (R-rank & Z-rank)
**Purpose**: Matches locations to housing personas/target groups
**Output**: Rankings showing which personas best match the location
**Used for**: Target group recommendations based on location characteristics

---

## Primary Scoring System

### Core Concept

The primary scoring system evaluates location data points by comparing them against national benchmarks. Each indicator receives a score based on how it performs relative to the national average.

### Architecture

**Core Components:**

1. **Types** (`src/features/location/data/parsers/types.ts`)
   - `ComparisonType`: 'relatief' or 'absoluut'
   - `ScoreDirection`: 'positive' or 'negative'
   - `ScoringConfig`: Configuration for scoring parameters
   - `ParsedValue`: Extended with optional scoring fields

2. **Scoring Logic** (`src/features/location/data/parsers/scoring.ts`)
   - `calculateScore()`: Core scoring calculation
   - `applyScoringToDataset()`: Apply scoring to all indicators
   - `loadScoringConfig()`: Load JSON configuration

3. **Configuration** (`src/features/location/data/parsers/scoring-config.json`)
   - JSON overrides for specific indicators
   - Per-data-source configuration

4. **Integration** (`src/features/location/data/aggregator/multiLevelAggregator.ts`)
   - Applies scoring during data aggregation
   - Compares location data against national baseline

### Data Point Values

Each data point has **8 total values**:

**Existing Values (1-3):**
1. **originalValue**: Raw value from API
2. **absolute**: Absolute count/amount
3. **relative**: Percentage or per-capita value

**Scoring Values (4-8):**
4. **comparisonType**: Which value to use ('relatief' or 'absoluut')
5. **margin**: Acceptable variance percentage (default: 20%)
6. **baseValue**: Benchmark for comparison (default: national level)
7. **direction**: Whether higher is better ('positive' or 'negative')
8. **calculatedScore**: Final score (-1, 0, or 1)

### Scoring Algorithm

**Step 1: Select Comparison Value**
```typescript
const comparisonValue = comparisonType === 'relatief'
  ? location.relative
  : location.absolute;
```

**Step 2: Determine Base Value**
```typescript
const baseValue = config.baseValue ?? national[comparisonType];
```

**Step 3: Calculate Bounds**
```typescript
const marginValue = Math.abs(baseValue) * (margin / 100);
const lowerBound = baseValue - marginValue;
const upperBound = baseValue + marginValue;
```

**Step 4: Calculate Raw Score**
```typescript
if (comparisonValue < lowerBound) {
  rawScore = -1;
} else if (comparisonValue > upperBound) {
  rawScore = 1;
} else {
  rawScore = 0;
}
```

**Step 5: Apply Direction**
```typescript
if (direction === 'negative') {
  score = rawScore * -1; // Invert for "lower is better"
}
```

### Score Interpretation

- **`-1`**: Below threshold (worse than national average)
- **`0`**: Within acceptable range (comparable to national average)
- **`+1`**: Above threshold (better than national average)

### Direction Behavior

**Positive Direction** (default):
- Higher values = Better = Score `1`
- Lower values = Worse = Score `-1`
- Examples: Health quality, income levels, amenities availability

**Negative Direction**:
- Lower values = Better = Score `1`
- Higher values = Worse = Score `-1`
- Examples: Crime rates, pollution levels, unemployment

### Configuration Examples

**Example 1: Income (Positive Direction)**
```json
{
  "indicator": "Gemiddeld inkomen per inwoner",
  "comparisonType": "relatief",
  "margin": 20,
  "direction": "positive"
}
```

**Example 2: Crime (Negative Direction)**
```json
{
  "indicator": "Woninginbraken per 1.000 inwoners",
  "comparisonType": "relatief",
  "margin": 15,
  "direction": "negative"
}
```

---

## Secondary Scoring System (Target Groups)

### Overview

The secondary scoring system calculates how well a location matches each housing persona (target group) based on the primary scores. It uses persona-specific multipliers to create rankings.

### Calculation Formula

```
Final Score = Σ (baseScore × multiplier × categoryWeight)

Where:
- baseScore: Primary score from location data (-1 to +1)
- multiplier: 3 (most important), 2 (average), or 1 (least important)
- categoryWeight: 1.0, 1.0, 0.8, or 0.8 (by category)
```

### Architecture

**1. Scoring Mapping** (`target-group-scoring-map.json`)

Location: `src/features/location/data/sources/target-group-scoring-map.json`

Contains:
- **Category Weights**: Multipliers for each data category
  - `voorzieningen` (amenities): 1.0
  - `leefbaarheid` (livability): 1.0
  - `woningvoorraad` (housing stock): 0.8
  - `demografie` (demographics): 0.8

- **Scoring Mappings**: Maps data points to persona characteristics
  - `most`: Multiplier of 3 - Most important
  - `average`: Multiplier of 2 - Moderately important
  - `least`: Multiplier of 1 - Least important

**2. Scoring Calculation** (`targetGroupScoring.ts`)

Location: `src/features/location/utils/targetGroupScoring.ts`

Key functions:
- `calculateTargetGroupScores()`: Calculate scores for all personas
- `getTopTargetGroups()`: Get top N matching personas
- `getTargetGroupDetails()`: Get detailed breakdown for one persona

### Example Calculation

**Scenario**: Healthcare accessibility score = **-0.5** (poor)

**For "Senioren op Budget" (55+ years, low income)**:
- Healthcare is "most important" for 55+ age
- Multiplier = **3**
- Weighted score = -0.5 × 3 = **-1.5** (large negative impact)

**For "Jonge Starters" (20-35 years, low income)**:
- Healthcare is "least important" for 20-35 age
- Multiplier = **1**
- Weighted score = -0.5 × 1 = **-0.5** (small negative impact)

**Result**: The same negative score has different impacts based on persona priorities.

### Ranking Types

**R-Rank (Raw Rank)**:
- Direct sum of weighted scores
- Can be negative or positive
- Shows absolute matching strength

**Z-Rank (Standardized Rank)**:
- Normalized using z-score transformation
- Accounts for variation across personas
- Better for comparing relative fit

### Category Weights Rationale

| Category | Weight | Reason |
|----------|--------|--------|
| Voorzieningen | 1.0 | Direct impact on daily life |
| Leefbaarheid | 1.0 | Quality of living environment |
| Woningvoorraad | 0.8 | Important but less dynamic |
| Demografie | 0.8 | Context, not deterministic |

---

## Special Cases

### Residential Data (Altum AI) - Not Scored

**Status**: ❌ Residential data is **NOT included** in scoring systems

**Why?**

**Scored Data Sources** (Demographics, Health, Safety, Livability):
- Have multi-level geographic data (national, municipality, district, neighborhood)
- Show **indicators** (rates, percentages, per-capita values)
- Can answer: "Is this location better/worse than the national average?"

**Structure Example**:
```
National Level:    Unemployment = 5.2%  (BASELINE)
Municipality:      Unemployment = 6.1%  (COMPARE)
Score: -1 (worse than national)
```

**Residential Data** (Altum AI):
- **No national baseline** - Only local market data
- Shows **housing inventory** (counts, types, prices)
- Cannot answer: "Better or worse than average?" - Only "What's available?"

**Structure Example**:
```
Location Data:
- Total homes: 450
- Koopwoningen: 320 (71%)
- Huurwoningen: 130 (29%)
- Average price: €385,000
```

**No Comparison Possible**:
- No national "average home count" to compare against
- Prices are market-specific (Amsterdam ≠ Groningen)
- Availability is location-specific feature, not a quality indicator

**Alternative Approach**:

Instead of scoring, residential data is used for:
1. **Filtering**: Match persona preferences (buy vs rent, budget range)
2. **Availability**: Show what housing types exist
3. **Market context**: Provide price and supply information

**Future Consideration**:

Residential data COULD be scored if we had:
- National average home prices per municipality type
- Affordability ratios (price-to-income)
- Supply/demand indicators

But this would require additional data sources beyond Altum AI.

---

## Implementation Reference

### Files and Locations

**Primary Scoring**:
```
src/features/location/data/
├── parsers/
│   ├── types.ts                    # Type definitions
│   ├── scoring.ts                  # Core scoring logic
│   └── scoring-config.json         # Configuration overrides
└── aggregator/
    └── multiLevelAggregator.ts     # Integration point
```

**Secondary Scoring**:
```
src/features/location/
├── data/sources/
│   └── target-group-scoring-map.json    # Persona mappings
└── utils/
    └── targetGroupScoring.ts            # Calculation logic
```

### Configuration Files

**Primary Scoring Config** (`scoring-config.json`):
```json
{
  "demographics": {
    "Gemiddeld inkomen per inwoner": {
      "comparisonType": "relatief",
      "margin": 20,
      "direction": "positive"
    }
  },
  "safety": {
    "Woninginbraken per 1.000 inwoners": {
      "comparisonType": "relatief",
      "margin": 15,
      "direction": "negative"
    }
  }
}
```

**Target Group Scoring Map** (`target-group-scoring-map.json`):
```json
{
  "categoryWeights": {
    "voorzieningen": 1.0,
    "leefbaarheid": 1.0,
    "woningvoorraad": 0.8,
    "demografie": 0.8
  },
  "scoringMappings": {
    "Zorg - Huisarts & Apotheek": {
      "characteristics": [
        { "name": "age", "values": ["65+"], "importance": "most" },
        { "name": "age", "values": ["55-64"], "importance": "average" }
      ]
    }
  }
}
```

### API Integration

**Usage in Component**:
```typescript
import { applyScoringToDataset } from '@/features/location/data/parsers/scoring';
import { calculateTargetGroupScores } from '@/features/location/utils/targetGroupScoring';

// Apply primary scoring
const scoredData = await applyScoringToDataset(locationData, nationalData);

// Calculate target group matches
const rankings = calculateTargetGroupScores(scoredData, personas);

// Get top 5 matches
const topMatches = getTopTargetGroups(rankings, 5);
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| comparisonType | 'relatief' | Use relative values (percentages) |
| margin | 20 | ±20% acceptable variance |
| direction | 'positive' | Higher is better |
| categoryWeight | 1.0 | No category weighting |
| multiplier | 1 | Least important if not specified |

---

## Troubleshooting

### Common Issues

**Issue 1: All scores are 0**
- Check if national baseline data is loaded
- Verify comparisonType matches available data (relative vs absolute)

**Issue 2: Scores seem inverted**
- Check direction setting ('positive' vs 'negative')
- Crime/pollution should use 'negative' direction

**Issue 3: Target group rankings unexpected**
- Verify scoring-map.json has correct characteristic mappings
- Check categoryWeights configuration

**Issue 4: Missing scores for some indicators**
- Check if indicator is in scoring-config.json
- Verify indicator name matches exactly (case-sensitive)

---

## See Also

- [Data Pipeline](../02-core-concepts/data-pipeline.md) - How data flows through the system
- [Amenities Implementation](amenities.md) - Amenities-specific scoring
- [Normalizers](normalizers.md) - Data normalization before scoring
- [Target Group Scoring Status](../../10-development-tools/target-group-scoring.md) - Implementation status

---

**Original Files [ARCHIVED]**:
- `/docs/archive/SCORING_SYSTEM.md`
- `/docs/archive/HOW_SCORING_WORKS.md`
- `/docs/archive/SECONDARY_SCORING_SYSTEM.md`
- `/docs/archive/RESIDENTIAL_SCORING_ANALYSIS.md`
