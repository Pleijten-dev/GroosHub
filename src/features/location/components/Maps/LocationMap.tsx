"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMap.module.css';
import { TileLayerConfig, DEFAULT_MAP_STYLE } from './mapStyles';
import { WMSLayerConfig } from './wmsLayers';
import { WMSFeatureInfo } from './WMSLayerControl';

// Fix for default marker icons in Leaflet with Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationMapProps {
  center?: [number, number];
  zoom?: number;
  marker?: [number, number];
  locationName?: string;
  style?: TileLayerConfig;
  wmsLayer?: WMSLayerConfig | null;
  wmsOpacity?: number;
  onFeatureClick?: (info: WMSFeatureInfo) => void;
  children?: React.ReactNode;
}

/**
 * LocationMap Component
 * A responsive Leaflet map component that fills its container
 * Supports WMS layers, opacity control, and GetFeatureInfo queries
 */
export const LocationMap: React.FC<LocationMapProps> = ({
  center = [51.920198, 4.474601], // Default: Rotterdam
  zoom = 8,
  marker,
  locationName,
  style = DEFAULT_MAP_STYLE, // Default to DATAVIZ.LIGHT
  wmsLayer = null,
  wmsOpacity = 0.7,
  onFeatureClick,
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);

  useEffect(() => {
    // Only initialize the map once
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize the map
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add tile layer using the provided style
    L.tileLayer(style.url, {
      attribution: style.attribution,
      maxZoom: style.maxZoom || 19,
      minZoom: style.minZoom,
    }).addTo(map);

    mapRef.current = map;

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update map view when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Update marker when marker position changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if position is provided
    if (marker) {
      // Create custom black arrow icon
      const arrowIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 40px; height: 40px;">
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 35 L10 15 L20 18 L30 15 Z" fill="black" stroke="white" stroke-width="2"/>
            </svg>
          </div>
        `,
        className: 'custom-arrow-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 35], // Point of the arrow
        popupAnchor: [0, -35],
      });

      const newMarker = L.marker(marker, { icon: arrowIcon }).addTo(mapRef.current);

      if (locationName) {
        newMarker.bindPopup(locationName).openPopup();
      }

      markerRef.current = newMarker;
    }
  }, [marker, locationName]);

  // Handle WMS layer changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing WMS layer
    if (wmsLayerRef.current) {
      wmsLayerRef.current.remove();
      wmsLayerRef.current = null;
    }

    // Add new WMS layer if provided
    if (wmsLayer) {
      const wms = L.tileLayer.wms(wmsLayer.url, {
        layers: wmsLayer.layers,
        format: 'image/png',
        transparent: true,
        attribution: wmsLayer.attribution || '',
        minZoom: wmsLayer.minZoom,
        maxZoom: wmsLayer.maxZoom,
        opacity: wmsOpacity,
        // Request tiles in EPSG:4326 (WGS84) instead of EPSG:28992 (RD)
        // This ensures proper coordinate transformation from Dutch RD to WGS84
        crs: L.CRS.EPSG4326,
      });

      wms.addTo(mapRef.current);
      wmsLayerRef.current = wms;
    }
  }, [wmsLayer, wmsOpacity]);

  // Handle GetFeatureInfo click
  const handleMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      if (!mapRef.current || !wmsLayerRef.current || !onFeatureClick || !wmsLayer) return;

      const map = mapRef.current;
      const point = map.latLngToContainerPoint(e.latlng);
      const size = map.getSize();
      const bounds = map.getBounds();

      // Construct GetFeatureInfo URL
      // Use CRS instead of SRS for WMS 1.3.0, and request in EPSG:4326 (WGS84)
      const params = {
        request: 'GetFeatureInfo',
        service: 'WMS',
        crs: 'EPSG:4326',
        version: '1.3.0',
        format: 'image/png',
        bbox: `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`,
        height: size.y.toString(),
        width: size.x.toString(),
        layers: wmsLayer.layers,
        query_layers: wmsLayer.layers,
        info_format: 'application/json',
        i: Math.floor(point.x).toString(),
        j: Math.floor(point.y).toString(),
      };

      const url = `${wmsLayer.url}?${new URLSearchParams(params).toString()}`;

      // Fetch feature info
      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            onFeatureClick({
              layerName: wmsLayer.layers,
              properties: feature.properties || {},
              coordinates: [e.latlng.lat, e.latlng.lng],
            });
          }
        })
        .catch((error) => {
          console.error('Error fetching feature info:', error);
        });
    },
    [wmsLayer, onFeatureClick]
  );

  // Add/remove click handler based on whether we have a WMS layer and callback
  useEffect(() => {
    if (!mapRef.current) return;

    if (wmsLayer && onFeatureClick) {
      mapRef.current.on('click', handleMapClick);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [wmsLayer, onFeatureClick, handleMapClick]);

  // Handle window resize to invalidate map size
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Initial size check after a short delay to ensure proper rendering
    const timeoutId = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapContainerRef} className={styles.mapContainer} />
      {children}
    </div>
  );
};
