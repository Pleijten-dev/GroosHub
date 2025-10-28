"use client";

/**
 * Altum AI API Client
 * Interactive Reference API - Housing Market Data
 *
 * This client fetches comparable property data for valuation purposes
 */

import type { LocationData } from '../../services/locationGeocoder';
import type {
  AltumAIRequest,
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
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.altum.ai/interactive-reference';
  private readonly parser: AltumAIParser;

  // Default search parameters (from user's schema)
  private readonly defaultParams = {
    strict_energylabel: false,
    strict_street: false,
    strict_buurt: false,
    strict_wijk: false,
    comparable_housetype: 0,
    comparable_innersurfacearea: 0,
    comparable_distance: 0,
    reference_number: 30,
    weight_distance: 0.8,
    weight_innersurfacearea: 0.2,
    weight_transactiondate: 0.2,
    weight_buildyear: 0.5,
    date_limit: 60,
    weight_visualsimilarity: 0.5,
    visual_similarity: false,
    include_funda_data: false,
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ALTUM_AI_KEY || process.env.NEXT_PUBLIC_ALTUM_AI_KEY || '';
    this.parser = new AltumAIParser();

    if (!this.apiKey) {
      console.warn('⚠️  [Altum AI Client] API key not configured');
    }
  }

  /**
   * Parse address string to extract postcode, housenumber, and addition
   * Example inputs:
   *   "Kerkstraat 37C, 3021AC Rotterdam"
   *   "3021AC 37 C"
   *   "Postcode: 3021AC, Number: 37C"
   */
  private parseAddress(address: string): ParsedAddress | null {
    try {
      console.log(`🔍 [Altum AI] Parsing address: ${address}`);

      // Pattern 1: Match postcode (6 chars: 4 digits + 2 letters)
      const postcodePattern = /\b(\d{4}\s?[A-Z]{2})\b/i;
      const postcodeMatch = address.match(postcodePattern);

      if (!postcodeMatch) {
        console.warn(`⚠️  [Altum AI] Could not extract postcode from: ${address}`);
        return null;
      }

      const postcode = postcodeMatch[1].replace(/\s/g, '').toUpperCase();

      // Pattern 2: Match house number (digits, optionally followed by letter/addition)
      // Look for number near the postcode
      const numberPattern = /\b(\d+)\s*([A-Z]{1,3})?\b/gi;
      const numberMatches = [...address.matchAll(numberPattern)];

      if (numberMatches.length === 0) {
        console.warn(`⚠️  [Altum AI] Could not extract house number from: ${address}`);
        return null;
      }

      // Take the first match as house number
      const housenumber = parseInt(numberMatches[0][1], 10);
      const houseaddition = numberMatches[0][2] || undefined;

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

      // Build request body
      const requestBody: AltumAIRequest = {
        postcode: parsedAddress.postcode,
        housenumber: parsedAddress.housenumber,
        ...this.defaultParams,
      };

      // Add house addition if present
      if (parsedAddress.houseaddition) {
        requestBody.houseaddition = parsedAddress.houseaddition;
      }

      console.log(`📤 [Altum AI] Request:`, {
        postcode: requestBody.postcode,
        housenumber: requestBody.housenumber,
        houseaddition: requestBody.houseaddition,
      });

      // Make API request
      const response = await this.makeRequest(requestBody);

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
   * Make HTTP request to Altum AI API
   */
  private async makeRequest(
    body: AltumAIRequest
  ): Promise<AltumAIResponse | null> {
    const startTime = Date.now();

    try {
      if (!this.apiKey) {
        throw new Error('Altum AI API key not configured');
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        // Handle 422 Unprocessable Entity (wrong input format)
        if (response.status === 422) {
          console.error(`❌ [Altum AI] Invalid request format (422)`);
          const errorData = await response.json().catch(() => ({}));
          console.error(`❌ [Altum AI] Error details:`, errorData);
          return null;
        }

        console.error(
          `❌ [Altum AI] API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data: AltumAIResponse = await response.json();

      console.log(`⏱️  [Altum AI] Request completed in ${responseTime}ms`);

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [Altum AI] Request failed after ${responseTime}ms:`, error);
      return null;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== '';
  }
}
