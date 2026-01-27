/**
 * JSON Round-Trip Validation Utility
 *
 * Validates data integrity before save and after load from database.
 * Catches issues like:
 * - Date objects becoming strings
 * - undefined becoming null
 * - NaN/Infinity becoming null
 * - Circular references (throws error)
 * - Functions being dropped
 * - Symbol properties being dropped
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  type: 'critical' | 'data_loss';
}

export interface ValidationWarning {
  path: string;
  message: string;
  type: 'conversion' | 'precision';
}

/**
 * Validates that data can survive JSON serialization without critical data loss
 */
export function validateForJsonSerialization(
  data: unknown,
  path: string = 'root'
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  validateValue(data, path, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateValue(
  value: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (value === null || value === undefined) {
    // null and undefined are handled by JSON.stringify (undefined becomes null in arrays, omitted in objects)
    return;
  }

  const type = typeof value;

  if (type === 'function') {
    errors.push({
      path,
      message: 'Functions cannot be serialized to JSON',
      type: 'data_loss',
    });
    return;
  }

  if (type === 'symbol') {
    errors.push({
      path,
      message: 'Symbols cannot be serialized to JSON',
      type: 'data_loss',
    });
    return;
  }

  if (type === 'bigint') {
    errors.push({
      path,
      message: 'BigInt cannot be serialized to JSON (use string representation)',
      type: 'data_loss',
    });
    return;
  }

  if (type === 'number') {
    if (Number.isNaN(value)) {
      errors.push({
        path,
        message: 'NaN will become null in JSON',
        type: 'data_loss',
      });
    } else if (!Number.isFinite(value)) {
      errors.push({
        path,
        message: 'Infinity/-Infinity will become null in JSON',
        type: 'data_loss',
      });
    }
    return;
  }

  if (type === 'string' || type === 'boolean') {
    return; // These serialize correctly
  }

  if (value instanceof Date) {
    warnings.push({
      path,
      message: 'Date will become ISO string after JSON round-trip',
      type: 'conversion',
    });
    return;
  }

  if (value instanceof Map) {
    errors.push({
      path,
      message: 'Map will become empty object {} in JSON',
      type: 'data_loss',
    });
    return;
  }

  if (value instanceof Set) {
    errors.push({
      path,
      message: 'Set will become empty object {} in JSON',
      type: 'data_loss',
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateValue(item, `${path}[${index}]`, errors, warnings);
    });
    return;
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>;

    // Check for symbol keys (which are dropped)
    const symbolKeys = Object.getOwnPropertySymbols(obj);
    if (symbolKeys.length > 0) {
      warnings.push({
        path,
        message: `${symbolKeys.length} symbol key(s) will be dropped`,
        type: 'conversion',
      });
    }

    // Recursively validate object properties
    for (const key of Object.keys(obj)) {
      validateValue(obj[key], `${path}.${key}`, errors, warnings);
    }
  }
}

/**
 * Performs actual JSON round-trip and compares result
 * Returns detailed differences if any
 */
export function testJsonRoundTrip(data: unknown): {
  success: boolean;
  original: unknown;
  afterRoundTrip: unknown;
  differences: string[];
} {
  try {
    const serialized = JSON.stringify(data);
    const deserialized = JSON.parse(serialized);
    const differences = findDifferences(data, deserialized, 'root');

    return {
      success: differences.length === 0,
      original: data,
      afterRoundTrip: deserialized,
      differences,
    };
  } catch (error) {
    return {
      success: false,
      original: data,
      afterRoundTrip: null,
      differences: [`Serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

function findDifferences(
  original: unknown,
  afterRoundTrip: unknown,
  path: string
): string[] {
  const differences: string[] = [];

  if (original === afterRoundTrip) {
    return differences;
  }

  if (original === null || original === undefined) {
    if (afterRoundTrip !== null) {
      differences.push(`${path}: null/undefined became ${JSON.stringify(afterRoundTrip)}`);
    }
    return differences;
  }

  if (afterRoundTrip === null || afterRoundTrip === undefined) {
    differences.push(`${path}: ${typeof original} became null`);
    return differences;
  }

  const originalType = typeof original;
  const afterType = typeof afterRoundTrip;

  // Type changed
  if (originalType !== afterType) {
    // Date becomes string - expected
    if (original instanceof Date && afterType === 'string') {
      // This is expected behavior, don't report as difference
      return differences;
    }
    differences.push(`${path}: type changed from ${originalType} to ${afterType}`);
    return differences;
  }

  // Handle numbers specially (NaN, Infinity)
  if (originalType === 'number') {
    if (Number.isNaN(original as number) && afterRoundTrip === null) {
      differences.push(`${path}: NaN became null`);
    } else if (!Number.isFinite(original as number) && afterRoundTrip === null) {
      differences.push(`${path}: Infinity became null`);
    } else if (original !== afterRoundTrip) {
      differences.push(`${path}: number changed from ${original} to ${afterRoundTrip}`);
    }
    return differences;
  }

  // Handle strings
  if (originalType === 'string') {
    if (original !== afterRoundTrip) {
      differences.push(`${path}: string changed`);
    }
    return differences;
  }

  // Handle arrays
  if (Array.isArray(original)) {
    if (!Array.isArray(afterRoundTrip)) {
      differences.push(`${path}: array became ${afterType}`);
      return differences;
    }
    if (original.length !== afterRoundTrip.length) {
      differences.push(`${path}: array length changed from ${original.length} to ${afterRoundTrip.length}`);
    }
    const maxLen = Math.max(original.length, afterRoundTrip.length);
    for (let i = 0; i < maxLen; i++) {
      differences.push(...findDifferences(original[i], afterRoundTrip[i], `${path}[${i}]`));
    }
    return differences;
  }

  // Handle objects
  if (originalType === 'object') {
    const origObj = original as Record<string, unknown>;
    const afterObj = afterRoundTrip as Record<string, unknown>;

    const origKeys = new Set(Object.keys(origObj));
    const afterKeys = new Set(Object.keys(afterObj));

    // Find missing keys
    for (const key of origKeys) {
      if (!afterKeys.has(key)) {
        differences.push(`${path}.${key}: property was removed`);
      }
    }

    // Find added keys (shouldn't happen in round-trip)
    for (const key of afterKeys) {
      if (!origKeys.has(key)) {
        differences.push(`${path}.${key}: unexpected property was added`);
      }
    }

    // Compare common keys
    for (const key of origKeys) {
      if (afterKeys.has(key)) {
        differences.push(...findDifferences(origObj[key], afterObj[key], `${path}.${key}`));
      }
    }
  }

  return differences;
}

/**
 * Validate snapshot data before saving to database
 * Returns validation result with actionable information
 */
export function validateSnapshotData(snapshotData: {
  demographicsData?: unknown;
  healthData?: unknown;
  safetyData?: unknown;
  livabilityData?: unknown;
  amenitiesData?: unknown;
  housingData?: unknown;
  wmsGradingData?: unknown;
  pveData?: unknown;
  categoryScores?: unknown;
}): {
  isValid: boolean;
  fieldResults: Record<string, ValidationResult>;
  summary: string;
} {
  const fieldResults: Record<string, ValidationResult> = {};
  let totalErrors = 0;
  let totalWarnings = 0;

  const fields = [
    { name: 'demographicsData', data: snapshotData.demographicsData },
    { name: 'healthData', data: snapshotData.healthData },
    { name: 'safetyData', data: snapshotData.safetyData },
    { name: 'livabilityData', data: snapshotData.livabilityData },
    { name: 'amenitiesData', data: snapshotData.amenitiesData },
    { name: 'housingData', data: snapshotData.housingData },
    { name: 'wmsGradingData', data: snapshotData.wmsGradingData },
    { name: 'pveData', data: snapshotData.pveData },
    { name: 'categoryScores', data: snapshotData.categoryScores },
  ];

  for (const field of fields) {
    if (field.data !== undefined && field.data !== null) {
      const result = validateForJsonSerialization(field.data, field.name);
      fieldResults[field.name] = result;
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    }
  }

  return {
    isValid: totalErrors === 0,
    fieldResults,
    summary: totalErrors === 0
      ? totalWarnings > 0
        ? `Valid with ${totalWarnings} warning(s)`
        : 'All fields valid'
      : `Invalid: ${totalErrors} error(s), ${totalWarnings} warning(s)`,
  };
}

/**
 * Validate loaded snapshot data after retrieval from database
 * Checks that expected fields have valid structure
 */
export function validateLoadedSnapshot(loadedData: Record<string, unknown>): {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
  summary: string;
} {
  const expectedFields = [
    'demographics_data',
    'health_data',
    'safety_data',
    'livability_data',
    'amenities_data',
    'housing_data',
  ];

  const optionalFields = [
    'wms_grading_data',
    'pve_data',
    'category_scores',
  ];

  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  // Check required fields
  for (const field of expectedFields) {
    if (!(field in loadedData)) {
      missingFields.push(field);
    } else if (loadedData[field] !== null && typeof loadedData[field] !== 'object') {
      invalidFields.push(`${field} (expected object, got ${typeof loadedData[field]})`);
    }
  }

  // Check optional fields (only validate if present)
  for (const field of optionalFields) {
    if (field in loadedData && loadedData[field] !== null && typeof loadedData[field] !== 'object') {
      invalidFields.push(`${field} (expected object, got ${typeof loadedData[field]})`);
    }
  }

  const isValid = missingFields.length === 0 && invalidFields.length === 0;

  return {
    isValid,
    missingFields,
    invalidFields,
    summary: isValid
      ? 'Loaded snapshot data is valid'
      : `Issues: ${missingFields.length} missing, ${invalidFields.length} invalid`,
  };
}
