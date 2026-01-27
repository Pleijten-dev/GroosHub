/**
 * Scoring Algorithm Version Tracking
 *
 * This module tracks the version of scoring algorithms used in the application.
 * When scoring logic changes, update the version number and add to the changelog.
 *
 * Versioning follows semantic versioning:
 * - MAJOR: Breaking changes that require re-scoring all saved data
 * - MINOR: New scoring features that don't affect existing calculations
 * - PATCH: Bug fixes in scoring calculations
 */

/**
 * Current version of the scoring algorithm
 * Update this when scoring logic changes
 */
export const CURRENT_SCORING_VERSION = '1.1.0';

/**
 * Minimum compatible version for loading without re-scoring warning
 * Snapshots with versions below this should show a warning
 */
export const MIN_COMPATIBLE_VERSION = '1.0.0';

/**
 * Version changelog for tracking scoring changes
 */
export const SCORING_VERSION_CHANGELOG: Record<string, {
  date: string;
  changes: string[];
  breakingChanges: boolean;
}> = {
  '1.0.0': {
    date: '2024-01-01',
    changes: [
      'Initial scoring algorithm',
      'Basic comparison scoring: comparisonType, baseValue, margin, direction',
      'Score range: -1 to +1',
    ],
    breakingChanges: false,
  },
  '1.1.0': {
    date: '2025-01-21',
    changes: [
      'Added pre-computed scores for amenities',
      'Fixed Omgeving category score calculation',
      'Added JSON round-trip validation',
      'Added scoring version tracking',
      'Fixed PDF export score formulas',
    ],
    breakingChanges: false,
  },
};

/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }

  return 0;
}

/**
 * Check if a snapshot version is compatible with current scoring
 */
export function isVersionCompatible(snapshotVersion: string | null | undefined): {
  compatible: boolean;
  message: string;
  requiresRescore: boolean;
} {
  if (!snapshotVersion) {
    return {
      compatible: true,
      message: 'No version recorded (pre-versioning snapshot)',
      requiresRescore: false,
    };
  }

  const comparison = compareVersions(snapshotVersion, MIN_COMPATIBLE_VERSION);

  if (comparison < 0) {
    return {
      compatible: false,
      message: `Snapshot version ${snapshotVersion} is below minimum compatible version ${MIN_COMPATIBLE_VERSION}`,
      requiresRescore: true,
    };
  }

  if (snapshotVersion === CURRENT_SCORING_VERSION) {
    return {
      compatible: true,
      message: 'Snapshot uses current scoring version',
      requiresRescore: false,
    };
  }

  const currentComparison = compareVersions(snapshotVersion, CURRENT_SCORING_VERSION);

  if (currentComparison < 0) {
    return {
      compatible: true,
      message: `Snapshot version ${snapshotVersion} is older than current ${CURRENT_SCORING_VERSION} but compatible`,
      requiresRescore: false,
    };
  }

  return {
    compatible: true,
    message: `Snapshot version ${snapshotVersion} is newer than current ${CURRENT_SCORING_VERSION}`,
    requiresRescore: false,
  };
}

/**
 * Get changes between two versions
 */
export function getChangesBetweenVersions(
  fromVersion: string,
  toVersion: string
): string[] {
  const changes: string[] = [];
  const versions = Object.keys(SCORING_VERSION_CHANGELOG).sort(compareVersions);

  for (const version of versions) {
    if (compareVersions(version, fromVersion) > 0 && compareVersions(version, toVersion) <= 0) {
      const changelog = SCORING_VERSION_CHANGELOG[version];
      changes.push(`v${version} (${changelog.date}):`);
      changelog.changes.forEach(change => changes.push(`  - ${change}`));
    }
  }

  return changes;
}

/**
 * Scoring metadata to include with snapshots
 */
export interface ScoringMetadata {
  scoringAlgorithmVersion: string;
  scoredAt: string; // ISO timestamp
  scoringFeatures: {
    precomputedAmenityScores: boolean;
    dynamicOmgevingScores: boolean;
    jsonValidation: boolean;
  };
}

/**
 * Create scoring metadata for a new snapshot
 */
export function createScoringMetadata(): ScoringMetadata {
  return {
    scoringAlgorithmVersion: CURRENT_SCORING_VERSION,
    scoredAt: new Date().toISOString(),
    scoringFeatures: {
      precomputedAmenityScores: true,
      dynamicOmgevingScores: true,
      jsonValidation: true,
    },
  };
}
