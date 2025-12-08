# How Target Group Scoring Works

## Overview

The secondary scoring system calculates how well a location matches each housing persona (target group) based on real location data. The system extracts scores from your location's demographics, health, livability, safety, and amenities data, then applies persona-specific multipliers to calculate rankings.

## Score Calculation Formula

```
Final Score = Σ (baseScore × multiplier × categoryWeight)

Where:
- baseScore: Normalized score from location data (-1 to +1)
- multiplier: 3 (most important), 2 (average), or 1 (least important)
- categoryWeight: 1.0, 1.0, 0.8, or 0.8 (by category)
```

### Example Calculation

**Location Score**: Zorg (Huisarts & Apotheek) = **-0.5** (poor healthcare access)

**For "Senioren op Budget" (55+ years, low income, 1-person household)**:
- This matches "most important" for 55+ age → multiplier = **3**
- Weighted score = -0.5 × 3 = **-1.5**

**For "Jonge Starters" (20-35 years, low income, 1-person household)**:
- This matches "least important" for 20-35 age → multiplier = **1**
- Weighted score = -0.5 × 1 = **-0.5**

**Result**: Negative base scores create LARGER negative impacts for personas who value that characteristic most.

## Data Flow

```
┌─────────────────────────────────────┐
│  Location Data (UnifiedLocationData)│
│  - Demographics                      │
│  - Health                            │
│  - Safety                            │
│  - Livability                        │
│  - Amenities                         │
│  - Residential                       │
└──────────┬──────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ extractLocationScores()               │
│ Extracts scores from data:            │
│ - Uses calculatedScore if available   │
│ - Falls back to normalized relative % │
│ - Converts residential data to rows   │
│ - Splits income into 3 brackets       │
│ - Range: -1 to +1                     │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ calculatePersonaScores()              │
│ For each persona:                     │
│ 1. Match characteristics to mappings  │
│ 2. Apply multipliers (3, 2, or 1)    │
│ 3. Sum by category                    │
│ 4. Apply category weights             │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ Calculate Rankings                    │
│ - R-rank: % of max possible score    │
│ - Z-rank: Standardized distribution   │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ Display in Tables                     │
│ - Summary Ranking Table               │
│ - Detailed Scoring Table              │
└───────────────────────────────────────┘
```

## Real Data vs Dummy Data

### When Real Data is Used

When you **search for an address** and location data is loaded:
- `extractLocationScores()` extracts actual scores from UnifiedLocationData
- Scores include negative values from real location analysis
- Residential data (housing types, sizes, prices) is converted to scored rows
- Income is split into 3 brackets (low/medium/high) based on national median
- Example: If a location has poor upscale dining options, the score for "Upscale Restaurants (€€€€-€€€€€)" will be negative

### When Dummy Data is Used

When **no address is searched yet**:
- DoelgroepenGrid uses predefined dummy data
- Dummy data includes negative scores to demonstrate the system
- This allows users to see how the tables work before searching

## Score Extraction Details

### From Calculated Scores
Preferred method - uses scores already calculated by the scoring system:
```typescript
if (row.calculatedScore !== undefined && row.calculatedScore !== null) {
  scores[row.title] = row.calculatedScore;  // Already in -1 to +1 range
}
```

### From Relative Percentages
Fallback method - normalizes percentage values:
```typescript
else if (row.relative !== null) {
  scores[row.title] = normalizePercentage(row.relative);
}

function normalizePercentage(percentage: number): number {
  if (percentage < 30) return (percentage / 30) - 1;      // -1 to 0
  if (percentage < 70) return ((percentage - 30) / 40) - 0.5; // -0.5 to 0.5
  return ((percentage - 70) / 30) * 0.5 + 0.5;            // 0.5 to 1
}
```

## Understanding Negative Scores

### Why Negative Scores Matter

Negative scores indicate **unfavorable** conditions:
- **-0.8**: Very poor (e.g., no hospitals nearby)
- **-0.4**: Below average (e.g., limited retail options)
- **0.0**: Neutral/average
- **+0.4**: Above average
- **+0.8**: Excellent

### How They Affect Rankings

When multiplied by importance multipliers:
- **Most important (×3)**: -0.5 becomes **-1.5** (major penalty)
- **Average important (×2)**: -0.5 becomes **-1.0** (moderate penalty)
- **Least important (×1)**: -0.5 becomes **-0.5** (minor penalty)

This ensures personas who value certain characteristics more are MORE affected by poor scores in those areas.

## Ranking Methods

### R-Rank (Relative Rank)
```
R-rank = (Achieved Score / Maximum Possible Score) × 100%
```

**Interpretation**:
- 80-100%: Excellent match for this location
- 60-80%: Good match
- 40-60%: Moderate match
- 20-40%: Poor match
- 0-20%: Very poor match
- Negative: Location has significant drawbacks for this persona

**Can R-rank be negative?**
Yes! If the achieved score is negative (more penalties than benefits), R-rank will be negative, indicating this location is unsuitable for that persona.

### Z-Rank (Standardized Rank)
```
z-score = (score - mean) / standard_deviation
Z-rank = tanh(z-score / 2)  // Normalize to -1 to +1
```

**Interpretation**:
- +0.5 to +1.0: Well above average
- 0 to +0.5: Above average
- 0 to -0.5: Below average
- -0.5 to -1.0: Well below average

Z-rank shows how each persona compares to others for this location.

## Example: Complete Calculation

**Location**: Amsterdam Centrum (searched address)

**Extracted Scores**:
- Openbaar vervoer (halte): **+0.9** (excellent)
- Upscale Restaurants: **+0.7** (very good)
- Woonoppervlak - Groot: **-0.6** (few large homes)
- Koopwoningen: **-0.4** (limited ownership)

**For "Jonge Starters" (20-35, low income, 1-person)**:

1. **Match characteristics**:
   - Openbaar vervoer: age 20-35 = "most" → ×3
   - Openbaar vervoer: low income = "most" → ×3
   - Upscale Restaurants: low income = "least" → ×1
   - Woonoppervlak - Groot: 1-person = "least" → ×1
   - Koopwoningen: low income = "least" → ×1

2. **Calculate weighted scores**:
   - +0.9 × 3 = +2.7 (public transport - very good!)
   - +0.9 × 3 = +2.7 (public transport again - income match)
   - +0.7 × 1 = +0.7 (restaurants - don't care much)
   - -0.6 × 1 = -0.6 (large homes - don't need them)
   - -0.4 × 1 = -0.4 (ownership - not a priority)

3. **Sum and apply category weights**:
   - Voorzieningen category total × 1.0
   - Woningvooraad category total × 0.8
   - Final weighted total: **~15.2**

4. **Calculate rankings**:
   - Max possible: ~40 (if all scores were +1 with ×3)
   - R-rank: 15.2 / 40 = **38%** (moderate match)
   - Z-rank: Compare to other personas → **+0.15** (slightly above average)

## Key Takeaways

1. ✅ **Real data is used** when you search for an address
2. ✅ **Negative scores are preserved** and amplified by multipliers
3. ✅ **Personas who value characteristics more** are MORE affected by poor scores
4. ✅ **R-rank can be negative** indicating unsuitable locations
5. ✅ **Z-rank shows relative performance** compared to other personas
6. ✅ **Dummy data is only for demonstration** when no address is searched

## Testing the System

To see negative scores in action:
1. Search for an address with known limitations
2. Go to **Doelgroepen** tab
3. Click **Score Tabellen**
4. Look at the **Detailed Scoring Table** for individual scores
5. Check the **Summary Ranking Table** for overall rankings

Personas that value the location's weak areas will rank lower!
