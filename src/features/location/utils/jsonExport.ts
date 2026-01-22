/**
 * JSON Export Utility
 * Exports comprehensive location data including national and neighborhood levels,
 * detailed persona scores, and scenarios
 */

import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from './targetGroupScoring';
import { extractLocationScores } from './extractLocationScores';
import { convertResidentialToRows } from '../components/Residential/residentialDataConverter';

export interface ExportScenario {
  name: string;
  positions: number[];
  personas: {
    id: string;
    name: string;
    rRankPosition: number;
    rRank: number;
    zRank: number;
    zRankPosition: number;
    weightedTotal: number;
    maxPossibleScore: number;
    categoryScores: {
      voorzieningen: number;
      leefbaarheid: number;
      woningvooraad: number;
      demografie: number;
    };
  }[];
}

export interface LocationDataExport {
  metadata: {
    exportDate: string;
    location: {
      municipality: string;
      municipalityCode: string;
      district?: string;
      districtCode?: string;
      neighborhood?: string;
      neighborhoodCode?: string;
    };
  };
  nationalData: {
    demographics: ExportDataRow[];
    health: ExportDataRow[];
    livability: ExportDataRow[];
    safety: ExportDataRow[];
  };
  neighborhoodData: {
    demographics: ExportDataRow[];
    health: ExportDataRow[];
    livability: ExportDataRow[];
    safety: ExportDataRow[];
    amenities: ExportDataRow[];
    residential: ExportDataRow[];
  };
  locationScores: Record<string, number>;
  personaScores: {
    summary: {
      personaId: string;
      personaName: string;
      rRankPosition: number;
      zRankPosition: number;
      rRank: number;
      zRank: number;
      weightedTotal: number;
      maxPossibleScore: number;
      categoryScores: {
        voorzieningen: number;
        leefbaarheid: number;
        woningvooraad: number;
        demografie: number;
      };
    }[];
    detailed: {
      personaId: string;
      personaName: string;
      rRankPosition: number;
      zRankPosition: number;
      scores: {
        category: string;
        subcategory: string;
        characteristicType: string;
        multiplier: number;
        baseScore: number;
        weightedScore: number;
      }[];
      totals: {
        weightedTotal: number;
        maxPossibleScore: number;
        rRank: number;
        zRank: number;
      };
    }[];
  };
  scenarios: {
    scenario1: ExportScenario;
    scenario2: ExportScenario;
    scenario3: ExportScenario;
    custom: ExportScenario;
  };
}

interface ExportDataRow {
  source: string;
  geographicLevel: string;
  geographicCode: string;
  geographicName: string;
  key: string;
  title: string;
  absolute: number | null;
  relative: number | null;
  unit?: string;
  calculatedScore?: number | null;
}

/**
 * Convert UnifiedDataRow to ExportDataRow format
 */
function convertToExportRow(row: UnifiedDataRow): ExportDataRow {
  return {
    source: row.source,
    geographicLevel: row.geographicLevel,
    geographicCode: row.geographicCode,
    geographicName: row.geographicName,
    key: row.key,
    title: row.title,
    absolute: row.absolute,
    relative: row.relative,
    unit: row.unit,
    calculatedScore: row.calculatedScore,
  };
}

/**
 * Export comprehensive location data to JSON
 */
export function exportLocationDataToJSON(
  data: UnifiedLocationData,
  personaScores: PersonaScore[],
  scenarios: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
  },
  customScenarioPersonaIds: string[] = []
): LocationDataExport {
  // Extract location scores
  const locationScores = extractLocationScores(data);

  // Build scenario exports
  const buildScenario = (name: string, positions: number[]): ExportScenario => {
    const selectedPersonas = positions
      .map(pos => personaScores[pos - 1])
      .filter(p => p !== undefined);

    return {
      name,
      positions,
      personas: selectedPersonas.map(p => ({
        id: p.personaId,
        name: p.personaName,
        rRankPosition: p.rRankPosition,
        rRank: p.rRank,
        zRank: p.zRank,
        zRankPosition: p.zRankPosition,
        weightedTotal: p.weightedTotal,
        maxPossibleScore: p.maxPossibleScore,
        categoryScores: p.categoryScores,
      })),
    };
  };

  // Build custom scenario
  const customScenario: ExportScenario = {
    name: 'Custom',
    positions: [],
    personas: customScenarioPersonaIds
      .map(id => personaScores.find(p => p.personaId === id))
      .filter((p): p is PersonaScore => p !== undefined)
      .map(p => ({
        id: p.personaId,
        name: p.personaName,
        rRankPosition: p.rRankPosition,
        rRank: p.rRank,
        zRank: p.zRank,
        zRankPosition: p.zRankPosition,
        weightedTotal: p.weightedTotal,
        maxPossibleScore: p.maxPossibleScore,
        categoryScores: p.categoryScores,
      })),
  };

  // Convert residential data to rows
  const residentialRows = convertResidentialToRows(data.residential);

  return {
    metadata: {
      exportDate: new Date().toISOString(),
      location: {
        municipality: data.location.municipality?.statnaam,
        municipalityCode: data.location.municipality?.statcode,
        district: data.location.district?.statnaam,
        districtCode: data.location.district?.statcode,
        neighborhood: data.location.neighborhood?.statnaam,
        neighborhoodCode: data.location.neighborhood?.statcode,
      },
    },
    nationalData: {
      demographics: data.demographics.national.map(convertToExportRow),
      health: data.health.national.map(convertToExportRow),
      livability: data.livability.national.map(convertToExportRow),
      safety: data.safety.national.map(convertToExportRow),
    },
    neighborhoodData: {
      demographics: data.demographics.neighborhood.map(convertToExportRow),
      health: data.health.neighborhood.map(convertToExportRow),
      livability: data.livability.municipality.map(convertToExportRow), // Livability only has municipality
      safety: data.safety.neighborhood.map(convertToExportRow),
      amenities: data.amenities.map(convertToExportRow),
      residential: residentialRows.map(convertToExportRow),
    },
    locationScores,
    personaScores: {
      summary: personaScores.map(p => ({
        personaId: p.personaId,
        personaName: p.personaName,
        rRankPosition: p.rRankPosition,
        zRankPosition: p.zRankPosition,
        rRank: p.rRank,
        zRank: p.zRank,
        weightedTotal: p.weightedTotal,
        maxPossibleScore: p.maxPossibleScore,
        categoryScores: p.categoryScores,
      })),
      detailed: personaScores.map(p => ({
        personaId: p.personaId,
        personaName: p.personaName,
        rRankPosition: p.rRankPosition,
        zRankPosition: p.zRankPosition,
        scores: p.detailedScores,
        totals: {
          weightedTotal: p.weightedTotal,
          maxPossibleScore: p.maxPossibleScore,
          rRank: p.rRank,
          zRank: p.zRank,
        },
      })),
    },
    scenarios: {
      scenario1: buildScenario('Scenario 1', scenarios.scenario1),
      scenario2: buildScenario('Scenario 2', scenarios.scenario2),
      scenario3: buildScenario('Scenario 3', scenarios.scenario3),
      custom: customScenario,
    },
  };
}

/**
 * Download JSON file
 */
export function downloadJSON(data: LocationDataExport, filename: string = 'location-export.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
