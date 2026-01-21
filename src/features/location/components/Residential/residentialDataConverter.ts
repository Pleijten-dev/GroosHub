import type { ResidentialData, ReferenceHouse } from '../../data/sources/altum-ai/types';
import type { UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import {
  calculateResidentialScores,
  type ResidentialScores,
  type ResidentialCategoryScore
} from '../../data/scoring/residentialScoring';

/**
 * Get all unique values and their counts for a specific field
 */
function getFieldDistribution(
  referenceHouses: ReferenceHouse[],
  fieldKey: string
): Record<string, number> {
  const distribution: Record<string, number> = {};

  referenceHouses.forEach((house) => {
    const value = house[fieldKey as keyof ReferenceHouse];
    if (value !== null && value !== undefined) {
      const stringValue = String(value);
      distribution[stringValue] = (distribution[stringValue] || 0) + 1;
    }
  });

  return distribution;
}

/**
 * Helper to create a row from a scored category
 */
function createCategoryScoreRow(
  categoryScore: ResidentialCategoryScore,
  categoryType: 'typologie' | 'woonoppervlak' | 'transactieprijs',
  categoryKey: string,
  geographicCode: string,
  geographicName: string,
  totalReferences: number
): UnifiedDataRow {
  return {
    source: 'residential',
    geographicLevel: 'municipality',
    geographicCode,
    geographicName,
    key: `${categoryType}_${categoryKey}`,
    title: categoryScore.category,
    titleNl: categoryScore.category,
    titleEn: categoryScore.category,
    value: categoryScore.count,
    absolute: categoryScore.count,
    relative: null,
    displayValue: categoryScore.count.toString(),
    displayAbsolute: categoryScore.count.toString(),
    displayRelative: '-',
    // Add scoring info
    scoring: {
      comparisonType: 'absoluut',
      margin: 50, // Not really used for residential, but required
      baseValue: 10, // Base value for residential scoring
      direction: 'positive'
    },
    calculatedScore: categoryScore.score,
    metadata: {
      count: categoryScore.count,
      total: totalReferences,
      categoryType,
      categoryKey,
    },
  };
}

/**
 * Helper to create a row for calculated averages (no scoring)
 */
function createAverageRow(
  key: string,
  displayNameNl: string,
  displayNameEn: string,
  value: number | null,
  unit: string,
  geographicCode: string,
  geographicName: string
): UnifiedDataRow {
  const formattedValue = value !== null ? `${value.toLocaleString('nl-NL')}${unit}` : 'N/A';

  return {
    source: 'residential',
    geographicLevel: 'municipality',
    geographicCode,
    geographicName,
    key: `average_${key}`,
    title: `Gemiddeld ${displayNameNl}`,
    titleNl: `Gemiddeld ${displayNameNl}`,
    titleEn: `Average ${displayNameEn}`,
    value: value,
    absolute: value,
    relative: null,
    displayValue: formattedValue,
    displayAbsolute: formattedValue,
    displayRelative: '-',
    unit,
    metadata: {
      isAverage: true,
      fieldName: key,
    },
  };
}

/**
 * Convert residential market data to UnifiedDataRow format
 * for display in the main data table
 *
 * Creates scored rows for typologie, woonoppervlak, and transactieprijs categories
 * Also includes calculated averages (display only, no scoring)
 */
export function convertResidentialToRows(
  residentialData: ResidentialData | null
): UnifiedDataRow[] {
  if (!residentialData || !residentialData.hasData) {
    return [];
  }

  const rows: UnifiedDataRow[] = [];
  const referenceHouses = residentialData.referenceHouses || [];
  const geographicCode = residentialData.targetProperty?.address?.postcode || '';
  const geographicName = residentialData.targetProperty?.address?.postcode || '';

  // Use pre-computed scores if available (from database snapshot),
  // otherwise calculate from referenceHouses
  // This fixes the issue where scores would be recalculated with potentially
  // corrupted/empty referenceHouses after JSON serialization round-trip
  const scores: ResidentialScores = residentialData.precomputedScores
    ? residentialData.precomputedScores
    : calculateResidentialScores(referenceHouses);

  // === SCORED CATEGORIES ===

  // 1. Typologie Categories (with scoring)
  rows.push(
    createCategoryScoreRow(
      scores.typologie.laagStedelijk,
      'typologie',
      'laagStedelijk',
      geographicCode,
      geographicName,
      referenceHouses.length
    ),
    createCategoryScoreRow(
      scores.typologie.randStedelijk,
      'typologie',
      'randStedelijk',
      geographicCode,
      geographicName,
      referenceHouses.length
    ),
    createCategoryScoreRow(
      scores.typologie.hoogStedelijk,
      'typologie',
      'hoogStedelijk',
      geographicCode,
      geographicName,
      referenceHouses.length
    )
  );

  // 2. Woonoppervlak Categories (with scoring)
  rows.push(
    createCategoryScoreRow(
      scores.woonoppervlak.klein,
      'woonoppervlak',
      'klein',
      geographicCode,
      geographicName,
      referenceHouses.length
    ),
    createCategoryScoreRow(
      scores.woonoppervlak.midden,
      'woonoppervlak',
      'midden',
      geographicCode,
      geographicName,
      referenceHouses.length
    ),
    createCategoryScoreRow(
      scores.woonoppervlak.groot,
      'woonoppervlak',
      'groot',
      geographicCode,
      geographicName,
      referenceHouses.length
    )
  );

  // 3. Transactieprijs Categories (with scoring)
  rows.push(
    createCategoryScoreRow(
      scores.transactieprijs.laag,
      'transactieprijs',
      'laag',
      geographicCode,
      geographicName,
      referenceHouses.length
    ),
    createCategoryScoreRow(
      scores.transactieprijs.midden,
      'transactieprijs',
      'midden',
      geographicCode,
      geographicName,
      referenceHouses.length
    ),
    createCategoryScoreRow(
      scores.transactieprijs.hoog,
      'transactieprijs',
      'hoog',
      geographicCode,
      geographicName,
      referenceHouses.length
    )
  );

  // === CALCULATED AVERAGES (display only, no scoring) ===

  rows.push(
    createAverageRow(
      'bouwjaar',
      'Bouwjaar',
      'Build Year',
      scores.averages.bouwjaar,
      '',
      geographicCode,
      geographicName
    ),
    createAverageRow(
      'woonoppervlakte',
      'Woonoppervlakte',
      'Inner Surface Area',
      scores.averages.woonoppervlakte,
      'm²',
      geographicCode,
      geographicName
    ),
    createAverageRow(
      'perceeloppervlakte',
      'Perceeloppervlakte',
      'Outer Surface Area',
      scores.averages.perceeloppervlakte,
      'm²',
      geographicCode,
      geographicName
    ),
    createAverageRow(
      'inhoud',
      'Inhoud',
      'Volume',
      scores.averages.inhoud,
      'm³',
      geographicCode,
      geographicName
    ),
    createAverageRow(
      'transactieprijs',
      'Transactieprijs',
      'Transaction Price',
      scores.averages.transactieprijs,
      ' €',
      geographicCode,
      geographicName
    ),
    createAverageRow(
      'geindexeerdeTransactieprijs',
      'Geïndexeerde Transactieprijs',
      'Indexed Transaction Price',
      scores.averages.geindexeerdeTransactieprijs,
      ' €',
      geographicCode,
      geographicName
    )
  );

  // === OPTIONAL: Keep original distribution data for reference ===
  // (This maintains backward compatibility if needed)

  // Field definitions with their display names
  const fields = [
    {
      key: 'HouseType',
      displayNameNl: 'Woningtype (distributie)',
      displayNameEn: 'House Type (distribution)',
    },
    {
      key: 'DefinitiveEnergyLabel',
      displayNameNl: 'Energielabel',
      displayNameEn: 'Energy Label',
    },
  ];

  // Process each field for distribution display
  fields.forEach((field) => {
    const distribution = getFieldDistribution(referenceHouses, field.key);

    // Create a row for each unique value
    Object.entries(distribution).forEach(([value, count]) => {
      rows.push({
        source: 'residential',
        geographicLevel: 'municipality',
        geographicCode,
        geographicName,
        key: `${field.key}_${value}`,
        title: `${field.displayNameNl} - ${value}`,
        titleNl: `${field.displayNameNl} - ${value}`,
        titleEn: `${field.displayNameEn} - ${value}`,
        value: count,
        absolute: count,
        relative: null,
        displayValue: count.toString(),
        displayAbsolute: count.toString(),
        displayRelative: '-',
        metadata: {
          count,
          total: referenceHouses.length,
          fieldName: field.key,
          fieldValue: value,
          isDistribution: true,
        },
      });
    });
  });

  return rows;
}
