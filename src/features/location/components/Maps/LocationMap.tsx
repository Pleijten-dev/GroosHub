"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationMap.module.css';
import { TileLayerConfig, DEFAULT_MAP_STYLE } from './mapStyles';

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
}

/**
 * LocationMap Component
 * A responsive Leaflet map component that fills its container
 */
export const LocationMap: React.FC<LocationMapProps> = ({
  center = [52.0907, 5.1214], // Default: Center of Netherlands (Utrecht)
  zoom = 8,
  marker,
  locationName,
  style = DEFAULT_MAP_STYLE, // Default to DATAVIZ.LIGHT
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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
      const newMarker = L.marker(marker).addTo(mapRef.current);

      if (locationName) {
        newMarker.bindPopup(locationName).openPopup();
      }

      markerRef.current = newMarker;
    }
  }, [marker, locationName]);

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
    </div>
  );
};
