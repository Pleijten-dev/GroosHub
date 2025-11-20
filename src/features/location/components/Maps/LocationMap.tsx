"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMap.module.css';
import { TileLayerConfig, DEFAULT_MAP_STYLE } from './mapStyles';
import { WMSLayerConfig } from './wmsLayers';
import { WMSFeatureInfo } from './WMSLayerControl';
import type { AmenityMultiCategoryResponse, PlaceResult } from '../../data/sources/google-places/types';

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
  onZoomChange?: (zoom: number) => void;
  amenities?: AmenityMultiCategoryResponse | null;
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
  onZoomChange,
  amenities = null,
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);
  const amenityMarkersRef = useRef<L.Marker[]>([]);
  const distanceCirclesRef = useRef<L.Circle[]>([]);

  // Accent green color from design system
  const ACCENT_GREEN = '#477638';

  // Helper function to create green circle markers for amenities
  const createAmenityIcon = useCallback(() => {
    return L.divIcon({
      html: `
        <div style="
          width: 16px;
          height: 16px;
          background-color: ${ACCENT_GREEN};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        "></div>
      `,
      className: 'custom-amenity-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }, []);

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

  // Track zoom changes from user interaction
  useEffect(() => {
    if (!mapRef.current || !onZoomChange) return;

    const handleZoomEnd = () => {
      if (mapRef.current && onZoomChange) {
        const currentZoom = mapRef.current.getZoom();
        onZoomChange(currentZoom);
      }
    };

    mapRef.current.on('zoomend', handleZoomEnd);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('zoomend', handleZoomEnd);
      }
    };
  }, [onZoomChange]);

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
      // Create custom white square icon
      const squareIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 12px; height: 12px;">
            <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
              <!-- White square with black border for visibility -->
              <rect x="1" y="1" width="10" height="10" fill="white" stroke="black" stroke-width="1"/>
            </svg>
          </div>
        `,
        className: 'custom-square-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6], // Center of the square
        popupAnchor: [0, -6],
      });

      const newMarker = L.marker(marker, { icon: squareIcon }).addTo(mapRef.current);

      if (locationName) {
        newMarker.bindPopup(locationName).openPopup();
      }

      markerRef.current = newMarker;
    }
  }, [marker, locationName]);

  // Handle WMS layer changes and amenity markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing WMS layer
    if (wmsLayerRef.current) {
      wmsLayerRef.current.remove();
      wmsLayerRef.current = null;
    }

    // Remove existing amenity markers
    amenityMarkersRef.current.forEach((marker) => marker.remove());
    amenityMarkersRef.current = [];

    // Remove existing distance circles
    distanceCirclesRef.current.forEach((circle) => circle.remove());
    distanceCirclesRef.current = [];

    // Check if this is an amenity layer or a WMS layer
    if (wmsLayer) {
      const isAmenityLayer = wmsLayer.url.startsWith('amenity://');

      if (isAmenityLayer && wmsLayer.amenityCategoryId && amenities) {
        // Handle amenity marker layer
        const categoryId = wmsLayer.amenityCategoryId;
        const categoryData = amenities.results.find((r) => r.category.id === categoryId);

        if (categoryData && categoryData.places.length > 0) {
          const amenityIcon = createAmenityIcon();

          // Add distance reference circles for amenity layers only
          if (marker) {
            const distances = [250, 500, 1000, 2000]; // in meters
            const circles = distances.map((distance) => {
              return L.circle(marker, {
                radius: distance,
                color: ACCENT_GREEN,
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 1.5,
                opacity: 0.4,
                dashArray: '5, 10',
              }).addTo(mapRef.current!);
            });

            distanceCirclesRef.current = circles;
          }

          // Create markers for each amenity
          const newMarkers = categoryData.places.map((place: PlaceResult) => {
            const amenityMarker = L.marker([place.location.lat, place.location.lng], {
              icon: amenityIcon,
            }).addTo(mapRef.current!);

            // Create popup card with amenity information
            const displayName = place.displayName?.text || place.name;
            const distance = place.distanceKm !== undefined
              ? place.distanceKm < 1
                ? `${Math.round(place.distanceKm * 1000)}m`
                : `${place.distanceKm.toFixed(1)}km`
              : '';

            const popupContent = `
              <div style="
                min-width: 240px;
                max-width: 280px;
                padding: 12px;
                font-family: system-ui, -apple-system, sans-serif;
              ">
                <h3 style="
                  margin: 0 0 8px 0;
                  font-size: 15px;
                  font-weight: 600;
                  color: #1a1a1a;
                  line-height: 1.3;
                ">${displayName}</h3>

                ${place.formattedAddress ? `
                  <p style="
                    margin: 0 0 8px 0;
                    font-size: 13px;
                    color: #666;
                    line-height: 1.4;
                  ">${place.formattedAddress}</p>
                ` : ''}

                <div style="
                  display: flex;
                  gap: 12px;
                  flex-wrap: wrap;
                  margin-top: 8px;
                  padding-top: 8px;
                  border-top: 1px solid #e5e7eb;
                ">
                  ${place.rating ? `
                    <div style="
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      font-size: 13px;
                      color: #374151;
                    ">
                      <span style="color: #f59e0b;">★</span>
                      <span style="font-weight: 500;">${place.rating.toFixed(1)}</span>
                      ${place.userRatingsTotal ? `
                        <span style="color: #9ca3af; font-size: 12px;">(${place.userRatingsTotal})</span>
                      ` : ''}
                    </div>
                  ` : ''}

                  ${distance ? `
                    <div style="
                      font-size: 13px;
                      color: #477638;
                      font-weight: 500;
                    ">${distance} afstand</div>
                  ` : ''}
                </div>
              </div>
            `;

            amenityMarker.bindPopup(popupContent, {
              maxWidth: 300,
              closeButton: true,
              autoClose: true,
              autoPan: true,
            });

            return amenityMarker;
          });

          amenityMarkersRef.current = newMarkers;
        }
      } else {
        // Handle regular WMS layer
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
    }
  }, [wmsLayer, wmsOpacity, amenities, createAmenityIcon, marker]);

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
  // Note: Don't add click handler for amenity layers - they use marker popups instead
  useEffect(() => {
    if (!mapRef.current) return;

    const isAmenityLayer = wmsLayer?.url.startsWith('amenity://');
    if (wmsLayer && onFeatureClick && !isAmenityLayer) {
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
