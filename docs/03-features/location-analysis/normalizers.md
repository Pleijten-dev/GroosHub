# Data Normalizers & Aggregators Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [How Normalizers Work](#how-normalizers-work)
- [How the Aggregator Works](#how-the-aggregator-works)
- [Updating Existing Datasets](#updating-existing-datasets)
- [Adding New Data Sources](#adding-new-data-sources)
- [Testing Your Changes](#testing-your-changes)
- [Troubleshooting](#troubleshooting)

---

## Overview

The normalizers and aggregators form **Step 2** of the data processing pipeline:

```
Step 1: Data Retrieval (API Clients)
    ↓
Step 2: Key Normalization (Normalizers) ← YOU ARE HERE
    ↓
Step 3: Data Transformation (multiLevelAggregator)
    ↓
Step 4: Data Presentation (UI Components)
```

**Purpose:**
- Transform raw CBS StatLine API keys (e.g., `Gemeentenaam_1`) to human-readable format (e.g., `Gemeentenaam`)
- Map crime codes (e.g., `Crime_0.0.0`) to descriptive names (e.g., `Totaal misdrijven`)
- Provide a single source of truth for key mappings

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API CLIENTS                              │
│  (CBS Demographics, RIVM Health, CBS Livability, Politie)   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          Raw Data: { "AantalInwoners_5": 872680 }
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   NORMALIZERS                                │
│  Transform keys to human-readable format                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
      Normalized: { "Aantal Inwoners": 872680 }
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              MULTI-LEVEL AGGREGATOR                          │
│  Combines all sources into unified structure                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                UnifiedLocationData
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  UI COMPONENTS                               │
│         (MultiLevelDataTable, etc.)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/features/location/data/
├── normalizers/
│   ├── index.ts                         # Barrel exports
│   ├── demographicsKeyNormalizer.ts     # CBS Demographics (84583NED)
│   ├── healthKeyNormalizer.ts           # RIVM Health (50120NED)
│   ├── livabilityKeyNormalizer.ts       # CBS Livability (85146NED)
│   ├── safetyKeyNormalizer.ts           # Politie Safety (47018NED)
│   └── README.md                        # This file
│
├── aggregator/
│   └── multiLevelAggregator.ts          # Combines & transforms data
│
└── sources/
    ├── cbs-demographics/client.ts
    ├── rivm-health/client.ts
    ├── cbs-livability/client.ts
    └── politie-safety/client.ts
```

---

## How Normalizers Work

### Normalizer Structure

Each normalizer file exports:

1. **Key Map** - Maps raw keys to readable labels
2. **Normalize Function** - Transforms entire data objects
3. **Get Readable Key** - Gets single key label
4. **Is Known Key** - Checks if key exists in mapping

### Example: Demographics Normalizer

```typescript
// demographicsKeyNormalizer.ts

// 1. Key mapping
export const demographicsKeyMap: Record<string, string> = {
  Gemeentenaam_1: 'Gemeentenaam',
  AantalInwoners_5: 'Aantal Inwoners',
  Bevolkingsdichtheid_33: 'Bevolkingsdichtheid',
  // ... more mappings
};

// 2. Normalize entire object
export function normalizeDemographicsKeys(
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = demographicsKeyMap[key] || key;
    normalized[normalizedKey] = value;
  }

  return normalized;
}

// 3. Get single readable key
export function getReadableKey(key: string): string {
  return demographicsKeyMap[key] || key;
}

// 4. Check if key exists
export function isKnownKey(key: string): boolean {
  return key in demographicsKeyMap;
}
```

### Safety Normalizer (Special Case)

Safety data uses crime codes instead of suffixed keys:

```typescript
// safetyKeyNormalizer.ts

// Maps crime codes to crime type metadata
export const crimeTypeMap: Record<string, CrimeType> = {
  '0.0.0': {
    key: '0.0.0',
    title: 'Totaal misdrijven',
    description: null,
  },
  '1.1.1': {
    key: '1.1.1',
    title: 'Diefstal/inbraak woning',
    description: 'A20 Gekwal. Diefstal in/uit woning...',
  },
  // ... more crime types
};

// Extracts code from "Crime_0.0.0" format
export function normalizeSafetyKey(crimeCode: string): string {
  const codeMatch = crimeCode.match(/(\d+\.\d+\.\d+)/);
  if (!codeMatch) return crimeCode;

  const code = codeMatch[1].trim();
  const crimeType = crimeTypeMap[code];

  return crimeType ? crimeType.title : crimeCode;
}
```

---

## How the Aggregator Works

The `multiLevelAggregator.ts` orchestrates the entire data transformation process:

```typescript
// multiLevelAggregator.ts

import { getReadableKey as getDemographicsReadableKey } from '../normalizers/demographicsKeyNormalizer';
import { getReadableKey as getHealthReadableKey } from '../normalizers/healthKeyNormalizer';
import { getReadableKey as getLivabilityReadableKey } from '../normalizers/livabilityKeyNormalizer';
import { normalizeSafetyKey } from '../normalizers/safetyKeyNormalizer';

class MultiLevelAggregator {
  // Converts raw data to UnifiedDataRow[]
  private convertToRows(
    data: Record<string, unknown>,
    source: 'demographics' | 'health' | 'livability' | 'safety',
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const rows: UnifiedDataRow[] = [];

    Object.entries(data).forEach(([key, value]) => {
      // Skip metadata fields
      if (['ID', 'WijkenEnBuurten', 'RegioS', 'Perioden', 'Leeftijd', 'Marges'].includes(key)) {
        return;
      }

      // Normalize the key based on the source
      let normalizedKey = key;
      switch (source) {
        case 'demographics':
          normalizedKey = getDemographicsReadableKey(key);
          break;
        case 'health':
          normalizedKey = getHealthReadableKey(key);
          break;
        case 'livability':
          normalizedKey = getLivabilityReadableKey(key);
          break;
      }

      rows.push({
        source,
        geographicLevel,
        geographicCode,
        geographicName,
        key: normalizedKey,  // ← Human-readable key
        value,
        displayValue: this.formatValue(value),
      });
    });

    return rows;
  }
}
```

---

## Updating Existing Datasets

### Scenario: CBS Updates a Dataset

When CBS updates a dataset (e.g., adds new indicators to Demographics 84583NED):

### Step 1: Identify New Keys

Check the CBS API for new fields:

```bash
# Example API endpoint
https://dataderden.cbs.nl/ODataApi/OData/84583NED
```

Look for new keys like:
- `NieuweIndicator_117`
- `ExtraMetric_118`

### Step 2: Update the Normalizer

Open the appropriate normalizer file:

```typescript
// demographicsKeyNormalizer.ts

export const demographicsKeyMap: Record<string, string> = {
  // ... existing mappings ...

  // NEW: Add your new mappings here
  NieuweIndicator_117: 'Nieuwe Indicator',
  ExtraMetric_118: 'Extra Metric',

  // Keep alphabetical or grouped by category for maintainability
};
```

### Step 3: Test the Changes

```bash
# Run TypeScript check
npx tsc --noEmit

# Test the normalization
npm run dev
# Visit http://localhost:3000/location
# Search for a location and verify new keys display correctly
```

### Step 4: Commit Your Changes

```bash
git add src/features/location/data/normalizers/demographicsKeyNormalizer.ts
git commit -m "Update demographics normalizer with new CBS indicators"
git push
```

---

## Adding New Data Sources

### Scenario: Adding a New API (e.g., "CBS Education")

Follow these steps to add a completely new data source:

### Step 1: Create the API Client

Create a new client file:

```typescript
// src/features/location/data/sources/cbs-education/client.ts

export interface CBSEducationResponse {
  national?: { level: Level; data: Record<string, unknown>; fetchedAt: Date };
  municipality?: { level: Level; data: Record<string, unknown>; fetchedAt: Date };
  district?: { level: Level; data: Record<string, unknown>; fetchedAt: Date };
  neighborhood?: { level: Level; data: Record<string, unknown>; fetchedAt: Date };
}

export class CBSEducationClient {
  private readonly DATASET_ID = '12345NED'; // Replace with actual dataset ID

  async fetchMultiLevel(statcodes: StatCodes): Promise<CBSEducationResponse> {
    // Implementation similar to other clients
  }
}
```

### Step 2: Create the Normalizer

Create a new normalizer file:

```typescript
// src/features/location/data/normalizers/educationKeyNormalizer.ts

/**
 * CBS Education Key Normalizer
 */
export const educationKeyMap: Record<string, string> = {
  // Map your keys here
  SchoolType_1: 'School Type',
  NumberOfStudents_2: 'Number Of Students',
  GraduationRate_3: 'Graduation Rate',
  // ... more mappings
};

/**
 * Normalizes CBS Education data keys
 */
export function normalizeEducationKeys(
  rawData: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawData)) {
    const normalizedKey = educationKeyMap[key] || key;
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Gets the human-readable label for a CBS Education key
 */
export function getReadableKey(key: string): string {
  return educationKeyMap[key] || key;
}

/**
 * Checks if a key exists in the education key map
 */
export function isKnownKey(key: string): boolean {
  return key in educationKeyMap;
}
```

### Step 3: Update the Barrel Export

Add your normalizer to the index:

```typescript
// src/features/location/data/normalizers/index.ts

export {
  educationKeyMap,
  normalizeEducationKeys,
  getReadableKey as getEducationReadableKey,
  isKnownKey as isEducationKnownKey,
} from './educationKeyNormalizer';
```

### Step 4: Update the Aggregator

Add support for the new source:

```typescript
// src/features/location/data/aggregator/multiLevelAggregator.ts

// 1. Add import
import { getReadableKey as getEducationReadableKey } from '../normalizers/educationKeyNormalizer';
import type { CBSEducationMultiLevelResponse } from '../sources/cbs-education/client';

// 2. Update UnifiedLocationData interface
export interface UnifiedLocationData {
  location: LocationData;
  demographics: { national: UnifiedDataRow[]; municipality: UnifiedDataRow[]; /* ... */ };
  health: { /* ... */ };
  livability: { /* ... */ };
  safety: { /* ... */ };
  education: {  // ← NEW
    national: UnifiedDataRow[];
    municipality: UnifiedDataRow[];
    district: UnifiedDataRow[];
    neighborhood: UnifiedDataRow[];
  };
  fetchedAt: Date;
}

// 3. Update aggregate method
aggregate(
  locationData: LocationData,
  demographics: CBSDemographicsMultiLevelResponse,
  health: RIVMHealthMultiLevelResponse,
  livability: CBSLivabilityMultiLevelResponse,
  safety: PolitieSafetyMultiLevelResponse,
  education: CBSEducationMultiLevelResponse  // ← NEW parameter
): UnifiedLocationData {
  return {
    // ... existing sources ...
    education: {  // ← NEW
      national: education.national
        ? this.convertToRows(
            education.national.data,
            'education',
            'national',
            education.national.level.code,
            'Nederland'
          )
        : [],
      municipality: education.municipality
        ? this.convertToRows(
            education.municipality.data,
            'education',
            'municipality',
            education.municipality.level.code,
            locationData.municipality.statnaam
          )
        : [],
      // ... district and neighborhood levels
    },
    fetchedAt: new Date(),
  };
}

// 4. Update convertToRows to handle new source
private convertToRows(
  data: Record<string, unknown>,
  source: 'demographics' | 'health' | 'livability' | 'safety' | 'education',  // ← Add 'education'
  geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
  geographicCode: string,
  geographicName: string
): UnifiedDataRow[] {
  // ... existing code ...

  switch (source) {
    case 'demographics':
      normalizedKey = getDemographicsReadableKey(key);
      break;
    case 'health':
      normalizedKey = getHealthReadableKey(key);
      break;
    case 'livability':
      normalizedKey = getLivabilityReadableKey(key);
      break;
    case 'education':  // ← NEW
      normalizedKey = getEducationReadableKey(key);
      break;
  }

  // ... rest of function
}
```

### Step 5: Update the Hook

Update `useLocationData` to fetch the new source:

```typescript
// src/features/location/hooks/useLocationData.ts

export function useLocationData(address: string) {
  // ... existing code ...

  // Add new client
  const educationClient = new CBSEducationClient();

  // Fetch education data in parallel with others
  const [demographics, health, livability, safety, education] = await Promise.all([
    demographicsClient.fetchMultiLevel(statcodes),
    healthClient.fetchMultiLevel(statcodes),
    livabilityClient.fetchMultiLevel(statcodes),
    safetyClient.fetchMultiLevel(statcodes),
    educationClient.fetchMultiLevel(statcodes),  // ← NEW
  ]);

  // Pass to aggregator
  const aggregated = aggregator.aggregate(
    locationData,
    demographics,
    health,
    livability,
    safety,
    education  // ← NEW
  );
}
```

### Step 6: Update UI Components

Update the data table to show the new source:

```typescript
// src/features/location/components/DataTables/MultiLevelDataTable.tsx

type DataSource = 'demographics' | 'health' | 'livability' | 'safety' | 'education';  // ← Add 'education'

const SOURCE_LABELS = {
  demographics: { nl: 'Demografie (CBS)', en: 'Demographics (CBS)' },
  health: { nl: 'Gezondheid (RIVM)', en: 'Health (RIVM)' },
  livability: { nl: 'Leefbaarheid (CBS)', en: 'Livability (CBS)' },
  safety: { nl: 'Veiligheid (Politie)', en: 'Safety (Police)' },
  education: { nl: 'Onderwijs (CBS)', en: 'Education (CBS)' },  // ← NEW
};

// Update filter logic to include education data
const getFilteredRows = (): UnifiedDataRow[] => {
  switch (selectedLevel) {
    case 'municipality':
      rows.push(...data.demographics.municipality);
      rows.push(...data.health.municipality);
      rows.push(...data.livability.municipality);
      rows.push(...data.safety.municipality);
      rows.push(...data.education.municipality);  // ← NEW
      break;
    // ... other levels
  }
};
```

---

## Testing Your Changes

### 1. TypeScript Validation

```bash
# Check for type errors
npx tsc --noEmit --skipLibCheck
```

### 2. Local Testing

```bash
# Start development server
npm run dev

# Visit the location page
# Open http://localhost:3000/location

# Test with a real address
# Example: "Kalverstraat 1, Amsterdam"
```

### 3. Verify Normalized Keys

Check the data table displays:
- ✅ Human-readable key names (not `SomeKey_123`)
- ✅ Proper formatting of values
- ✅ Correct source badges (colors)
- ✅ All geographic levels work

### 4. Edge Cases to Test

- **Missing data**: Some neighborhoods may not have all data
- **Null values**: Ensure `-` is displayed for null/undefined
- **Large numbers**: Check number formatting (e.g., `1.234.567`)
- **Unknown keys**: Fallback to original key if not in map

---

## Troubleshooting

### Problem: Keys Still Show as `SomeKey_123` Format

**Cause:** Normalizer not applied in aggregator

**Solution:**
1. Check import in `multiLevelAggregator.ts`
2. Verify switch statement includes your source
3. Ensure `getReadableKey` is called for each key

```typescript
// ❌ Wrong - missing normalization
rows.push({ key, value, ... });

// ✅ Correct - key is normalized
const normalizedKey = getReadableKey(key);
rows.push({ key: normalizedKey, value, ... });
```

### Problem: TypeScript Errors After Adding New Source

**Cause:** Type definitions not updated

**Solution:**
1. Update `UnifiedDataRow` source type
2. Update `UnifiedLocationData` interface
3. Update all switch statements to include new source
4. Update UI component types

### Problem: Some Keys Return Original Format

**Cause:** Key not in normalizer map

**Solution:**
1. Check if key exists in CBS API response
2. Add missing key to normalizer map
3. Verify key spelling matches exactly (case-sensitive)

```typescript
// Debug: Log unmapped keys
Object.entries(data).forEach(([key, value]) => {
  if (!isKnownKey(key)) {
    console.warn(`Unknown key: ${key}`);
  }
});
```

### Problem: Crime Codes Not Normalizing

**Cause:** Crime code pattern not matching

**Solution:**
1. Check crime code format in API response
2. Verify regex pattern in `normalizeSafetyKey`
3. Ensure crime code exists in `crimeTypeMap`

```typescript
// Debug crime code extraction
const codeMatch = crimeCode.match(/(\d+\.\d+\.\d+)/);
console.log('Crime code:', crimeCode, '→ Extracted:', codeMatch?.[1]);
```

### Problem: Build Fails After Changes

**Cause:** Import paths or type mismatches

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## Best Practices

### 1. Naming Conventions

- **Normalizer files**: `{source}KeyNormalizer.ts`
- **Key maps**: `{source}KeyMap`
- **Functions**: Use consistent naming (`normalizeXKeys`, `getReadableKey`, `isKnownKey`)

### 2. Key Mapping Organization

Organize keys by category for maintainability:

```typescript
export const demographicsKeyMap: Record<string, string> = {
  // Geographic identifiers
  Gemeentenaam_1: 'Gemeentenaam',
  SoortRegio_2: 'Soort Regio',

  // Population - Total and Gender
  AantalInwoners_5: 'Aantal Inwoners',
  Mannen_6: 'Mannen',

  // Population - Age Groups
  k_0Tot15Jaar_8: '0 Tot 15 Jaar',
  // ...
};
```

### 3. Documentation

Always add JSDoc comments:

```typescript
/**
 * Normalizes CBS Demographics data by transforming keys from suffixed format to human-readable format
 *
 * @param rawData - Raw data object from CBS API
 * @returns Normalized data object with human-readable keys
 *
 * @example
 * ```typescript
 * const raw = { Gemeentenaam_1: "Amsterdam", AantalInwoners_5: 872680 };
 * const normalized = normalizeDemographicsKeys(raw);
 * // { "Gemeentenaam": "Amsterdam", "Aantal Inwoners": 872680 }
 * ```
 */
```

### 4. Fallback Behavior

Always provide fallback to original key:

```typescript
// ✅ Good - has fallback
const normalizedKey = keyMap[key] || key;

// ❌ Bad - throws on unknown key
const normalizedKey = keyMap[key];
```

### 5. Testing New Mappings

Create a simple test to verify mappings:

```typescript
// Test in browser console or create a test file
const testData = {
  AantalInwoners_5: 100000,
  UnknownKey_999: 123,
};

const normalized = normalizeDemographicsKeys(testData);
console.log(normalized);
// Expected: { "Aantal Inwoners": 100000, "UnknownKey_999": 123 }
```

---

## Quick Reference

### Common Tasks

| Task | Files to Edit |
|------|---------------|
| Add new key to existing source | `{source}KeyNormalizer.ts` |
| Add new data source | Create normalizer + update aggregator + update hook + update UI |
| Fix incorrect key label | Update mapping in `{source}KeyNormalizer.ts` |
| Debug unmapped keys | Add logging in `convertToRows()` |

### File Checklist for New Source

- [ ] Create API client (`/sources/{source}/client.ts`)
- [ ] Create normalizer (`/normalizers/{source}KeyNormalizer.ts`)
- [ ] Update barrel export (`/normalizers/index.ts`)
- [ ] Update aggregator types (`multiLevelAggregator.ts`)
- [ ] Update aggregator logic (`multiLevelAggregator.ts`)
- [ ] Update hook (`useLocationData.ts`)
- [ ] Update UI component (`MultiLevelDataTable.tsx`)
- [ ] Test with real data
- [ ] Commit and push

---

## Support

For questions or issues:

1. Check this documentation
2. Review existing normalizers for examples
3. Check TypeScript errors carefully
4. Test with real CBS API responses
5. Consult CBS StatLine documentation: https://www.cbs.nl/nl-nl/onze-diensten/open-data

---

**Last Updated:** 2025-01-27
**Version:** 1.0.0
**Maintained By:** Development Team
