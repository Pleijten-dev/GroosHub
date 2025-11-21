// Utility functions for calculating connections between target groups

import { PersonaScore } from './targetGroupScoring';
import communalSpacesData from '../data/sources/communal-spaces.json';
import publicSpacesData from '../data/sources/public-spaces.json';

export interface Connection {
  from: number;
  to: number;
  count: number;
}

interface HousingPersona {
  id: string;
  name: string;
  income_level: string;
  household_type: string;
  age_group: string;
}

interface AmenitySpace {
  id: string;
  name: string;
  target_groups: string[];
  [key: string]: any;
}

interface AmenityData {
  nl: {
    spaces: AmenitySpace[];
  };
  en: {
    spaces: AmenitySpace[];
  };
}

/**
 * Calculate connections between all personas based on shared amenities
 * from communal-spaces.json and public-spaces.json
 */
export function calculateConnections(
  allPersonas: HousingPersona[],
  allPersonaScores: PersonaScore[]
): Connection[] {
  const connectionMap = new Map<string, number>();

  // Get all amenities from both files (use Dutch locale)
  const communalSpaces = (communalSpacesData as AmenityData).nl.spaces;
  const publicSpaces = (publicSpacesData as AmenityData).nl.spaces;
  const allAmenities = [...communalSpaces, ...publicSpaces];

  // Build a map of persona name to persona index
  const personaNameToIndex = new Map<string, number>();
  allPersonas.forEach((persona, index) => {
    personaNameToIndex.set(persona.name, index);
  });

  // For each amenity, find which personas are connected through it
  allAmenities.forEach(amenity => {
    const targetGroups = amenity.target_groups || [];

    // Check if this amenity is suitable for all target groups
    const isSuitableForAll = targetGroups.some(group =>
      group === 'geschikt voor elke doelgroep' ||
      group === 'suitable for all target groups'
    );

    let connectedPersonaIndices: number[] = [];

    if (isSuitableForAll) {
      // All personas are connected through this amenity
      connectedPersonaIndices = allPersonas.map((_, index) => index);
    } else {
      // Only personas listed in target_groups are connected
      connectedPersonaIndices = targetGroups
        .map(groupName => personaNameToIndex.get(groupName))
        .filter((index): index is number => index !== undefined);
    }

    // Create connections between all personas that share this amenity
    for (let i = 0; i < connectedPersonaIndices.length; i++) {
      for (let j = i + 1; j < connectedPersonaIndices.length; j++) {
        const idx1 = connectedPersonaIndices[i];
        const idx2 = connectedPersonaIndices[j];

        // Ensure we always use the same order (smaller index first)
        const [from, to] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];
        const key = `${from}-${to}`;

        // Increment connection count for this pair
        connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
      }
    }
  });

  // Convert to array
  const connectionsArray: Connection[] = [];
  connectionMap.forEach((count, key) => {
    const [from, to] = key.split('-').map(Number);
    connectionsArray.push({ from, to, count });
  });

  return connectionsArray;
}

/**
 * Get top N connections for a specific persona index
 */
export function getTopConnectionsForPersona(
  personaIndex: number,
  connections: Connection[],
  limit: number = 10
): Array<{ index: number; count: number }> {
  return connections
    .filter(c => c.from === personaIndex || c.to === personaIndex)
    .map(conn => ({
      index: conn.from === personaIndex ? conn.to : conn.from,
      count: conn.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Calculate scenario groups based on R-rank and connection strength cross-reference
 *
 * Algorithm:
 * - Scenario 1: Take R-rank #1, get its 5 strongest connections, sort by R-rank, take top 3 => [1,2,3,4]
 * - Scenario 2: Take next R-rank not in [1,2,3,4], get its 5 strongest connections (can include 2,3,4), sort by R-rank, take top 3 => e.g., [5,2,6,8]
 * - Scenario 3: Take next R-rank not in [1,2,3,4,5,2,6,8], get its 5 strongest connections (can include any previous), sort by R-rank, take top 3 => e.g., [7,3,6,9]
 *
 * Note: Anchor cannot be ANY persona from previous scenarios. Connections can overlap.
 */
export function calculateScenarios(
  allPersonas: HousingPersona[],
  allPersonaScores: PersonaScore[],
  connections: Connection[]
): {
  scenario1: number[]; // R-rank positions (1-based)
  scenario2: number[];
  scenario3: number[];
} {
  const excludedPersonaIds = new Set<string>(); // Track excluded personas by ID

  const getScenarioGroup = (): number[] => {
    // Find the highest R-ranked persona not in any previous scenario
    const availableScores = allPersonaScores.filter(ps => !excludedPersonaIds.has(ps.personaId));
    if (availableScores.length === 0) return [];

    // Get the best available persona (lowest R-rank position = best)
    const anchorPersona = availableScores[0];
    // Find index in allPersonas array (connections use allPersonas indices)
    const anchorIndex = allPersonas.findIndex(p => p.id === anchorPersona.personaId);
    if (anchorIndex === -1) return [];

    // Get top 5 strongest connections for this anchor persona
    const topConnections = getTopConnectionsForPersona(anchorIndex, connections, 5);

    // Sort connections by R-rank (best to worst) and take top 3
    const top3Connections = topConnections
      .map(conn => {
        const connPersona = allPersonas[conn.index];
        // Find the score by matching persona ID, not by index
        const score = allPersonaScores.find(ps => ps.personaId === connPersona.id);
        if (!score) return null;

        return {
          personaId: connPersona.id,
          index: conn.index,
          rRankPosition: score.rRankPosition
        };
      })
      .filter((conn): conn is NonNullable<typeof conn> => conn !== null)
      .sort((a, b) => a.rRankPosition - b.rRankPosition)
      .slice(0, 3); // Take top 3 by R-rank

    // Build result: anchor + top 3 connections
    const result = [
      anchorPersona.rRankPosition,
      ...top3Connections.map(conn => conn.rRankPosition)
    ];

    // Mark all personas in this scenario as excluded for future anchor selection
    excludedPersonaIds.add(anchorPersona.personaId);
    top3Connections.forEach(conn => excludedPersonaIds.add(conn.personaId));

    return result;
  };

  const scenario1 = getScenarioGroup();
  const scenario2 = getScenarioGroup();
  const scenario3 = getScenarioGroup();

  return { scenario1, scenario2, scenario3 };
}
