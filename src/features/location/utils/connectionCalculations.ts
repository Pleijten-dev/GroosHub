// Utility functions for calculating connections between target groups

import { PersonaScore } from './targetGroupScoring';

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

/**
 * Calculate connections between all personas based on shared characteristics and score similarity
 */
export function calculateConnections(
  allPersonas: HousingPersona[],
  allPersonaScores: PersonaScore[]
): Connection[] {
  const connectionMap = new Map<string, number>();

  // Calculate connections based on similar characteristics
  for (let i = 0; i < allPersonas.length; i++) {
    for (let j = i + 1; j < allPersonas.length; j++) {
      const persona1 = allPersonas[i];
      const persona2 = allPersonas[j];

      // Count shared characteristics
      let sharedCount = 0;

      if (persona1.income_level === persona2.income_level) sharedCount += 3;
      if (persona1.household_type === persona2.household_type) sharedCount += 3;
      if (persona1.age_group === persona2.age_group) sharedCount += 3;

      // Also consider scoring similarity
      const score1 = allPersonaScores.find(ps => ps.personaId === persona1.id);
      const score2 = allPersonaScores.find(ps => ps.personaId === persona2.id);

      if (score1 && score2) {
        // Normalize scores and calculate similarity (closer scores = stronger connection)
        const scoreDiff = Math.abs(score1.weightedTotal - score2.weightedTotal);
        const maxDiff = 100; // Assume max difference is 100
        const scoreSimilarity = Math.max(0, maxDiff - scoreDiff) / maxDiff;
        sharedCount += Math.floor(scoreSimilarity * 5); // Add 0-5 points based on score similarity
      }

      // Only add connection if there's some similarity
      if (sharedCount > 0) {
        const key = `${i}-${j}`;
        connectionMap.set(key, sharedCount);
      }
    }
  }

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
