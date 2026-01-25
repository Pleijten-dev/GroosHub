/**
 * PVE Stacked Bar Capture Utility
 *
 * Captures the rendered PVE stacked bar component as a PNG image
 * for use in PDF exports. This preserves the exact styling including
 * the noise-gradient SVG filters.
 */

import html2canvas from 'html2canvas';

/**
 * Capture options for the PVE bar
 */
export interface PVECaptureOptions {
  /** Scale factor for higher resolution (default: 2) */
  scale?: number;
  /** Background color (default: white) */
  backgroundColor?: string;
  /** Whether to include the labels below the bar (default: false, just the bar) */
  includeLabels?: boolean;
}

/**
 * Captures the PVE stacked bar element and returns a data URL
 *
 * @param element - The DOM element to capture (the bar container)
 * @param options - Capture options
 * @returns Promise resolving to base64 data URL of the captured image
 */
export async function capturePVEBar(
  element: HTMLElement,
  options: PVECaptureOptions = {}
): Promise<string> {
  const {
    scale = 2,
    backgroundColor = '#ffffff',
  } = options;

  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      // Ensure SVG filters are rendered
      foreignObjectRendering: false,
    });

    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Failed to capture PVE bar:', error);
    throw error;
  }
}

/**
 * Captures the PVE bar by ID selector
 *
 * @param elementId - The ID of the element to capture
 * @param options - Capture options
 * @returns Promise resolving to base64 data URL, or null if element not found
 */
export async function capturePVEBarById(
  elementId: string,
  options: PVECaptureOptions = {}
): Promise<string | null> {
  const element = document.getElementById(elementId);

  if (!element) {
    console.warn(`PVE bar element not found: ${elementId}`);
    return null;
  }

  return capturePVEBar(element, options);
}

/**
 * Global reference for the PVE bar element (set by the PVEQuestionnaire component)
 */
let pveBarElement: HTMLElement | null = null;

/**
 * Registers the PVE bar element for capture
 * Called by PVEQuestionnaire when mounting
 */
export function registerPVEBarElement(element: HTMLElement | null): void {
  pveBarElement = element;
}

/**
 * Captures the registered PVE bar element
 *
 * @param options - Capture options
 * @returns Promise resolving to base64 data URL, or null if not registered
 */
export async function captureRegisteredPVEBar(
  options: PVECaptureOptions = {}
): Promise<string | null> {
  if (!pveBarElement) {
    console.warn('No PVE bar element registered for capture');
    return null;
  }

  return capturePVEBar(pveBarElement, options);
}
