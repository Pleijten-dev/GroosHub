/**
 * Location Summary Generation API
 * Demonstrates useObject hook - generates structured location analysis
 */

import { streamObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getModel } from '@/lib/ai/models';

// Schema for location summary
const locationSummarySchema = z.object({
  overallScore: z.number().min(0).max(10).describe('Overall location score from 0-10'),
  safetyScore: z.number().min(0).max(10).describe('Safety score from 0-10'),
  livabilityScore: z.number().min(0).max(10).describe('Livability score from 0-10'),
  amenitiesScore: z.number().min(0).max(10).describe('Nearby amenities score from 0-10'),

  strengths: z.array(z.string()).describe('Top 3-5 strengths of this location'),
  weaknesses: z.array(z.string()).describe('Top 3-5 weaknesses of this location'),

  bestFor: z.array(z.string()).describe('Types of people/families this location is best suited for'),
  notRecommendedFor: z.array(z.string()).describe('Types of people this location may not suit'),

  keyHighlights: z.array(z.object({
    category: z.string().describe('Category like "Schools", "Transport", "Shopping"'),
    highlight: z.string().describe('Key highlight in this category'),
  })).describe('3-5 key highlights across different categories'),

  investmentPotential: z.enum(['Low', 'Medium', 'High']).describe('Investment potential rating'),
  investmentReasoning: z.string().describe('Brief explanation of investment potential'),

  oneLineSummary: z.string().describe('One sentence summary of the location'),
});

export type LocationSummary = z.infer<typeof locationSummarySchema>;

/**
 * POST /api/generate-location-summary
 * Stream a structured location analysis object
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { locationData, address } = body;

    if (!locationData || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: locationData, address' },
        { status: 400 }
      );
    }

    console.log(`[Location Summary] Generating summary for: ${address}`);

    // Build prompt from location data
    const prompt = `
You are a location analysis expert. Analyze the following location data and provide a comprehensive summary.

**Location:** ${address}

**Data Available:**
${JSON.stringify(locationData, null, 2)}

Provide a structured analysis that helps users understand:
1. Overall quality and scores
2. Key strengths and weaknesses
3. Who this location is best suited for
4. Investment potential

Be specific and data-driven in your analysis.
    `.trim();

    // Use streamObject to generate structured summary
    const result = streamObject({
      model: getModel('gpt-4o'), // Good balance of speed and quality
      schema: locationSummarySchema,
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'generate-location-summary',
        metadata: {
          userId,
          address,
        },
      },
    });

    // Return streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[Location Summary] Error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate location summary' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-location-summary
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Location Summary API is running',
    schema: {
      type: 'object',
      properties: {
        overallScore: { type: 'number', range: '0-10' },
        safetyScore: { type: 'number', range: '0-10' },
        livabilityScore: { type: 'number', range: '0-10' },
        amenitiesScore: { type: 'number', range: '0-10' },
        strengths: { type: 'array', items: 'string' },
        weaknesses: { type: 'array', items: 'string' },
        bestFor: { type: 'array', items: 'string' },
        notRecommendedFor: { type: 'array', items: 'string' },
        keyHighlights: { type: 'array', items: 'object' },
        investmentPotential: { type: 'enum', values: ['Low', 'Medium', 'High'] },
        investmentReasoning: { type: 'string' },
        oneLineSummary: { type: 'string' },
      },
    },
  });
}
