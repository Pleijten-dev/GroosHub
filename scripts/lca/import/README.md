# LCA Data Import Scripts

This directory contains scripts to populate the LCA database with reference data needed for calculations.

## Prerequisites

Before running these scripts, ensure:

1. **Database tables created**: Run the migration file `src/lib/db/migrations/005_lca_schema.sql` in your Neon database dashboard
2. **Environment configured**: Your `.env.local` file contains the database URL:
   ```bash
   POSTGRES_URL=your_postgres_url_here
   # OR
   POSTGRES_URL_NON_POOLING=your_postgres_non_pooling_url_here
   ```
3. **Dependencies installed**: Run `npm install` if you haven't already

## Import Sequence

Run these scripts **in order** from the project root directory:

### 1. Seed Reference Values

Seeds MPG reference limits and operational carbon estimates for Dutch building types.

```bash
npx tsx scripts/lca/import/seed-reference-values.ts
```

**What it does:**
- Inserts MPG limits for 5 building types (vrijstaand, rijwoning, appartement, tussenwoning, hoekwoning)
- Adds operational carbon estimates by energy label
- Uses upsert logic (updates if already exists)

**Expected output:**
```
🌱 Seeding LCA reference values...
✅ Seeded 5 reference values successfully
```

**Data inserted:** 5 records into `lca_reference_values`

---

### 2. Import NMD Service Lives

Seeds material service life data from NMD or uses sensible defaults.

```bash
npx tsx scripts/lca/import/import-nmd-lifespans.ts
```

**What it does:**
- Checks for NMD data file at `data/lca/nmd-service-lives.xlsx`
- If file exists: Parses and imports NMD data
- If file missing: Seeds 25+ default service lifespans for common Dutch materials

**Expected output (with defaults):**
```
🔄 Starting NMD service life data import...
⚠️  NMD data file not found. Using default values...
🌱 Seeding default service life values...
✅ Seeded 28 default service life records
✨ Import complete
```

**Data inserted:** 25-30 records into `lca_service_lives`

**Optional:** To use official NMD data instead of defaults:
1. Download NMD service life data from [Nationale Milieudatabase](https://www.milieudatabase.nl)
2. Save as `data/lca/nmd-service-lives.xlsx`
3. Re-run the script

---

### 3. Import Ökobaudat EPD Data

Imports Environmental Product Declaration (EPD) data from German Ökobaudat database.

**IMPORTANT:** This script requires a CSV data file.

#### Step 3a: Download Ökobaudat Data

1. Go to: https://www.oekobaudat.de
2. Navigate to the data export section
3. Export as **CSV format** with **all indicators**
4. Save the file to: `data/lca/oekobaudat-export.csv`

The file will be approximately 50-100MB and contains EPDs for thousands of building materials.

#### Step 3b: Run Import Script

```bash
npx tsx scripts/lca/import/import-oekobaudat.ts
```

**What it does:**
- Parses the Ökobaudat CSV export
- Filters for Dutch-relevant materials (excludes tropical timber, non-EU regions)
- Maps Ökobaudat categories to simplified categories (insulation, concrete, timber, etc.)
- Extracts all LCA module values (A1-A3, A4, A5, C1-C4, D)
- Assesses EPD quality rating (1-5)
- Translates material names to Dutch (placeholder for MVP)

**Expected output:**
```
🔄 Starting Ökobaudat data import...
📊 Found 8543 records in CSV
✅ Imported 100 materials...
✅ Imported 200 materials...
...
✅ Imported 2847 materials...

📊 Import Summary:
✅ Imported: 2847
⏭️  Skipped: 5234
❌ Errors: 462
✨ Import complete
```

**Data inserted:** 2000-3000 records into `lca_materials` (varies based on filter criteria)

**Note on skipped records:**
- Materials without GWP A1-A3 data (can't calculate impact)
- Non-European materials (e.g., tropical timber)
- Materials from regions outside EU-27/DE/NL

---

## Verification

After running all three scripts, verify the data was imported:

### Check Reference Values

```sql
SELECT building_type, mpg_limit, energy_label
FROM lca_reference_values
ORDER BY building_type;
```

Expected: 5 rows (one per building type)

### Check Service Lives

```sql
SELECT category, COUNT(*) as count
FROM lca_service_lives
GROUP BY category
ORDER BY category;
```

Expected: 25-30 rows grouped by category (concrete, timber, insulation, etc.)

### Check Materials

```sql
SELECT
  category,
  COUNT(*) as count,
  AVG(quality_rating) as avg_quality
FROM lca_materials
WHERE dutch_availability = true
GROUP BY category
ORDER BY category;
```

Expected: 2000-3000 rows grouped by category with quality ratings

### Quick Stats Query

```sql
SELECT
  'Reference Values' as table_name, COUNT(*) as count FROM lca_reference_values
UNION ALL
SELECT 'Service Lives', COUNT(*) FROM lca_service_lives
UNION ALL
SELECT 'Materials', COUNT(*) FROM lca_materials;
```

Expected output:
```
table_name         | count
-------------------|-------
Reference Values   |     5
Service Lives      |    28
Materials          | 2847
```

---

## Troubleshooting

### Error: Database URL not configured

**Problem:**
```
Database URL not configured. Please set POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable.
```

**Solution:**
Add your Neon database URL to `.env.local`:
```bash
POSTGRES_URL=postgresql://user:password@host.neon.tech/dbname
```

### Error: relation "lca_materials" does not exist

**Problem:**
```
relation "lca_materials" does not exist
```

**Solution:**
Run the SQL migration first:
1. Open your Neon dashboard
2. Go to SQL Editor
3. Copy contents of `src/lib/db/migrations/005_lca_schema.sql`
4. Execute the migration
5. Verify tables exist with: `\dt lca_*`

### Error: CSV file not found (Ökobaudat)

**Problem:**
```
❌ CSV file not found at: /path/to/data/lca/oekobaudat-export.csv
```

**Solution:**
1. Download from https://www.oekobaudat.de
2. Export as CSV with all indicators
3. Save to exactly: `data/lca/oekobaudat-export.csv`

### Performance: Ökobaudat import is slow

This is expected. The script processes thousands of records with complex parsing logic. Typical import time: 2-5 minutes depending on your machine and CSV size.

Progress is shown every 100 materials imported.

---

## Re-running Scripts

All scripts are **idempotent** (safe to run multiple times):

- **Reference values**: Uses `ON CONFLICT` upsert - updates existing records
- **Service lives**: Inserts new records (duplicate prevention not implemented in defaults)
- **Ökobaudat**: May create duplicates if run multiple times

**Recommendation:** If you need to re-import Ökobaudat data:
1. Clear the table first:
   ```sql
   TRUNCATE TABLE lca_materials CASCADE;
   ```
2. Re-run the import script

---

## Next Steps

After successfully importing all data:

1. **Convert Calculator to SQL**: Update `src/features/lca/utils/lca-calculator.ts` to use SQL queries instead of Prisma
2. **Create API Endpoints**: Build the REST API for LCA calculations
3. **Build Frontend Pages**: Create Quick Start form and Results Dashboard
4. **Test Calculations**: Verify LCA calculations with known test cases

See `Documentation/LCA_IMPLEMENTATION_TODO.md` for the complete implementation roadmap.

---

## Data Sources

- **MPG Limits**: Dutch Building Decree (Bouwbesluit) 2025 requirements
- **Operational Carbon**: ISSO Publication 82.3 and typical Dutch energy performance
- **Service Lives**: ISO 15686 and Dutch construction practice
- **EPD Data**: Ökobaudat (German Federal Ministry) - https://www.oekobaudat.de
- **Optional NMD**: Nationale Milieudatabase (Stichting Bouwkwaliteit) - https://www.milieudatabase.nl

---

## Script Maintenance

### Adding New Reference Values

Edit `scripts/lca/import/seed-reference-values.ts`:

```typescript
const mpgLimits = [
  {
    building_type: 'new_type',
    mpg_limit: 0.50,
    energy_label: 'A',
    operational_carbon: 8.0,
    source: 'Bouwbesluit 2025',
    valid_from: new Date('2025-01-01')
  }
];
```

### Adding Default Service Lives

Edit `scripts/lca/import/import-nmd-lifespans.ts`:

```typescript
const defaultLifespans = [
  {
    category: 'new_category',
    subcategory: 'new_sub',
    material_name: 'Material Name',
    rsl: 50,
    source: 'ISO15686',
    confidence: 'medium'
  }
];
```

### Customizing Ökobaudat Filters

Edit `scripts/lca/import/import-oekobaudat.ts`:

```typescript
function checkDutchRelevance(record: Record<string, string>): boolean {
  // Modify exclusion logic
  const excludedCategories = [
    'Tropical timber',
    'Your exclusion here'
  ];

  // Modify region logic
  const allowedRegions = ['DE', 'NL', 'EU', 'EU-27', 'BE', 'FR'];

  return true; // Your custom logic
}
```

---

## Support

For issues with:
- **Database setup**: Check Neon documentation
- **Import scripts**: Review error messages and verify data file formats
- **LCA calculations**: See `Documentation/LCA_IMPLEMENTATION_TODO.md`
- **Project structure**: See `CLAUDE.md` for architecture patterns

