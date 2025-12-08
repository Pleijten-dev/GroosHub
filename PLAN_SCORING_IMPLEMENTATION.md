# PDF Plan Scoring Agent - Implementation Guide

## Overview
Automatically analyze architectural floor plans and calculate scores based on room types, sizes, and furniture.

## Architecture

```
User uploads PDF → Convert to image → AI Vision Analysis → Extract data → Calculate score → Display results
```

## Tech Stack

- **PDF Processing**: `pdf.js` or `pdf-lib`
- **Image Hosting**: Cloudflare R2 (already available)
- **AI Vision**: Anthropic Claude 3.5 Sonnet (already integrated)
- **Storage**: PostgreSQL (existing)
- **Frontend**: Next.js 15 + React 19 (existing)

## Database Schema

```sql
-- Add to existing schema
CREATE TABLE plan_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  analysis_result JSONB NOT NULL,
  score DECIMAL(3,2) NOT NULL,  -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE plan_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Steps

### Step 1: File Upload API

```typescript
// app/api/plan-scoring/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { put } from '@vercel/blob';  // or R2

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // Upload to R2/Blob storage
  const blob = await put(`plans/${session.user.id}/${file.name}`, file, {
    access: 'public'
  });

  return NextResponse.json({ url: blob.url });
}
```

### Step 2: PDF to Image Conversion

```typescript
// features/plan-scoring/lib/pdf-processor.ts
import * as pdfjsLib from 'pdfjs-dist';

export async function convertPdfToImage(pdfUrl: string): Promise<string> {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(1); // First page

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toDataURL('image/png');
}
```

### Step 3: AI Vision Analysis

```typescript
// features/plan-scoring/lib/vision-analyzer.ts
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export interface RoomAnalysis {
  type: string;
  size: number;  // m²
  furniture: string[];
  confidence: number;
}

export interface FloorPlanAnalysis {
  rooms: RoomAnalysis[];
  totalArea: number;
  scale?: string;
  errors?: string[];
}

export async function analyzeFloorPlan(
  imageUrl: string
): Promise<FloorPlanAnalysis> {
  const prompt = `
You are an expert architectural floor plan analyzer. Analyze this floor plan image and provide:

1. **Rooms**: List each room with:
   - Type (bedroom, living_room, kitchen, bathroom, etc.)
   - Approximate size in m² (if dimensions are visible)
   - Furniture pieces visible in the room
   - Confidence level (0-1)

2. **Total Area**: Sum of all room areas
3. **Scale**: If visible (e.g., "1:100")
4. **Errors**: Any issues or ambiguities

Return ONLY valid JSON in this exact format:
{
  "rooms": [
    {
      "type": "bedroom",
      "size": 12.5,
      "furniture": ["bed", "wardrobe"],
      "confidence": 0.9
    }
  ],
  "totalArea": 85.5,
  "scale": "1:100",
  "errors": []
}
`;

  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image', image: imageUrl }
        ]
      }
    ],
    temperature: 0.2  // Lower temperature for more consistent results
  });

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[0]);
}
```

### Step 4: Scoring Logic

```typescript
// features/plan-scoring/lib/plan-scorer.ts

export interface ScoringConfig {
  roomSizeWeights: {
    [roomType: string]: {
      min: number;    // Minimum acceptable size (m²)
      ideal: number;  // Ideal size
      max: number;    // Maximum beneficial size
    };
  };
  requiredFurniture: {
    [roomType: string]: string[];
  };
  weights: {
    sizeScore: number;      // % weight
    furnitureScore: number; // % weight
    layoutScore: number;    // % weight
  };
}

const DEFAULT_CONFIG: ScoringConfig = {
  roomSizeWeights: {
    bedroom: { min: 9, ideal: 15, max: 25 },
    living_room: { min: 18, ideal: 30, max: 50 },
    kitchen: { min: 6, ideal: 12, max: 20 },
    bathroom: { min: 3, ideal: 6, max: 12 }
  },
  requiredFurniture: {
    bedroom: ['bed'],
    living_room: ['sofa'],
    kitchen: ['sink', 'stove', 'refrigerator'],
    bathroom: ['toilet', 'sink']
  },
  weights: {
    sizeScore: 40,
    furnitureScore: 30,
    layoutScore: 30
  }
};

export function calculatePlanScore(
  analysis: FloorPlanAnalysis,
  config: ScoringConfig = DEFAULT_CONFIG
): {
  totalScore: number;
  breakdown: {
    sizeScore: number;
    furnitureScore: number;
    layoutScore: number;
  };
  details: any;
} {
  let sizeScore = 0;
  let furnitureScore = 0;
  let layoutScore = 0;

  const roomScores: any[] = [];

  // 1. Size Scoring
  analysis.rooms.forEach(room => {
    const weights = config.roomSizeWeights[room.type];
    if (!weights) return;

    let roomSizeScore = 0;
    if (room.size < weights.min) {
      // Too small - penalty
      roomSizeScore = (room.size / weights.min) * 0.5;
    } else if (room.size <= weights.ideal) {
      // Between min and ideal - linear interpolation
      roomSizeScore = 0.5 + ((room.size - weights.min) / (weights.ideal - weights.min)) * 0.5;
    } else if (room.size <= weights.max) {
      // Between ideal and max - perfect score
      roomSizeScore = 1.0;
    } else {
      // Too large - slight penalty
      roomSizeScore = 0.9;
    }

    sizeScore += roomSizeScore;

    // 2. Furniture Scoring
    const required = config.requiredFurniture[room.type] || [];
    const hasRequired = required.filter(item =>
      room.furniture.some(f => f.toLowerCase().includes(item.toLowerCase()))
    );
    const roomFurnitureScore = required.length > 0
      ? hasRequired.length / required.length
      : 1.0;

    furnitureScore += roomFurnitureScore;

    roomScores.push({
      room: room.type,
      size: room.size,
      sizeScore: roomSizeScore,
      furnitureScore: roomFurnitureScore,
      furniture: room.furniture
    });
  });

  // Normalize by room count
  const roomCount = analysis.rooms.length || 1;
  sizeScore = sizeScore / roomCount;
  furnitureScore = furnitureScore / roomCount;

  // 3. Layout Scoring (simple heuristic for now)
  // - Adequate total area
  // - Good room count (2-6 rooms is ideal)
  const areaScore = Math.min(analysis.totalArea / 80, 1.0); // 80m² is baseline
  const roomCountScore = analysis.rooms.length >= 2 && analysis.rooms.length <= 6 ? 1.0 : 0.7;
  layoutScore = (areaScore + roomCountScore) / 2;

  // Calculate weighted total
  const totalScore =
    (sizeScore * config.weights.sizeScore / 100) +
    (furnitureScore * config.weights.furnitureScore / 100) +
    (layoutScore * config.weights.layoutScore / 100);

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown: {
      sizeScore: Math.round(sizeScore * 100) / 100,
      furnitureScore: Math.round(furnitureScore * 100) / 100,
      layoutScore: Math.round(layoutScore * 100) / 100
    },
    details: {
      roomScores,
      totalArea: analysis.totalArea,
      roomCount: analysis.rooms.length
    }
  };
}
```

### Step 5: API Endpoint

```typescript
// app/api/plan-scoring/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeFloorPlan } from '@/features/plan-scoring/lib/vision-analyzer';
import { calculatePlanScore } from '@/features/plan-scoring/lib/plan-scorer';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { imageUrl, fileName } = await request.json();

  try {
    // 1. Analyze with AI
    const analysis = await analyzeFloorPlan(imageUrl);

    // 2. Calculate score
    const scoring = calculatePlanScore(analysis);

    // 3. Save to database
    const result = await db.query(`
      INSERT INTO plan_analyses (user_id, file_name, file_url, analysis_result, score)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, score, created_at
    `, [
      session.user.id,
      fileName,
      imageUrl,
      JSON.stringify({ analysis, scoring }),
      scoring.totalScore
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        analysis,
        scoring,
        createdAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze floor plan' },
      { status: 500 }
    );
  }
}
```

### Step 6: Frontend Component

```typescript
// features/plan-scoring/components/PlanUploader.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { Card } from '@/shared/components/UI/Card/Card';
import { RadialChart } from '@/shared/components/common/RadialChart/RadialChart';

export function PlanUploader({ locale }: { locale: 'nl' | 'en' }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;

    setAnalyzing(true);

    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/plan-scoring/upload', {
        method: 'POST',
        body: formData
      });
      const { url } = await uploadRes.json();

      // 2. Analyze
      const analyzeRes = await fetch('/api/plan-scoring/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, fileName: file.name })
      });
      const data = await analyzeRes.json();

      setResult(data.data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze floor plan');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-base">
      <Card>
        <h2 className="text-2xl font-semibold mb-base">
          {locale === 'nl' ? 'Upload Plattegrond' : 'Upload Floor Plan'}
        </h2>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-base"
        />

        <Button
          onClick={handleUpload}
          disabled={!file || analyzing}
          variant="primary"
        >
          {analyzing
            ? (locale === 'nl' ? 'Analyseren...' : 'Analyzing...')
            : (locale === 'nl' ? 'Analyseer' : 'Analyze')}
        </Button>
      </Card>

      {result && (
        <Card>
          <h3 className="text-xl font-semibold mb-base">
            {locale === 'nl' ? 'Resultaten' : 'Results'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-base">
            <RadialChart
              data={[
                {
                  label: locale === 'nl' ? 'Totale Score' : 'Total Score',
                  value: result.scoring.totalScore * 100,
                  color: '#477638'
                }
              ]}
              height={300}
            />

            <div className="space-y-sm">
              <div>
                <strong>{locale === 'nl' ? 'Grootte' : 'Size'}: </strong>
                {(result.scoring.breakdown.sizeScore * 100).toFixed(0)}%
              </div>
              <div>
                <strong>{locale === 'nl' ? 'Meubels' : 'Furniture'}: </strong>
                {(result.scoring.breakdown.furnitureScore * 100).toFixed(0)}%
              </div>
              <div>
                <strong>{locale === 'nl' ? 'Indeling' : 'Layout'}: </strong>
                {(result.scoring.breakdown.layoutScore * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="mt-base">
            <h4 className="font-semibold mb-sm">
              {locale === 'nl' ? 'Kamers' : 'Rooms'}:
            </h4>
            {result.analysis.rooms.map((room: any, i: number) => (
              <div key={i} className="border-b py-sm">
                <div className="font-medium capitalize">{room.type}</div>
                <div className="text-sm text-gray-600">
                  {room.size}m² • {room.furniture.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
```

## Complexity Estimate

### Development Time
- **Quick Prototype**: 1-2 weeks (basic functionality)
- **Production Ready**: 3-4 weeks (with testing, error handling, UI polish)

### Complexity Breakdown
- **Easy** (30%): File upload, database, UI integration
- **Medium** (40%): PDF processing, scoring logic
- **Complex** (30%): AI vision accuracy, edge cases

## Next Steps

1. **Prototype First**: Start with AI vision approach
2. **Test with Real Plans**: Gather sample PDFs
3. **Iterate on Prompts**: Refine AI analysis accuracy
4. **Add Validations**: Let users correct AI interpretations
5. **Scale Gradually**: Add features like custom scoring configs

## Estimated Costs

- **AI Vision API**: ~$0.01-0.05 per analysis (Claude Vision)
- **Storage**: Minimal (R2 is cheap)
- **Development**: 40-80 hours

## Conclusion

This is **definitely achievable** and would be a great addition to GroosHub's urban development focus. The AI vision approach gives you a working prototype quickly, and you can enhance accuracy over time.

Would you like me to start implementing this feature?
