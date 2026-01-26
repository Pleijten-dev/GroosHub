# Issue: AI Panel Not Receiving Location Data

**Status:** Open
**Priority:** High
**Date:** 2026-01-26
**Branch:** claude/review-ai-assistant-6IBuE (merged)

## Problem Description

When using the AI Panel quick actions on the location page, the AI assistant responds but states that data is "unavailable" or "not provided" - even though the admin tools confirm that location data (demographics, health, safety, etc.) exists and is loaded in the UI.

## Expected Behavior

When a user clicks a quick action (e.g., "Explain Scenarios", "Safety Assessment"), the AI should receive the full `CompactLocationExport` data and provide analysis based on actual numbers.

## Actual Behavior

The AI responds with generic statements like:
- "Data is not available for this location"
- "Unable to provide analysis without demographic data"
- (sometimes with emoticons, which was separately fixed)

## Root Cause Analysis

The issue is likely in how `locationExport` is passed to the `AIPanel` component.

### Data Flow

```
LocationPage
  └── AIPanel (receives context prop)
        └── executeAITool() sends locationData to API
              └── /api/ai-assistant/execute-tool receives and builds payload
```

### Key Files to Investigate

1. **`src/app/[locale]/location/page.tsx`** or parent component
   - Check how `locationExport` is passed to `AIPanel`
   - The `context.locationExport` might be `undefined` or empty

2. **`src/features/ai-assistant/components/AIPanel/AIPanel.tsx`**
   - Lines 666-676: Debug logs were added to trace what data is available
   - Check `context.locationExport` vs `context.currentView.location`

3. **`src/features/location/utils/jsonExportCompact.ts`**
   - The `CompactLocationExport` type definition
   - How the export is built from location data

### Debug Logs Already Added

In `AIPanel.tsx` around line 665:
```typescript
console.log('[AIPanel] Executing tool:', toolId);
console.log('[AIPanel] Context locationExport available:', !!context.locationExport);
console.log('[AIPanel] Context currentView.location:', context.currentView.location);
if (context.locationExport) {
  const exportKeys = Object.keys(context.locationExport as object);
  console.log('[AIPanel] locationExport keys:', exportKeys);
}
```

## How to Reproduce

1. Navigate to `/nl/location` or `/en/location`
2. Search for an address (e.g., "Amsterdam Centraal")
3. Wait for all data tabs to load (demographics, safety, etc.)
4. Open the AI Panel (sparkle button bottom-right)
5. Click any quick action (e.g., "Leg scenario's uit")
6. Observe: AI says data is unavailable

## Potential Fixes

### Option 1: Check Parent Component Props
The parent component might not be passing `locationExport` to `AIPanel`. Verify the props being passed.

### Option 2: Timing Issue
The `locationExport` might be built asynchronously after the panel renders. The panel might need to re-read the context when executing a tool.

### Option 3: State Not Lifting
If location data is stored in a child component's state, it might not be available in the parent's context object that gets passed to `AIPanel`.

### Option 4: Different Branch Fix
The user suspects this might have been fixed in a different branch. Check for recent changes to:
- Location page component
- Location data context/provider
- How `CompactLocationExport` is built and stored

## Related Files

- `/src/features/ai-assistant/components/AIPanel/AIPanel.tsx`
- `/src/app/api/ai-assistant/execute-tool/route.ts`
- `/src/features/ai-assistant/utils/aiToolsPayloadBuilder.ts`
- `/src/features/location/utils/jsonExportCompact.ts`
- Location page component (parent of AIPanel)

## Test Verification

After fixing, verify by:
1. Opening browser console
2. Clicking a quick action
3. Checking logs for `[AIPanel] locationExport keys:` - should show array like `['metadata', 'demographics', 'health', 'safety', ...]`
4. Checking server logs for `[AI Assistant] Executing tool:` - the context data should be populated
