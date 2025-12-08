# Saved Locations - Versioning & Schema Evolution Guide

## Overview

The saved locations system uses **semantic versioning** and **flexible JSONB storage** to handle schema changes gracefully without breaking existing saved data.

---

## Current Version: 1.0.0

### Data Structure
```typescript
{
  dataVersion: "1.0.0",
  completionStatus: "complete" | "with_personas_pve" | "with_personas" | "with_pve" | "location_only",
  locationData: UnifiedLocationData,
  selectedPVE?: PVEConfig,
  selectedPersonas?: SelectedPersona[],
  llmRapport?: LLMRapportData,
  metadata: {
    // Version-specific tracking
  }
}
```

---

## Handling Schema Changes

### 1. **Adding New Fields** ✅ (Safe - No Migration Needed)

When adding new optional fields:

```sql
-- Example: Adding a new feature
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS new_feature JSONB;
```

**TypeScript:**
```typescript
export interface SavedLocation {
  // ... existing fields
  newFeature?: NewFeatureType; // Optional field
}
```

**What happens:**
- ✅ Old saved locations: Field is `null` or `undefined` - handled gracefully
- ✅ New saved locations: Field is populated
- ✅ No migration required

---

### 2. **Changing Existing Field Structure** ⚠️ (Requires Migration)

When changing how data is stored within JSONB:

#### Example: Changing LLM Rapport Structure

**Before (v1.0.0):**
```typescript
llmRapport: {
  housing: string,
  community: string,
  public: string
}
```

**After (v2.0.0):**
```typescript
llmRapport: {
  sections: [
    { type: 'housing', content: string, metadata: {...} },
    { type: 'community', content: string, metadata: {...} },
    { type: 'public', content: string, metadata: {...} }
  ],
  generatedAt: Date,
  model: string
}
```

#### Migration Strategy:

**Step 1: Create Migration SQL**
```sql
-- migrations/005_rapport_structure_v2.sql

-- Add temporary migration tracking
DO $$
DECLARE
  loc RECORD;
  old_rapport JSONB;
  new_rapport JSONB;
BEGIN
  FOR loc IN SELECT id, llm_rapport FROM saved_locations
             WHERE llm_rapport IS NOT NULL
             AND data_version = '1.0.0'
  LOOP
    old_rapport := loc.llm_rapport;

    -- Transform old structure to new structure
    new_rapport := jsonb_build_object(
      'sections', jsonb_build_array(
        jsonb_build_object(
          'type', 'housing',
          'content', old_rapport->'housing',
          'metadata', '{}'::jsonb
        ),
        jsonb_build_object(
          'type', 'community',
          'content', old_rapport->'community',
          'metadata', '{}'::jsonb
        ),
        jsonb_build_object(
          'type', 'public',
          'content', old_rapport->'public',
          'metadata', '{}'::jsonb
        )
      ),
      'generatedAt', old_rapport->>'generatedAt',
      'model', 'legacy'
    );

    -- Update with new structure
    UPDATE saved_locations
    SET
      llm_rapport = new_rapport,
      data_version = '2.0.0',
      metadata = metadata || jsonb_build_object(
        'migratedFrom', '1.0.0',
        'migrationDate', NOW()::text,
        'warnings', jsonb_build_array('rapport_structure_migrated')
      )
    WHERE id = loc.id;
  END LOOP;
END $$;
```

**Step 2: Update TypeScript Types**
```typescript
// types/saved-locations.ts

export interface LLMRapportDataV1 {
  housing?: string;
  community?: string;
  public?: string;
  generatedAt?: string;
}

export interface LLMRapportDataV2 {
  sections: Array<{
    type: 'housing' | 'community' | 'public';
    content: string;
    metadata: Record<string, unknown>;
  }>;
  generatedAt: Date;
  model: string;
}

// Union type for backwards compatibility
export type LLMRapportData = LLMRapportDataV1 | LLMRapportDataV2;

// Type guard
export function isRapportV2(rapport: LLMRapportData): rapport is LLMRapportDataV2 {
  return 'sections' in rapport && Array.isArray(rapport.sections);
}
```

**Step 3: Handle Both Versions in Code**
```typescript
// When loading rapport
function loadRapport(savedLocation: SavedLocation) {
  const rapport = savedLocation.llmRapport;

  if (!rapport) return null;

  // Check version
  if (isRapportV2(rapport)) {
    // Use new structure
    return rapport.sections;
  } else {
    // Handle old structure (v1.0.0)
    return [
      { type: 'housing', content: rapport.housing || '', metadata: {} },
      { type: 'community', content: rapport.community || '', metadata: {} },
      { type: 'public', content: rapport.public || '', metadata: {} }
    ];
  }
}
```

---

### 3. **Removing Fields** 🚫 (Avoid if Possible)

**Best Practice:** Don't remove fields. Instead:
- Mark as deprecated in documentation
- Stop writing to them
- Keep reading for backwards compatibility

If you **must** remove:

```sql
-- Only after ensuring no locations use this field
ALTER TABLE saved_locations
DROP COLUMN IF EXISTS deprecated_field;

-- Update version
UPDATE saved_locations
SET data_version = '3.0.0'
WHERE data_version = '2.0.0';
```

---

## Partial State Handling

### Completion Statuses

The system automatically tracks workflow completion:

```typescript
'location_only'      // Just location data fetched
'with_personas'      // + Target personas selected
'with_pve'          // + PVE (requirements) completed
'with_personas_pve' // + Both personas and PVE
'complete'          // + LLM rapport generated
```

### Automatic Status Updates

The database trigger automatically updates `completion_status` based on what data exists:

```sql
CREATE TRIGGER trigger_update_completion_status
  BEFORE INSERT OR UPDATE ON saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_completion_status();
```

### Saving Partial Progress

```typescript
// Save just location data
await fetch('/api/location/saved', {
  method: 'POST',
  body: JSON.stringify({
    address: "Keizersgracht 123, Amsterdam",
    coordinates: { lat: 52.3676, lng: 4.8904 },
    locationData: { /* all fetched data */ }
  })
});
// completionStatus: 'location_only'

// Later: Add personas
await fetch('/api/location/saved', {
  method: 'POST',
  body: JSON.stringify({
    address: "Keizersgracht 123, Amsterdam",
    coordinates: { lat: 52.3676, lng: 4.8904 },
    locationData: { /* data */ },
    selectedPersonas: [/* selected personas */]
  })
});
// completionStatus: 'with_personas'

// Continue until complete...
```

---

## Best Practices

### ✅ DO:

1. **Use Semantic Versioning**
   - Major: Breaking changes (incompatible data structure)
   - Minor: New features (backwards compatible)
   - Patch: Bug fixes in migrations

2. **Always Provide Type Guards**
   ```typescript
   function isSafeToLoad(data: unknown): data is ValidStructure {
     return typeof data === 'object' && data !== null && 'requiredField' in data;
   }
   ```

3. **Use Metadata for Tracking**
   ```typescript
   metadata: {
     migratedFrom: "1.0.0",
     migrationDate: "2024-01-15T10:30:00Z",
     warnings: ["old_field_removed"]
   }
   ```

4. **Test Migrations Thoroughly**
   - Test with real saved locations
   - Verify all versions load correctly
   - Check rollback procedures

### ❌ DON'T:

1. **Don't Break Existing Data**
   - Never change field types without migration
   - Never assume all records have new fields

2. **Don't Skip Versions**
   - Always migrate 1.0.0 → 2.0.0 → 3.0.0
   - Never jump 1.0.0 → 3.0.0 without intermediate migrations

3. **Don't Remove Version Checking**
   - Always check `dataVersion` before processing
   - Handle all supported versions

---

## Version Support Policy

- **Current Version:** Fully supported
- **Previous Major Version:** Supported for 6 months after new major release
- **Older Versions:** Read-only support (migration prompted)

### Migration Prompts

When loading an old version:

```typescript
if (savedLocation.dataVersion !== CURRENT_VERSION) {
  const shouldMigrate = confirm(
    `This saved location uses an older data format (${savedLocation.dataVersion}).
     Would you like to migrate it to the current version (${CURRENT_VERSION})?`
  );

  if (shouldMigrate) {
    await migrateLocation(savedLocation.id);
  }
}
```

---

## Testing Migrations

### Test Checklist

- [ ] Old saved locations still load
- [ ] New saved locations use new structure
- [ ] Mixed versions work together
- [ ] Sharing works across versions
- [ ] UI displays all versions correctly
- [ ] Export includes version info
- [ ] Import handles version detection

### Test Data Generator

```typescript
// tests/saved-locations-test-data.ts

export function generateTestLocationV1() {
  return {
    dataVersion: "1.0.0",
    llmRapport: {
      housing: "Old format housing text",
      community: "Old format community text",
      public: "Old format public text"
    }
  };
}

export function generateTestLocationV2() {
  return {
    dataVersion: "2.0.0",
    llmRapport: {
      sections: [
        { type: "housing", content: "New format", metadata: {} }
      ],
      model: "claude-3-sonnet"
    }
  };
}
```

---

## Emergency Rollback

If a migration causes issues:

```sql
-- Rollback to previous version
UPDATE saved_locations
SET
  data_version = metadata->>'migratedFrom',
  llm_rapport = /* restore from backup */,
  metadata = metadata - 'migratedFrom' - 'migrationDate'
WHERE metadata->>'migratedFrom' IS NOT NULL
AND data_version = '2.0.0';
```

**Always backup before major migrations!**

---

## Future Proofing

### Reserved Metadata Keys

These keys are reserved for system use:

- `migratedFrom` - Previous version
- `migrationDate` - When migrated
- `warnings` - Migration warnings
- `systemVersion` - App version that created/updated
- `deprecated` - Fields marked for removal

### Custom Extensions

Use `customFields` for app-specific data:

```typescript
metadata: {
  customFields: {
    userNotes: "My custom annotation",
    importedFrom: "external-system",
    tags: ["favorite", "project-a"]
  }
}
```

---

## Summary

✅ **Partial states** are supported - save anytime
✅ **Schema changes** are handled with versioning
✅ **Backwards compatibility** is maintained
✅ **Migrations** are automated but optional
✅ **Old data** never breaks

Your saved locations will work even as the system evolves! 🚀
