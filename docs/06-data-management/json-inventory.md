# JSON Data Files Inventory

## 📊 Complete List of JSON Files in GroosHub Project

Generated: 2025-11-21

---

## ✅ **ACTIVE & VALIDATED** - Core LLM Data Files

These JSON files are actively used by the LLM and validated by `npm run validate:data`:

### 1. **housing-personas.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 51KB
- **Purpose:** Defines all target group personas with demographics, income levels, housing preferences
- **Used by:**
  - `/app/[locale]/location/page.tsx`
  - `/src/features/location/utils/jsonExportCompact.ts`
  - `/src/features/location/components/Doelgroepen/DoelgroepenGrid.tsx`
  - API: `generate-building-program/route.ts` (indirectly via rapport data)
- **Structure:** Bilingual (nl/en), contains `housing_personas` array
- **Status:** ✅ Active, Core Data
- **Validation:** ✅ Persona names checked against target_groups

### 2. **housing-typologies.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 8.2KB
- **Purpose:** Available apartment typologies (studio, 1-bed, 2-bed, penthouse, etc.)
- **Used by:**
  - API: `generate-building-program/route.ts`
  - Validation script
- **Structure:** Bilingual (nl/en), contains `typologies` array with id, name, bedrooms, area_m2
- **Status:** ✅ Active, Core Data
- **Validation:** ✅ All typology_ids referenced in property-type-mapping are validated

### 3. **property-type-mapping.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 6.3KB (updated Nov 21)
- **Purpose:** Maps persona housing preferences to concrete apartment typology IDs
- **Used by:**
  - API: `generate-building-program/route.ts`
  - Validation script
- **Structure:** Bilingual (nl/en), maps housing preference strings to typology_ids arrays
- **Status:** ✅ Active, Core Data, **JUST FIXED**
- **Validation:** ✅ All mappings validated (0 errors after recent fix)
- **Recent Changes:** Added "Middensegment 2-kamer grondgebonden woning" mapping

### 4. **building-amenities.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 9.8KB
- **Purpose:** Amenities that can be included in the building (gym, coworking, bike storage, etc.)
- **Used by:**
  - API: `generate-building-program/route.ts`
- **Structure:** Bilingual (nl/en), contains `amenities` array
- **Status:** ✅ Active, Core Data
- **Validation:** ⚠️ Not currently validated (no relational dependencies)

### 5. **communal-spaces.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 46KB
- **Purpose:** 37 communal space types for residents (shared living room, guest room, laundry, etc.)
- **Used by:**
  - API: `generate-building-program/route.ts`
  - Validation script
- **Structure:** Bilingual (nl/en), contains `spaces` array with target_groups
- **Status:** ✅ Active, Core Data
- **Validation:** ⚠️ **334 warnings** - target_groups don't exactly match persona names
  - Example: Uses "Jonge Starter" but personas.json has "Jonge Starters"
  - Needs fixing for consistency

### 6. **public-spaces.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 48KB
- **Purpose:** 36 public/commercial space types (retail, cafes, medical, childcare, etc.)
- **Used by:**
  - API: `generate-building-program/route.ts`
  - Validation script
- **Structure:** Bilingual (nl/en), contains `spaces` array with target_groups
- **Status:** ✅ Active, Core Data, **JUST ADDED**
- **Validation:** ⚠️ **334 warnings** - same target_groups mismatch issue as communal-spaces
- **Recent Changes:** Created Nov 21, 2025

### 7. **target-group-scoring-map.json** ⭐
- **Location:** `src/features/location/data/sources/`
- **Size:** 22KB
- **Purpose:** Scoring configuration for target group matching
- **Used by:**
  - `/src/features/location/utils/targetGroupScoring.ts`
- **Structure:** Maps target group IDs to scoring criteria
- **Status:** ✅ Active, Core Data
- **Validation:** ⚠️ Not currently validated (could add checks)

---

## 🔧 **ACTIVE** - Configuration Files

### 8. **scoring-config.json**
- **Location:** `src/features/location/data/parsers/`
- **Size:** 1.4KB
- **Purpose:** Configuration for scoring calculations
- **Used by:**
  - `/src/features/location/data/parsers/scoring.ts`
- **Status:** ✅ Active, Configuration
- **Validation:** ❌ Not validated

---

## 🌐 **ACTIVE** - Internationalization (i18n)

### 9. **common.json** (Dutch)
- **Location:** `src/i18n/nl/`
- **Purpose:** Dutch language translations
- **Status:** ✅ Active, i18n

### 10. **common.json** (English)
- **Location:** `src/i18n/en/`
- **Purpose:** English language translations
- **Status:** ✅ Active, i18n

---

## 📦 **SYSTEM** - Package & TypeScript Config

### 11. **package.json**
- **Location:** Root
- **Purpose:** NPM package configuration
- **Status:** ✅ Active, System
- **Recent Changes:** Added `validate:data` script

### 12. **package-lock.json**
- **Location:** Root
- **Purpose:** NPM dependency lock file
- **Status:** ✅ Active, System (auto-generated)

### 13. **tsconfig.json**
- **Location:** Root
- **Purpose:** TypeScript compiler configuration
- **Status:** ✅ Active, System

---

## 📂 **NOT JSON FILES** - TypeScript API Clients

These directories contain `.ts` files (not JSON), used for fetching external API data:

- `src/features/location/data/sources/altum-ai/` - API client for Altum AI
- `src/features/location/data/sources/cbs-demographics/` - API client for CBS demographics
- `src/features/location/data/sources/cbs-livability/` - API client for CBS livability data
- `src/features/location/data/sources/google-places/` - API client for Google Places
- `src/features/location/data/sources/politie-safety/` - API client for Police safety data
- `src/features/location/data/sources/rivm-health/` - API client for RIVM health data

**Status:** ✅ Active TypeScript modules (not JSON data)

---

## 🎯 Summary

### Total JSON Files: 13
- **Core LLM Data:** 7 files (housing-personas, typologies, mapping, amenities, communal-spaces, public-spaces, scoring-map)
- **Configuration:** 1 file (scoring-config)
- **i18n:** 2 files (nl/common, en/common)
- **System:** 3 files (package.json, package-lock.json, tsconfig.json)

### Validation Status:
- ✅ **0 Critical Errors** (fixed as of Nov 21, 2025)
- ⚠️ **334 Warnings** - Persona name mismatches in:
  - `communal-spaces.json`
  - `public-spaces.json`

---

## 🔍 The 334 Warnings Explained

**Problem:** Target groups in spaces don't exactly match persona names

**Affected Files:**
1. **`communal-spaces.json`** - uses names like:
   - "Jonge Starter" (singular)
   - "De Carriërestarter"
   - "Zelfbewuste Solist"
   - "De Doorzetter"
   - "Bescheiden Stellen"
   - "Zelfstandige Senior"

2. **`public-spaces.json`** - uses the same naming variants

**Expected Names (from `housing-personas.json`):**
   - "Jonge **Starters**" (plural)
   - Different persona set entirely

**Impact:**
- ⚠️ Low - Warnings only, LLM still receives the data
- But should be fixed for proper relational integrity

**To Fix:**
1. Export exact persona names from `housing-personas.json`
2. Update all `target_groups` arrays in both space files to match exactly
3. OR: Update validation script to normalize/fuzzy-match names

---

## 📌 Recommendations

### High Priority:
1. ✅ **DONE:** Add missing property type mapping (Middensegment 2-kamer grondgebonden)
2. ⚠️ **TODO:** Fix 334 target_groups naming mismatches
3. ✅ **DONE:** Run validation in CI/CD to prevent future issues

### Nice to Have:
4. Consider validating `building-amenities.json` structure
5. Consider validating `target-group-scoring-map.json` references
6. Add validation for scoring-config.json schema

### Not Needed:
- ❌ No outdated JSON files found
- ❌ No duplicate data files found
- ❌ No deprecated files to remove

---

## 🚀 Next Steps

1. **Fix the warnings** by standardizing persona names across files
2. **Keep using JSON** - Your current setup is optimal for:
   - Static LLM data
   - Version control
   - Build-time validation
   - Fast loading

3. **Only consider a database** if you need:
   - User-generated data
   - Frequent runtime updates
   - Complex queries
   - Millions of records

For your use case, **JSON + validation is the right choice**. ✅
