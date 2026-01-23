/**
 * API Route for Housing Personas Data
 * Returns the full housing personas data with property types and image URLs
 */

import { NextResponse } from 'next/server';
import housingPersonas from '@/features/location/data/sources/housing-personas.json';

export async function GET() {
  return NextResponse.json(housingPersonas);
}
