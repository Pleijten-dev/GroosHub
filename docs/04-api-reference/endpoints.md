# API URL Reference Guide

This document lists all the API endpoints and URL patterns used for each data source at each geographic level.

## Test Address
```
Address: beukelsdijk 37c, Rotterdam
Municipality: Rotterdam (GM0599)
District: Delfshaven (WK059903)
Neighborhood: Middelland (BU05990325)
```

---

## 1. CBS Demographics (84583NED)

**Base URL:** `https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet`

**Field Used:** `WijkenEnBuurten`

**Period:** `2023JJ00` (2023 annual)

### URL Patterns

#### National Level (NL00)
```
https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'NL00') and Perioden eq '2023JJ00'
```

#### Municipality Level (GM0599)
```
https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'GM0599') and Perioden eq '2023JJ00'
```

#### District Level (WK059903)
```
https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'WK059903') and Perioden eq '2023JJ00'
```

#### Neighborhood Level (BU05990325)
```
https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'BU05990325') and Perioden eq '2023JJ00'
```

---

## 2. RIVM Health (50120NED)

**Base URL:** `https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet`

**Field Used:** `WijkenEnBuurten`

**Period:** `2022JJ00` (2022 annual - latest available)

**Additional Filters:**
- `Leeftijd eq '20300'` (All ages)
- `Marges eq 'MW00000'` (No margin indicator)

### URL Patterns

#### National Level (NL00 or NL01?)
```
https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'NL00') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'
```

**Alternative (NL01):**
```
https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'NL01') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'
```

#### Municipality Level (GM0599)
```
https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'GM0599') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'
```

#### District Level (WK059903)
```
https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'WK059903') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'
```

#### Neighborhood Level (BU05990325)
```
https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'BU05990325') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'
```

---

## 3. CBS Livability (85146NED)

**Base URL:** `https://opendata.cbs.nl/ODataApi/odata/85146NED/UntypedDataSet`

**Field Used:** `RegioS` (Note: Different from Demographics!)

**Period:** `2023JJ00` (2023 annual)

**Additional Filters:**
- `Marges eq 'MW00000'` (No margin indicator)

### URL Patterns

#### National Level (NL00?)
```
https://opendata.cbs.nl/ODataApi/odata/85146NED/UntypedDataSet?$filter=startswith(RegioS,'NL00') and Perioden eq '2023JJ00' and Marges eq 'MW00000'
```

**Alternative (NL01):**
```
https://opendata.cbs.nl/ODataApi/odata/85146NED/UntypedDataSet?$filter=startswith(RegioS,'NL01') and Perioden eq '2023JJ00' and Marges eq 'MW00000'
```

#### Municipality Level (GM0599)
```
https://opendata.cbs.nl/ODataApi/odata/85146NED/UntypedDataSet?$filter=startswith(RegioS,'GM0599') and Perioden eq '2023JJ00' and Marges eq 'MW00000'
```

---

## 4. Politie Safety (47018NED)

**Base URL:** `https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet`

**Field Used:** `WijkenEnBuurten`

**Period:** `2024JJ00` (2024 annual)

### URL Patterns

#### National Level (NL00 or NL01?)
```
https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'NL00') and Perioden eq '2024JJ00'
```

**Alternative (NL01):**
```
https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'NL01') and Perioden eq '2024JJ00'
```

#### Municipality Level (GM0599)
```
https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'GM0599') and Perioden eq '2024JJ00'
```

#### District Level (WK059903)
```
https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'WK059903') and Perioden eq '2024JJ00'
```

#### Neighborhood Level (BU05990325)
```
https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet?$filter=startswith(WijkenEnBuurten,'BU05990325') and Perioden eq '2024JJ00'
```

---

## Summary Table

| Dataset | National | Municipality | District | Neighborhood | Field Name |
|---------|----------|--------------|----------|--------------|------------|
| CBS Demographics (84583NED) | NL00 | GMxxxx | WKxxxxxx | BUxxxxxxxx | `WijkenEnBuurten` |
| RIVM Health (50120NED) | NL00/NL01? | GMxxxx? | WKxxxxxx | BUxxxxxxxx | `WijkenEnBuurten` |
| CBS Livability (85146NED) | NL00/NL01? | GMxxxx | - | - | `RegioS` |
| Politie Safety (47018NED) | NL00/NL01? | GMxxxx? | WKxxxxxx | BUxxxxxxxx | `WijkenEnBuurten` |

---

## Questions to Investigate

1. **Do RIVM and Politie use NL01 instead of NL00 for national data?**
   - Try both codes and see which returns data

2. **Does CBS Livability have national level data?**
   - Check if NL00 or NL01 returns any data

3. **Do RIVM and Politie have municipality-level data?**
   - Try GM0599 and similar codes

4. **Are we using the correct field names?**
   - CBS Demographics: `WijkenEnBuurten` ✓
   - RIVM Health: `WijkenEnBuurten` ✓
   - CBS Livability: `RegioS` ✓
   - Politie Safety: `WijkenEnBuurten` ✓

---

## Testing Instructions

### In Browser Console

After entering an address and clicking "Haal Gegevens Op", you should see color-coded console logs:

- 🔵 CBS Demographics
- 🟢 RIVM Health
- 🟣 CBS Livability
- 🔴 Politie Safety

Each log will show:
1. The code being fetched
2. The complete URL
3. Result (number of rows found or "No data")

### Manual URL Testing

You can also test these URLs directly in your browser or with curl:

```bash
# Test CBS Demographics for NL00
curl "https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet?\$filter=startswith(WijkenEnBuurten,'NL00') and Perioden eq '2023JJ00'"

# Test RIVM Health for NL01
curl "https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet?\$filter=startswith(WijkenEnBuurten,'NL01') and Perioden eq '2022JJ00' and Leeftijd eq '20300' and Marges eq 'MW00000'"
```

Note: When testing in bash, you need to escape the `$` in `$filter` with a backslash.

---

## Expected Results

Based on your observation for Rotterdam:

### ✅ Working
- **NL00:** CBS Demographics only
- **GM0599:** CBS Demographics + CBS Livability
- **WK059903:** CBS Demographics + RIVM Health + Politie Safety
- **BU05990325:** CBS Demographics + RIVM Health + Politie Safety

### ❓ Missing
- **NL00:** RIVM Health, CBS Livability, Politie Safety
- **GM0599:** RIVM Health, Politie Safety

This suggests:
1. RIVM and Politie might not have national level data, or use a different code
2. RIVM and Politie might not have municipality level data
3. CBS Livability might not have national level data

---

## Next Steps

1. **Review console logs** after testing with Rotterdam address
2. **Verify which URLs return 0 rows**
3. **Test alternative national codes** (NL01, NL02, etc.)
4. **Check dataset documentation** for supported geographic levels
5. **Adjust client implementations** based on findings
