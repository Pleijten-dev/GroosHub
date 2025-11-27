# LCA Package System - Implementation Summary

## ✅ What Was Implemented

A complete package-based system for LCA Quick Start that allows users to **manually select** predefined building assembly packages instead of automatic template generation.

---

## 📦 System Overview

### Architecture

```
┌─────────────────────────────────────────┐
│ LEVEL 1: Materials (lca_materials)      │
│ • 902 Ökobaudat materials               │
└──────────────┬──────────────────────────┘
               │ Used in
┌──────────────▼──────────────────────────┐
│ LEVEL 2: Packages (NEW!)                │
│ • lca_packages                          │
│ • lca_package_layers                    │
│ • Reusable templates available to all   │
└──────────────┬──────────────────────────┘
               │ Applied to
┌──────────────▼──────────────────────────┐
│ LEVEL 3: Projects (lca_projects)        │
│ • User's specific buildings             │
└──────────────┬──────────────────────────┘
               │ Contains
┌──────────────▼──────────────────────────┐
│ LEVEL 4: Elements (lca_elements)        │
│ • package_id reference added            │
│ • Tracks which package created it       │
└──────────────┬──────────────────────────┘
               │ Has
┌──────────────▼──────────────────────────┐
│ LEVEL 5: Layers (lca_layers)            │
│ • Material layers copied from package   │
└─────────────────────────────────────────┘
```

---

## 📁 Files Created/Modified

### Database

✅ **Created**: `src/lib/db/migrations/008_lca_packages.sql`
- Creates `lca_packages` table
- Creates `lca_package_layers` table
- Adds `package_id` to `lca_elements`
- Indexes and constraints

### TypeScript Types

✅ **Modified**: `src/features/lca/types/index.ts`
- Added `LCAPackage` interface
- Added `LCAPackageLayer` interface
- Added `PackageWithLayers`, `CreatePackageInput`, etc.
- Added `QuickStartPackageSelections` type
- Updated `LCAElement` to include `package_id`

### API Endpoints

✅ **Created**: `src/app/api/lca/packages/route.ts`
- `GET /api/lca/packages` - List packages with filtering
- `POST /api/lca/packages` - Create new package

✅ **Created**: `src/app/api/lca/packages/[id]/route.ts`
- `GET /api/lca/packages/[id]` - Get package details with layers
- `PATCH /api/lca/packages/[id]` - Update package
- `DELETE /api/lca/packages/[id]` - Delete package

✅ **Created**: `src/app/api/lca/packages/for-quick-start/route.ts`
- `GET /api/lca/packages/for-quick-start` - Get packages organized by category
- Optimized for Quick Start form (filters by construction system)

✅ **Created**: `src/app/api/lca/projects/quick-create-v2/route.ts`
- New Quick Create endpoint that accepts package selections
- Applies packages to create elements with layers
- Calculates appropriate quantities based on building dimensions

### Frontend Components

✅ **Created**: `src/features/lca/components/quick-start/QuickStartFormWithPackages.tsx`
- Updated Quick Start form with package selection dropdowns
- Fetches available packages based on construction system
- Shows package details (name, layer count, thickness)
- Auto-selects first available package in each category

### Seed Script

✅ **Created**: `scripts/lca/seed-packages.ts`
- Seeds 15+ system template packages
- Categories: exterior walls, roofs, floors, windows, foundations
- Construction systems: houtskelet, metselwerk, beton, CLT
- Facade types: hout, vezelcement, metselwerk, metaal, stucwerk
- Roof types: hellend dakpannen, plat bitumen, groendak
- Floor types: kruipruimte, betonplaat, tussenvloer
- Window frames: PVC, hout, aluminium

---

## 🚀 How to Deploy

### Step 1: Run Database Migration

```bash
# Option 1: Using npm script
npm run db:migrate

# Option 2: Using npx
npx tsx scripts/init-database.ts
```

**Expected output:**
```
🔄 Starting database migration...
✅ Database connection established
📄 Schema file loaded
⚙️  Executing base schema...
✅ Base schema created successfully!
📁 Running migration files...
  📄 Running 008_lca_packages.sql...
  ✅ 008_lca_packages.sql completed
✅ All migrations completed successfully!
```

### Step 2: Seed System Packages

```bash
npx tsx scripts/lca/seed-packages.ts
```

**Expected output:**
```
🌱 Seeding LCA Packages...

📦 Creating 15 package templates...

  Processing: Houtskelet RC 5.0 - Houten gevelbekleding
    ✅ Created with 5 layers

  Processing: Houtskelet RC 5.0 - Vezelcement
    ✅ Created with 5 layers

  [... more packages ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seeding complete!
   Created: 15 packages
   Skipped: 0 packages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Update Quick Start Page

Replace the old form with the new package-based form:

```tsx
// src/app/[locale]/lca/quick-start/page.tsx

// OLD:
import QuickStartForm from '@/features/lca/components/quick-start/QuickStartForm';

// NEW:
import QuickStartFormWithPackages from '@/features/lca/components/quick-start/QuickStartFormWithPackages';

// Update the component:
<QuickStartFormWithPackages locale={locale as 'nl' | 'en'} />
```

### Step 4: Test the System

1. **Navigate to**: `http://localhost:3000/nl/lca/quick-start`

2. **Fill in basic info**:
   - Project name
   - Gross floor area (e.g., 120 m²)
   - Number of floors (e.g., 2)
   - Number of dwellings (e.g., 1)
   - Study period (e.g., 75 years)

3. **Select construction system**:
   - Choose: Houtskeletbouw / Metselwerk / Beton / CLT
   - Packages automatically filter based on selection

4. **Select packages**:
   - Gevel (exterior wall) - Choose from available packages
   - Dak (roof) - Choose from available packages
   - Vloer (floor) - Choose from available packages
   - Kozijnen (windows) - Choose from available packages
   - Fundering (foundation) - Choose from available packages

5. **Submit**:
   - Creates project with selected packages
   - Redirects to results page

---

## 🔄 Updated Quick Start Workflow

### Old Workflow (Hardcoded Templates)

```
User selects:
└─> Construction System + Facade + Foundation + Roof + Windows
    └─> System generates hardcoded templates
        └─> Creates elements with material searches
            └─> Results
```

### New Workflow (Package Selection)

```
User selects:
└─> Construction System
    └─> Fetches available packages (filtered by construction system)
        └─> User selects specific package for each category:
            • Exterior Wall: "Houtskelet RC 5.0 - Houten gevelbekleding"
            • Roof: "Hellend dak - Dakpannen RC 5.0"
            • Floor: "Begane grond - Kruipruimte RC 3.5"
            • Windows: "Kozijnen - PVC HR+++"
            • Foundation: "Fundering - Betonnen strokenfundering"
        └─> System applies packages to project
            └─> Creates elements with package_id reference
                └─> Copies all layers from package to element
                    └─> Results
```

**Key Differences:**
- ✅ User has full control over package selection
- ✅ No hardcoded material searches
- ✅ Packages show layer count and thickness
- ✅ Packages can be reused across projects
- ✅ Elements track which package they came from (traceability)

---

## 📊 Database Schema Details

### lca_packages

Stores reusable building assembly templates.

```sql
CREATE TABLE lca_packages (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,  -- 'exterior_wall', 'floor', 'roof', etc.
  construction_system VARCHAR(100),  -- 'houtskelet', 'metselwerk', etc.
  insulation_level VARCHAR(50),  -- 'rc_5.0', 'rc_6.0', etc.
  total_thickness DECIMAL(10,6),  -- meters
  is_template BOOLEAN,  -- System template
  is_public BOOLEAN,  -- Available to all users
  user_id INTEGER,  -- NULL for system packages
  usage_count INTEGER,  -- Track popularity
  tags TEXT[],  -- Search tags
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### lca_package_layers

Defines material layers within packages.

```sql
CREATE TABLE lca_package_layers (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES lca_packages(id),
  position INTEGER,  -- 1 = outermost
  material_id UUID REFERENCES lca_materials(id),
  thickness DECIMAL(10,6),  -- meters
  coverage DECIMAL(4,3),  -- 0-1
  layer_function VARCHAR(100),  -- 'structural', 'insulation', 'finish'
  notes TEXT
);
```

### lca_elements (updated)

Added `package_id` for traceability.

```sql
ALTER TABLE lca_elements
ADD COLUMN package_id UUID REFERENCES lca_packages(id);
```

---

## 🎨 Seeded Packages

### Exterior Walls (5 packages)

1. **Houtskelet RC 5.0 - Houten gevelbekleding**
   - Construction: Houtskelet
   - Insulation: RC 5.0 (200mm mineraalwol)
   - Layers: Hout (18mm) | OSB (12mm) | Mineraalwol (200mm) | OSB (12mm) | Gips (12.5mm)

2. **Houtskelet RC 5.0 - Vezelcement**
   - Construction: Houtskelet
   - Insulation: RC 5.0
   - Layers: Vezelcement (10mm) | OSB (12mm) | Mineraalwol (200mm) | OSB (12mm) | Gips (12.5mm)

3. **Houtskelet RC 5.0 - Metselwerk voorgevel**
   - Construction: Houtskelet
   - Insulation: RC 5.0
   - Layers: Baksteen (100mm) | OSB (12mm) | Mineraalwol (200mm) | OSB (12mm) | Gips (12.5mm)

4. **Metselwerk RC 5.0 - Spouwmuur**
   - Construction: Metselwerk
   - Insulation: RC 5.0 (200mm EPS)
   - Layers: Baksteen (100mm) | EPS (200mm) | Kalkzandsteen (100mm) | Gips (10mm)

5. **Beton RC 5.0 - Geïsoleerd**
   - Construction: Beton
   - Insulation: RC 5.0
   - Layers: Stucwerk (15mm) | EPS (200mm) | Beton (150mm) | Gips (10mm)

6. **CLT RC 5.0 - Houtvezelisolatie**
   - Construction: CLT
   - Insulation: RC 5.0
   - Layers: Hout (18mm) | Houtvezel (200mm) | CLT (100mm) | Gips (12.5mm)

### Roofs (3 packages)

1. **Hellend dak - Dakpannen RC 5.0**
   - Layers: Dakpannen (15mm) | OSB (18mm) | Mineraalwol (200mm) | OSB (18mm)

2. **Plat dak - Bitumen RC 5.0**
   - Layers: Bitumen (5mm) | OSB (18mm) | EPS (200mm)

3. **Groendak - Extensief RC 5.0**
   - Layers: Groendak (150mm) | EPDM (5mm) | OSB (18mm) | EPS (200mm)

### Floors (3 packages)

1. **Begane grond - Kruipruimte RC 3.5**
   - Layers: OSB (22mm) | Mineraalwol (140mm)

2. **Begane grond - Betonplaat RC 3.5**
   - Layers: Beton (150mm) | EPS (140mm)

3. **Tussenvloer - Houten balkenvloer**
   - Layers: OSB (22mm) | Hout balken (200mm, 10% coverage) | Mineraalwol (200mm, 90% coverage)

### Windows (3 packages)

1. **Kozijnen - PVC HR+++**
   - Layers: Triple glas (40mm, 85% coverage) | PVC (80mm, 15% coverage)

2. **Kozijnen - Hout HR+++**
   - Layers: Triple glas (40mm, 85% coverage) | Hout (80mm, 15% coverage)

3. **Kozijnen - Aluminium HR+++**
   - Layers: Triple glas (40mm, 85% coverage) | Aluminium (80mm, 15% coverage)

### Foundation (1 package)

1. **Fundering - Betonnen strokenfundering**
   - Layers: Beton (300mm)

---

## 📡 API Endpoints Reference

### Get Packages for Quick Start

```http
GET /api/lca/packages/for-quick-start?construction_system=houtskelet
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exterior_wall": [
      {
        "id": "uuid",
        "name": "Houtskelet RC 5.0 - Houten gevelbekleding",
        "description": "...",
        "category": "exterior_wall",
        "construction_system": "houtskelet",
        "insulation_level": "rc_5.0",
        "total_thickness": 0.2545,
        "layer_count": 5,
        "usage_count": 0
      }
    ],
    "roof": [...],
    "floor": [...],
    "windows": [...],
    "foundation": [...]
  }
}
```

### Create Project with Packages

```http
POST /api/lca/projects/quick-create-v2
Content-Type: application/json

{
  "name": "My Project",
  "gross_floor_area": 120,
  "floors": 2,
  "dwelling_count": 1,
  "construction_system": "houtskelet",
  "study_period": 75,
  "packages": {
    "exterior_wall": "package-uuid-1",
    "roof": "package-uuid-2",
    "floor": "package-uuid-3",
    "windows": "package-uuid-4",
    "foundation": "package-uuid-5"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project": { "id": "project-uuid", ... },
    "elements_created": 6,
    "layers_created": 28
  }
}
```

---

## 🔧 Next Steps (Optional Enhancements)

### Phase 2: Package Management UI

Create admin pages for package management:

1. **Package Library Page** (`/nl/lca/packages`)
   - List all available packages
   - Filter by category, construction system, insulation level
   - Search functionality

2. **Package Editor**
   - Create custom packages
   - Edit existing packages
   - Layer management (add, remove, reorder)
   - Material selection

3. **Package Details Page**
   - View package information
   - See all layers with materials
   - Usage statistics
   - Clone package functionality

### Phase 3: Advanced Features

1. **Package Versioning**
   - Track package updates
   - Allow projects to update to new package versions

2. **Package Templates**
   - Create package templates for different use cases
   - Import/export packages

3. **Usage Analytics**
   - Track most popular packages
   - Recommend packages based on project type

---

## 🐛 Troubleshooting

### Migration Fails

**Error**: `Database URL not configured`

**Solution**: Set environment variables:
```bash
export POSTGRES_URL="your_connection_string"
export POSTGRES_URL_NON_POOLING="your_non_pooling_connection_string"
```

### Seed Script Fails

**Error**: `Material not found`

**Solution**: Ensure materials table is populated first:
```bash
npx tsx scripts/lca/import/import-oekobaudat-fixed.ts
```

### Packages Not Loading

**Error**: Empty package dropdown

**Solution**:
1. Check if packages were seeded: `SELECT COUNT(*) FROM lca_packages;`
2. Check browser console for API errors
3. Verify `/api/lca/packages/for-quick-start` returns data

---

## ✅ Summary

The LCA Package System has been successfully implemented with:

- ✅ Database schema (migration ready)
- ✅ TypeScript types
- ✅ Complete API endpoints
- ✅ Seed script with 15+ packages
- ✅ Updated Quick Start form with package selection
- ✅ New Quick Create endpoint (v2)

**To activate:**
1. Run migration: `npm run db:migrate`
2. Seed packages: `npx tsx scripts/lca/seed-packages.ts`
3. Update Quick Start page to use `QuickStartFormWithPackages`
4. Test the complete workflow

The old Quick Start form (`QuickStartForm.tsx`) is preserved for backward compatibility.
