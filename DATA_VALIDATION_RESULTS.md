# Data Validation Results

## Overview

The data integrity validation script has been created and run successfully. It found **340 total issues** across your relational data:

- **6 Errors** (blocking issues that need fixing)
- **334 Warnings** (naming mismatches that should be fixed for consistency)

## Critical Errors (Must Fix)

### Missing Property Type Mapping

Three personas reference a housing type that doesn't exist in `property-type-mapping.json`:

**Dutch:**
- "Zelfstandige Senior" desires **"Middensegment 2-kamer grondgebonden woning"**
- "De Balanszoekers" desires **"Middensegment 2-kamer grondgebonden woning"**
- "De Zwitserlevers" desires **"Middensegment 2-kamer grondgebonden woning"**

**English:**
- "Independent Senior" desires **"Mid-range 2-room ground-level dwelling"**
- "The Balance Seekers" desires **"Mid-range 2-room ground-level dwelling"**
- "The Comfortable Livers" desires **"Mid-range 2-room ground-level dwelling"**

**Fix:** Add the missing entry to `property-type-mapping.json`:

```json
{
  "nl": {
    "mappings": {
      "Middensegment 2-kamer grondgebonden woning": {
        "typology_ids": [],
        "match_type": "not_available",
        "description": "Grondgebonden woningen zijn niet beschikbaar in een appartementengebouw",
        "alternative_suggestion": "one_bed_65"
      }
    }
  },
  "en": {
    "mappings": {
      "Mid-range 2-room ground-level dwelling": {
        "typology_ids": [],
        "match_type": "not_available",
        "description": "Ground-level dwellings are not available in an apartment building",
        "alternative_suggestion": "one_bed_65"
      }
    }
  }
}
```

## Warnings (Should Fix for Consistency)

### Persona Name Mismatches

The target_groups in `communal-spaces.json` and `public-spaces.json` use slightly different names than the actual persona names in `housing-personas.json`.

**Examples:**
- Spaces use: "Jonge Starter"
- Personas have: "Jonge Starters" (plural)

- Spaces use: "De Carriërestarter"
- Personas have: Different name (need to check exact match)

**Recommendation:**
1. Export a list of all persona names from `housing-personas.json`
2. Update all `target_groups` in spaces to use exact persona names
3. OR: Update validation to use fuzzy matching/normalization

## Running Validation

```bash
npm run validate:data
```

This will:
- ✓ Check all typology_id references are valid
- ✓ Check all property type mappings exist
- ✓ Check target_groups match persona names
- ✓ Check consistency between Dutch and English versions
- ✓ Exit with error code if critical issues found (useful for CI/CD)

## Benefits of This Approach

### Why JSON + Validation > Database

For your use case, keeping JSON with validation is better than moving to SQL because:

1. **Version Control** - Git diffs show exactly what changed
2. **Simple Deployment** - No database setup, just deploy files
3. **Fast Access** - No query overhead, data loads instantly
4. **Static Site Generation** - Works perfectly with Next.js static exports
5. **Easy Editing** - Developers can edit JSON directly
6. **Build-Time Validation** - Catches errors before deployment

### When to Consider SQL

Only move to a database if you have:
- User-generated content that changes frequently
- Complex runtime queries (joins, aggregations)
- Need for transactions and ACID guarantees
- Data too large for JSON (100k+ records)

## Next Steps

1. **Fix the 6 critical errors** by adding the missing property type mapping
2. **Standardize persona names** in all target_groups arrays
3. **Add validation to CI/CD** to prevent future issues
4. **Consider:** Create a TypeScript type generator from the JSON schemas for even better type safety

## Adding to CI/CD

Add to your `.github/workflows` or similar:

```yaml
- name: Validate Data Integrity
  run: npm run validate:data
```

This ensures no one can merge code with broken data references.
