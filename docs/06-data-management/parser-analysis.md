# Parser vs Normalizer Analysis

## Current State

### Normalizers
**Location:** `src/features/location/data/normalizers/`

**Purpose:** Transform raw API keys to human-readable format

**Implementation:**
- Simple key-to-label mapping dictionaries
- Example: `AantalInwoners_5` → `Aantal Inwoners`
- Provide `getReadableKey()` function for lookups

**Files:**
- `demographicsKeyNormalizer.ts` - CBS Demographics (84583NED)
- `healthKeyNormalizer.ts` - RIVM Health (50120NED)
- `livabilityKeyNormalizer.ts` - CBS Livability (85146NED)
- `safetyKeyNormalizer.ts` - Politie Safety (47018NED)

### Parsers
**Location:** `src/features/location/data/parsers/`

**Purpose:** Convert raw API data into structured ParsedDataset format

**Implementation:**
- Define mapping arrays with:
  - `key`: API field name
  - `title`: Human-readable label (DUPLICATED FROM NORMALIZERS)
  - `getAbsolute()`: Function to extract absolute value
  - `getRelative()`: Function to calculate relative value
  - `unit`: Optional unit string

**Files:**
- `demographicsParser.ts`
- `healthParser.ts`
- `livabilityParser.ts`
- `safetyParser.ts`

## Duplication Analysis

### ✅ What's NOT Duplicated
- **Value extraction logic**: Parsers handle complex calculations (absolute/relative values)
- **Population-based calculations**: Parsers perform per-capita conversions
- **Unit assignment**: Parsers determine appropriate units (%, count, etc.)
- **Data validation**: Parsers handle null values, type conversions

### ⚠️ What IS Duplicated
- **Title/Label generation**: Both parsers and normalizers define human-readable labels
- **Current state**:
  - Normalizers define complete key-to-label mappings
  - Parsers import normalizers but DON'T use them
  - Parsers hardcode titles in their mapping arrays

### Evidence
```typescript
// demographicsParser.ts - Line 9
import { getReadableKey } from '../normalizers/demographicsKeyNormalizer';

// But getReadableKey() is NEVER called in the parser
// Instead, titles are hardcoded in mappings:
{
  key: 'AantalInwoners_5',
  title: 'Aantal Inwoners',  // DUPLICATES normalizer
  getAbsolute: () => getNumber('AantalInwoners_5'),
  getRelative: () => null
}
```

## Impact Assessment

### Current Impact: LOW
- Both systems work independently
- No functional bugs or errors
- Data is processed correctly

### Maintenance Impact: MEDIUM
- When adding new indicators, must update BOTH normalizers AND parsers
- Risk of inconsistent labels between systems
- Extra work for developers

### Code Quality Impact: MEDIUM
- Violates DRY (Don't Repeat Yourself) principle
- Unused imports (normalizers imported but not used)
- Larger codebase to maintain

## Recommendations

### Option 1: Parsers Use Normalizers (Recommended)
**Pros:**
- Single source of truth for labels
- Easier maintenance
- Smaller codebase

**Cons:**
- Requires refactoring all 4 parsers
- Need to test thoroughly

**Implementation:**
```typescript
// BEFORE (current)
{
  key: 'AantalInwoners_5',
  title: 'Aantal Inwoners',
  getAbsolute: () => getNumber('AantalInwoners_5'),
  getRelative: () => null
}

// AFTER (proposed)
{
  key: 'AantalInwoners_5',
  title: getReadableKey('AantalInwoners_5'),
  getAbsolute: () => getNumber('AantalInwoners_5'),
  getRelative: () => null
}
```

### Option 2: Remove Normalizers
**Pros:**
- Simpler architecture (one less system)
- Parsers already have all the logic

**Cons:**
- Lose centralized label management
- Harder to update labels across system
- Aggregator would need refactoring (currently imports normalizers)

### Option 3: Status Quo
**Pros:**
- No changes needed
- Current system works

**Cons:**
- Continued duplication
- Higher maintenance burden

## Decision

**For this implementation:** Maintain status quo with scoring system changes

**Future recommendation:** Refactor parsers to use normalizers (Option 1)

## Conclusion

**Duplication exists but is isolated to title/label generation.** The core responsibilities are properly separated:
- **Normalizers**: Key → Label mapping
- **Parsers**: Raw data → Structured data with calculations

The duplication is a code quality issue, not a functional bug. It should be addressed in a future refactoring effort to improve maintainability.

**Status:** ✅ Verified - Duplication documented, recommendation made
