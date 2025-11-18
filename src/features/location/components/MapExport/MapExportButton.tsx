'use client';

import React, { useState } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { Button } from '../../../../shared/components/UI';
import { WMS_CATEGORIES, WMSLayerConfig } from '../Maps/wmsLayers';
import { downloadWMSTile, exportMapsAsZip, generateMapBookletPDF, MapCapture } from '../../utils/mapExport';

interface MapExportButtonProps {
  /** Current locale */
  locale: Locale;
  /** Location coordinates [lat, lng] */
  coordinates: [number, number];
  /** Location name for the marker */
  locationName?: string;
}

export const MapExportButton: React.FC<MapExportButtonProps> = ({
  locale,
  coordinates,
  locationName,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [currentLayerTitle, setCurrentLayerTitle] = useState<string>('');

  // Get all available WMS layers
  const allLayers = React.useMemo(() => {
    const layers: Array<{ category: string; id: string; config: WMSLayerConfig }> = [];

    Object.entries(WMS_CATEGORIES).forEach(([categoryId, category]) => {
      Object.entries(category.layers).forEach(([layerId, config]) => {
        layers.push({
          category: categoryId,
          id: layerId,
          config,
        });
      });
    });

    return layers;
  }, []);

  /**
   * Export all maps as PNG files in a ZIP
   */
  const handleExportZip = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(allLayers.length);

    try {
      const captures: MapCapture[] = [];

      // Download each layer directly from WMS
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];

        setCurrentLayerTitle(layer.config.title);
        setExportProgress(i + 1);

        try {
          const capture = await downloadWMSTile({
            url: layer.config.url,
            layers: layer.config.layers,
            layerTitle: layer.config.title,
            center: coordinates,
            zoom: layer.config.recommendedZoom || 15,
            width: 1200,
            height: 1200,
          });
          captures.push(capture);
        } catch (error) {
          console.error(`Failed to download ${layer.config.title}:`, error);
          // Continue with other layers even if one fails
        }
      }

      // Export as ZIP
      if (captures.length > 0) {
        await exportMapsAsZip(captures, `kaarten-export-${new Date().toISOString().split('T')[0]}.zip`);
      } else {
        alert(locale === 'nl' ? 'Geen kaarten konden worden gedownload.' : 'No maps could be downloaded.');
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert(locale === 'nl' ? 'Export mislukt. Probeer opnieuw.' : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentLayerTitle('');
    }
  };

  /**
   * Generate PDF booklet with all maps
   */
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(allLayers.length * 2); // Double because we download both aerial + WMS

    try {
      const captures: MapCapture[] = [];
      const aerialPhotos: MapCapture[] = [];

      // Aerial photo WMS configuration
      const aerialPhotoWMS = {
        url: 'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0',
        layers: 'Actueel_orthoHR', // High resolution aerial photos
      };

      // Download each layer + aerial photo directly from WMS
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];

        // Download aerial photo for this zoom level
        setCurrentLayerTitle(`${locale === 'nl' ? 'Luchtfoto voor' : 'Aerial photo for'} ${layer.config.title}`);
        setExportProgress(i * 2 + 1);

        try {
          const aerialPhoto = await downloadWMSTile({
            url: aerialPhotoWMS.url,
            layers: aerialPhotoWMS.layers,
            layerTitle: `Luchtfoto - ${layer.config.title}`,
            center: coordinates,
            zoom: layer.config.recommendedZoom || 15,
            width: 1200,
            height: 1200,
          });
          aerialPhotos.push(aerialPhoto);
        } catch (error) {
          console.error(`Failed to download aerial photo for ${layer.config.title}:`, error);
          // Push empty to maintain array alignment
          aerialPhotos.push(null as any);
        }

        // Download WMS layer
        setCurrentLayerTitle(layer.config.title);
        setExportProgress(i * 2 + 2);

        try {
          const capture = await downloadWMSTile({
            url: layer.config.url,
            layers: layer.config.layers,
            layerTitle: layer.config.title,
            center: coordinates,
            zoom: layer.config.recommendedZoom || 15,
            width: 1200,
            height: 1200,
          });
          captures.push(capture);
        } catch (error) {
          console.error(`Failed to download ${layer.config.title}:`, error);
          // Continue with other layers even if one fails
        }
      }

      // Generate PDF booklet with aerial photos as background
      if (captures.length > 0) {
        await generateMapBookletPDF(captures, {
          title: locale === 'nl' ? 'Kaarten Rapport' : 'Maps Report',
          filename: `kaarten-rapport-${new Date().toISOString().split('T')[0]}.pdf`,
          locale,
          aerialPhotos: aerialPhotos, // Keep array aligned - null values are handled in PDF generation
        });
      } else {
        alert(locale === 'nl' ? 'Geen kaarten konden worden gedownload.' : 'No maps could be downloaded.');
      }

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(locale === 'nl' ? 'PDF generatie mislukt. Probeer opnieuw.' : 'PDF generation failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentLayerTitle('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex flex-col gap-3">
        <Button
          onClick={handleExportZip}
          variant="primary"
          disabled={isExporting}
          className="w-full"
        >
          {isExporting && exportProgress > 0
            ? `${locale === 'nl' ? 'Exporteren' : 'Exporting'}... ${exportProgress}/${exportTotal}`
            : locale === 'nl'
            ? '📦 Download ZIP met alle kaarten'
            : '📦 Download ZIP with all maps'}
        </Button>

        <Button
          onClick={handleExportPDF}
          variant="primary"
          disabled={isExporting}
          className="w-full"
        >
          {isExporting && exportProgress > 0
            ? `${locale === 'nl' ? 'Genereren' : 'Generating'}... ${exportProgress}/${exportTotal}`
            : locale === 'nl'
            ? '📄 Genereer A4 PDF Boekje'
            : '📄 Generate A4 PDF Booklet'}
        </Button>
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-600">
        <p>
          {locale === 'nl'
            ? `ZIP: Download ${allLayers.length} kaartlagen direct van WMS servers.`
            : `ZIP: Downloads ${allLayers.length} map layers directly from WMS servers.`}
        </p>
        <p className="mt-1">
          {locale === 'nl'
            ? `PDF: Download ${allLayers.length} kaartlagen + luchtfoto's als achtergrond (80% transparantie).`
            : `PDF: Downloads ${allLayers.length} map layers + aerial photos as background (80% transparency).`}
        </p>
        <p className="mt-1">
          {locale === 'nl'
            ? 'Let op: Dit kan enkele minuten duren afhankelijk van uw internetverbinding.'
            : 'Note: This may take several minutes depending on your internet connection.'}
        </p>
      </div>

      {/* Progress Indicator */}
      {isExporting && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {locale === 'nl' ? 'Bezig met downloaden...' : 'Downloading...'}
            </span>
            <span className="text-sm text-blue-700">
              {exportProgress} / {exportTotal}
            </span>
          </div>

          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(exportProgress / exportTotal) * 100}%` }}
            />
          </div>

          {currentLayerTitle && (
            <p className="text-xs text-blue-700 truncate">
              {currentLayerTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
