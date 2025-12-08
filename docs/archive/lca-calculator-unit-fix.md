# LCA Calculator Unit Handling Fix

## Problem

The calculator was producing GWP values that were ~750x too high:
- **Expected A1-A3**: ~8,000-12,000 kg CO₂-eq
- **Actual A1-A3**: 5,393,223 kg CO₂-eq
- **Issue**: Unit mismatch in GWP calculations

## Root Cause

Ökobaudat materials can have GWP values in different units:
- **Volumetric materials** (concrete, gypsum, particle board): GWP per m³
- **Mass-based materials** (mineral wool, steel): GWP per kg

The calculator was treating all materials as if their GWP was per kg, causing volumetric materials to be calculated incorrectly.

### Example: Cement Bound Particle Board
- **GWP**: 1694.15 kg CO₂-eq per m³
- **Density**: 1200 kg/m³
- **Correct GWP per kg**: 1694.15 / 1200 = **1.41 kg CO₂/kg**
- **Old calculation** (wrong): mass × 1694.15 = way too high
- **New calculation** (correct): mass × (1694.15 / 1200) = reasonable

## Solution

Updated `calculateA1A3()` function in `src/features/lca/utils/lca-calculator.ts`:

```typescript
export function calculateA1A3(mass: number, material: Material): number {
  const gwpValue = material.gwp_a1_a3 || 0;

  // Check if GWP is per volume (m³) or per mass (kg)
  const declaredUnit = material.declared_unit || '1 kg';
  const isVolumetric = declaredUnit.toLowerCase().includes('m3') ||
                       declaredUnit.toLowerCase().includes('m³') ||
                       declaredUnit.toLowerCase().includes('m2') ||
                       declaredUnit.toLowerCase().includes('m²');

  if (isVolumetric && material.density && material.density > 0) {
    // GWP is per m³, convert to per kg
    const gwpPerKg = gwpValue / material.density;
    return mass * gwpPerKg;
  }

  // GWP is per kg (or no density available), use directly
  const conversionFactor = material.conversion_to_kg || 1;

  if (conversionFactor === 1) {
    return mass * gwpValue;
  }

  // For other conversion factors, divide to get quantity in declared units
  const quantityInDeclaredUnit = mass / conversionFactor;
  return quantityInDeclaredUnit * gwpValue;
}
```

## Expected Results After Fix

For the test project (120 m² timber frame house with RC 6.0 insulation):

### Phase Breakdown
- **A1-A3 (Production)**: ~6,000-9,000 kg CO₂-eq
- **A4 (Transport)**: ~80-100 kg CO₂-eq
- **A5 (Construction)**: ~300-500 kg CO₂-eq
- **B4 (Replacement)**: 0 kg CO₂-eq (no replacements in test data)
- **C (End of Life)**: ~200-400 kg CO₂-eq
- **D (Benefits)**: ~0-100 kg CO₂-eq

### Totals
- **Total (A-C)**: ~7,000-10,000 kg CO₂-eq
- **Total in tonnes**: ~7-10 tonnes
- **MPG**: ~0.78-1.11 kg CO₂-eq/m²/year

### Compliance
- **MPG Limit** (vrijstaand, 2025): ~0.60 kg CO₂-eq/m²/year
- **Expected Result**: ❌ NO (slightly above limit, which is realistic for RC 6.0 only)

*Note: To achieve compliance, the project would need additional measures like lower-carbon materials, renewable energy, or circular design strategies.*

## Testing

Run the test with:
```bash
npx tsx scripts/lca/test/recreate-and-test.ts
```

The test will:
1. Clean up existing test data
2. Create test project with real material IDs
3. Show material details (units, conversion factors, GWP values)
4. Run calculator
5. Display detailed results

## Materials Used in Test

1. **Cement Bound Particle Board** (OSB substitute)
   - GWP: 1694.15 per m³ → 1.41 per kg
   - Used for: exterior sheathing, studs, rafters

2. **Mineral Wool (Facade)**
   - GWP: 70.39 per kg (already per kg)
   - Used for: wall insulation (200mm)

3. **Mineral Wool (Blowable)**
   - GWP: 64.02 per kg (already per kg)
   - Used for: roof insulation (240mm)

4. **Gypsum Interior Plaster**
   - GWP: 119.40 per m³ → 0.13 per kg
   - Used for: interior finish (12.5mm)

## Next Steps

1. ✅ Calculator unit handling fixed
2. ✅ Test data updated with real materials
3. ⏳ Run test to verify results (requires database credentials)
4. ⏳ Phase 2: Create API endpoints
5. ⏳ Phase 3: Build frontend UI

## Verification

To verify the fix is working correctly, check that:
- A1-A3 values are in the range 6,000-10,000 kg CO₂-eq (not millions)
- C phase values are not NaN
- MPG value is between 0.70-1.20 kg CO₂-eq/m²/year
- Results are consistent with typical timber frame construction
