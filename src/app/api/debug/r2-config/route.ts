/**
 * R2 Configuration Diagnostic Endpoint
 *
 * Checks R2 environment variables and configuration
 * Helps debug connection issues
 *
 * Usage: GET /api/debug/r2-config
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Login required' },
        { status: 401 }
      );
    }

    // Gather R2 configuration (safely, without exposing secrets)
    const config = {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ?
        `${process.env.R2_ACCOUNT_ID.substring(0, 8)}...` :
        'MISSING',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?
        `${process.env.R2_ACCESS_KEY_ID.substring(0, 8)}...` :
        'MISSING',
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?
        'SET (hidden)' :
        'MISSING',
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'MISSING',
      R2_JURISDICTION: process.env.R2_JURISDICTION || 'NOT SET (default)',
    };

    // Calculate endpoint
    const accountId = process.env.R2_ACCOUNT_ID;
    const jurisdiction = process.env.R2_JURISDICTION;

    let endpoint = 'N/A';
    if (accountId) {
      if (jurisdiction && jurisdiction.toLowerCase() === 'eu') {
        endpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;
      } else {
        endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      }
    }

    // Check what's missing
    const missing: string[] = [];
    if (!process.env.R2_ACCOUNT_ID) missing.push('R2_ACCOUNT_ID');
    if (!process.env.R2_ACCESS_KEY_ID) missing.push('R2_ACCESS_KEY_ID');
    if (!process.env.R2_SECRET_ACCESS_KEY) missing.push('R2_SECRET_ACCESS_KEY');
    if (!process.env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');

    const recommendations: string[] = [];

    const diagnosis = {
      status: missing.length === 0 ? 'CONFIGURED' : 'INCOMPLETE',
      config,
      endpoint,
      missing,
      recommendations
    };

    // Add recommendations
    if (missing.length > 0) {
      recommendations.push(`Add missing environment variables: ${missing.join(', ')}`);
    }

    if (!process.env.R2_JURISDICTION) {
      recommendations.push(
        'If your bucket is in EU region, add: R2_JURISDICTION=eu'
      );
    }

    if (process.env.R2_BUCKET_NAME !== 'grooshub-chat-files') {
      recommendations.push(
        `Bucket name is '${process.env.R2_BUCKET_NAME}', expected 'grooshub-chat-files'`
      );
    }

    return NextResponse.json(diagnosis);

  } catch (error) {
    console.error('[R2 Debug] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
