// src/features/location/data/sources/google-custom-search/GoogleProjectSearchClient.ts

/**
 * Google Custom Search API Response Types
 */
export interface GoogleSearchResult {
  kind: string;
  title: string;
  htmlTitle: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlSnippet: string;
  cacheId?: string;
  formattedUrl: string;
  htmlFormattedUrl: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    metatags?: Array<{
      'og:image'?: string;
      'og:type'?: string;
      'og:title'?: string;
      'og:description'?: string;
      'og:url'?: string;
      [key: string]: string | undefined;
    }>;
    cse_image?: Array<{
      src: string;
    }>;
  };
}

export interface GoogleSearchResponse {
  kind: string;
  url: {
    type: string;
    template: string;
  };
  queries: {
    request: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
    nextPage?: Array<{
      title: string;
      totalResults: string;
      searchTerms: string;
      count: number;
      startIndex: number;
      inputEncoding: string;
      outputEncoding: string;
      safe: string;
      cx: string;
    }>;
  };
  searchInformation: {
    searchTime: number;
    formattedSearchTime: string;
    totalResults: string;
    formattedTotalResults: string;
  };
  items?: GoogleSearchResult[];
}

export interface SearchProjectsParams {
  location: string; // Address or location name
  radius?: number; // Search radius in meters (not directly supported by Google, used for context)
  maxResults?: number; // Max results to return (1-10 per API call)
  language?: 'nl' | 'en'; // Search language
}

/**
 * Google Custom Search API Client for finding architectural/residential projects
 *
 * Uses Google Custom Search API to find:
 * - New construction projects (nieuwbouw)
 * - Residential development projects
 * - Apartment buildings
 * - Commercial real estate projects
 *
 * @see https://developers.google.com/custom-search/v1/overview
 */
export class GoogleProjectSearchClient {
  private apiKey: string;
  private searchEngineId: string;
  private baseUrl = 'https://www.googleapis.com/customsearch/v1';

  constructor(apiKey?: string, searchEngineId?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || '';
    this.searchEngineId = searchEngineId || process.env.GOOGLE_SEARCH_ENGINE_ID || '';

    if (!this.apiKey) {
      console.warn('⚠️ GOOGLE_CUSTOM_SEARCH_API_KEY not set');
    }
    if (!this.searchEngineId) {
      console.warn('⚠️ GOOGLE_SEARCH_ENGINE_ID not set');
    }
  }

  /**
   * Search for architectural/residential projects near a location
   */
  async searchProjects(params: SearchProjectsParams): Promise<GoogleSearchResponse> {
    const { location, maxResults = 10, language = 'nl' } = params;

    // Build search query for Dutch residential/architectural projects
    const searchTerms = this.buildSearchQuery(location, language);

    // Build request URL
    const url = new URL(this.baseUrl);
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('cx', this.searchEngineId);
    url.searchParams.append('q', searchTerms);
    url.searchParams.append('num', Math.min(maxResults, 10).toString()); // Max 10 per request
    url.searchParams.append('lr', `lang_${language}`); // Language restriction
    url.searchParams.append('hl', language); // Interface language

    // Optional: Restrict to recent results (last 3 years)
    // url.searchParams.append('dateRestrict', 'y3');

    try {
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Google Custom Search API error: ${response.status} ${response.statusText}\n${errorText}`
        );
      }

      const data: GoogleSearchResponse = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching from Google Custom Search API:', error);
      throw error;
    }
  }

  /**
   * Build search query optimized for finding residential/architectural projects
   */
  private buildSearchQuery(location: string, language: 'nl' | 'en'): string {
    // Extract city/neighborhood from address
    const locationParts = location.split(',').map((p) => p.trim());
    const city = locationParts[locationParts.length - 1] || location;

    if (language === 'nl') {
      // Dutch search query
      // Focus on "nieuwbouw" (new construction) + location
      // Include common project types
      return `nieuwbouw ${city} project (appartementen OR woningen OR "grondgebonden woningen")`;
    } else {
      // English search query
      return `new construction ${city} project (apartments OR housing OR residential)`;
    }
  }

  /**
   * Search for projects with pagination support
   */
  async searchProjectsPaginated(
    params: SearchProjectsParams,
    startIndex: number = 1
  ): Promise<GoogleSearchResponse> {
    const url = new URL(this.baseUrl);
    const searchTerms = this.buildSearchQuery(params.location, params.language || 'nl');

    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('cx', this.searchEngineId);
    url.searchParams.append('q', searchTerms);
    url.searchParams.append('num', Math.min(params.maxResults || 10, 10).toString());
    url.searchParams.append('start', startIndex.toString());
    url.searchParams.append('lr', `lang_${params.language || 'nl'}`);
    url.searchParams.append('hl', params.language || 'nl');

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Custom Search API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Check if API credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.searchEngineId);
  }

  /**
   * Get usage information
   * Note: Free tier = 100 queries/day
   * Paid tier = $5 per 1000 queries, max 10,000/day
   */
  getUsageInfo(): {
    freeQueries: number;
    paidRate: string;
    maxDaily: number;
  } {
    return {
      freeQueries: 100,
      paidRate: '$5 per 1000 queries',
      maxDaily: 10000,
    };
  }
}

/**
 * Export singleton instance
 */
export const googleProjectSearchClient = new GoogleProjectSearchClient();
