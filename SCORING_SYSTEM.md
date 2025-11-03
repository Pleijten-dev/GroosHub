# Location Data Point Scoring System

## Overview

The scoring system evaluates location data points by comparing them against national benchmarks. Each data point receives a score of `-1`, `0`, or `1` based on how it performs relative to the national average, considering configurable margins and direction.

## Architecture

### Core Components

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

## Data Point Values

Each data point has **8 total values** (3 existing + 5 new):

### Existing Values
1. **originalValue**: Raw value from API
2. **absolute**: Absolute count/amount
3. **relative**: Percentage or per-capita value

### New Scoring Values
4. **comparisonType**: Which value to use ('relatief' or 'absoluut')
5. **margin**: Acceptable variance percentage (default: 20%)
6. **baseValue**: Benchmark for comparison (default: national level)
7. **direction**: Whether higher is better ('positive' or 'negative')
8. **calculatedScore**: Final score (-1, 0, or 1)

## Scoring Calculation

### Algorithm

1. **Select Comparison Value**
   ```typescript
   const comparisonValue = comparisonType === 'relatief'
     ? location.relative
     : location.absolute;
   ```

2. **Determine Base Value**
   ```typescript
   const baseValue = config.baseValue ?? national[comparisonType];
   ```

3. **Calculate Bounds**
   ```typescript
   const marginValue = Math.abs(baseValue) * (margin / 100);
   const lowerBound = baseValue - marginValue;
   const upperBound = baseValue + marginValue;
   ```

4. **Calculate Score**
   ```typescript
   if (comparisonValue < lowerBound) {
     rawScore = -1;
   } else if (comparisonValue > upperBound) {
     rawScore = 1;
   } else {
     rawScore = 0;
   }
   ```

5. **Apply Direction**
   ```typescript
   if (direction === 'negative') {
     score = rawScore * -1; // Invert
   }
   ```

### Score Interpretation

- **`-1`**: Below threshold (worse than national average)
- **`0`**: Within acceptable range (comparable to national average)
- **`1`**: Above threshold (better than national average)

### Direction Behavior

**Positive Direction** (default):
- Higher values = Better = Score `1`
- Lower values = Worse = Score `-1`
- Example: Health quality, income levels

**Negative Direction**:
- Higher values = Worse = Score `-1`
- Lower values = Better = Score `1`
- Example: Crime rates, unemployment

## Configuration

### Default Values

```typescript
{
  comparisonType: 'relatief',  // Use relative values
  margin: 20,                   // 20% variance threshold
  baseValue: null,              // Use national level
  direction: 'positive'         // Higher is better
}
```

### JSON Configuration Format

```json
{
  "demographics": {
    "WerkloosheidsPercentage": {
      "direction": "negative",
      "margin": 15
    }
  },
  "health": {
    "Overgewicht_17": {
      "direction": "negative",
      "margin": 20
    }
  },
  "safety": {
    "DiefstalinbraakWoning_1": {
      "direction": "negative",
      "margin": 25
    }
  },
  "livability": {
    "FysiekLeefomgeving_1": {
      "direction": "positive",
      "margin": 15
    }
  }
}
```

### Configuration Override Priority

1. **JSON file override** (highest priority)
2. **Function parameter override**
3. **Default values** (lowest priority)

## Usage Examples

### Example 1: Crime Rate (Negative Direction)

```typescript
// National level: 50 crimes per 1000 residents
// Location level: 70 crimes per 1000 residents
// Margin: 25%
// Direction: negative (lower is better)

// Calculation:
// lowerBound = 50 - (50 * 0.25) = 37.5
// upperBound = 50 + (50 * 0.25) = 62.5
// 70 > 62.5 → rawScore = 1
// direction === 'negative' → finalScore = -1 (inverted)

// Result: Score -1 (worse than national average)
```

### Example 2: Health Quality (Positive Direction)

```typescript
// National level: 75% report good health
// Location level: 82% report good health
// Margin: 15%
// Direction: positive (higher is better)

// Calculation:
// lowerBound = 75 - (75 * 0.15) = 63.75
// upperBound = 75 + (75 * 0.15) = 86.25
// 82 is between 63.75 and 86.25 → score = 0

// Result: Score 0 (comparable to national average)
```

### Example 3: Income Level (Positive Direction)

```typescript
// National level: €35,000
// Location level: €42,000
// Margin: 20%
// Direction: positive (higher is better)

// Calculation:
// lowerBound = 35000 - (35000 * 0.20) = 28,000
// upperBound = 35000 + (35000 * 0.20) = 42,000
// 42000 = 42000 → score = 0 (on the boundary)

// Result: Score 0 (at upper threshold)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Data Fetching (useLocationData hook)                    │
│    - Fetch location data for all geographic levels         │
│    - Fetch national data                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Parsing (Individual Parsers)                            │
│    - DemographicsParser                                     │
│    - HealthParser                                           │
│    - LivabilityParser                                       │
│    - SafetyParser                                           │
│    Creates ParsedValue objects (without scoring yet)       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Aggregation (MultiLevelAggregator)                      │
│    - Load scoring configuration                             │
│    - Parse national level data                              │
│    - For each non-national level:                           │
│      • Apply scoring via applyScoringToDataset()            │
│      • Compare against national baseline                    │
│      • Calculate scores                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Output (UnifiedLocationData)                            │
│    - Each UnifiedDataRow includes:                          │
│      • scoring: ScoringConfig                               │
│      • calculatedScore: -1 | 0 | 1 | null                   │
│    - National level rows have no scoring                    │
│    - Municipality/District/Neighborhood have scores         │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### TypeScript Interfaces

```typescript
export interface ParsedValue {
  title: string;
  originalValue: string | number | null;
  absolute: number | null;
  relative: number | null;
  unit?: string;
  scoring?: ScoringConfig;
  calculatedScore?: -1 | 0 | 1 | null;
}

export interface UnifiedDataRow {
  // ... existing fields ...
  scoring?: ScoringConfig;
  calculatedScore?: -1 | 0 | 1 | null;
}
```

### Key Functions

**calculateScore()**
```typescript
function calculateScore(
  parsedValue: ParsedValue,
  nationalValue: ParsedValue | null,
  config?: ScoringConfigOverride
): -1 | 0 | 1 | null
```

**applyScoringToDataset()**
```typescript
function applyScoringToDataset(
  locationDataset: Map<string, ParsedValue>,
  nationalDataset: Map<string, ParsedValue> | null,
  source: string,
  configOverrides?: ScoringConfigOverrides
): Map<string, ParsedValue>
```

## Testing

### Test Scenarios

1. **Positive Direction, Above Threshold**
   - Input: value > upperBound, direction = 'positive'
   - Expected: score = 1

2. **Positive Direction, Below Threshold**
   - Input: value < lowerBound, direction = 'positive'
   - Expected: score = -1

3. **Negative Direction, Above Threshold**
   - Input: value > upperBound, direction = 'negative'
   - Expected: score = -1 (inverted)

4. **Within Range**
   - Input: lowerBound ≤ value ≤ upperBound
   - Expected: score = 0

5. **Null Values**
   - Input: value = null or nationalValue = null
   - Expected: score = null

## Future Enhancements

### Planned
- [ ] Add support for custom scoring algorithms
- [ ] Implement weighted scoring across multiple indicators
- [ ] Add historical trend analysis
- [ ] Create scoring visualization components

### Considerations
- [ ] Refactor parsers to use normalizers (reduce duplication)
- [ ] Add scoring presets for common use cases
- [ ] Support for custom comparison functions
- [ ] Multi-level baseline comparisons (e.g., vs municipality, not just national)

## Maintenance

### Adding New Indicators

1. **Update scoring-config.json** (if non-default behavior needed)
   ```json
   {
     "demographics": {
       "NewIndicator_123": {
         "direction": "negative",
         "margin": 15
       }
     }
   }
   ```

2. **Parser automatically handles scoring** (no code changes needed)

3. **Test with sample data** to verify correct scoring

### Modifying Thresholds

Update `scoring-config.json`:
```json
{
  "health": {
    "Overgewicht_17": {
      "margin": 25  // Changed from 20% to 25%
    }
  }
}
```

## References

- Types: `src/features/location/data/parsers/types.ts`
- Scoring Logic: `src/features/location/data/parsers/scoring.ts`
- Configuration: `src/features/location/data/parsers/scoring-config.json`
- Integration: `src/features/location/data/aggregator/multiLevelAggregator.ts`
- Usage: `src/features/location/hooks/useLocationData.ts`
