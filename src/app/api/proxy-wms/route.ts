// src/app/api/proxy-wms/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Allowed WMS hosts for security
const ALLOWED_HOSTS = [
  'data.rivm.nl',
  'geodata.nationaalgeoregister.nl',
  'service.pdok.nl',
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(url);

    // Security check: only allow specific WMS hosts
    if (!ALLOWED_HOSTS.some(host => parsedUrl.hostname.includes(host))) {
      return NextResponse.json(
        { error: 'Host not allowed' },
        { status: 403 }
      );
    }

    // Fetch the WMS image
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/png,image/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `WMS request failed: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('WMS proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WMS image' },
      { status: 500 }
    );
  }
}
