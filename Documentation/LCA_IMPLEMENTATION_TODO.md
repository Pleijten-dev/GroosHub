# LCA Tool Implementation Checklist

> **Project**: GroosHub - LCA Calculation Tool for Dutch Residential Projects
> **Status**: In Development
> **Last Updated**: 2025-11-24

---

## Table of Contents

1. [Phase 0: Data Preparation & Setup](#phase-0-data-preparation--setup)
2. [Phase 1: Core Calculation Engine](#phase-1-core-calculation-engine)
3. [Phase 2: Frontend - 3-Tier Input System](#phase-2-frontend---3-tier-input-system)
4. [Phase 3: Templates & Presets](#phase-3-templates--presets)
5. [Phase 4: BIM Integration](#phase-4-bim-integration)
6. [Phase 5: Polish & Deployment](#phase-5-polish--deployment)

---

## Phase 0: Data Preparation & Setup

### 0.1 Database Setup ✅

- [x] Create Prisma schema for LCA models
- [x] Define Material model with EPD data fields
- [x] Define ServiceLife model for lifespan data
- [x] Define LCAProject, LCAElement, LCALayer models
- [x] Define LCATemplate model for presets
- [x] Define ReferenceValue model for MPG limits
- [ ] **TODO**: Integrate LCA schema into main `prisma/schema.prisma`
- [ ] **TODO**: Run `npx prisma generate` to generate types
- [ ] **TODO**: Run `npx prisma migrate dev --name add_lca_models` to create migration
- [ ] **TODO**: Apply migration to database

### 0.2 Data Acquisition 📥

- [ ] **TODO**: Download Ökobaudat dataset
  - Go to: https://www.oekobaudat.de
  - Export as CSV with all LCA indicators
  - Save to: `data/lca/oekobaudat-export.csv`
  - Note: File may be large (50MB+)

- [ ] **TODO**: Register and download NMD data (optional)
  - Register at: https://www.nmd.nl
  - Download Reference Service Life data (Excel)
  - Save to: `data/lca/nmd-service-lives.xlsx`
  - If not available, script will use defaults

- [ ] **TODO**: Gather SBK reference values
  - Source: SBK (Stichting Bouwkwaliteit) documentation
  - Already included in default lifespans seeding

### 0.3 Data Import Scripts ⚙️

Scripts created but need refinement:

- [x] Create `import-oekobaudat.ts` script structure
- [x] Create `import-nmd-lifespans.ts` script structure
- [x] Create `seed-reference-values.ts` script

**TODO Tasks:**

- [ ] **TODO**: Test and refine `import-oekobaudat.ts`
  - Map actual CSV column names to script
  - Test with sample data
  - Handle edge cases (missing values, invalid formats)

- [ ] **TODO**: Implement Dutch translation logic
  - Add translation mapping for common materials
  - Consider using translation API or manual mapping file

- [ ] **TODO**: Complete category mapping
  - Map all Ökobaudat categories to simplified categories
  - Document mapping in separate file

- [ ] **TODO**: Run import scripts in sequence:
  ```bash
  npx ts-node scripts/lca/import/seed-reference-values.ts
  npx ts-node scripts/lca/import/import-nmd-lifespans.ts
  npx ts-node scripts/lca/import/import-oekobaudat.ts
  ```

- [ ] **TODO**: Verify imported data
  - Check material count in database
  - Verify sample materials have correct values
  - Test query performance

### 0.4 Dependencies 📦

**TODO: Install required packages:**

```bash
npm install csv-parse xlsx recharts jspdf jspdf-autotable
npm install -D @types/node
```

Packages needed:
- `csv-parse` - Parse Ökobaudat CSV
- `xlsx` - Parse NMD Excel files
- `recharts` - Charts for results dashboard
- `jspdf` - PDF report generation
- `jspdf-autotable` - Tables in PDF reports

---

## Phase 1: Core Calculation Engine

### 1.1 Calculation Engine ✅

- [x] Create `lca-calculator.ts` with core calculation logic
- [x] Implement `calculateProjectLCA()` function
- [x] Implement module calculations (A1-A3, A4, A5, B4, C, D)
- [x] Implement `calculateOperationalCarbon()` function
- [x] Implement `normalizeResults()` function
- [x] Define TypeScript types

**TODO Tasks:**

- [ ] **TODO**: Test calculation engine with sample data
  - Create test project with known values
  - Verify calculations match manual calculations
  - Test edge cases (zero values, very large projects)

- [ ] **TODO**: Optimize calculation performance
  - Consider caching intermediate results
  - Profile for bottlenecks if needed

### 1.2 API Endpoints 🔌

**TODO: Create API routes:**

#### Calculate Endpoint
- [ ] **TODO**: Create `app/api/lca/calculate/route.ts`
  - POST endpoint to trigger LCA calculation
  - Input: `{ projectId: string }`
  - Output: `LCAResult` + normalized values
  - Update project cache with results

#### Project CRUD Endpoints
- [ ] **TODO**: Create `app/api/lca/projects/route.ts`
  - GET: List user's projects
  - POST: Create new project

- [ ] **TODO**: Create `app/api/lca/projects/[id]/route.ts`
  - GET: Get project details with elements
  - PATCH: Update project metadata
  - DELETE: Delete project

- [ ] **TODO**: Create `app/api/lca/projects/quick-create/route.ts`
  - POST: Create project from template (Tier 1)
  - Apply template elements
  - Auto-calculate areas based on GFA

#### Element CRUD Endpoints
- [ ] **TODO**: Create `app/api/lca/elements/route.ts`
  - POST: Create new element

- [ ] **TODO**: Create `app/api/lca/elements/[id]/route.ts`
  - GET: Get element details with layers
  - PATCH: Update element
  - DELETE: Delete element

- [ ] **TODO**: Create `app/api/lca/elements/[id]/layers/route.ts`
  - POST: Add layer to element

#### Layer CRUD Endpoints
- [ ] **TODO**: Create `app/api/lca/layers/[id]/route.ts`
  - PATCH: Update layer (thickness, material, etc.)
  - DELETE: Remove layer

#### Material Endpoints
- [ ] **TODO**: Create `app/api/lca/materials/route.ts`
  - GET: Search/filter materials
  - Query params: search, category, quality, etc.
  - POST: Create custom material (future feature)

- [ ] **TODO**: Create `app/api/lca/materials/[id]/route.ts`
  - GET: Get material details

#### Template Endpoints
- [ ] **TODO**: Create `app/api/lca/templates/route.ts`
  - GET: List available templates
  - Filter by construction_system, building_type

**API Testing:**
- [ ] **TODO**: Test all endpoints with Postman/Thunder Client
- [ ] **TODO**: Add error handling for all endpoints
- [ ] **TODO**: Add authentication checks (use NextAuth session)
- [ ] **TODO**: Add input validation (use Zod schemas)

---

## Phase 2: Frontend - 3-Tier Input System

### 2.1 Tier 1: Quick Start Mode 🚀

**TODO: Create Quick Start interface:**

- [ ] **TODO**: Create `app/[locale]/lca/new/quick/page.tsx`
  - Form with 5-6 inputs:
    - Project name
    - Gross floor area (GFA)
    - Building type (vrijstaand, rijwoning, etc.)
    - Construction system (houtskelet, CLT, etc.)
    - Insulation level (RC 3.5, 5.0, 6.0, 8.0)
    - Energy label
  - Submit creates project from template
  - Redirect to project results page

- [ ] **TODO**: Create quick start form component
  - `src/features/lca/components/quick-start/QuickStartForm.tsx`
  - Use shadcn/ui form components
  - Client-side validation

- [ ] **TODO**: Add loading states during project creation

- [ ] **TODO**: Handle errors gracefully with user feedback

### 2.2 Tier 2: Custom Build-up Mode 🔧

**TODO: Create Custom Mode interface:**

- [ ] **TODO**: Create `app/[locale]/lca/projects/[id]/page.tsx`
  - Main project view
  - List of elements
  - Add/remove elements
  - Edit element details
  - Calculate button
  - Results section

- [ ] **TODO**: Create `ElementList` component
  - `src/features/lca/components/custom-mode/ElementList.tsx`
  - Show all elements with summary impacts
  - Add element button
  - Edit/delete element actions

- [ ] **TODO**: Create `ElementEditor` component
  - `src/features/lca/components/element-editor/ElementEditor.tsx`
  - Layer stack visualization (outside → inside)
  - Add/remove/reorder layers
  - Edit layer properties (thickness, coverage)
  - Real-time impact preview per layer

- [ ] **TODO**: Create `MaterialPicker` component
  - `src/features/lca/components/material-picker/MaterialPicker.tsx`
  - Search materials by name
  - Filter by category
  - Show material properties:
    - GWP A1-A3
    - Density
    - Reference service life
    - EPD source
  - Select material + enter thickness

- [ ] **TODO**: Create `LayerRow` component
  - Display layer with material info
  - Editable thickness input
  - Impact per m² display
  - Drag handle for reordering
  - Delete button

- [ ] **TODO**: Add element templates
  - Pre-configured element types (wall, floor, roof)
  - Quick insertion of common assemblies

### 2.3 Results Dashboard 📊

**TODO: Create Results Dashboard:**

- [ ] **TODO**: Create `ResultsDashboard` component
  - `src/features/lca/components/results/ResultsDashboard.tsx`
  - Main MPG score card (large, prominent)
  - Compliance indicator (pass/fail vs limit)
  - Total embodied CO2
  - Operational CO2 estimate
  - Total lifecycle carbon

- [ ] **TODO**: Create `PhaseBreakdownChart` component
  - Bar chart showing A1-A3, A4, A5, B4, C, D
  - Use recharts library
  - Color-coded by phase

- [ ] **TODO**: Create `ElementBreakdownChart` component
  - Bar/pie chart showing contribution by element
  - Interactive - click to see element details

- [ ] **TODO**: Create `ModuleDCard` component
  - Highlight circularity benefits (Module D)
  - Explain why it doesn't count toward MPG

- [ ] **TODO**: Create `ComparisonView` component (future)
  - Compare multiple design variants
  - Side-by-side comparison

- [ ] **TODO**: Add export functionality
  - Export results as PDF
  - Export data as CSV/Excel

### 2.4 Shared Components

- [ ] **TODO**: Create LCA-specific Card component
  - Based on existing Card in `shared/components/UI/Card/`
  - Add LCA-specific styling

- [ ] **TODO**: Create impact indicator components
  - Color-coded impact levels (green = low, red = high)
  - Tooltips with explanations

- [ ] **TODO**: Create loading skeletons for all components

### 2.5 Hooks

- [ ] **TODO**: Create `useProject` hook
  - Fetch project data
  - Handle loading/error states
  - Trigger recalculation

- [ ] **TODO**: Create `useElements` hook
  - CRUD operations for elements

- [ ] **TODO**: Create `useMaterials` hook
  - Search/filter materials
  - Material selection state

- [ ] **TODO**: Create `useCalculation` hook
  - Trigger calculation
  - Poll for results if async
  - Handle calculation errors

---

## Phase 3: Templates & Presets

### 3.1 Template Creation 📋

**TODO: Create construction templates:**

- [ ] **TODO**: Create `scripts/lca/templates/houtskelet-templates.ts`
  - Houtskelet RC 3.5
  - Houtskelet RC 5.0
  - Houtskelet RC 6.0 (already in outline)
  - Houtskelet RC 8.0

- [ ] **TODO**: Create `scripts/lca/templates/clv-templates.ts`
  - CLT/massief hout RC 5.0
  - CLT/massief hout RC 6.0

- [ ] **TODO**: Create `scripts/lca/templates/metselwerk-templates.ts`
  - Traditioneel metselwerk RC 3.5
  - Traditioneel metselwerk RC 5.0

- [ ] **TODO**: Create `scripts/lca/templates/beton-templates.ts`
  - Betonnen elementen RC 5.0
  - Betonnen elementen RC 6.0

**Template Structure (per template):**
- Exterior walls (gevel)
- Interior walls (binnen wanden - draagend + niet-draagend)
- Ground floor (vloer begane grond)
- Intermediate floor (tussenvloer)
- Roof (dak)
- Foundation (fundering)
- Windows (kozijnen/ramen)

### 3.2 Template Seeding

- [ ] **TODO**: Create `scripts/lca/templates/seed-templates.ts`
  - Import all template definitions
  - Resolve material_search to actual material IDs
  - Create LCATemplate records
  - Handle missing materials gracefully

- [ ] **TODO**: Run template seeding:
  ```bash
  npx ts-node scripts/lca/templates/seed-templates.ts
  ```

### 3.3 Area Factor Calculations

- [ ] **TODO**: Refine `getAreaFactor()` function
  - Accurate area calculations per building type
  - Consider building geometry (vrijstaand vs rijwoning)
  - Document assumptions

### 3.4 Template Management UI (future)

- [ ] **TODO**: Allow users to save custom templates
- [ ] **TODO**: Template marketplace/sharing
- [ ] **TODO**: Template version control

---

## Phase 4: BIM Integration

### 4.1 Grasshopper Export Component 🦗

- [ ] **TODO**: Create Grasshopper Python component
  - Script already provided in outline
  - Save as: `integrations/grasshopper/LCA_Export.py`

- [ ] **TODO**: Package as Grasshopper component (.ghpy)

- [ ] **TODO**: Create documentation for Grasshopper users
  - How to install component
  - How to use component
  - Input/output specifications

- [ ] **TODO**: Test with sample Grasshopper file

### 4.2 Revit/Dynamo Script 🏗️

- [ ] **TODO**: Create Dynamo Python script
  - Script structure provided in outline
  - Save as: `integrations/dynamo/ExportToLCA.py`

- [ ] **TODO**: Create Dynamo workflow file (.dyn)
  - Visual workflow for non-programmers
  - Input nodes for API URL, filters
  - Output nodes for status

- [ ] **TODO**: Create documentation for Revit users

- [ ] **TODO**: Test with sample Revit model

### 4.3 Import API Endpoints

- [ ] **TODO**: Create `app/api/lca/import/grasshopper/route.ts`
  - Parse Grasshopper export JSON
  - Create project + elements
  - Match materials by name
  - Return project URL

- [ ] **TODO**: Create `app/api/lca/import/revit/route.ts`
  - Parse Revit export JSON
  - Handle layer data from Revit wall types
  - Create project structure

- [ ] **TODO**: Create `app/api/lca/import/ifc/route.ts` (future)
  - Parse IFC files
  - Extract geometry + materials
  - More complex but more powerful

### 4.4 BIM Import UI

- [ ] **TODO**: Create `app/[locale]/lca/import/page.tsx`
  - Upload JSON file from BIM tool
  - Preview imported data before creating project
  - Material matching interface (map BIM materials to database)

---

## Phase 5: Polish & Deployment

### 5.1 PDF Report Generation 📄

- [ ] **TODO**: Create `src/features/lca/utils/pdf-generator.ts`
  - Structure provided in outline
  - Use jsPDF + autoTable

**Report Sections:**
- [ ] Title page with project info
- [ ] Executive summary with MPG score
- [ ] Detailed breakdown by element
- [ ] Detailed breakdown by phase
- [ ] Material list with quantities
- [ ] Assumptions and notes
- [ ] Compliance statement

- [ ] **TODO**: Create PDF download endpoint
  - `app/api/lca/projects/[id]/report/route.ts`
  - Generate PDF on server
  - Stream to client

- [ ] **TODO**: Add PDF download button to results page

- [ ] **TODO**: Test PDF generation with various project sizes

### 5.2 Internationalization 🌍

**TODO: Add Dutch translations:**

- [ ] **TODO**: Create `src/i18n/nl/lca.json`
  - All LCA-specific terms
  - Form labels
  - Error messages
  - Help text

- [ ] **TODO**: Create `src/i18n/en/lca.json`
  - English translations

**Key terms to translate:**
- Building types (vrijstaand, rijwoning, etc.)
- Construction systems (houtskelet, metselwerk, etc.)
- Element categories (gevel, tussenvloer, etc.)
- LCA phases (productie, transport, bouw, gebruik, sloop)
- Units and technical terms

- [ ] **TODO**: Integrate with existing `useTranslation` hook

### 5.3 Testing 🧪

**Unit Tests:**
- [ ] **TODO**: Create `__tests__/lca/calculations.test.ts`
  - Test structure provided in outline
  - Test each module calculation (A1-A3, A4, A5, B4, C, D)
  - Test edge cases (zero values, very large values)
  - Test replacement calculations with various lifespans

**Integration Tests:**
- [ ] **TODO**: Create `__tests__/lca/api.test.ts`
  - Test API endpoints
  - Test project creation flow
  - Test calculation flow

**E2E Tests:**
- [ ] **TODO**: Create Playwright tests for user flows
  - Quick start flow
  - Custom mode flow
  - Results viewing

### 5.4 Documentation 📚

- [ ] **TODO**: Create `Documentation/LCA_USER_GUIDE.md`
  - How to use the LCA tool
  - Explanation of MPG
  - How to interpret results
  - Best practices for data entry

- [ ] **TODO**: Create `Documentation/LCA_METHODOLOGY.md`
  - Calculation methodology
  - Data sources
  - Assumptions and limitations
  - Validation against EN 15978

- [ ] **TODO**: Create `Documentation/LCA_API_REFERENCE.md`
  - All API endpoints
  - Request/response formats
  - Authentication requirements

- [ ] **TODO**: Add inline help text throughout UI
  - Tooltips for technical terms
  - Help modals for complex concepts
  - Links to documentation

### 5.5 Performance Optimization ⚡

- [ ] **TODO**: Optimize database queries
  - Add indexes for common queries
  - Use `select` to limit returned fields
  - Implement pagination for large lists

- [ ] **TODO**: Implement caching
  - Cache calculation results
  - Cache material searches
  - Use React Query for client-side caching

- [ ] **TODO**: Optimize frontend bundle size
  - Code splitting by route
  - Lazy load heavy components (charts, PDF generator)
  - Tree-shake unused dependencies

### 5.6 UI/UX Polish ✨

- [ ] **TODO**: Add loading states everywhere
- [ ] **TODO**: Add empty states (no projects, no elements)
- [ ] **TODO**: Add success/error toasts for all actions
- [ ] **TODO**: Add confirmation dialogs for destructive actions
- [ ] **TODO**: Add keyboard shortcuts (save, calculate, etc.)
- [ ] **TODO**: Add dark mode support (if project supports it)
- [ ] **TODO**: Mobile responsiveness check
- [ ] **TODO**: Accessibility audit (WCAG AA compliance)

### 5.7 Navigation Integration

- [ ] **TODO**: Add LCA menu item to main navigation
  - Update `src/shared/components/UI/NavigationBar/NavigationBar.tsx`
  - Add routes for:
    - `/[locale]/lca` - LCA home/project list
    - `/[locale]/lca/new` - Choose input mode
    - `/[locale]/lca/new/quick` - Quick start
    - `/[locale]/lca/projects/[id]` - Project details/edit

- [ ] **TODO**: Add LCA feature to homepage
  - Feature card on landing page
  - Brief description + call to action

### 5.8 Deployment 🚀

- [ ] **TODO**: Environment variables check
  - Document any required env vars
  - Update `.env.local.example`

- [ ] **TODO**: Database migration
  - Test migration on staging environment
  - Backup production database before migration
  - Run migration on production

- [ ] **TODO**: Data import on production
  - Upload Ökobaudat CSV to production server
  - Run import scripts on production
  - Verify data integrity

- [ ] **TODO**: Deployment checklist
  - Run `npm run build` locally to check for errors
  - Test on staging environment
  - Deploy to production
  - Monitor for errors
  - Announce new feature to users

---

## Additional Features (Future)

### Phase 6: Advanced Features (Post-MVP)

- [ ] Comparison mode - compare multiple design variants
- [ ] Sensitivity analysis - see impact of changing parameters
- [ ] Optimization suggestions - AI-powered material substitution
- [ ] Real-time collaboration - multiple users editing same project
- [ ] Custom material creation - users can add their own EPDs
- [ ] Material favorites/library - save frequently used materials
- [ ] Project templates from completed projects
- [ ] API for third-party integrations
- [ ] Webhook notifications for calculation completion
- [ ] Advanced filtering and search for materials
- [ ] Material cost database integration
- [ ] Circular economy metrics (beyond Module D)
- [ ] Water footprint calculation
- [ ] Embodied energy calculation
- [ ] Regional customization (other countries beyond NL)

---

## Progress Tracking

### Completed ✅
- Directory structure created
- Prisma schema defined
- TypeScript types created
- Core calculation engine implemented
- Import scripts structure created
- Reference values script created

### In Progress 🔄
- Database setup and migration
- API endpoint creation
- Frontend component development

### Not Started ⏳
- Data acquisition (Ökobaudat, NMD)
- Template creation and seeding
- BIM integration
- PDF report generation
- Testing
- Documentation
- Deployment

---

## Timeline Estimate

### MVP (Tiers 1 & 2, no BIM)
- **Phase 0**: 2-3 weeks (data prep, depends on data availability)
- **Phase 1**: 1 week (API endpoints, testing calculation engine)
- **Phase 2**: 3-4 weeks (all frontend components)
- **Phase 3**: 2 weeks (templates)
- **Phase 5** (partial): 2 weeks (translations, testing, deployment)

**Total MVP**: ~10-12 weeks

### Full System (including BIM)
- Add **Phase 4**: 3-4 weeks (BIM integration)
- Add **Phase 5** (complete): 2 weeks (PDF reports, full polish)

**Total Full System**: ~15-18 weeks

---

## Getting Started

**Immediate Next Steps:**

1. **Integrate Prisma schema**
   ```bash
   # Add LCA models to prisma/schema.prisma
   # Then:
   npx prisma generate
   npx prisma migrate dev --name add_lca_models
   ```

2. **Install dependencies**
   ```bash
   npm install csv-parse xlsx recharts jspdf jspdf-autotable
   ```

3. **Acquire data**
   - Download Ökobaudat CSV
   - Place in `data/lca/oekobaudat-export.csv`

4. **Run imports**
   ```bash
   npx ts-node scripts/lca/import/seed-reference-values.ts
   npx ts-node scripts/lca/import/import-nmd-lifespans.ts
   npx ts-node scripts/lca/import/import-oekobaudat.ts
   ```

5. **Start building API endpoints**
   - Begin with `/api/lca/projects` CRUD
   - Then `/api/lca/calculate`
   - Test with Postman/Thunder Client

6. **Build Quick Start form**
   - Start with simplest user flow
   - Get end-to-end working quickly
   - Then expand to Custom Mode

---

## Notes & Considerations

### Data Quality
- Ökobaudat data may have inconsistencies
- Material matching from BIM tools is imperfect
- Service life data has uncertainty
- Consider adding quality/confidence indicators to results

### Performance
- Large projects (100+ elements) may be slow
- Consider async calculation with progress updates
- Material search needs to be fast (indexed, cached)

### Compliance
- MPG methodology may change
- Keep calculation logic modular for updates
- Document methodology version used

### User Support
- Add extensive help documentation
- Consider video tutorials
- Provide example projects
- Add contact form for support

### Legal
- Disclaimer: Results are estimates
- Not a substitute for professional LCA consultant
- Users responsible for data accuracy

---

## Questions to Resolve

1. **Data Licensing**: Can we legally use/redistribute Ökobaudat data?
2. **NMD Access**: Do we need paid license for NMD data?
3. **Validation**: Should we validate against third-party LCA tools?
4. **Certification**: Can results be used for official MPG compliance?
5. **User Accounts**: Should projects be private by default?
6. **Pricing**: Is this a free feature or premium?
7. **Storage Limits**: Limits on projects per user?
8. **Calculation Quotas**: Limits on calculations per day?

---

**Last Updated**: 2025-11-24
**Next Review**: After Phase 0 completion
