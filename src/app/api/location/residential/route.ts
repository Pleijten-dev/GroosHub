import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/location/residential
 * Fetch housing market reference data from Altum AI API
 * Runs server-side to keep API key secure
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { postcode, housenumber, houseaddition } = body;

    // Validate inputs
    if (!postcode || !housenumber) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Postcode and housenumber are required' },
        { status: 400 }
      );
    }

    console.log(`🔵 [Altum AI API] Fetching reference data: ${postcode} ${housenumber}${houseaddition || ''}`);

    // Get API key from environment
    const apiKey = process.env.Altum_AI_Key || process.env.ALTUM_AI_KEY;

    if (!apiKey) {
      console.error('❌ [Altum AI API] API key not configured in environment');
      return NextResponse.json(
        { error: 'CONFIG_ERROR', message: 'Altum AI API key not configured' },
        { status: 500 }
      );
    }

    // Build request body with default parameters
    const requestBody = {
      postcode,
      housenumber: parseInt(housenumber, 10),
      ...(houseaddition && { houseaddition }),
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

    console.log(`📤 [Altum AI API] Request body:`, {
      postcode: requestBody.postcode,
      housenumber: requestBody.housenumber,
      houseaddition: requestBody.houseaddition,
    });

    // Make request to Altum AI API
    const response = await fetch('https://api.altum.ai/interactive-reference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Altum AI API] API error: ${response.status} ${response.statusText}`);
      console.error(`❌ [Altum AI API] Error details:`, errorText);

      // Handle 422 Unprocessable Entity
      if (response.status === 422) {
        return NextResponse.json(
          {
            error: 'INVALID_INPUT',
            message: 'Invalid address format or parameters',
            details: errorText,
          },
          { status: 422 }
        );
      }

      return NextResponse.json(
        {
          error: 'API_ERROR',
          message: `Altum AI API returned ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log(`✅ [Altum AI API] Completed in ${responseTime}ms`);
    console.log(`✅ [Altum AI API] Found ${data.ReferenceData?.ReferenceHouses?.length || 0} reference houses`);

    return NextResponse.json({
      success: true,
      data,
      responseTimeMs: responseTime,
    });
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ [Altum AI API] Error after ${responseTime}ms:`, error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
