"use client";

import proj4 from "proj4";
import { point, booleanPointInPolygon } from "@turf/turf";
import type {
  Feature as GeoJSONFeature,
  MultiPolygon,
  Polygon,
} from "geojson";

/**
 * PDOK feature properties interface
 */
interface PDOKFeatureProps {
  statcode: string;
  statnaam: string;
}

/**
 * PDOK feature type
 */
type PDOKFeature = GeoJSONFeature<Polygon | MultiPolygon, PDOKFeatureProps>;

/**
 * PDOK WFS response interface
 */
interface PDOKWFSResponse {
  features: PDOKFeature[];
}

/**
 * Location data result interface
 */
export interface LocationData {
  address: string;
  coordinates: {
    wgs84: {
      latitude: number;
      longitude: number;
    };
    rd: {
      x: number;
      y: number;
    };
  };
  municipality: {
    statcode: string; // GMxxxx
    statnaam: string;
    geometry: Polygon | MultiPolygon;
  };
  district: {
    statcode: string; // WKxxxxxx
    statnaam: string;
    geometry: Polygon | MultiPolygon;
  } | null;
  neighborhood: {
    statcode: string; // BUxxxxxxxx
    statnaam: string;
    geometry: Polygon | MultiPolygon;
  } | null;
}

/**
 * Initialize Proj4 definitions for coordinate transformations
 */
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 " +
    "+k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel " +
    "+towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 " +
    "+units=m +no_defs"
);

/**
 * Main service class for geocoding and location code retrieval
 */
export class LocationGeocoderService {
  /**
   * Geocode an address and retrieve all relevant location codes
   */
  async geocodeAddress(address: string): Promise<LocationData | null> {
    try {
      // 1) Geocode address via Nominatim (OpenStreetMap)
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=nl`;
      const geoRes = await fetch(geocodeUrl);
      const geoData = await geoRes.json();

      if (!geoData.length) {
        throw new Error("No geocoding results found for the provided address.");
      }

      // Parse lat/lon
      const latitude = parseFloat(geoData[0].lat);
      const longitude = parseFloat(geoData[0].lon);

      // 2) Convert WGS84 to RD (EPSG:28992) using Proj4
      const rdCoordinates = proj4("EPSG:4326", "EPSG:28992", [
        longitude,
        latitude,
      ]) as [number, number];

      // 3) Fetch municipality data
      const municipality = await this.fetchMunicipality(rdCoordinates);
      if (!municipality) {
        throw new Error("Could not fetch municipality data for this location.");
      }

      // 4) Fetch district data (WK)
      const district = await this.fetchAreaData(
        municipality.statcode,
        "district",
        rdCoordinates
      );

      // 5) Fetch neighborhood data (BU)
      const neighborhood = await this.fetchAreaData(
        municipality.statcode,
        "neighborhood",
        rdCoordinates
      );

      return {
        address,
        coordinates: {
          wgs84: {
            latitude,
            longitude,
          },
          rd: {
            x: rdCoordinates[0],
            y: rdCoordinates[1],
          },
        },
        municipality,
        district,
        neighborhood,
      };
    } catch (error) {
      console.error("Error geocoding address:", error);
      return null;
    }
  }

  /**
   * Fetch municipality (GMxxxx) from PDOK that contains the RD point
   */
  private async fetchMunicipality(rdCoordinates: [number, number]) {
    try {
      const url = `https://service.pdok.nl/cbs/gebiedsindelingen/2023/wfs/v1_0?request=GetFeature&service=WFS&version=2.0.0&typeName=gemeente_gegeneraliseerd&outputFormat=application/json`;

      const res = await fetch(url);
      const data = (await res.json()) as PDOKWFSResponse;

      // Use @turf/turf to find which polygon contains our point
      const pointObj = point(rdCoordinates);

      const matched = data.features.filter((feature) =>
        booleanPointInPolygon(
          pointObj,
          feature as GeoJSONFeature<Polygon | MultiPolygon>
        )
      );

      if (matched.length > 0) {
        const props = matched[0].properties;
        return {
          statcode: props.statcode,
          statnaam: props.statnaam,
          geometry: matched[0].geometry,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching municipality data:", error);
      return null;
    }
  }

  /**
   * Fetch district (WKxxxxxx) or neighborhood (BUxxxxxxxx) from PDOK
   */
  private async fetchAreaData(
    parentStatcode: string,
    level: "district" | "neighborhood",
    rdCoordinates: [number, number]
  ) {
    try {
      const baseUrl =
        "https://service.pdok.nl/cbs/gebiedsindelingen/2023/wfs/v1_0";

      const codePrefix =
        level === "district"
          ? parentStatcode.replace("GM", "WK") // GMxxxx -> WKxxxx
          : parentStatcode.replace("GM", "BU"); // GMxxxx -> BUxxxx

      const typeName =
        level === "district" ? "wijk_gegeneraliseerd" : "buurt_gegeneraliseerd";

      // Build a WFS filter to get all WK/BU codes starting with the codePrefix
      const filterXML = `
        <Filter>
          <PropertyIsLike wildCard="*" singleChar="." escapeChar="\\">
            <PropertyName>statcode</PropertyName>
            <Literal>${codePrefix}*</Literal>
          </PropertyIsLike>
        </Filter>
      `.trim();

      const url = `${baseUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=${typeName}&outputFormat=application/json&filter=${encodeURIComponent(
        filterXML
      )}`;

      const res = await fetch(url);
      const data = (await res.json()) as PDOKWFSResponse;

      const pointObj = point(rdCoordinates);

      const matched = data.features.filter((feature) =>
        booleanPointInPolygon(
          pointObj,
          feature as GeoJSONFeature<Polygon | MultiPolygon>
        )
      );

      if (matched.length > 0) {
        const props = matched[0].properties;
        return {
          statcode: props.statcode,
          statnaam: props.statnaam,
          geometry: matched[0].geometry,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching area data:", error);
      return null;
    }
  }
}
