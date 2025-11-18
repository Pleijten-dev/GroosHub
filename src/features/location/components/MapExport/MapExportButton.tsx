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
    if (!mapContainerRef.current) {
      console.error('Map container not found');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(allLayers.length);
    setShowMapPreview(true);

    try {
      const captures: MapCapture[] = [];

      // Capture each layer
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];

        // Wait for map to render (give it time to load the WMS layer)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find the map container (it's rendered in the hidden div)
        const mapElement = mapContainerRef.current?.querySelector('.mapContainer') as HTMLElement;

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
        }

        setExportProgress(i + 1);
      }

      // Export as ZIP
      await exportMapsAsZip(captures, `kaarten-export-${new Date().toISOString().split('T')[0]}.zip`);

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
    if (!mapContainerRef.current) {
      console.error('Map container not found');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(allLayers.length);
    setShowMapPreview(true);

    try {
      const captures: MapCapture[] = [];

      // Capture each layer
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];

        // Wait for map to render
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mapElement = mapContainerRef.current?.querySelector('.mapContainer') as HTMLElement;

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
        }

        setExportProgress(i + 1);
      }

      // Generate PDF booklet
      await generateMapBookletPDF(captures, {
        title: locale === 'nl' ? 'Kaarten Rapport' : 'Maps Report',
        filename: `kaarten-rapport-${new Date().toISOString().split('T')[0]}.pdf`,
        locale,
      });

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
            ? 'Let op: Dit kan enkele minuten duren.'
            : 'Note: This may take several minutes.'}
        </p>
      </div>

      {/* Progress Indicator */}
      {isExporting && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(exportProgress / exportTotal) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 text-center">
            {locale === 'nl'
              ? `Kaart ${exportProgress} van ${exportTotal} wordt verwerkt...`
              : `Processing map ${exportProgress} of ${exportTotal}...`}
          </p>
        </div>
      )}

      {/* Hidden map container for rendering */}
      {showMapPreview && (
        <div
          ref={mapContainerRef}
          className="fixed top-0 left-0 w-[800px] h-[800px] opacity-0 pointer-events-none z-[-1]"
        >
          {allLayers.map((layer, index) => (
            index === exportProgress - 1 && (
              <div key={`${layer.category}-${layer.id}`} className="w-full h-full">
                <LocationMap
                  center={coordinates}
                  zoom={layer.config.recommendedZoom || 15}
                  marker={coordinates}
                  locationName={locationName}
                  style={MapStyle.DATAVIZ.LIGHT}
                  wmsLayer={layer.config}
                  wmsOpacity={0.7}
                />
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};
