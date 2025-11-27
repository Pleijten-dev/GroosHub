-- ============================================
-- LCA PACKAGES MIGRATION
-- Adds reusable building assembly library
-- ============================================

-- 1. Add package reference to elements
ALTER TABLE lca_elements
ADD COLUMN package_id UUID;

-- 2. Create packages table
CREATE TABLE lca_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification (same as ElementCategory)
  category VARCHAR(100) NOT NULL,  -- 'exterior_wall', 'floor', 'roof', etc.
  subcategory VARCHAR(100),  -- Optional: 'loadbearing', 'partition', 'insulated'

  -- Context filters (to help users find relevant packages)
  construction_system VARCHAR(100),  -- 'houtskelet', 'metselwerk', 'beton', 'clt', etc.
  insulation_level VARCHAR(50),  -- 'rc_3.5', 'rc_5.0', 'rc_6.0', 'rc_8.0'

  -- Calculated properties (computed from layers)
  total_thickness DECIMAL(10,6),  -- meters (sum of all layer thicknesses)
  total_rc_value DECIMAL(10,4),  -- m²K/W (thermal resistance)
  total_weight DECIMAL(10,2),  -- kg/m² (if applicable)

  -- Package type
  is_template BOOLEAN NOT NULL DEFAULT false,  -- System-provided template
  is_public BOOLEAN NOT NULL DEFAULT true,  -- Available to all users

  -- Ownership
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL for system packages

  -- Usage statistics
  usage_count INTEGER NOT NULL DEFAULT 0,  -- Track how many times used

  -- Tags (for search/filtering)
  tags TEXT[],  -- ['sustainable', 'low-carbon', 'passive-house']

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create package layers table
CREATE TABLE lca_package_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES lca_packages(id) ON DELETE CASCADE,

  -- Layer position (1 = outermost, increasing inward)
  position INTEGER NOT NULL,

  -- Material reference (NULL for air cavities)
  material_id UUID REFERENCES lca_materials(id),

  -- Geometry
  thickness DECIMAL(10,6) NOT NULL,  -- meters
  coverage DECIMAL(4,3) NOT NULL DEFAULT 1.0,  -- 0-1 (for studs with cavity: 0.15)

  -- Layer metadata
  layer_function VARCHAR(100),  -- 'structural', 'insulation', 'finish', 'weatherproofing'
  notes TEXT,  -- Additional notes about this layer

  -- Constraints
  UNIQUE(package_id, position),
  CHECK (thickness > 0),
  CHECK (coverage > 0 AND coverage <= 1)
);

-- 4. Add foreign key constraint to elements
ALTER TABLE lca_elements
ADD CONSTRAINT fk_lca_elements_package
FOREIGN KEY (package_id) REFERENCES lca_packages(id) ON DELETE SET NULL;

-- 5. Create indexes
CREATE INDEX idx_lca_elements_package ON lca_elements(package_id);
CREATE INDEX idx_lca_packages_category ON lca_packages(category);
CREATE INDEX idx_lca_packages_construction_system ON lca_packages(construction_system);
CREATE INDEX idx_lca_packages_user ON lca_packages(user_id);
CREATE INDEX idx_lca_packages_public ON lca_packages(is_public, is_template);
CREATE INDEX idx_lca_packages_tags ON lca_packages USING gin(tags);
CREATE INDEX idx_lca_package_layers_package ON lca_package_layers(package_id, position);
CREATE INDEX idx_lca_package_layers_material ON lca_package_layers(material_id);

-- 6. Add trigger
CREATE TRIGGER trigger_update_lca_packages_timestamp
BEFORE UPDATE ON lca_packages
FOR EACH ROW
EXECUTE FUNCTION update_lca_updated_at();

-- 7. Comments
COMMENT ON TABLE lca_packages IS 'Reusable building assembly templates (shared library)';
COMMENT ON TABLE lca_package_layers IS 'Material layers within packages (template definitions)';
COMMENT ON COLUMN lca_elements.package_id IS 'Reference to the package this element was created from';
