/**
 * Data Key Normalizers
 *
 * Transforms raw CBS StatLine API keys to human-readable format
 */

export {
  demographicsKeyMap,
  normalizeDemographicsKeys,
  getReadableKey as getDemographicsReadableKey,
  isKnownKey as isDemographicsKnownKey,
} from './demographicsKeyNormalizer';

export {
  healthKeyMap,
  normalizeHealthKeys,
  getReadableKey as getHealthReadableKey,
  isKnownKey as isHealthKnownKey,
} from './healthKeyNormalizer';

export {
  livabilityKeyMap,
  normalizeLivabilityKeys,
  getReadableKey as getLivabilityReadableKey,
  isKnownKey as isLivabilityKnownKey,
} from './livabilityKeyNormalizer';

export {
  crimeTypeMap,
  normalizeSafetyKey,
  normalizeSafetyKeys,
  getCrimeType,
  isKnownCrimeCode,
  getAllCrimeTypes,
} from './safetyKeyNormalizer';
