"use client";

/**
 * Altum AI API Client
 * Interactive Reference API - Housing Market Data
 *
 * This client fetches comparable property data via our API route
 */

import type { LocationData } from '../../services/locationGeocoder';
import type {
  AltumAIResponse,
  ResidentialData,
} from './types';
import { AltumAIParser } from './parser';

/**
 * Address parsing result
 */
interface ParsedAddress {
  postcode: string;
  housenumber: number;
  houseaddition?: string;
}

/**
 * Altum AI Client
 */
export class AltumAIClient {
  private readonly apiUrl = '/api/location/residential';
  private readonly parser: AltumAIParser;

  constructor() {
    this.parser = new AltumAIParser();
  }

  /**
   * Parse address string to extract postcode, housenumber, and addition
   * Supports various Dutch address formats:
   *   "Kerkstraat 37C, 3021AC Rotterdam"
   *   "3021AC 37 C"
   *   "Straatnaam 123-A, 1234 AB Plaats"
   */
  private parseAddress(address: string): ParsedAddress | null {
    try {
      console.log(`🔍 [Altum AI] Parsing address: ${address}`);

      // Pattern 1: Match Dutch postcode (4 digits + 2 letters, optionally with space)
      const postcodePattern = /\b(\d{4})\s?([A-Z]{2})\b/i;
      const postcodeMatch = address.match(postcodePattern);

      if (!postcodeMatch) {
        console.warn(`⚠️  [Altum AI] Could not extract postcode from: ${address}`);
        return null;
      }

      const postcode = (postcodeMatch[1] + postcodeMatch[2]).toUpperCase();

      // Pattern 2: Match house number with optional addition
      // Supports formats: "37", "37C", "37-C", "37 C", "37c"
      const numberPattern = /\b(\d+)\s*[-]?\s*([A-Za-z]{1,4})?\b/g;
      const numberMatches = [...address.matchAll(numberPattern)];

      if (numberMatches.length === 0) {
        console.warn(`⚠️  [Altum AI] Could not extract house number from: ${address}`);
        return null;
      }

      // Find the house number (should be before or after the postcode)
      let housenumber: number | null = null;
      let houseaddition: string | undefined;

      // Try to find a number that's not part of the postcode
      for (const match of numberMatches) {
        const num = parseInt(match[1], 10);
        const addition = match[2];

        // Skip if this looks like it's part of the postcode
        if (match[1] === postcodeMatch[1]) {
          continue;
        }

        housenumber = num;
        houseaddition = addition ? addition.toUpperCase() : undefined;
        break;
      }

      if (housenumber === null) {
        console.warn(`⚠️  [Altum AI] Could not extract house number from: ${address}`);
        return null;
      }

      console.log(`✅ [Altum AI] Parsed: ${postcode} ${housenumber}${houseaddition || ''}`);

      return {
        postcode,
        housenumber,
        houseaddition,
      };
    } catch (error) {
      console.error(`❌ [Altum AI] Error parsing address:`, error);
      return null;
    }
  }

  /**
   * Fetch reference data for a location
   */
  async fetchReferenceData(locationData: LocationData): Promise<ResidentialData | null> {
    try {
      console.log(`🔵 [Altum AI] Fetching reference data for: ${locationData.address}`);

      // Parse address to extract postcode and house number
      const parsedAddress = this.parseAddress(locationData.address);

      if (!parsedAddress) {
        console.error(`❌ [Altum AI] Could not parse address: ${locationData.address}`);
        return null;
      }

      console.log(`📤 [Altum AI] Request:`, {
        postcode: parsedAddress.postcode,
        housenumber: parsedAddress.housenumber,
        houseaddition: parsedAddress.houseaddition,
      });

      // Make API request via our server-side route
      const response = await this.makeRequest(parsedAddress);

      if (!response) {
        return null;
      }

      // Parse response into normalized structure
      const residentialData = this.parser.parse(response);

      console.log(
        `✅ [Altum AI] Found ${residentialData.referenceHouses.length} reference houses`
      );
      console.log(
        `✅ [Altum AI] Price range: ${residentialData.referencePriceMean.formatted}`
      );

      return residentialData;
    } catch (error) {
      console.error(`❌ [Altum AI] Error fetching reference data:`, error);
      return null;
    }
  }

  /**
   * Make HTTP request to our API route (which calls Altum AI)
   */
  private async makeRequest(
    address: ParsedAddress
  ): Promise<AltumAIResponse | null> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postcode: address.postcode,
          housenumber: address.housenumber,
          houseaddition: address.houseaddition,
        }),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `❌ [Altum AI] API route error: ${response.status} ${response.statusText}`
        );
        console.error(`❌ [Altum AI] Error details:`, errorData);
        return null;
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        console.error(`❌ [Altum AI] Invalid response from API route`);
        return null;
      }

      console.log(`⏱️  [Altum AI] Request completed in ${responseTime}ms`);

      return result.data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [Altum AI] Request failed after ${responseTime}ms:`, error);
      return null;
    }
  }
}
