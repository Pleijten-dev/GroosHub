# LCA Feature

> **Life Cycle Assessment Tool for Dutch Residential Projects**

## Overview

This feature provides a comprehensive LCA (Life Cycle Assessment) calculation tool for evaluating the environmental impact of residential building projects in the Netherlands. It calculates the MPG (Milieuprestatie Gebouwen) score according to Dutch building regulations.

## Features

### 3-Tier Input System

1. **Quick Start Mode** (Tier 1)
   - 5-minute assessment
   - Template-based
   - Automatic element generation based on building type and GFA
   - Perfect for early-stage design

2. **Custom Build-up Mode** (Tier 2)
   - Detailed layer-by-layer construction
   - Material picker with 1000+ EPD materials
   - Full control over all assemblies
   - Real-time impact feedback

3. **BIM Integration** (Tier 3) - *Coming Soon*
   - Import from Grasshopper
   - Import from Revit/Dynamo
   - IFC file support

### LCA Modules Calculated

- **A1-A3**: Production (extraction, transport to factory, manufacturing)
- **A4**: Transport to site
- **A5**: Construction/installation
- **B4**: Replacement over study period
- **C1-C4**: End of life (deconstruction, transport, processing, disposal)
- **D**: Benefits beyond system boundary (recycling, reuse)

### Key Metrics

- **MPG Score**: kg CO₂-eq/m²/year (for regulatory compliance)
- **Total Embodied Carbon**: Total carbon footprint of materials
- **Operational Carbon**: Estimated based on energy label
- **Module D Credits**: Circularity benefits (informational)

## Directory Structure

```
src/features/lca/
├── components/
│   ├── quick-start/       # Tier 1 components
│   ├── custom-mode/        # Tier 2 components
│   ├── results/            # Results dashboard
│   ├── material-picker/    # Material selection
│   └── element-editor/     # Layer editor
├── data/
│   ├── sources/            # API clients (future)
│   ├── parsers/            # Data parsers
│   ├── normalizers/        # Data normalizers
│   ├── scoring/            # Scoring logic
│   ├── cache/              # Caching layer
│   └── aggregator/         # Data aggregation
├── hooks/                  # React hooks
├── types/                  # TypeScript types
├── utils/                  # Utilities
│   └── lca-calculator.ts   # Core calculation engine
└── README.md               # This file
```

## Usage

### Quick Start

```typescript
// Create a quick project
const response = await fetch('/api/lca/projects/quick-create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Project Name',
    gfa: 150,
    buildingType: 'rijwoning',
    constructionSystem: 'houtskelet',
    insulationLevel: 'rc_6.0',
    energyLabel: 'A++'
  })
});

const { projectId } = await response.json();
```

### Calculate LCA

```typescript
// Trigger calculation
const result = await fetch('/api/lca/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId })
});

const { result, operational, total_carbon } = await result.json();
```

### Custom Mode

```typescript
// Add element
const element = await fetch('/api/lca/elements', {
  method: 'POST',
  body: JSON.stringify({
    project_id: projectId,
    name: 'Gevel Noord',
    category: 'exterior_wall',
    quantity: 45.5,
    quantity_unit: 'm2'
  })
});

// Add layer
const layer = await fetch(`/api/lca/elements/${elementId}/layers`, {
  method: 'POST',
  body: JSON.stringify({
    material_id: materialId,
    thickness: 0.200, // meters
    position: 1,
    coverage: 1.0
  })
});
```

## Data Sources

### Materials Database
- **Ökobaudat**: German EPD database (EU-wide relevance)
- **Filtered for Dutch market**: Only relevant materials
- **1000+ materials**: Covering all major construction materials

### Service Life Data
- **NMD**: Nationale Milieudatabase (Dutch official source)
- **ISO 15686**: International standard for service life prediction
- **SBK**: Stichting Bouwkwaliteit (Dutch construction quality foundation)

### Reference Values
- **MPG Limits**: Per building type (0.8 kg CO₂/m²/year for housing)
- **Operational Carbon**: By energy label (A++++ to D)

## Calculation Methodology

### Module A1-A3: Production

```
Impact = Mass × GWP_A1-A3
Mass = Area × Thickness × Density × Coverage
```

### Module A4: Transport

```
Impact = (Mass / 1000) × Distance × Emission_Factor
Emission_Factor = 0.062 kg CO₂/tonne-km (truck, default)
```

### Module A5: Construction

```
Impact = A1-A3_Impact × Factor
Factor = 5% (typical for walls)
```

### Module B4: Replacement

```
Replacements = floor(Study_Period / Lifespan) - 1
Impact = A1-A3_Impact × Replacements
```

### Module C: End of Life

```
Impact = Mass × (GWP_C1 + GWP_C2 + GWP_C3 + GWP_C4)
```

### Module D: Benefits

```
Impact = Mass × GWP_D
(Negative value = benefit)
```

### Normalization

```
MPG = Total_A_to_C / (GFA × Study_Period)
Unit: kg CO₂-eq/m²/year
```

## Templates

Pre-configured construction systems for quick start:

### Houtskelet (Timber Frame)
- RC 3.5, 5.0, 6.0, 8.0
- Mineral wool insulation
- Various facade finishes (timber, fiber cement)

### CLT/Massief Hout
- RC 5.0, 6.0
- Cross-laminated timber
- Wood fiber insulation

### Metselwerk (Masonry)
- RC 3.5, 5.0
- Cavity wall construction
- Traditional Dutch construction

### Beton (Concrete)
- RC 5.0, 6.0
- Concrete elements
- EPS/XPS insulation

## API Endpoints

### Projects
- `GET /api/lca/projects` - List projects
- `POST /api/lca/projects` - Create project
- `GET /api/lca/projects/[id]` - Get project
- `PATCH /api/lca/projects/[id]` - Update project
- `DELETE /api/lca/projects/[id]` - Delete project
- `POST /api/lca/projects/quick-create` - Create from template

### Elements
- `POST /api/lca/elements` - Create element
- `GET /api/lca/elements/[id]` - Get element
- `PATCH /api/lca/elements/[id]` - Update element
- `DELETE /api/lca/elements/[id]` - Delete element
- `POST /api/lca/elements/[id]/layers` - Add layer

### Layers
- `PATCH /api/lca/layers/[id]` - Update layer
- `DELETE /api/lca/layers/[id]` - Delete layer

### Materials
- `GET /api/lca/materials` - Search materials
- `GET /api/lca/materials/[id]` - Get material

### Calculation
- `POST /api/lca/calculate` - Calculate project LCA

### Templates
- `GET /api/lca/templates` - List templates

### Import
- `POST /api/lca/import/grasshopper` - Import from Grasshopper
- `POST /api/lca/import/revit` - Import from Revit

### Reports
- `GET /api/lca/projects/[id]/report` - Generate PDF report

## Development

### Running Imports

```bash
# Seed reference values
npx ts-node scripts/lca/import/seed-reference-values.ts

# Import service life data
npx ts-node scripts/lca/import/import-nmd-lifespans.ts

# Import Ökobaudat materials (requires CSV file)
npx ts-node scripts/lca/import/import-oekobaudat.ts

# Seed templates
npx ts-node scripts/lca/templates/seed-templates.ts
```

### Testing

```bash
# Run unit tests
npm test -- __tests__/lca/

# Run specific test file
npm test -- __tests__/lca/calculations.test.ts
```

### Adding a New Material Category

1. Add category to `MaterialCategory` type in `types/index.ts`
2. Add default transport distance in `DEFAULT_TRANSPORT_DISTANCES`
3. Add default lifespan in `DEFAULT_LIFESPANS`
4. Add A5 factor if new element category
5. Update category mapping in import scripts

### Adding a New Template

1. Create template definition in `scripts/lca/templates/`
2. Define all elements with layers
3. Specify area factors per building type
4. Run seed script to add to database

## Compliance

### Dutch Regulations

This tool calculates LCA according to:
- **MPG Bepalingsmethode 2024**
- **BENG (Bijna Energie Neutrale Gebouwen) standards**
- **NEN-EN 15978** (European standard for LCA of buildings)

### Limitations

⚠️ **Important Disclaimers:**

1. **Not a Substitute for Professional LCA**
   - Results are estimates based on generic EPD data
   - Actual project impacts may vary
   - Professional LCA consultant recommended for compliance

2. **Data Quality**
   - EPD data may not reflect specific products
   - Service life assumptions may not match actual performance
   - Transport distances are estimates

3. **Scope**
   - Does not include B6 (operational energy) in detail
   - Simplified A5 calculation
   - Does not include B1-B3 (maintenance)
   - Does not include B5 (refurbishment)

4. **Regulatory Use**
   - Results should be validated by qualified professional
   - May not be accepted for official MPG compliance without verification

## Roadmap

### Phase 1 (Current)
- [x] Core calculation engine
- [x] Database schema
- [ ] API endpoints
- [ ] Quick start mode
- [ ] Custom mode
- [ ] Results dashboard

### Phase 2
- [ ] BIM integration (Grasshopper, Revit)
- [ ] PDF reports
- [ ] Template marketplace

### Phase 3
- [ ] Comparison mode
- [ ] Sensitivity analysis
- [ ] Optimization suggestions
- [ ] Cost integration

### Phase 4
- [ ] Real-time collaboration
- [ ] Custom material creation
- [ ] API for third-party tools
- [ ] Advanced analytics

## Support

For questions or issues:
1. Check the [LCA Implementation TODO](../../../Documentation/LCA_IMPLEMENTATION_TODO.md)
2. Review the [LCA Methodology](../../../Documentation/LCA_METHODOLOGY.md) (coming soon)
3. Consult the [User Guide](../../../Documentation/LCA_USER_GUIDE.md) (coming soon)

## References

- [Ökobaudat Database](https://www.oekobaudat.de)
- [NMD - Nationale Milieudatabase](https://www.nmd.nl)
- [MPG Calculation Method](https://www.rvo.nl/onderwerpen/duurzaam-ondernemen/gebouwen/wetten-en-regels/nieuwbouw/milieuprestatie-gebouwen)
- [NEN-EN 15978](https://www.nen.nl/en/nen-en-15978-2011-en-163932)
- [ISO 15686 (Service Life Planning)](https://www.iso.org/standard/45798.html)

---

**Version**: 1.0.0
**Last Updated**: 2025-11-24
**Status**: In Development
