/**
 * Location Agent Tools - Index
 *
 * Exports all location analysis tools for the AI agent
 */

export { listUserSavedLocations } from './listUserSavedLocations';
export { getLocationData } from './getLocationData';
export { getPersonaInfo } from './getPersonaInfo';

// Re-export for convenience
export const locationTools = {
  listUserSavedLocations: 'listUserSavedLocations',
  getLocationData: 'getLocationData',
  getPersonaInfo: 'getPersonaInfo',
} as const;

export type LocationToolName = keyof typeof locationTools;
