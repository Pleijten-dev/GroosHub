/**
 * Map Export Utilities
 * Provides functionality to download WMS map tiles directly
 */

import JSZip from 'jszip';
import jsPDF from 'jspdf';

export interface WMSDownloadOptions {
  /** WMS service URL */
  url: string;
  /** WMS layer names */
  layers: string;
  /** Layer title */
  layerTitle: string;
  /** Center coordinates [lat, lng] */
  center: [number, number];
  /** Zoom level */
  zoom: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

export interface MapCapture {
  /** Layer title */
  title: string;
  /** Base64 encoded PNG data */
  dataUrl: string;
  /** Blob of the image */
  blob: Blob;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
}

/**
 * Calculate bounding box for a given center point and zoom level
 */
function calculateBBox(center: [number, number], zoom: number, width: number, height: number): string {
  const lat = center[0];
  const lng = center[1];

  // Approximate meters per pixel at given zoom level
  const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);

  // Calculate bbox dimensions in degrees
  const widthInMeters = width * metersPerPixel;
  const heightInMeters = height * metersPerPixel;

  // Rough conversion: 1 degree ≈ 111,320 meters
  const latDelta = heightInMeters / 111320 / 2;
  const lngDelta = widthInMeters / (111320 * Math.cos(lat * Math.PI / 180)) / 2;

  const south = lat - latDelta;
  const north = lat + latDelta;
  const west = lng - lngDelta;
  const east = lng + lngDelta;

  // WMS 1.3.0 uses lat,lng order for EPSG:4326
  return `${south},${west},${north},${east}`;
}

/**
 * Download a WMS map tile directly as PNG
 */
export async function downloadWMSTile(options: WMSDownloadOptions): Promise<MapCapture> {
  const {
    url,
    layers,
    layerTitle,
    center,
    zoom,
    width = 800,
    height = 800,
  } = options;

  // Calculate bounding box
  const bbox = calculateBBox(center, zoom, width, height);

  // Construct WMS GetMap request
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layers,
    styles: '',
    crs: 'EPSG:4326',
    bbox: bbox,
    width: width.toString(),
    height: height.toString(),
    format: 'image/png',
    transparent: 'true',
  });

  const requestUrl = `${url}?${params.toString()}`;

  try {
    // Fetch the WMS tile
    const response = await fetch(requestUrl, {
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`WMS request failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    // Convert blob to base64 data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return {
      title: layerTitle,
      dataUrl,
      blob,
      width,
      height,
    };
  } catch (error) {
    console.error(`Failed to download WMS tile for ${layerTitle}:`, error);
    throw error;
  }
}

/**
 * Export multiple map captures as a ZIP file
 */
export async function exportMapsAsZip(
  captures: MapCapture[],
  filename: string = 'maps-export.zip'
): Promise<void> {
  const zip = new JSZip();

  // Add each map image to the zip
  for (const capture of captures) {
    const sanitizedTitle = capture.title
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    zip.file(`${sanitizedTitle}.png`, capture.blob);
  }

  // Generate ZIP file
  const content = await zip.generateAsync({ type: 'blob' });

  // Download the ZIP
  downloadBlob(content, filename);
}

/**
 * Generate A4 portrait PDF booklet with map images and text fields
 * Each page has an aerial photo background with the WMS layer overlay at 80% opacity
 */
export async function generateMapBookletPDF(
  captures: MapCapture[],
  options: {
    title?: string;
    filename?: string;
    locale?: 'nl' | 'en';
    aerialPhotos?: (MapCapture | null)[];
  } = {}
): Promise<void> {
  const {
    title = 'Kaarten Rapport',
    filename = 'kaarten-rapport.pdf',
    locale = 'nl',
    aerialPhotos = [],
  } = options;

  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add title page
  pdf.setFontSize(24);
  pdf.text(title, pageWidth / 2, 40, { align: 'center' });

  pdf.setFontSize(12);
  const dateStr = new Date().toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US');
  pdf.text(
    locale === 'nl' ? `Gegenereerd op: ${dateStr}` : `Generated on: ${dateStr}`,
    pageWidth / 2,
    60,
    { align: 'center' }
  );

  // Add each map to a new page
  for (let i = 0; i < captures.length; i++) {
    const capture = captures[i];
    const aerialPhoto = aerialPhotos[i];

    // Add new page (except for first iteration after title page)
    pdf.addPage();

    // Calculate square image size (max width with margins)
    const availableWidth = pageWidth - 2 * margin;
    const imageSize = availableWidth;

    // Add map title
    pdf.setFontSize(16);
    pdf.text(capture.title, pageWidth / 2, margin + 10, { align: 'center' });

    const imageY = margin + 20;

    try {
      // Add aerial photo as background (if available)
      if (aerialPhoto) {
        pdf.addImage(
          aerialPhoto.dataUrl,
          'PNG',
          margin,
          imageY,
          imageSize,
          imageSize,
          undefined,
          'FAST'
        );
      }

      // Add WMS layer on top with 80% opacity
      pdf.setGState({ opacity: 0.8 });
      pdf.addImage(
        capture.dataUrl,
        'PNG',
        margin,
        imageY,
        imageSize,
        imageSize,
        undefined,
        'FAST'
      );
      // Reset opacity for other elements
      pdf.setGState({ opacity: 1.0 });
    } catch (error) {
      console.error(`Failed to add image for ${capture.title}:`, error);
      pdf.setFontSize(10);
      pdf.text(
        locale === 'nl' ? 'Fout bij laden afbeelding' : 'Error loading image',
        pageWidth / 2,
        imageY + imageSize / 2,
        { align: 'center' }
      );
    }

    // Add text field below the image
    const textFieldY = imageY + imageSize + 10;
    const textFieldHeight = pageHeight - textFieldY - margin;

    // Draw text field border
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(margin, textFieldY, availableWidth, textFieldHeight);

    // Add placeholder text
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      locale === 'nl' ? 'Notities...' : 'Notes...',
      margin + 5,
      textFieldY + 7
    );
    pdf.setTextColor(0, 0, 0);

    // Add page number
    pdf.setFontSize(8);
    pdf.text(
      `${i + 1} / ${captures.length}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  pdf.save(filename);
}

/**
 * Helper function to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
