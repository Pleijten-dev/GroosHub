/**
 * Map Export Utilities
 * Provides functionality to capture map tiles as PNG images
 */

import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import jsPDF from 'jspdf';

export interface MapExportOptions {
  /** Map container element */
  mapElement: HTMLElement;
  /** Layer title/name */
  layerTitle: string;
  /** Image quality (0-1) */
  quality?: number;
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
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
 * Capture a map element as PNG using html2canvas
 * This works around CORS restrictions by capturing the rendered DOM
 */
export async function captureMapAsPNG(options: MapExportOptions): Promise<MapCapture> {
  const {
    mapElement,
    layerTitle,
    quality = 0.95,
    width,
    height,
  } = options;

  // Use html2canvas to capture the rendered map
  const canvas = await html2canvas(mapElement, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#f0f0f0',
    scale: 2, // Higher resolution
    logging: false,
    width: width,
    height: height,
  });

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/png',
      quality
    );
  });

  return {
    title: layerTitle,
    dataUrl: canvas.toDataURL('image/png', quality),
    blob,
    width: canvas.width,
    height: canvas.height,
  };
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
 */
export async function generateMapBookletPDF(
  captures: MapCapture[],
  options: {
    title?: string;
    filename?: string;
    locale?: 'nl' | 'en';
  } = {}
): Promise<void> {
  const {
    title = 'Kaarten Rapport',
    filename = 'kaarten-rapport.pdf',
    locale = 'nl',
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

    // Add new page (except for first iteration after title page)
    pdf.addPage();

    // Calculate square image size (max width with margins)
    const availableWidth = pageWidth - 2 * margin;
    const imageSize = availableWidth;

    // Add map title
    pdf.setFontSize(16);
    pdf.text(capture.title, pageWidth / 2, margin + 10, { align: 'center' });

    // Add map image (square, centered)
    const imageY = margin + 20;
    try {
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
