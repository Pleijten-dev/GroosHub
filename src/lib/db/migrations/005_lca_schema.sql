-- LCA Tool Schema Migration
-- Adds tables for Life Cycle Assessment (LCA) calculation functionality

-- Drop existing tables if they exist (in dependency order)
DROP TABLE IF EXISTS lca_layers CASCADE;
DROP TABLE IF EXISTS lca_elements CASCADE;
DROP TABLE IF EXISTS lca_projects CASCADE;
DROP TABLE IF EXISTS lca_templates CASCADE;
DROP TABLE IF EXISTS lca_service_lives CASCADE;
DROP TABLE IF EXISTS lca_materials CASCADE;
DROP TABLE IF EXISTS lca_reference_values CASCADE;

-- ============================================
-- MATERIALS & EPD DATA
-- ============================================

CREATE TABLE lca_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  oekobaudat_uuid VARCHAR(255) UNIQUE,
  oekobaudat_version VARCHAR(50),
  name_de VARCHAR(500) NOT NULL,
  name_en VARCHAR(500),
  name_nl VARCHAR(500),

  -- Classification
  category VARCHAR(100) NOT NULL,  -- 'insulation', 'concrete', 'timber', etc.
  subcategory VARCHAR(100),
  material_type VARCHAR(50) NOT NULL,  -- 'generic', 'specific', 'custom'

  -- Physical properties
  density DECIMAL(10,2),  -- kg/m³
  bulk_density DECIMAL(10,2),  -- kg/m³ (for loose fill)
  area_weight DECIMAL(10,2),  -- kg/m²
  reference_thickness DECIMAL(10,6),  -- m
  thermal_conductivity DECIMAL(10,6),  -- λ-value W/mK

  -- Life cycle modules (per declared unit)
  declared_unit VARCHAR(50) NOT NULL,  -- '1 kg', '1 m³', '1 m²'
  conversion_to_kg DECIMAL(15,6) NOT NULL,  -- Conversion factor to 1 kg

  -- Module A1-A3: Production
  gwp_a1_a3 DECIMAL(15,6) NOT NULL,  -- kg CO2-eq
  odp_a1_a3 DECIMAL(15,9),  -- kg CFC11-eq
  pocp_a1_a3 DECIMAL(15,9),  -- kg Ethen-eq
  ap_a1_a3 DECIMAL(15,9),  -- kg SO2-eq
  ep_a1_a3 DECIMAL(15,9),  -- kg PO4-eq
  adpe_a1_a3 DECIMAL(15,9),  -- kg Sb-eq
  adpf_a1_a3 DECIMAL(15,6),  -- MJ

  -- Module A4: Transport
  gwp_a4 DECIMAL(15,6),
  transport_distance DECIMAL(10,2),  -- Default km
  transport_mode VARCHAR(50),  -- 'truck', 'train', 'ship'

  -- Module A5: Construction
  gwp_a5 DECIMAL(15,6),

  -- Module C: End of Life
  gwp_c1 DECIMAL(15,6),  -- Deconstruction
  gwp_c2 DECIMAL(15,6),  -- Transport
  gwp_c3 DECIMAL(15,6),  -- Waste processing
  gwp_c4 DECIMAL(15,6),  -- Disposal

  -- Module D: Benefits
  gwp_d DECIMAL(15,6),

  -- Biogenic carbon
  biogenic_carbon DECIMAL(15,6),  -- kg CO2 stored per kg material
  fossil_carbon DECIMAL(15,6),  -- kg CO2 from fossil content

  -- Service life data
  reference_service_life INTEGER,  -- years
  rsl_source VARCHAR(100),  -- 'NMD', 'ISO15686', 'expert_estimate'
  rsl_confidence VARCHAR(50),  -- 'high', 'medium', 'low'

  -- End-of-life scenario
  eol_scenario VARCHAR(100),  -- 'recycling', 'incineration', 'landfill'
  recyclability DECIMAL(3,2),  -- 0-1 (fraction that can be recycled)

  -- Regional data
  region VARCHAR(10) NOT NULL DEFAULT 'NL',
  dutch_availability BOOLEAN NOT NULL DEFAULT true,

  -- EPD metadata
  epd_validity TIMESTAMP,
  epd_owner VARCHAR(255),
  epd_url TEXT,
  background_database VARCHAR(255),

  -- Quality & filtering
  quality_rating INTEGER NOT NULL DEFAULT 3 CHECK (quality_rating BETWEEN 1 AND 5),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_generic BOOLEAN NOT NULL DEFAULT true,

  -- User content
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lca_materials_category ON lca_materials(category, subcategory);
CREATE INDEX idx_lca_materials_dutch ON lca_materials(dutch_availability, quality_rating);
CREATE INDEX idx_lca_materials_user ON lca_materials(user_id);
CREATE INDEX idx_lca_materials_name ON lca_materials(name_nl, name_en);

COMMENT ON TABLE lca_materials IS 'EPD (Environmental Product Declaration) data for construction materials';

-- ============================================
-- MATERIAL SERVICE LIFE DATABASE
-- ============================================

CREATE TABLE lca_service_lives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  material_name VARCHAR(255) NOT NULL,

  -- Lifespan data
  reference_service_life INTEGER NOT NULL,  -- years
  min_lifespan INTEGER,  -- Uncertainty range
  max_lifespan INTEGER,

  -- Context modifiers (JSON)
  environmental_factor JSONB,  -- {"coastal": 0.8, "inland": 1.0}
  maintenance_factor JSONB,  -- {"good": 1.2, "poor": 0.7}

  -- Source
  source VARCHAR(100) NOT NULL,  -- 'NMD', 'ISO15686', 'SBK', 'manufacturer'
  confidence_level VARCHAR(50) NOT NULL,  -- 'high', 'medium', 'low'
  region VARCHAR(10) NOT NULL DEFAULT 'NL',

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lca_service_lives_category ON lca_service_lives(category, subcategory);

COMMENT ON TABLE lca_service_lives IS 'Reference service life data from NMD and other sources';

-- ============================================
-- PROJECTS & ELEMENTS
-- ============================================

CREATE TABLE lca_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_number VARCHAR(100),

  -- Building data
  gross_floor_area DECIMAL(10,2) NOT NULL,  -- m² GFA
  building_type VARCHAR(100) NOT NULL,  -- 'vrijstaand', 'rijwoning', 'appartement'
  construction_system VARCHAR(100),  -- 'houtskelet', 'metselwerk', 'beton'
  floors INTEGER NOT NULL DEFAULT 2,

  -- LCA parameters
  study_period INTEGER NOT NULL DEFAULT 75,  -- years
  location VARCHAR(255),  -- City/region for transport calculations

  -- Energy data (simplified B6)
  energy_label VARCHAR(10),  -- 'A++', 'A+', 'A', 'B', etc.
  heating_system VARCHAR(100),  -- 'heat_pump', 'gas_boiler', 'district'
  annual_gas_use DECIMAL(10,2),  -- m³/year
  annual_electricity DECIMAL(10,2),  -- kWh/year

  -- Results cache (computed)
  total_gwp_a1_a3 DECIMAL(15,2),  -- kg CO2-eq
  total_gwp_a4 DECIMAL(15,2),
  total_gwp_a5 DECIMAL(15,2),
  total_gwp_b4 DECIMAL(15,2),
  total_gwp_c DECIMAL(15,2),
  total_gwp_d DECIMAL(15,2),
  total_gwp_sum DECIMAL(15,2),  -- A-C (for MPG compliance)
  total_gwp_per_m2_year DECIMAL(10,4),  -- Normalized

  operational_carbon DECIMAL(10,2),  -- B6 estimate
  total_carbon DECIMAL(10,4),  -- Embodied + operational

  -- Compliance
  mpg_reference_value DECIMAL(10,4),  -- kg CO2/m²/year
  is_compliant BOOLEAN,

  -- User & sharing
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lca_projects_user ON lca_projects(user_id);
CREATE INDEX idx_lca_projects_template ON lca_projects(is_template);
CREATE INDEX idx_lca_projects_created ON lca_projects(created_at DESC);

COMMENT ON TABLE lca_projects IS 'LCA projects with building data and calculated results';

CREATE TABLE lca_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES lca_projects(id) ON DELETE CASCADE,

  -- Identification
  name VARCHAR(255) NOT NULL,  -- 'Gevel noord', 'Tussenvloer', etc.
  sfb_code VARCHAR(50),  -- NL Sfb coding: '21.21', '27', etc.
  category VARCHAR(100) NOT NULL,  -- 'exterior_wall', 'floor', 'roof', etc.

  -- Geometry
  quantity DECIMAL(15,4) NOT NULL,  -- Area (m²), length (m), or volume (m³)
  quantity_unit VARCHAR(20) NOT NULL DEFAULT 'm2',

  -- Context
  description TEXT,
  notes TEXT,

  -- Calculated impacts (cached)
  total_gwp_a1_a3 DECIMAL(15,2),
  total_gwp_a4 DECIMAL(15,2),
  total_gwp_a5 DECIMAL(15,2),
  total_gwp_b4 DECIMAL(15,2),
  total_gwp_c DECIMAL(15,2),
  total_gwp_d DECIMAL(15,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lca_elements_project ON lca_elements(project_id);
CREATE INDEX idx_lca_elements_category ON lca_elements(category);

COMMENT ON TABLE lca_elements IS 'Building elements within LCA projects (walls, floors, roofs, etc.)';

CREATE TABLE lca_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES lca_elements(id) ON DELETE CASCADE,

  -- Layer position (1 = outermost)
  position INTEGER NOT NULL,

  -- Material reference
  material_id UUID NOT NULL REFERENCES lca_materials(id),

  -- Geometry
  thickness DECIMAL(10,6) NOT NULL,  -- meters
  coverage DECIMAL(4,3) NOT NULL DEFAULT 1.0,  -- 0-1 (for studs with cavity: 0.15)

  -- Overrides (optional)
  custom_lifespan INTEGER,  -- Override material default
  custom_transport_km DECIMAL(10,2),
  custom_eol_scenario VARCHAR(100),

  UNIQUE(element_id, position)
);

CREATE INDEX idx_lca_layers_element ON lca_layers(element_id, position);
CREATE INDEX idx_lca_layers_material ON lca_layers(material_id);

COMMENT ON TABLE lca_layers IS 'Material layers within building elements';

-- ============================================
-- TEMPLATES
-- ============================================

CREATE TABLE lca_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,  -- 'Houtskelet RC 6.0'
  description TEXT,

  -- Applicable to
  building_type VARCHAR(100),  -- NULL = all types
  construction_system VARCHAR(100) NOT NULL,

  -- Template data (JSON structure)
  elements_data JSONB NOT NULL,  -- Array of pre-configured elements

  -- Metadata
  source VARCHAR(50) NOT NULL DEFAULT 'system',  -- 'system', 'user'
  is_public BOOLEAN NOT NULL DEFAULT true,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lca_templates_system ON lca_templates(construction_system, building_type);

COMMENT ON TABLE lca_templates IS 'Pre-configured construction templates for quick project creation';

-- ============================================
-- REFERENCE DATA
-- ============================================

CREATE TABLE lca_reference_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- MPG reference values per building type
  building_type VARCHAR(100) UNIQUE NOT NULL,
  mpg_limit DECIMAL(10,4) NOT NULL,  -- kg CO2-eq/m²/year

  -- Typical operational carbon by energy label
  energy_label VARCHAR(10) NOT NULL,
  operational_carbon DECIMAL(10,2) NOT NULL,  -- kg CO2-eq/m²/year

  source VARCHAR(255) NOT NULL,
  valid_from TIMESTAMP NOT NULL
);

CREATE INDEX idx_lca_reference_building_type ON lca_reference_values(building_type);

COMMENT ON TABLE lca_reference_values IS 'MPG reference values and operational carbon estimates';

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_lca_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lca_materials_timestamp
BEFORE UPDATE ON lca_materials
FOR EACH ROW
EXECUTE FUNCTION update_lca_updated_at();

CREATE TRIGGER trigger_update_lca_projects_timestamp
BEFORE UPDATE ON lca_projects
FOR EACH ROW
EXECUTE FUNCTION update_lca_updated_at();

CREATE TRIGGER trigger_update_lca_elements_timestamp
BEFORE UPDATE ON lca_elements
FOR EACH ROW
EXECUTE FUNCTION update_lca_updated_at();
