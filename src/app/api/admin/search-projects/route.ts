// src/app/api/admin/search-projects/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { GoogleProjectSearchClient } from '@/features/location/data/sources/google-custom-search/GoogleProjectSearchClient';
import { ProjectMetadataParser } from '@/features/location/data/parsers/ProjectMetadataParser';
import type { ProjectMetadata } from '@/features/location/data/parsers/ProjectMetadataParser';

/**
 * Request body schema
 */
interface SearchProjectsRequest {
  address: string;
  locale?: 'nl' | 'en';
  maxResults?: number;
}

/**
 * Response schema
 */
interface SearchProjectsResponse {
  success: boolean;
  projects?: ProjectMetadata[];
  error?: string;
  metadata?: {
    totalResults: number;
    searchTime: number;
    query: string;
  };
}

/**
 * POST /api/admin/search-projects
 *
 * Search for architectural/residential projects near a given address
 *
 * Request body:
 * {
 *   "address": "Centrum, Amsterdam",
 *   "locale": "nl",
 *   "maxResults": 10
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "projects": [...],
 *   "metadata": {
 *     "totalResults": 10,
 *     "searchTime": 0.5,
 *     "query": "nieuwbouw Amsterdam project"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SearchProjectsRequest = await request.json();

    // Validate input
    if (!body.address || typeof body.address !== 'string') {
      return NextResponse.json<SearchProjectsResponse>(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    const { address, locale = 'nl', maxResults = 10 } = body;

    console.log('🔍 Searching for projects near:', address);

    // Initialize clients
    const searchClient = new GoogleProjectSearchClient();
    const parser = new ProjectMetadataParser();

    // Check if API is configured
    if (!searchClient.isConfigured()) {
      return NextResponse.json<SearchProjectsResponse>(
        {
          success: false,
          error: 'Google Custom Search API not configured. Please set GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.',
        },
        { status: 500 }
      );
    }

    // Search for projects
    const searchResponse = await searchClient.searchProjects({
      location: address,
      maxResults,
      language: locale,
    });

    // Parse results
    const projects = searchResponse.items
      ? parser.parseSearchResults(searchResponse.items, address)
      : [];

    console.log(`✅ Found ${projects.length} projects`);

    // Return results
    return NextResponse.json<SearchProjectsResponse>({
      success: true,
      projects,
      metadata: {
        totalResults: parseInt(searchResponse.searchInformation.totalResults, 10),
        searchTime: searchResponse.searchInformation.searchTime,
        query: searchResponse.queries.request[0]?.searchTerms || '',
      },
    });
  } catch (error) {
    console.error('❌ Error in /api/admin/search-projects:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Google API errors
      if (error.message.includes('Google Custom Search API error')) {
        return NextResponse.json<SearchProjectsResponse>(
          {
            success: false,
            error: `Search API error: ${error.message}`,
          },
          { status: 500 }
        );
      }

      // Generic errors
      return NextResponse.json<SearchProjectsResponse>(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Unknown errors
    return NextResponse.json<SearchProjectsResponse>(
      {
        success: false,
        error: 'An unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/search-projects
 *
 * Get API configuration status (for testing)
 */
export async function GET() {
  const searchClient = new GoogleProjectSearchClient();
  const isConfigured = searchClient.isConfigured();
  const usageInfo = searchClient.getUsageInfo();

  return NextResponse.json({
    configured: isConfigured,
    usage: usageInfo,
    message: isConfigured
      ? 'Google Custom Search API is configured and ready'
      : 'Google Custom Search API is not configured. Set GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.',
  });
}
