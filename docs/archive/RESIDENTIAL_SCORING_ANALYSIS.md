# Why Residential Data Isn't Scored (Yet)

## Current State

The scoring system is currently active for:
- ✅ **Demographics** (CBS)
- ✅ **Health** (RIVM)
- ✅ **Safety** (Politie)
- ✅ **Livability** (CBS)
- ❌ **Residential** (Altum AI) - **NOT SCORED**

## Why Residential Data Is Different

### Scored Data Sources (Demographics, Health, Safety, Livability)

**Data Structure:**
```
National Level:    Unemployment = 5.2%  (BASELINE)
Municipality:      Unemployment = 6.1%  (COMPARE)
Score: -1 (worse than national)
```

**Characteristics:**
- Have multi-level geographic data (national, municipality, district, neighborhood)
- Show **indicators** (rates, percentages, per-capita values)
- Can answer: "Is this location better/worse than the national average?"

### Residential Data (Altum AI)

**Data Structure:**
```
Reference Houses Near Location:
- House Type A: 10 houses
- House Type B: 5 houses
- Build Year 1980-1990: 8 houses
- Price Range 350-400k: 6 houses
```

**Characteristics:**
- Location-specific **comparable properties**
- Shows **distributions** (counts of characteristics)
- Already filtered to similar houses nearby
- **No national baseline** for comparison
- Can't answer: "Is this location better/worse than national?" because there's no national residential distribution data

### Key Difference

| Aspect | Demographics/Health/Safety/Livability | Residential (Altum AI) |
|--------|--------------------------------------|----------------------|
| **Data Type** | Performance indicators (rates, percentages) | Property characteristics (counts, distributions) |
| **Geographic Levels** | National, Municipality, District, Neighborhood | Location-specific only |
| **Purpose** | Compare location performance vs national | Find comparable properties near target |
| **Baseline** | National average | Target property |
| **Scoring** | ✅ Possible (compare vs national) | ❌ Not applicable (no national data) |

## Options to Enable Residential Scoring

### Option 1: No Scoring (Current - Recommended for Now)
**Rationale:** Residential data serves a different purpose (finding comparable properties) and doesn't have national statistics for comparison.

**Pros:**
- ✅ Honest representation of data
- ✅ No misleading scores
- ✅ Clear that residential data is different

**Cons:**
- ❌ Inconsistent with other data sources
- ❌ User expects scores everywhere

### Option 2: Calculate Aggregate Metrics and Score Those
**Approach:** Create derived indicators from residential data that can be scored.

**Examples of Aggregate Metrics:**
1. **Average Transaction Price Range**
   - Calculate: Midpoint of price ranges
   - Compare: Against national average house price
   - Score: Is this area more/less expensive than national?

2. **Average Build Year**
   - Calculate: Mean build year
   - Compare: Against national housing stock age
   - Score: Are houses newer/older than national?

3. **Energy Label Distribution**
   - Calculate: % with A/B labels
   - Compare: Against national energy label distribution
   - Score: Better/worse energy efficiency than national?

**Requirements:**
- Need national housing statistics (CBS has some)
- Need to fetch and parse national residential data
- Need to create new aggregate metrics from reference houses

**Implementation Complexity:** Medium-High

**Pros:**
- ✅ Consistent scoring across all data sources
- ✅ Meaningful comparisons (e.g., "houses are more expensive here")
- ✅ Uses national statistics

**Cons:**
- ❌ Requires national housing data (additional API calls)
- ❌ Different data source (mixing Altum AI with CBS)
- ❌ Aggregate metrics may not reflect individual property

### Option 3: Score Against Local Reference Average
**Approach:** Compare the target property against the reference houses.

**Example:**
- Target property: Built in 2015, Price 400k, Energy Label B
- Reference avg: Built in 1995, Price 350k, Energy Label C
- Score: Target is newer (+1), more expensive (?), better energy (+1)

**Pros:**
- ✅ Works with existing data
- ✅ No need for national statistics
- ✅ Directly relevant to target property

**Cons:**
- ❌ Different scoring model than other data sources
- ❌ Scores mean something different (vs local, not national)
- ❌ Confusing for users (inconsistent interpretation)

### Option 4: Add Explanatory Note (Quick Fix)
**Approach:** Keep residential data unscored but add explanation.

**Implementation:**
Add a note in the legend:
```
Note: Residential data shows property characteristics for comparable
houses near your location. Scoring is not applicable as there is no
national baseline for comparison.
```

**Pros:**
- ✅ Quick to implement
- ✅ Educates users
- ✅ Honest about data limitations

**Cons:**
- ❌ Still inconsistent
- ❌ Doesn't provide the scoring users might want

## Recommendation

### Immediate: Option 4 (Add Explanatory Note)
Add a clear note explaining why residential data isn't scored.

### Future: Option 2 (Aggregate Metrics with National Comparison)
**If you want full scoring for residential data:**

1. **Fetch national housing statistics** from CBS:
   - Average house prices by region
   - Housing stock age distribution
   - Energy label distribution
   - House type distribution

2. **Create aggregate metrics** from Altum AI reference houses:
   - Mean/median price range
   - Mean build year
   - Energy label distribution
   - House type distribution

3. **Apply scoring** using the existing system:
   - Compare local aggregates vs national
   - Use appropriate margins (e.g., ±15% for prices)
   - Set appropriate directions (higher price = neutral/negative depending on context)

4. **Display in table** alongside the existing distribution data

## Decision Needed

Which approach would you prefer?

1. **Keep as-is** with explanatory note (Option 4)
2. **Implement aggregate scoring** with national data (Option 2) - more work but full scoring
3. **Local comparison scoring** (Option 3) - different model but works with existing data
4. **No change** - accept that residential is different

Let me know and I can implement your chosen approach!
