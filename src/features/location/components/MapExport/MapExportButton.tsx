'use client';

import React, { useState, useRef } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { Button } from '../../../../shared/components/UI';
import { LocationMap } from '../Maps/LocationMap';
import { MapStyle } from '../Maps/mapStyles';
import { WMS_CATEGORIES, WMSLayerConfig } from '../Maps/wmsLayers';
import { captureMapAsPNG, exportMapsAsZip, generateMapBookletPDF, MapCapture } from '../../utils/mapExport';

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
  const [showMapPreview, setShowMapPreview] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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
    setShowMapPreview(true);

    try {
      // Wait for React to render the hidden map container
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!mapContainerRef.current) {
        console.error('Map container not found after render');
        alert(locale === 'nl' ? 'Kon kaartcontainer niet vinden. Probeer opnieuw.' : 'Could not find map container. Please try again.');
        return;
      }

      const captures: MapCapture[] = [];

      // Capture each layer
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];

        // Update progress to trigger re-render with new map layer
        setExportProgress(i + 1);

        // Wait for map to render (give it time to load the WMS layer)
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Find the map container - try multiple selectors
        let mapElement = mapContainerRef.current?.querySelector('.leaflet-container') as HTMLElement;

        if (!mapElement) {
          // Fallback: try to get the div with the map
          mapElement = mapContainerRef.current as HTMLElement;
        }

        if (mapElement) {
          try {
            const capture = await captureMapAsPNG({
              mapElement,
              layerTitle: layer.config.title,
              quality: 0.9,
            });
            captures.push(capture);
          } catch (error) {
            console.error(`Failed to capture ${layer.config.title}:`, error);
          }
        } else {
          console.warn(`Map element not found for layer ${i + 1}`);
        }
      }

      // Export as ZIP
      if (captures.length > 0) {
        await exportMapsAsZip(captures, `kaarten-export-${new Date().toISOString().split('T')[0]}.zip`);
      } else {
        alert(locale === 'nl' ? 'Geen kaarten konden worden geëxporteerd.' : 'No maps could be exported.');
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert(locale === 'nl' ? 'Export mislukt. Probeer opnieuw.' : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setShowMapPreview(false);
      setExportProgress(0);
    }
  };

  /**
   * Generate PDF booklet with all maps
   */
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(allLayers.length);
    setShowMapPreview(true);

    try {
      // Wait for React to render the hidden map container
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!mapContainerRef.current) {
        console.error('Map container not found after render');
        alert(locale === 'nl' ? 'Kon kaartcontainer niet vinden. Probeer opnieuw.' : 'Could not find map container. Please try again.');
        return;
      }

      const captures: MapCapture[] = [];

      // Capture each layer
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];

        // Update progress to trigger re-render with new map layer
        setExportProgress(i + 1);

        // Wait for map to render (give it time to load the WMS layer)
        await new Promise(resolve => setTimeout(resolve, 4000));

        // Find the map container - try multiple selectors
        let mapElement = mapContainerRef.current?.querySelector('.leaflet-container') as HTMLElement;

        if (!mapElement) {
          // Fallback: try to get the div with the map
          mapElement = mapContainerRef.current as HTMLElement;
        }

        if (mapElement) {
          try {
            const capture = await captureMapAsPNG({
              mapElement,
              layerTitle: layer.config.title,
              quality: 0.9,
            });
            captures.push(capture);
          } catch (error) {
            console.error(`Failed to capture ${layer.config.title}:`, error);
          }
        } else {
          console.warn(`Map element not found for layer ${i + 1}`);
        }
      }

      // Generate PDF booklet
      if (captures.length > 0) {
        await generateMapBookletPDF(captures, {
          title: locale === 'nl' ? 'Kaarten Rapport' : 'Maps Report',
          filename: `kaarten-rapport-${new Date().toISOString().split('T')[0]}.pdf`,
          locale,
        });
      } else {
        alert(locale === 'nl' ? 'Geen kaarten konden worden geëxporteerd.' : 'No maps could be exported.');
      }

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(locale === 'nl' ? 'PDF generatie mislukt. Probeer opnieuw.' : 'PDF generation failed. Please try again.');
    } finally {
      setIsExporting(false);
      setShowMapPreview(false);
      setExportProgress(0);
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
            ? `Dit exporteert ${allLayers.length} kaartlagen op het standaard zoomniveau rond uw locatie.`
            : `This exports ${allLayers.length} map layers at the default zoom level around your location.`}
        </p>
        <p className="mt-1">
          {locale === 'nl'
            ? 'Let op: Dit kan enkele minuten duren. U zult de voortgang kunnen zien in een overlay.'
            : 'Note: This may take several minutes. You will see the progress in an overlay.'}
        </p>
      </div>

      {/* Map preview overlay during export */}
      {showMapPreview && exportProgress > 0 && exportProgress <= allLayers.length && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-4xl w-full mx-4">
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {locale === 'nl' ? 'Kaarten worden verwerkt...' : 'Processing maps...'}
              </h3>
              <p className="text-sm text-gray-600">
                {locale === 'nl'
                  ? `Kaart ${exportProgress} van ${exportTotal}: ${allLayers[exportProgress - 1].config.title}`
                  : `Map ${exportProgress} of ${exportTotal}: ${allLayers[exportProgress - 1].config.title}`}
              </p>
            </div>

            {/* Map container - visible during export */}
            <div
              ref={mapContainerRef}
              className="w-full h-[600px] rounded-lg overflow-hidden border-2 border-gray-200"
            >
              <LocationMap
                center={coordinates}
                zoom={allLayers[exportProgress - 1].config.recommendedZoom || 15}
                marker={coordinates}
                locationName={locationName}
                style={MapStyle.DATAVIZ.LIGHT}
                wmsLayer={allLayers[exportProgress - 1].config}
                wmsOpacity={0.7}
              />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(exportProgress / exportTotal) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {locale === 'nl'
                  ? 'Even geduld, dit kan enkele minuten duren...'
                  : 'Please wait, this may take several minutes...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
