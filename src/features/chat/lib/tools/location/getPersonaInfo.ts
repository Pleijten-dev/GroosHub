/**
 * Location Agent Tool: Get Persona Information
 *
 * Retrieves housing persona details from the static JSON file
 * Supports searching by ID, name, or listing all personas with filters
 */

import { tool } from 'ai';
import { z } from 'zod';
import personasData from '@/features/location/data/sources/housing-personas.json';

/**
 * Housing Persona Interface
 */
interface HousingPersona {
  id: string;
  name: string;
  income_level: string;
  household_type: string;
  age_group: string;
  description: string;
  current_situation: string;
  desired_situation: string;
  current_property_types: string[];
  desired_property_types: string[];
  imageUrl: string;
}

/**
 * Tool: getPersonaInfo
 *
 * Retrieves information about housing personas
 * Can search by ID or name, or list all personas with optional filters
 */
export const getPersonaInfo = tool({
  description: `Get information about housing personas used in GroosHub location analysis.

  GroosHub uses 30+ housing personas categorized by:
  - Income level: "Laag inkomen" (Low), "Midden inkomen" (Middle), "Hoog inkomen" (High)
  - Household type: Single, couples, families
  - Age group: 20-35, 35-55, 55+

  Use this tool when:
  - User asks about specific persona (e.g., "Tell me about Jonge Starters")
  - User wants to list personas by category
  - User needs to understand persona characteristics
  - You need persona details to interpret location fit scores

  Returns: Persona details including current/desired situation, housing preferences, and target demographics.`,

  inputSchema: z.object({
    mode: z
      .enum(['search', 'list'])
      .describe('Search for specific persona or list personas with filters'),
    personaIdOrName: z
      .string()
      .optional()
      .describe('Persona ID (e.g., "jonge-starters") or name for search mode'),
    filters: z
      .object({
        income_level: z
          .enum(['Laag inkomen', 'Midden inkomen', 'Hoog inkomen'])
          .optional()
          .describe('Filter by income level'),
        household_type: z
          .string()
          .optional()
          .describe('Filter by household type (e.g., "1-persoonshuishouden")'),
        age_group: z
          .string()
          .optional()
          .describe('Filter by age group (e.g., "20-35 jaar")'),
      })
      .optional()
      .describe('Filters for list mode'),
  }),

  async execute({ mode, personaIdOrName, filters }) {
    try {
      console.log(`[Location Agent] Getting persona info - mode: ${mode}`);

      // Get personas from JSON (Dutch version)
      const personas = personasData.nl.housing_personas as HousingPersona[];

      if (mode === 'search') {
        if (!personaIdOrName) {
          return {
            success: false,
            error: 'Persona ID or name required for search mode',
            message: 'Please provide a persona ID or name to search for.',
          };
        }

        // Search by ID or name (case-insensitive, fuzzy)
        const searchTerm = personaIdOrName.toLowerCase();
        const found = personas.find(
          (p) =>
            p.id.toLowerCase() === searchTerm ||
            p.name.toLowerCase() === searchTerm ||
            p.name.toLowerCase().includes(searchTerm) ||
            p.id.toLowerCase().includes(searchTerm)
        );

        if (!found) {
          return {
            success: false,
            error: 'Persona not found',
            message: `No persona found matching "${personaIdOrName}". Try listing all personas to see available options.`,
          };
        }

        // Return detailed persona information
        return {
          success: true,
          mode: 'search',
          persona: formatPersonaDetails(found),
          message: `Found persona: ${found.name}`,
        };
      } else {
        // List mode: apply filters
        let filtered = personas;

        if (filters?.income_level) {
          filtered = filtered.filter((p) => p.income_level === filters.income_level);
        }

        if (filters?.household_type) {
          filtered = filtered.filter((p) => p.household_type === filters.household_type);
        }

        if (filters?.age_group) {
          filtered = filtered.filter((p) => p.age_group === filters.age_group);
        }

        // Return summary list
        const summary = filtered.map((p) => ({
          id: p.id,
          name: p.name,
          income_level: p.income_level,
          household_type: p.household_type,
          age_group: p.age_group,
          shortDescription: p.description.slice(0, 100) + '...',
        }));

        return {
          success: true,
          mode: 'list',
          count: summary.length,
          personas: summary,
          filters: filters || {},
          message: `Found ${summary.length} persona${summary.length !== 1 ? 's' : ''}.`,
        };
      }
    } catch (error) {
      console.error('[Location Agent] Error getting persona info:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get persona information',
        message: 'Unable to retrieve persona information. Please try again.',
      };
    }
  },
});

/**
 * Format persona details for LLM consumption
 */
function formatPersonaDetails(persona: HousingPersona) {
  return {
    id: persona.id,
    name: persona.name,
    category: {
      income_level: persona.income_level,
      household_type: persona.household_type,
      age_group: persona.age_group,
    },
    description: persona.description,
    housing: {
      current_situation: persona.current_situation,
      desired_situation: persona.desired_situation,
      current_property_types: persona.current_property_types,
      desired_property_types: persona.desired_property_types,
    },
    // Simplified needs assessment
    key_needs: deriveKeyNeeds(persona),
    target_demographics: {
      income: persona.income_level,
      age: persona.age_group,
      household: persona.household_type,
    },
  };
}

/**
 * Derive key needs from persona data
 * Helps LLM understand what matters most to this persona
 */
function deriveKeyNeeds(persona: HousingPersona): string[] {
  const needs: string[] = [];

  // Income-based needs
  if (persona.income_level === 'Laag inkomen') {
    needs.push('Affordability is critical');
    needs.push('Social housing or subsidized rent');
  } else if (persona.income_level === 'Hoog inkomen') {
    needs.push('Premium quality and finishes');
    needs.push('Willing to pay for amenities');
  }

  // Household-based needs
  if (persona.household_type.includes('1-persoons')) {
    needs.push('Small units (studio, 1-bedroom)');
    needs.push('Efficiency over space');
  } else if (persona.household_type.includes('gezin') || persona.household_type.includes('familie')) {
    needs.push('Family-sized units (2-3+ bedrooms)');
    needs.push('Child-friendly amenities');
    needs.push('Schools and playgrounds nearby');
  }

  // Age-based needs
  if (persona.age_group === '20-35 jaar') {
    needs.push('Urban location');
    needs.push('Transit accessibility');
    needs.push('Social/nightlife proximity');
  } else if (persona.age_group === '55+ jaar') {
    needs.push('Accessibility (elevator, ground floor)');
    needs.push('Healthcare proximity');
    needs.push('Quiet neighborhood');
  }

  // Property type insights
  if (persona.desired_property_types.some((t) => t.toLowerCase().includes('goedkoop'))) {
    needs.push('Budget-conscious');
  }

  return needs;
}

/**
 * Helper: List all available filter options
 * Useful for LLM to know what filters are valid
 */
export function getPersonaFilterOptions(): {
  income_levels: string[];
  household_types: string[];
  age_groups: string[];
} {
  const personas = personasData.nl.housing_personas as HousingPersona[];

  return {
    income_levels: [...new Set(personas.map((p) => p.income_level))],
    household_types: [...new Set(personas.map((p) => p.household_type))],
    age_groups: [...new Set(personas.map((p) => p.age_group))],
  };
}
