#!/usr/bin/env tsx
/**
 * Data Integrity Validation Script
 *
 * Validates all relational data matches across JSON files:
 * - Property type mapping → Housing typologies
 * - Communal spaces target_groups → Personas
 * - Public spaces target_groups → Personas
 *
 * Run with: npx tsx scripts/validate-data-integrity.ts
 */

import housingTypologies from '../src/features/location/data/sources/housing-typologies.json';
import propertyTypeMapping from '../src/features/location/data/sources/property-type-mapping.json';
import communalSpaces from '../src/features/location/data/sources/communal-spaces.json';
import publicSpaces from '../src/features/location/data/sources/public-spaces.json';
import personas from '../src/features/location/data/sources/housing-personas.json';

interface ValidationError {
  category: string;
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

const errors: ValidationError[] = [];

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function logError(error: ValidationError) {
  const color = error.severity === 'error' ? colors.red : colors.yellow;
  const icon = error.severity === 'error' ? '✗' : '⚠';
  console.log(`${color}${icon} [${error.category}] ${error.message}${colors.reset}`);
  if (error.details) {
    console.log(`  ${error.details}`);
  }
}

/**
 * Validate that all typology_ids in property-type-mapping exist in housing-typologies
 */
function validatePropertyTypeMappings() {
  console.log(`\n${colors.blue}${colors.bold}Validating Property Type Mappings...${colors.reset}`);

  for (const locale of ['nl', 'en'] as const) {
    const typologyIds = new Set(
      housingTypologies[locale].typologies.map(t => t.id)
    );

    const mappings = propertyTypeMapping[locale].mappings;

    for (const [propertyType, mapping] of Object.entries(mappings)) {
      for (const typologyId of mapping.typology_ids) {
        if (!typologyIds.has(typologyId)) {
          errors.push({
            category: 'Property Mapping',
            severity: 'error',
            message: `Invalid typology_id reference`,
            details: `"${propertyType}" (${locale}) references typology_id "${typologyId}" which doesn't exist in housing-typologies.json`,
          });
        }
      }

      // Also validate alternative_suggestion if present
      if (mapping.alternative_suggestion && !typologyIds.has(mapping.alternative_suggestion)) {
        errors.push({
          category: 'Property Mapping',
          severity: 'error',
          message: `Invalid alternative_suggestion reference`,
          details: `"${propertyType}" (${locale}) has alternative_suggestion "${mapping.alternative_suggestion}" which doesn't exist`,
        });
      }
    }
  }
}

/**
 * Validate that all target_groups in communal spaces reference real personas
 */
function validateCommunalSpaceTargetGroups() {
  console.log(`\n${colors.blue}${colors.bold}Validating Communal Space Target Groups...${colors.reset}`);

  for (const locale of ['nl', 'en'] as const) {
    const personaNames = new Set(
      personas[locale].housing_personas.map(p => p.name)
    );

    const spaces = communalSpaces[locale].spaces;

    for (const space of spaces) {
      for (const targetGroup of space.target_groups) {
        // Skip generic entries
        if (targetGroup.toLowerCase().includes('geschikt voor') ||
            targetGroup.toLowerCase().includes('suitable for')) {
          continue;
        }

        if (!personaNames.has(targetGroup)) {
          errors.push({
            category: 'Communal Spaces',
            severity: 'warning',
            message: `Unrecognized target_group in communal space`,
            details: `Space "${space.name}" (${locale}) has target_group "${targetGroup}" which doesn't match any persona name`,
          });
        }
      }
    }
  }
}

/**
 * Validate that all target_groups in public spaces reference real personas
 */
function validatePublicSpaceTargetGroups() {
  console.log(`\n${colors.blue}${colors.bold}Validating Public Space Target Groups...${colors.reset}`);

  for (const locale of ['nl', 'en'] as const) {
    const personaNames = new Set(
      personas[locale].housing_personas.map(p => p.name)
    );

    const spaces = publicSpaces[locale].spaces;

    for (const space of spaces) {
      for (const targetGroup of space.target_groups) {
        // Skip generic entries
        if (targetGroup.toLowerCase().includes('geschikt voor') ||
            targetGroup.toLowerCase().includes('suitable for')) {
          continue;
        }

        if (!personaNames.has(targetGroup)) {
          errors.push({
            category: 'Public Spaces',
            severity: 'warning',
            message: `Unrecognized target_group in public space`,
            details: `Space "${space.name}" (${locale}) has target_group "${targetGroup}" which doesn't match any persona name`,
          });
        }
      }
    }
  }
}

/**
 * Validate that desired_property_types in personas exist in property-type-mapping
 */
function validatePersonaHousingPreferences() {
  console.log(`\n${colors.blue}${colors.bold}Validating Persona Housing Preferences...${colors.reset}`);

  for (const locale of ['nl', 'en'] as const) {
    const mappingKeys = new Set(
      Object.keys(propertyTypeMapping[locale].mappings)
    );

    const personaList = personas[locale].housing_personas;

    for (const persona of personaList) {
      if (!persona.desired_property_types) continue;

      for (const propertyType of persona.desired_property_types) {
        if (!mappingKeys.has(propertyType)) {
          errors.push({
            category: 'Persona Housing',
            severity: 'error',
            message: `Invalid desired_property_type in persona`,
            details: `Persona "${persona.name}" (${locale}) desires "${propertyType}" which doesn't exist in property-type-mapping.json`,
          });
        }
      }
    }
  }
}

/**
 * Check for consistency between nl and en versions
 */
function validateLocaleConsistency() {
  console.log(`\n${colors.blue}${colors.bold}Validating Locale Consistency...${colors.reset}`);

  // Check housing typologies have same IDs
  const nlTypologyIds = new Set(housingTypologies.nl.typologies.map(t => t.id));
  const enTypologyIds = new Set(housingTypologies.en.typologies.map(t => t.id));

  if (nlTypologyIds.size !== enTypologyIds.size) {
    errors.push({
      category: 'Locale Consistency',
      severity: 'error',
      message: `Typology count mismatch between locales`,
      details: `NL has ${nlTypologyIds.size} typologies, EN has ${enTypologyIds.size}`,
    });
  }

  for (const id of nlTypologyIds) {
    if (!enTypologyIds.has(id)) {
      errors.push({
        category: 'Locale Consistency',
        severity: 'error',
        message: `Missing typology in EN locale`,
        details: `Typology "${id}" exists in NL but not in EN`,
      });
    }
  }

  for (const id of enTypologyIds) {
    if (!nlTypologyIds.has(id)) {
      errors.push({
        category: 'Locale Consistency',
        severity: 'error',
        message: `Missing typology in NL locale`,
        details: `Typology "${id}" exists in EN but not in NL`,
      });
    }
  }

  // Check communal spaces have same IDs
  const nlCommunalIds = new Set(communalSpaces.nl.spaces.map(s => s.id));
  const enCommunalIds = new Set(communalSpaces.en.spaces.map(s => s.id));

  if (nlCommunalIds.size !== enCommunalIds.size) {
    errors.push({
      category: 'Locale Consistency',
      severity: 'error',
      message: `Communal space count mismatch between locales`,
      details: `NL has ${nlCommunalIds.size} spaces, EN has ${enCommunalIds.size}`,
    });
  }

  // Check public spaces have same IDs
  const nlPublicIds = new Set(publicSpaces.nl.spaces.map(s => s.id));
  const enPublicIds = new Set(publicSpaces.en.spaces.map(s => s.id));

  if (nlPublicIds.size !== enPublicIds.size) {
    errors.push({
      category: 'Locale Consistency',
      severity: 'error',
      message: `Public space count mismatch between locales`,
      details: `NL has ${nlPublicIds.size} spaces, EN has ${enPublicIds.size}`,
    });
  }
}

/**
 * Main validation runner
 */
function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Data Integrity Validation');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(colors.reset);

  validatePropertyTypeMappings();
  validateCommunalSpaceTargetGroups();
  validatePublicSpaceTargetGroups();
  validatePersonaHousingPreferences();
  validateLocaleConsistency();

  console.log(`\n${colors.bold}Results:${colors.reset}`);
  console.log('─────────────────────────────────────────────────────────────');

  if (errors.length === 0) {
    console.log(`${colors.green}${colors.bold}✓ All validations passed! Data integrity is intact.${colors.reset}`);
    process.exit(0);
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  console.log(`${colors.red}Found ${errorCount} error(s)${colors.reset}`);
  console.log(`${colors.yellow}Found ${warningCount} warning(s)${colors.reset}\n`);

  errors.forEach(logError);

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total issues: ${errors.length}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Warnings: ${warningCount}`);

  if (errorCount > 0) {
    console.log(`\n${colors.red}${colors.bold}✗ Validation failed. Please fix the errors above.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠ Validation passed with warnings.${colors.reset}`);
    process.exit(0);
  }
}

main();
