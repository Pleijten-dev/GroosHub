// src/features/location/data/parsers/ProjectMetadataParser.ts

import type { GoogleSearchResult } from '../sources/google-custom-search/GoogleProjectSearchClient';

/**
 * Parsed project metadata
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  address: string;
  type: string;
  numberOfHouses?: number;
  image?: string;
  url: string;
  description?: string;
  features?: string[];
  developer?: string;
  completionYear?: number;
  sourceUrl: string;
}

/**
 * Project Metadata Parser
 *
 * Extracts structured project information from:
 * 1. Google Search Results (OpenGraph metadata, snippets)
 * 2. Web page HTML (OpenGraph tags, Schema.org JSON-LD)
 */
export class ProjectMetadataParser {
  /**
   * Parse Google Search Result into project metadata
   */
  parseSearchResult(result: GoogleSearchResult, searchLocation: string): ProjectMetadata {
    const metadata: ProjectMetadata = {
      id: this.generateId(result.link),
      name: this.extractProjectName(result),
      address: this.extractAddress(result, searchLocation),
      type: this.extractProjectType(result),
      url: result.link,
      sourceUrl: result.link,
      description: this.extractDescription(result),
      image: this.extractImage(result),
    };

    // Try to extract additional data from snippet
    const additionalData = this.extractFromSnippet(result.snippet);
    return { ...metadata, ...additionalData };
  }

  /**
   * Parse multiple search results
   */
  parseSearchResults(
    results: GoogleSearchResult[],
    searchLocation: string
  ): ProjectMetadata[] {
    return results
      .map((result) => this.parseSearchResult(result, searchLocation))
      .filter((project) => this.isValidProject(project));
  }

  /**
   * Generate unique ID from URL
   */
  private generateId(url: string): string {
    // Use base64 encoding of URL as ID
    try {
      return Buffer.from(url).toString('base64').substring(0, 16);
    } catch {
      // Fallback for browser environment
      return url.substring(0, 16).replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  /**
   * Extract project name from search result
   */
  private extractProjectName(result: GoogleSearchResult): string {
    // Try OpenGraph title first
    const ogTitle = result.pagemap?.metatags?.[0]?.['og:title'];
    if (ogTitle) {
      return this.cleanTitle(ogTitle);
    }

    // Fallback to page title
    return this.cleanTitle(result.title);
  }

  /**
   * Clean and format title
   */
  private cleanTitle(title: string): string {
    // Remove common suffixes
    return title
      .replace(/\s*[-|]\s*(Nieuwbouw|Funda|NVM|Bouwfonds|AM|VORM).*$/i, '')
      .trim();
  }

  /**
   * Extract address from search result
   */
  private extractAddress(result: GoogleSearchResult, searchLocation: string): string {
    // Try to find address in snippet
    const addressMatch = result.snippet.match(/\b[\w\s]+\s+\d+[a-zA-Z]?,?\s+\d{4}\s*[A-Z]{2}\b/);
    if (addressMatch) {
      return addressMatch[0];
    }

    // Fallback to search location
    return searchLocation;
  }

  /**
   * Extract project type from search result
   */
  private extractProjectType(result: GoogleSearchResult): string {
    const snippet = result.snippet.toLowerCase();
    const title = result.title.toLowerCase();
    const combined = `${title} ${snippet}`;

    // Check for project types
    if (combined.includes('appartement')) {
      return 'Appartementen';
    } else if (combined.includes('grondgebonden')) {
      return 'Grondgebonden woningen';
    } else if (
      combined.includes('woning') ||
      combined.includes('housing') ||
      combined.includes('residential')
    ) {
      return 'Woningen';
    } else if (combined.includes('kantoor') || combined.includes('office')) {
      return 'Kantoorgebouw';
    } else if (combined.includes('gemengd') || combined.includes('mixed')) {
      return 'Gemengd';
    }

    return 'Nieuwbouw';
  }

  /**
   * Extract description from search result
   */
  private extractDescription(result: GoogleSearchResult): string | undefined {
    // Try OpenGraph description
    const ogDescription = result.pagemap?.metatags?.[0]?.['og:description'];
    if (ogDescription) {
      return ogDescription;
    }

    // Fallback to snippet
    return result.snippet || undefined;
  }

  /**
   * Extract image from search result
   */
  private extractImage(result: GoogleSearchResult): string | undefined {
    // Try OpenGraph image
    const ogImage = result.pagemap?.metatags?.[0]?.['og:image'];
    if (ogImage && this.isValidImageUrl(ogImage)) {
      return ogImage;
    }

    // Try thumbnail
    const thumbnail = result.pagemap?.cse_thumbnail?.[0]?.src;
    if (thumbnail && this.isValidImageUrl(thumbnail)) {
      return thumbnail;
    }

    // Try cse_image
    const cseImage = result.pagemap?.cse_image?.[0]?.src;
    if (cseImage && this.isValidImageUrl(cseImage)) {
      return cseImage;
    }

    return undefined;
  }

  /**
   * Validate image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        /\.(jpg|jpeg|png|webp|gif)$/i.test(parsed.pathname)
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract additional data from snippet text
   */
  private extractFromSnippet(snippet: string): Partial<ProjectMetadata> {
    const data: Partial<ProjectMetadata> = {};

    // Extract number of houses
    const housesMatch = snippet.match(/(\d+)\s*(woningen|appartementen|units|homes)/i);
    if (housesMatch) {
      data.numberOfHouses = parseInt(housesMatch[1], 10);
    }

    // Extract completion year
    const yearMatch = snippet.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 2020 && year <= 2030) {
        data.completionYear = year;
      }
    }

    // Extract developer
    const developerMatch = snippet.match(
      /\b(VORM|AM|Bouwfonds|Synchroon|Heijmans|BAM|VolkerWessels|Kondor Wessels)\b/i
    );
    if (developerMatch) {
      data.developer = developerMatch[1];
    }

    // Extract features from snippet
    const features: string[] = [];
    if (snippet.toLowerCase().includes('duurzaam')) {
      features.push('Duurzaam');
    }
    if (snippet.toLowerCase().includes('energiezuinig')) {
      features.push('Energiezuinig');
    }
    if (snippet.toLowerCase().includes('parkeren')) {
      features.push('Parkeren');
    }
    if (snippet.toLowerCase().includes('balkon')) {
      features.push('Balkon');
    }
    if (snippet.toLowerCase().includes('tuin')) {
      features.push('Tuin');
    }

    if (features.length > 0) {
      data.features = features;
    }

    return data;
  }

  /**
   * Validate if parsed project has minimum required data
   */
  private isValidProject(project: ProjectMetadata): boolean {
    return !!(project.name && project.url);
  }

  /**
   * Enrich project metadata by fetching and parsing the actual page
   * This would require server-side fetching to avoid CORS issues
   */
  async enrichFromUrl(url: string): Promise<Partial<ProjectMetadata>> {
    // This method would fetch the actual page and extract more metadata
    // For now, return empty object (implement in API route)
    return {};
  }
}

/**
 * Export singleton instance
 */
export const projectMetadataParser = new ProjectMetadataParser();
