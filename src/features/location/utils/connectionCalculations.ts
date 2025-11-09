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
 * - Scenario 1: Take R-rank #1, get its top 10 connections, sort by R-rank, take top 3 => 4 total
 * - Scenario 2: Exclude scenario 1's 4, take next highest R-rank, get its top 10 connections, sort by R-rank, take top 3 => 4 more
 * - Scenario 3: Exclude scenarios 1&2's 8, take next highest R-rank, get its top 10 connections, sort by R-rank, take top 3 => 4 more
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
  const excludedIndices = new Set<number>();

  const getScenarioGroup = (): number[] => {
    // Find the highest R-ranked persona not yet excluded
    const availableScores = allPersonaScores.filter((_, index) => !excludedIndices.has(index));
    if (availableScores.length === 0) return [];

    // Get the best available persona (lowest R-rank position = best)
    const anchorPersona = availableScores[0];
    const anchorIndex = allPersonaScores.findIndex(ps => ps.personaId === anchorPersona.personaId);

    // Get top 10 connections for this anchor persona
    const topConnections = getTopConnectionsForPersona(anchorIndex, connections, 10);

    // Filter out already excluded indices and sort by R-rank
    const availableConnections = topConnections
      .filter(conn => !excludedIndices.has(conn.index))
      .map(conn => {
        const score = allPersonaScores[conn.index];
        return {
          index: conn.index,
          rRankPosition: score.rRankPosition
        };
      })
      .sort((a, b) => a.rRankPosition - b.rRankPosition)
      .slice(0, 3); // Take top 3 by R-rank

    // Build result: anchor + top 3 connections
    const result = [
      anchorPersona.rRankPosition,
      ...availableConnections.map(conn => allPersonaScores[conn.index].rRankPosition)
    ];

    // Mark all as excluded for next scenario
    excludedIndices.add(anchorIndex);
    availableConnections.forEach(conn => excludedIndices.add(conn.index));

    return result;
  };

  const scenario1 = getScenarioGroup();
  const scenario2 = getScenarioGroup();
  const scenario3 = getScenarioGroup();

  return { scenario1, scenario2, scenario3 };
}
