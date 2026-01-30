# LCA Tool Documentation

**Last Updated:** January 30, 2026

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Calculation Engine](#calculation-engine)
7. [Pages and UI Components](#pages-and-ui-components)
8. [Data Sources](#data-sources)
9. [Feature Gaps and TODOs](#feature-gaps-and-todos)
10. [Future Integration: Forma Plugin](#future-integration-forma-plugin)

---

## Overview

The LCA (Life Cycle Assessment) tool is a feature within GroosHub that enables users to calculate the environmental impact of building projects according to Dutch MPG (Milieuprestatie Gebouwen) standards. The tool calculates embodied carbon across all lifecycle phases (A1-D) following the EN 15978 European standard.

### Key Features

- **MPG Compliance Checking**: Validates projects against Dutch 2025 MPG limits
- **Full Lifecycle Calculation**: Covers phases A1-A3, A4, A5, B4, C1-C4, and Module D
- **Material Database**: Integrated with Ökobaudat EPD database (900+ materials)
- **Quick Start Mode**: Template-based project creation for rapid assessments
- **Dutch Building Standards**: Support for Dutch construction systems, building types, and regulations
- **Bilingual Support**: Full Dutch (NL) and English (EN) translations

### Target Users

- Architects and designers
- Sustainability consultants
- Building developers
- Construction companies seeking MPG compliance

---

## Current Implementation Status

### Completed Features

| Feature | Status | Location |
|---------|--------|----------|
| LCA Landing Page | ✅ Complete | `src/app/[locale]/lca/page.tsx` |
| Quick Start Form | ✅ Complete | `src/app/[locale]/lca/quick-start/page.tsx` |
| Project Dashboard | ✅ Complete | `src/app/[locale]/lca/dashboard/page.tsx` |
| Project Detail Page | ✅ Complete | `src/app/[locale]/lca/projects/[id]/page.tsx` |
| Results Dashboard | ✅ Complete | `src/app/[locale]/lca/results/[id]/page.tsx` |
| LCA Calculation Engine | ✅ Complete | `src/features/lca/utils/lca-calculator.ts` |
| All Phase Calculations (A1-D) | ✅ Complete | `src/features/lca/utils/calculations/` |
| Material Database Integration | ✅ Complete | `lca_materials` table |
| API Routes (CRUD + Calculate) | ✅ Complete | `src/app/api/lca/` |
| Snapshot Versioning | ✅ Complete | `src/lib/db/queries/lca.ts` |
| Database Schema | ✅ Complete | `prisma/schema-lca.prisma` |
| Ökobaudat Import Script | ✅ Complete | `scripts/lca/import/import-oekobaudat-fixed.ts` |
| NMD Lifespan Import | ✅ Complete | `scripts/lca/import/import-nmd-lifespans.ts` |
| MPG Reference Values | ✅ Complete | `scripts/lca/import/seed-reference-values.ts` |

### Partially Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| Advanced Mode (Custom Elements) | 🔶 UI Ready, Logic Partial | Landing page shows "Coming Soon" |
| Template System | 🔶 Basic Implementation | Templates generated programmatically, not from DB |
| Element Editor | 🔶 Not Started | Need UI for adding/editing elements and layers |
| Material Selector | 🔶 API Ready | No UI component for material selection |
| Project Comparison | 🔶 Not Started | Data structure supports it, no UI |
| Export to PDF/Excel | 🔶 Not Started | Types defined, no implementation |
| Grasshopper/Revit Import | 🔶 Types Defined | No actual import implementation |

### Not Yet Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| Forma Plugin Integration | High | Sync building data from Autodesk Forma |
| AI Assistant Integration | High | Query LCA data through chat |
| Detailed Reporting | Medium | Generate MPG-compliant reports |
| Multi-project Comparison | Medium | Compare environmental impact across projects |
| User Custom Materials | Medium | Allow users to add their own EPD data |
| Sensitivity Analysis | Low | Vary parameters to see impact |
| Monte Carlo Simulation | Low | Uncertainty analysis |

---

## Architecture

### File Structure

```
src/
├── app/
│   ├── [locale]/lca/
│   │   ├── page.tsx                 # Landing page
│   │   ├── quick-start/page.tsx     # Quick Start form
│   │   ├── dashboard/page.tsx       # Project dashboard
│   │   ├── projects/[id]/page.tsx   # Project detail
│   │   └── results/[id]/page.tsx    # Results view
│   └── api/lca/
│       ├── calculate/route.ts       # Trigger calculation
│       ├── materials/route.ts       # Material search
│       ├── projects/route.ts        # Project CRUD
│       ├── projects/[id]/route.ts   # Single project
│       ├── projects/quick-create/route.ts  # Quick Start
│       ├── snapshots/route.ts       # Snapshot versioning
│       └── snapshots/[id]/route.ts  # Single snapshot
├── features/lca/
│   ├── components/
│   │   ├── charts/
│   │   │   └── PhaseBreakdownMini.tsx
│   │   ├── modals/
│   │   │   └── NewProjectModal.tsx
│   │   ├── navigation/
│   │   │   ├── LCASidebar.tsx
│   │   │   ├── LCATabNavigation.tsx
│   │   │   └── ProjectContextMenu.tsx
│   │   ├── quick-start/
│   │   │   └── QuickStartForm.tsx
│   │   ├── results/
│   │   │   └── ResultsDashboard.tsx
│   │   ├── sidebar/
│   │   │   ├── LCAProjectCard.tsx
│   │   │   └── LCAProjectsSection.tsx
│   │   └── ui/
│   │       ├── ElementCategoryIcon.tsx
│   │       └── MPGScoreBadge.tsx
│   ├── hooks/
│   │   └── useProjects.ts
│   ├── types/
│   │   └── index.ts                 # All TypeScript types
│   └── utils/
│       ├── lca-calculator.ts        # Main calculation orchestrator
│       └── calculations/
│           ├── index.ts             # Centralized exports
│           ├── types.ts             # Calculation types
│           ├── phase-a1-a3.ts       # Production
│           ├── phase-a4.ts          # Transport to site
│           ├── phase-a5.ts          # Construction
│           ├── phase-b4.ts          # Replacement
│           ├── phase-c1.ts          # Deconstruction
│           ├── phase-c2.ts          # Transport EOL
│           ├── phase-c3.ts          # Waste processing
│           ├── phase-c4.ts          # Disposal
│           ├── phase-d.ts           # Benefits
│           └── operational.ts       # B6 operational energy
├── lib/db/queries/
│   └── lca.ts                       # Snapshot queries
└── prisma/
    └── schema-lca.prisma            # LCA database models

scripts/lca/
├── import/
│   ├── import-oekobaudat-fixed.ts   # Material import
│   ├── import-nmd-lifespans.ts      # Service life data
│   └── seed-reference-values.ts     # MPG limits
└── test/
    ├── recreate-and-test.ts
    └── test-api-endpoints.ts
```

### Data Flow

```
User Input (Quick Start Form)
      │
      ▼
API: /api/lca/projects/quick-create
      │
      ├─► Create LCA Project (lca_projects)
      │
      ├─► Generate Elements from Template (lca_elements)
      │
      └─► Create Layers with Materials (lca_layers → lca_materials)
            │
            ▼
      API: /api/lca/calculate
            │
            ▼
      LCA Calculator Engine
            │
            ├─► Phase A1-A3: calculateA1A3()
            ├─► Phase A4: calculateA4()
            ├─► Phase A5: calculateA5()
            ├─► Phase B4: calculateB4()
            ├─► Phase C: calculateC() (C1+C2+C3+C4)
            └─► Phase D: calculateD()
                  │
                  ▼
            Normalize Results (per m²/year)
                  │
                  ▼
            Update Project Cache (lca_projects)
                  │
                  ▼
            Check MPG Compliance
                  │
                  ▼
            Results Dashboard Display
```

---

## Database Schema

### Core Tables

#### `lca_materials`
Stores Environmental Product Declaration (EPD) data from Ökobaudat.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `oekobaudat_uuid` | String | Original Ökobaudat identifier |
| `name_de`, `name_en`, `name_nl` | String | Multilingual names |
| `category`, `subcategory` | String | Material classification |
| `density` | Float | kg/m³ |
| `declared_unit` | String | Reference unit (1 kg, 1 m³, etc.) |
| `gwp_a1_a3` | Float | Production phase GWP (kg CO₂-eq) |
| `gwp_a4`, `gwp_a5` | Float | Transport and construction GWP |
| `gwp_c1..c4` | Float | End-of-life phase GWP |
| `gwp_d` | Float | Module D benefits |
| `biogenic_carbon` | Float | Stored biogenic CO₂ |
| `reference_service_life` | Int | Expected lifespan (years) |
| `dutch_availability` | Boolean | Available in Netherlands |
| `quality_rating` | Int | 1-5 quality score |

#### `lca_projects`
Main project entity with cached calculation results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Project name |
| `gross_floor_area` | Float | GFA in m² |
| `building_type` | String | vrijstaand, rijwoning, appartement |
| `construction_system` | String | houtskelet, clt, metselwerk, beton |
| `study_period` | Int | Default 75 years |
| `facade_cladding` | String | Facade material type |
| `foundation` | String | Foundation type |
| `roof` | String | Roof type |
| `window_frames` | String | Frame material |
| `window_to_wall_ratio` | Float | Percentage (0-100) |
| `total_gwp_a1_a3..d` | Float | Cached phase results |
| `total_gwp_per_m2_year` | Float | Normalized MPG score |
| `mpg_reference_value` | Float | Applicable limit |
| `is_compliant` | Boolean | Passes MPG check |
| `user_id` | String | Owner |

#### `lca_elements`
Building elements (walls, floors, roof, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK to lca_projects |
| `name` | String | Element name |
| `category` | String | exterior_wall, floor, roof, etc. |
| `quantity` | Float | Area/length/volume |
| `quantity_unit` | String | m², m, m³ |
| `sfb_code` | String | Dutch Sfb classification |

#### `lca_layers`
Material layers within elements.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `element_id` | UUID | FK to lca_elements |
| `material_id` | UUID | FK to lca_materials |
| `position` | Int | Layer order (1 = outermost) |
| `thickness` | Float | Thickness in meters |
| `coverage` | Float | 0-1 (for studs/cavity) |
| `custom_lifespan` | Int | Override default RSL |
| `custom_transport_km` | Float | Override transport distance |

#### `lca_reference_values`
MPG limits and operational carbon benchmarks.

| Column | Type | Description |
|--------|------|-------------|
| `building_type` | String | Building type identifier |
| `mpg_limit` | Float | kg CO₂-eq/m²/year |
| `energy_label` | String | A+++, A++, etc. |
| `operational_carbon` | Float | Benchmark operational emissions |

#### `lca_snapshots`
Version control for calculations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | FK to project |
| `version_number` | Int | Auto-incrementing |
| `is_active` | Boolean | Current version |
| `results` | JSON | Full calculation results |
| `calculation_status` | String | pending, calculating, completed, failed |

---

## API Routes

### Projects

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/lca/projects` | List user's projects |
| POST | `/api/lca/projects` | Create new project |
| GET | `/api/lca/projects/[id]` | Get project details |
| PUT | `/api/lca/projects/[id]` | Update project |
| DELETE | `/api/lca/projects/[id]` | Delete project |
| POST | `/api/lca/projects/quick-create` | Quick Start creation |

### Materials

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/lca/materials` | Search materials |
| POST | `/api/lca/materials` | Get categories with counts |

**Query Parameters for GET:**
- `search`: Search term for name
- `category`: Filter by category
- `min_quality`: Minimum quality rating (1-5)
- `dutch_only`: Only Dutch-available materials (default: true)
- `limit`, `offset`: Pagination

### Calculation

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/lca/calculate` | Trigger full LCA calculation |

**Request Body:**
```json
{
  "projectId": "uuid"
}
```

### Snapshots

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/lca/snapshots` | List snapshots for project |
| POST | `/api/lca/snapshots` | Create new snapshot |
| GET | `/api/lca/snapshots/[id]` | Get snapshot |
| PUT | `/api/lca/snapshots/[id]` | Update snapshot |
| DELETE | `/api/lca/snapshots/[id]` | Delete snapshot |

---

## Calculation Engine

### Lifecycle Phases (EN 15978)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BUILDING LIFECYCLE                                │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│  A: PRODUCTION  │   B: USE STAGE  │  C: END OF LIFE │   D: BENEFITS    │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ A1: Raw material│ B1: Use         │ C1: Deconstruct │ D: Recycling     │
│ A2: Transport   │ B2: Maintenance │ C2: Transport   │    benefits,     │
│ A3: Manufacture │ B3: Repair      │ C3: Processing  │    energy        │
│ A4: To site     │ B4: Replacement │ C4: Disposal    │    recovery      │
│ A5: Construction│ B5: Refurbish   │                 │                  │
│                 │ B6: Operational │                 │                  │
│                 │ B7: Water       │                 │                  │
└─────────────────┴─────────────────┴─────────────────┴──────────────────┘
```

### Calculation Functions

#### `calculateA1A3(mass, material)` - Production
Calculates GWP from raw material extraction through manufacturing.
```typescript
// Per-unit GWP × mass (considering declared unit conversion)
gwp = material.gwp_a1_a3 * (mass / material.conversion_to_kg)
```

#### `calculateA4(mass, material, customDistance)` - Transport to Site
Calculates transport emissions based on distance and mode.
```typescript
// Default distances: concrete=50km, timber=200km, metal=500km
// Emission factors: truck=0.062, train=0.022, ship=0.008 kg CO₂-eq/tonne-km
gwp = (mass/1000) * distance * emissionFactor
```

#### `calculateA5(a1a3, elementCategory)` - Construction
Estimates construction waste and installation emissions.
```typescript
// Percentage of A1-A3 based on element type
// Ranges: windows=2%, walls=3-5%, foundation=8%, MEP=10%
gwp = a1a3 * A5_FACTOR[category]
```

#### `calculateB4(mass, material, customLifespan, studyPeriod)` - Replacement
Calculates replacements needed over building lifespan.
```typescript
// Number of replacements × production impact
lifespan = customLifespan || material.reference_service_life || DEFAULT
replacements = Math.floor(studyPeriod / lifespan)
gwp = replacements * calculateA1A3(mass, material)
```

#### `calculateC(mass, material)` - End of Life
Sum of C1 (deconstruction), C2 (transport), C3 (processing), C4 (disposal).
```typescript
gwp = c1 + c2 + c3 + c4
// Each uses material-specific EPD values or defaults
```

#### `calculateD(mass, material)` - Benefits
Module D credits for recycling/reuse (typically negative).
```typescript
gwp = material.gwp_d * mass  // Often negative (benefit)
```

#### `calculateOperationalCarbon(project)` - B6
Simplified operational energy estimation.
```typescript
// Based on energy label: A++++= 5, A= 25, D= 55 kg CO₂-eq/m²/year
gwp = OPERATIONAL_CARBON_BY_LABEL[energyLabel] * gfa * studyPeriod
```

### Normalization

Results are normalized to:
- `per_m2`: Total GWP / Gross Floor Area
- `per_m2_per_year`: Total GWP / GFA / Study Period (MPG score)

### MPG Compliance

```typescript
// 2025 limits by building type:
// vrijstaand: 0.8 kg CO₂-eq/m²/year
// rijwoning: 0.5 kg CO₂-eq/m²/year
// appartement: 0.45 kg CO₂-eq/m²/year

isCompliant = normalized.per_m2_per_year <= mpgLimit
```

---

## Pages and UI Components

### Pages

#### Landing Page (`/lca`)
- Hero section with LCA Calculator title
- Quick Start card (recommended, links to `/lca/quick-start`)
- Advanced Mode card (coming soon, disabled)
- Features grid (MPG Compliance, Data-Driven, Complete Lifecycle, Optimization)
- MPG Information section with 2025/2030 limits
- CTA section

#### Quick Start (`/lca/quick-start`)
Form with sections:
1. **Basic Information**: Name, GFA, floors, location
2. **Dwelling Characteristics**: Number of dwellings
3. **Construction**: Construction system, facade, foundation, roof, windows, WWR, study period

On submit → Creates project with template elements → Redirects to results

#### Dashboard (`/lca/dashboard`)
- Sidebar with project list (LCAProjectsSection)
- Demo component showcase (MPGScoreBadge, PhaseBreakdownMini, ElementCategoryIcon)
- New Project Modal

#### Project Detail (`/lca/projects/[id]`)
- Project header with name, type, area
- MPG Compliance section with score badge
- Phase Breakdown chart
- Project Details grid

#### Results (`/lca/results/[id]`)
- Large MPG score card (green/red based on compliance)
- Quick stats: Embodied Carbon, Operational Carbon, Total Impact
- LCA Phases Breakdown with phase bars
- Project Details and Methodology sections
- "Start Calculation" button if not yet calculated

### Components

| Component | Purpose |
|-----------|---------|
| `MPGScoreBadge` | Visual compliance indicator (green/yellow/red) |
| `PhaseBreakdownMini` | Horizontal bar chart showing phase distribution |
| `ElementCategoryIcon` | Icons for element types (wall, roof, floor, etc.) |
| `LCAProjectCard` | Project summary in sidebar |
| `LCAProjectsSection` | Project list with new project button |
| `LCASidebar` | Collapsible sidebar with project navigation |
| `LCATabNavigation` | Tab navigation for LCA section |
| `NewProjectModal` | Modal for creating new project |
| `QuickStartForm` | Full Quick Start form component |
| `ResultsDashboard` | Main results visualization |

---

## Data Sources

### Ökobaudat (German EPD Database)
- **Source**: https://www.oekobaudat.de/
- **Records**: 900+ materials
- **Import**: `scripts/lca/import/import-oekobaudat-fixed.ts`
- **Coverage**: GWP for all lifecycle phases, density, declared units

### NMD (Nationale Milieudatabase - Dutch)
- **Source**: Dutch national environmental database
- **Data**: Reference Service Life (RSL) values
- **Import**: `scripts/lca/import/import-nmd-lifespans.ts`

### MPG Reference Values
- **Source**: Dutch Building Decree (Bouwbesluit)
- **Data**: MPG limits per building type, operational carbon by energy label
- **Import**: `scripts/lca/import/seed-reference-values.ts`

---

## Feature Gaps and TODOs

### High Priority

1. **Advanced Mode / Custom Element Editor**
   - UI for manually adding building elements
   - Material selector with search
   - Layer editor with thickness, coverage inputs
   - Currently: Templates only, no custom editing

2. **Forma Plugin Integration**
   - Sync building geometry from Autodesk Forma
   - Extract element quantities automatically
   - Map Forma materials to LCA materials
   - See [Future Integration: Forma Plugin](#future-integration-forma-plugin)

3. **AI Assistant Integration**
   - Store LCA results in vector database
   - Allow natural language queries about projects
   - "What's the biggest contributor to my carbon footprint?"
   - "Compare timber vs concrete for this project"

4. **PDF/Excel Export**
   - Generate MPG-compliant reports
   - Export detailed phase breakdown
   - Types defined (`GrasshopperExportData`, `RevitExportData`) but not implemented

### Medium Priority

5. **Project Comparison**
   - Compare multiple projects side-by-side
   - Variant analysis (same building, different materials)

6. **User Custom Materials**
   - Allow users to add their own EPD data
   - Upload manufacturer EPDs
   - Database schema supports it (`user_id` field in materials)

7. **Detailed Element Breakdown**
   - Show impact per element in results
   - Currently: Only phase breakdown, not element breakdown

8. **Operational Carbon Detail**
   - More detailed B6 calculation
   - Support actual gas/electricity usage (fields exist but unused)

### Low Priority

9. **Sensitivity Analysis**
   - Vary parameters to see impact range
   - "What if insulation is 25% thicker?"

10. **Monte Carlo Simulation**
    - Uncertainty analysis on material data
    - Confidence intervals on results

11. **Multi-tenant Templates**
    - Organization-specific default templates
    - Template sharing between users

---

## Future Integration: Forma Plugin

### Vision

Connect GroosHub LCA tool to Autodesk Forma to:
1. **Sync Building Data**: Import building geometry, elements, and quantities
2. **Material Mapping**: Map Forma materials to Ökobaudat EPDs
3. **Automatic Updates**: Recalculate LCA when Forma model changes
4. **Design Feedback**: Show environmental impact directly in Forma

### Data Flow (Proposed)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Autodesk  │────►│ GroosHub     │────►│  PostgreSQL │
│    Forma    │     │ Forma Plugin │     │   Database  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                    │
       │  Building Model    │  Element Data      │  LCA Results
       │  - Geometry        │  - Quantities      │  - By Element
       │  - Materials       │  - Material IDs    │  - By Phase
       │  - Zones           │  - Properties      │  - MPG Score
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                   AI Assistant                          │
│  "What's the carbon impact of building A vs B?"        │
│  "How can I reduce the MPG score by 20%?"              │
└─────────────────────────────────────────────────────────┘
```

### Implementation Steps

1. **Forma API Integration**
   - Authenticate with Forma API
   - Fetch project/model data
   - Subscribe to model change events

2. **Element Extraction**
   - Parse Forma elements (walls, floors, roofs)
   - Calculate areas/volumes from geometry
   - Extract material assignments

3. **Material Mapping**
   - Create mapping table: Forma materials → LCA materials
   - Handle fuzzy matching for similar materials
   - Allow manual overrides

4. **Sync Workflow**
   - Manual sync button in GroosHub
   - Optional: Automatic sync on Forma changes
   - Conflict resolution for edited projects

5. **AI Integration**
   - Store LCA project data with embeddings
   - Enable RAG queries on project portfolio
   - "Show me all projects exceeding MPG limit"

### Database Additions Needed

```sql
-- Forma integration tables
CREATE TABLE forma_connections (
  id UUID PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  forma_project_id VARCHAR(255),
  lca_project_id UUID REFERENCES lca_projects(id),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE forma_material_mappings (
  id UUID PRIMARY KEY,
  forma_material_id VARCHAR(255),
  forma_material_name VARCHAR(255),
  lca_material_id UUID REFERENCES lca_materials(id),
  confidence FLOAT,
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Quick Reference

### Building Types (Dutch)

| Code | Dutch | English |
|------|-------|---------|
| `vrijstaand` | Vrijstaand | Detached house |
| `twee_onder_een_kap` | Twee-onder-een-kap | Semi-detached |
| `rijwoning` | Rijwoning | Terraced house |
| `appartement` | Appartement | Apartment |

### Construction Systems

| Code | Dutch | English |
|------|-------|---------|
| `houtskelet` | Houtskeletbouw | Timber frame |
| `clt` | CLT / Massief hout | Cross-laminated timber |
| `metselwerk` | Metselwerk | Masonry |
| `beton` | Betonbouw | Concrete |

### Element Categories

| Code | Description |
|------|-------------|
| `exterior_wall` | External walls |
| `interior_wall` | Internal walls |
| `floor` | Floors |
| `roof` | Roof |
| `foundation` | Foundation |
| `windows` | Windows and glazing |
| `doors` | Doors |
| `mep` | Mechanical/Electrical/Plumbing |
| `finishes` | Interior finishes |

### Default Constants

```typescript
// Transport emission factors (kg CO₂-eq/tonne-km)
truck: 0.062
train: 0.022
ship: 0.008

// Default lifespans (years)
concrete: 100
timber: 75
masonry: 100
insulation: 50
glass: 30
finishes: 25

// A5 factors (% of A1-A3)
exterior_wall: 5%
floor: 4%
roof: 6%
foundation: 8%
windows: 2%
mep: 10%

// Operational carbon by energy label (kg CO₂-eq/m²/year)
A++++: 5
A+++: 8
A++: 12
A+: 18
A: 25
B: 35
C: 45
D: 55
```

---

## Market Research: Competing LCA Tools

### Overview

This section summarizes research on leading building LCA tools to identify features that may enhance GroosHub's LCA tool.

### Major LCA Software Comparison

| Tool | Key Strengths | Pricing | Target Users |
|------|--------------|---------|--------------|
| **One Click LCA** | Largest database (500K+ EPDs), 20+ BIM integrations, 140+ certifications | Subscription | Enterprise, Consultants |
| **Tally** | Native Revit integration, real-time analysis | Subscription | Architects using Revit |
| **EC3** | Free, open-access, 100K+ EPDs, procurement focus | Free | All construction professionals |
| **Athena IE4B** | Custom assemblies, Canadian/US LCI data | Free | North American projects |
| **Carbon Designer 3D** | Early design optimization, massing-based | Part of One Click LCA | Early design stage |
| **2050 Materials** | Forma integration, parametric carbon estimation | API-based | Urban planners |

### Feature Gap Analysis

Based on competitor analysis, the following features are common in market-leading tools but missing from GroosHub:

#### High-Value Missing Features

| Feature | Present in Competitors | GroosHub Status | Priority |
|---------|----------------------|-----------------|----------|
| **BIM Integration (Revit/IFC)** | One Click LCA, Tally | Types defined only | High |
| **Material Benchmarking** | One Click LCA, EC3 | Not implemented | High |
| **Design Variant Comparison** | All major tools | Not implemented | High |
| **Real-time Calculation** | Tally, Carbon Designer | Backend only | Medium |
| **Carbon Hotspot Visualization** | One Click LCA | Not implemented | Medium |
| **PDF/Excel Export** | All tools | Types defined only | Medium |
| **Certification Documentation** | One Click LCA | Not implemented | Medium |
| **Early Design Optimizer** | Carbon Designer 3D | Not implemented | Medium |
| **Material Alternatives Suggestions** | EC3 | Not implemented | Low |
| **Sensitivity Analysis** | SimaPro, GaBi | Not implemented | Low |

#### Dutch Market-Specific Requirements

Per [Nationale Milieudatabase (NMD)](https://milieudatabase.nl/en/):

| Requirement | GroosHub Status | Notes |
|-------------|-----------------|-------|
| EN 15804+A2 compliance | Partial | Using Ökobaudat, should add NMD Category 1-3 data |
| 19 impact categories | Partial | Currently focus on GWP only |
| Shadow price calculation (€/m²/year) | Not implemented | Required for official MPG |
| NMD-validated tool status | Not achieved | Requires Stichting NMD validation |
| A2 set support (from Jan 2026) | Not implemented | Should be ready for transition |

**Note:** As of October 2025, only validated tools like MPGCalc 3 (DGMR Software) can be used for official MPG calculations. GroosHub can position as an early-design/estimation tool or pursue NMD validation.

### Competitive Positioning

**GroosHub's Unique Advantages:**
1. AI-powered insights through integrated chat assistant
2. Forma integration potential (none of the competitors have this)
3. Location analysis with Dutch CBS data
4. Multi-tenant organization structure
5. All-in-one platform (LCA + Location + AI)

**Recommended Differentiation Strategy:**
1. **Forma Integration First**: No competitor has native Forma integration - this is a significant opportunity
2. **AI-Assisted LCA**: Use the AI assistant to provide optimization recommendations
3. **Design-Phase Focus**: Target early design decisions where quick iterations matter more than NMD validation
4. **Portfolio Analysis**: Leverage multi-project capabilities for portfolio-level carbon tracking

---

## Implementation Outline

### Phase 1: Foundation Enhancement (Weeks 1-4)

#### 1.1 Advanced Mode / Element Editor
**Goal:** Enable custom element and layer editing for detailed LCA calculations

**Tasks:**
- [ ] Create `ElementEditor` component for adding/editing building elements
- [ ] Create `LayerEditor` component for adding material layers
- [ ] Create `MaterialSelector` component with search and filtering
- [ ] Update `/lca/projects/[id]` page with edit capability
- [ ] Add API endpoints for element CRUD operations
- [ ] Implement drag-and-drop layer reordering

**Files to Create:**
```
src/features/lca/components/editor/
├── ElementEditor.tsx
├── LayerEditor.tsx
├── MaterialSelector.tsx
├── ElementList.tsx
└── index.ts
```

**Database Changes:** None required (schema already supports this)

#### 1.2 Material Benchmarking
**Goal:** Compare materials within a category to identify lower-carbon alternatives

**Tasks:**
- [ ] Create `MaterialBenchmark` component showing category averages
- [ ] Add API endpoint `/api/lca/materials/benchmark` for category stats
- [ ] Display benchmark comparison in material selector
- [ ] Add "Alternative Suggestions" feature in results view

#### 1.3 Design Variant Comparison
**Goal:** Compare multiple project configurations side-by-side

**Tasks:**
- [ ] Create `ProjectComparison` page at `/lca/compare`
- [ ] Add project selection UI for up to 4 projects
- [ ] Create comparison charts (stacked bar, radar)
- [ ] Show phase-by-phase and element-by-element differences

---

### Phase 2: Forma Integration (Weeks 5-10)

#### 2.1 Forma API Connection
**Goal:** Connect to Autodesk Forma for building geometry import

**Tasks:**
- [ ] Set up Forma developer account and API credentials
- [ ] Create OAuth flow for Forma authentication
- [ ] Implement Forma project listing
- [ ] Create `/api/integrations/forma/` routes

**Files to Create:**
```
src/features/integrations/forma/
├── types/index.ts
├── api/FormaClient.ts
├── hooks/useFormaProjects.ts
├── components/FormaConnect.tsx
└── utils/geometryParser.ts
```

#### 2.2 Geometry Extraction
**Goal:** Extract building elements and quantities from Forma models

**Implementation using Forma API:**
```typescript
// Example using Forma.elements API
const buildings = await Forma.getPathsByCategory({ category: 'buildings' });
const footprints = await Forma.render.footprints.get({ paths: buildings });
const triangles = await Forma.render.triangles.get({ paths: buildings });
```

**Tasks:**
- [ ] Implement building footprint extraction
- [ ] Calculate floor areas from geometry
- [ ] Estimate wall areas from perimeter × height
- [ ] Extract roof geometry
- [ ] Parse material assignments if available

#### 2.3 Material Mapping
**Goal:** Map Forma materials to LCA database materials

**Tasks:**
- [ ] Create `forma_material_mappings` table
- [ ] Build fuzzy matching algorithm for material names
- [ ] Create UI for manual mapping overrides
- [ ] Store mapping history for future projects

**Database Additions:**
```sql
CREATE TABLE forma_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  forma_project_id VARCHAR(255) NOT NULL,
  lca_project_id UUID REFERENCES lca_projects(id),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(forma_project_id, lca_project_id)
);

CREATE TABLE forma_material_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER REFERENCES organizations(id),
  forma_material_name VARCHAR(255) NOT NULL,
  lca_material_id UUID REFERENCES lca_materials(id),
  confidence FLOAT,
  is_manual BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, forma_material_name)
);
```

#### 2.4 Sync Workflow
**Goal:** Enable bidirectional sync between Forma and GroosHub

**Tasks:**
- [ ] Create sync UI in project editor
- [ ] Implement "Import from Forma" flow
- [ ] Handle sync conflicts (manual edits vs. Forma updates)
- [ ] Add webhook support for Forma model changes (if available)
- [ ] Create sync history/audit log

---

### Phase 3: AI Integration (Weeks 11-14)

#### 3.1 LCA Data Embedding
**Goal:** Store LCA project data in vector database for AI queries

**Tasks:**
- [ ] Create embedding schema for LCA projects
- [ ] Generate embeddings for project summaries
- [ ] Store material combinations and results
- [ ] Index by building type, construction system, MPG score

**Embedding Content:**
```
Project: [name]
Building Type: [type], GFA: [area] m²
Construction: [system], [facade], [foundation], [roof]
MPG Score: [score] kg CO₂-eq/m²/year ([compliant/non-compliant])
Phase Breakdown: A1-A3: [value], B4: [value], C: [value], D: [value]
Key Materials: [top 5 materials by impact]
```

#### 3.2 AI Query Capabilities
**Goal:** Enable natural language queries about LCA data

**Example Queries:**
- "What's the biggest carbon contributor in my project?"
- "How does my project compare to similar buildings?"
- "What material swaps could reduce my MPG score by 10%?"
- "Show me all projects exceeding the 2025 MPG limit"
- "What's the average MPG score for timber frame houses?"

**Tasks:**
- [ ] Add LCA context to AI assistant system prompt
- [ ] Create LCA-specific RAG retrieval function
- [ ] Implement comparative analysis tools
- [ ] Add optimization suggestion generation

#### 3.3 Optimization Recommendations
**Goal:** AI-generated suggestions for reducing environmental impact

**Tasks:**
- [ ] Analyze material contributions by phase
- [ ] Compare against benchmarks
- [ ] Generate actionable recommendations
- [ ] Estimate impact of each recommendation

---

### Phase 4: Reporting & Export (Weeks 15-18)

#### 4.1 PDF Report Generation
**Goal:** Generate professional MPG-compliant reports

**Report Sections:**
1. Executive Summary (MPG score, compliance status)
2. Project Information (building details)
3. Phase Breakdown (A1-A3, A4, A5, B4, C, D)
4. Element Analysis (contribution by element)
5. Material List (all materials with EPD references)
6. Methodology Notes (calculation assumptions)
7. Appendices (detailed data tables)

**Tasks:**
- [ ] Install PDF generation library (e.g., `@react-pdf/renderer`)
- [ ] Create report templates with branding
- [ ] Implement chart rendering for PDF
- [ ] Add export button to results page
- [ ] Support Dutch and English reports

#### 4.2 Excel Export
**Goal:** Export detailed data for external analysis

**Export Sheets:**
1. Summary (project overview, scores)
2. Elements (all elements with totals)
3. Layers (all layers with materials)
4. Materials (EPD data used)
5. Phase Results (detailed phase breakdown)

**Tasks:**
- [ ] Install XLSX generation library
- [ ] Create export templates
- [ ] Add export options (full data vs. summary)

#### 4.3 BIM Export (IFC/Revit)
**Goal:** Export LCA data back to BIM tools

**Tasks:**
- [ ] Research IFC property set standards for LCA data
- [ ] Implement IFC export with environmental properties
- [ ] Create Revit shared parameters file

---

### Phase 5: Polish & Scale (Weeks 19-24)

#### 5.1 Performance Optimization
- [ ] Implement calculation caching
- [ ] Add background job processing for large projects
- [ ] Optimize material search with Postgres full-text search
- [ ] Add pagination to all list views

#### 5.2 Multi-tenant Enhancements
- [ ] Organization-level material library
- [ ] Shared project templates
- [ ] Role-based access (viewer/editor/admin)
- [ ] Organization benchmarks and statistics

#### 5.3 Additional Impact Categories
**Goal:** Support all 19 EN 15804 impact categories (not just GWP)

**Categories to Add:**
- ODP (Ozone Depletion Potential)
- AP (Acidification Potential)
- EP (Eutrophication Potential)
- POCP (Photochemical Ozone Creation)
- ADP (Abiotic Depletion Potential)
- Water use, Land use, etc.

#### 5.4 NMD Validation Preparation
**Goal:** Prepare for official NMD tool validation (optional, long-term)

**Requirements:**
- [ ] Implement EN 15804+A2 calculations
- [ ] Add shadow price calculation (€/m²/year)
- [ ] Support NMD Category 1/2/3 data with penalties
- [ ] Document methodology for NMD audit
- [ ] Apply for Stichting NMD validation process

---

## Priority Roadmap Summary

| Priority | Features | Timeline |
|----------|----------|----------|
| **P0 - Critical** | Element Editor, Material Selector | Weeks 1-4 |
| **P1 - High** | Forma Integration, AI Queries | Weeks 5-14 |
| **P2 - Medium** | PDF/Excel Export, Comparison | Weeks 15-18 |
| **P3 - Nice to Have** | Additional Impact Categories, NMD Validation | Weeks 19-24 |

---

## Related Documentation

- [Database Schema](./DATABASE-SCHEMA.md) - Full database documentation
- [API Routing](./NEXTJS-ROUTING-AND-API.md) - API conventions
- [AI Assistant](./AI-ASSISTANT-PAGE.md) - Chat and RAG integration

---

## Sources

### LCA Tools Research
- [One Click LCA - Building LCA Software](https://oneclicklca.com/en-us/resources/articles/building-lca-software)
- [One Click LCA - BIM Integrations](https://oneclicklca.com/en-us/why-us/capabilities/bim-other-integrations)
- [Building Transparency - EC3 Tool](https://www.buildingtransparency.org/tools/)
- [Devera - LCA Software Comparison 2025](https://www.devera.ai/resources/lca-software-comparison-in-2025-best-tools-ranking)

### Dutch MPG Standards
- [Nationale Milieudatabase - Environmental Performance](https://milieudatabase.nl/en/environmental-performance/)
- [Nationale Milieudatabase - Calculation Tools](https://milieudatabase.nl/en/environmental-performance/calculation-tools/)
- [Patrick Teuffel - MPG Explanation](https://www.patrick-teuffel.eu/en/mpg/)

### Forma Integration
- [Autodesk Forma APIs](https://aps.autodesk.com/autodesk-forma)
- [Forma API Getting Started](https://aps.autodesk.com/en/docs/forma/v1/overview/getting-started)
- [2050 Materials - Forma Integration](https://2050-materials.com/blog/embodied-carbon-in-urban-planning-with-2050-materials-api-in-autodesk-forma/)
