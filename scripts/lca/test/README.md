# LCA Calculator Testing

This directory contains scripts to test the LCA calculator functionality.

## Prerequisites

Before running tests, ensure:

1. **Database tables created**: Run `src/lib/db/migrations/005_lca_schema.sql` in Neon
2. **Materials imported**: Run the Ökobaudat import script first
3. **User exists**: Have at least one user in the database
4. **Environment configured**: `.env.local` contains `POSTGRES_URL`

## Testing Steps

### 1. Create Test Data

First, create test data in the database:

```bash
# Option A: Run SQL directly in Neon dashboard
# - Open Neon SQL Editor
# - Copy contents of create-test-data.sql
# - Update user_id to match your database (line 29)
# - Execute the SQL

# Option B: Use psql (if installed locally)
psql $POSTGRES_URL -f scripts/lca/test/create-test-data.sql
```

**Important**: Update the `user_id` in `create-test-data.sql` (line 29) to match an existing user in your database. You can find a user ID by running:

```sql
SELECT id FROM users LIMIT 1;
```

### 2. Run Calculator Test

Execute the test script:

```bash
npx tsx scripts/lca/test/test-calculator.ts
```

### 3. Review Results

The test will output:
- **Phase breakdown**: A1-A3, A4, A5, B4, C1-C4, D
- **Element breakdown**: Impact per building element
- **MPG value**: Calculated environmental performance coefficient
- **Compliance check**: Whether project meets MPG limits

**Expected Results** (approximate values for test project):

```
Test project: 120 m² houtskelet woning with RC 6.0 insulation

Phase Distribution:
  A1-A3 (Production):    60-70% of total
  B4 (Replacement):      15-25% of total
  Other phases:          10-20% of total

Total Impact:            8,000 - 12,000 kg CO₂-eq
MPG Value:               0.50 - 0.70 kg CO₂-eq/m²/year
```

## Test Data Structure

The test creates:

### Project
- **Type**: Vrijstaand (detached house)
- **Construction**: Houtskelet (timber frame)
- **Size**: 120 m² GFA, 2 floors
- **Insulation**: RC 6.0
- **Study period**: 75 years

### Elements

**1. Exterior Wall (50 m²)**
- OSB board (12mm)
- Mineral wool insulation (200mm)
- Timber studs (45x195mm @ 600mm centers)
- Gypsum board (12.5mm)

**2. Roof (65 m²)**
- Roof tiles (15mm)
- Mineral wool insulation (240mm)
- Timber rafters (240mm @ 600mm centers)

**3. Ground Floor (60 m²)**
- Ceramic tiles (10mm)
- Concrete slab (150mm)
- EPS insulation (100mm)

## Troubleshooting

### Error: "Project not found"

**Cause**: Test data not created or wrong project ID

**Solution**:
1. Run `create-test-data.sql` in Neon
2. Verify project exists: `SELECT * FROM lca_projects WHERE id = '00000000-0000-0000-0000-000000000001';`

### Error: "No project data found"

**Cause**: Elements or layers not created properly

**Solution**:
1. Check if materials were imported first
2. Verify layers were created: See verification queries at end of `create-test-data.sql`
3. Re-run the create-test-data.sql script

### Error: "Database URL not configured"

**Cause**: Missing environment variable or `.env.local` file not found

**Solution**:
1. Ensure `.env.local` exists in the project root (not in scripts directory)
2. Add database URLs without quotes:
```bash
POSTGRES_URL=postgres://user:password@host.neon.tech/dbname
POSTGRES_URL_NON_POOLING=postgres://user:password@host.neon.tech/dbname
```
3. Make sure the `.env.local` file is in `/home/user/GroosHub/.env.local`
4. Values should NOT have quotes around them

### Warning: "A1-A3 phase seems low"

**Cause**: Missing or low-quality material EPD data

**Solution**:
1. Check material GWP values: `SELECT name_en, gwp_a1_a3 FROM lca_materials WHERE id IN (...)`
2. Ensure materials have non-zero GWP values
3. Re-import materials if needed

### Warning: "B4 replacement impact seems very high"

**Cause**: Materials have short service lives or missing data

**Solution**:
1. Check service lives: `SELECT reference_service_life FROM lca_materials WHERE id IN (...)`
2. Import NMD service life data
3. Set custom lifespans in layers if needed

## Verifying Results

After running the test, verify cached values match:

```sql
SELECT
  name,
  total_gwp_per_m2_year,
  mpg_reference_value,
  is_compliant,
  total_gwp_a1_a3,
  total_gwp_sum
FROM lca_projects
WHERE id = '00000000-0000-0000-0000-000000000001';
```

The values should match the test output.

## Cleaning Up Test Data

To remove test data:

```sql
DELETE FROM lca_layers WHERE element_id IN (
  SELECT id FROM lca_elements WHERE project_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM lca_elements WHERE project_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM lca_projects WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Next Steps

After successful testing:

1. **Create more test cases**: Different building types, construction systems
2. **Validate against benchmarks**: Compare results to known MPG values
3. **Test edge cases**: Projects with no materials, zero quantities, etc.
4. **API testing**: Test via `/api/lca/calculate` endpoint
5. **Frontend testing**: Create projects through Quick Start form

## Performance Notes

Typical test performance:
- **Calculation time**: 100-500ms
- **Database queries**: 2-3 queries (load + update + reference lookup)
- **Memory**: < 50MB

For large projects (100+ elements):
- Consider query optimization
- Add indexes on foreign keys if needed
- Monitor query performance in Neon dashboard
