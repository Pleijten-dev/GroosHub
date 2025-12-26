/**
 * Query Classification API
 * POST /api/rag/classify-query
 *
 * Determines if a user query warrants expensive Agent RAG invocation
 * Uses cheap, fast model (GPT-4o-mini) to classify queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { auth } from '@/lib/auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 10; // Classification should be fast

const requestSchema = z.object({
  query: z.string().min(1),
  projectId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { query, projectId } = requestSchema.parse(body);

    console.log(`[Query Classifier] Classifying: "${query.substring(0, 100)}..."`);

    // 3. Use cheap model to classify
    // GPT-4o-mini is 60x cheaper than GPT-4o and very fast
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0, // Deterministic classification
      system: `Je bent een query classificatie assistent voor een RAG systeem met bouwregelgeving documenten.

TAAK: Bepaal of een gebruikersvraag gaat over bouwregelgeving/architectuur documenten in de database.

PROJECT CONTEXT:
- Het project bevat documenten zoals Bouwbesluit 2012, architectuurnormen, bouwvoorschriften
- De documenten bevatten informatie over: bouwhoogte, verdiepingshoogte, brandveiligheid, toegankelijkheid, constructie-eisen, etc.

CLASSIFICATIE REGELS:

✅ DOCUMENT-RELATED (roep agent aan):
- Vragen over specifieke artikelen, tabellen, paragrafen
- Vragen over bouwvoorschriften, normen, eisen
- Vragen over specifieke waarden (hoogte, afstand, oppervlakte)
- Vragen over brandveiligheid, toegankelijkheid, geluidsisolatie
- Technische bouweisen
- Voorbeelden:
  * "Wat is de minimale verdiepingshoogte?"
  * "Welke eisen gelden voor brandveiligheid?"
  * "Wat staat er in artikel 4.164?"

❌ NIET DOCUMENT-RELATED (skip agent, gebruik tools/kennis):
- Vragen over locatieanalyse, demografie, veiligheid, gezondheid
- Vragen over "mijn opgeslagen locaties", "mijn projecten"
- Vragen over kaarten, grafieken, visualisaties
- Algemene vragen zonder documentcontext
- Chitchat, begroetingen
- Tool-based vragen
- Voorbeelden:
  * "Toon demografie voor mijn locatie"
  * "Wat is de criminaliteit in Amsterdam?"
  * "Wat is het weer vandaag?"
  * "Hallo, hoe gaat het?"
  * "Vergelijk twee locaties"

OUTPUT FORMAT:
{
  "isDocumentRelated": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Korte uitleg waarom"
}`,
      prompt: `Classificeer deze query:

"${query}"

Geef antwoord in JSON formaat.`,
    });

    // 4. Parse classification result
    let classification;
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      classification = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[Query Classifier] Failed to parse classification:', result.text);
      // Fallback: assume document-related if parsing fails (safe default)
      classification = {
        isDocumentRelated: true,
        confidence: 0.5,
        reasoning: 'Parsing failed, defaulting to document-related for safety'
      };
    }

    console.log(`[Query Classifier] Result: ${classification.isDocumentRelated ? 'DOCUMENT' : 'NON-DOCUMENT'} (${classification.confidence.toFixed(2)})`);
    console.log(`[Query Classifier] Reasoning: ${classification.reasoning}`);

    // 5. Return classification
    return NextResponse.json({
      isDocumentRelated: classification.isDocumentRelated,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    });

  } catch (error) {
    console.error('[Query Classifier] Error:', error);

    // On error, default to document-related (fail-safe)
    // Better to make unnecessary agent call than miss relevant documents
    return NextResponse.json({
      isDocumentRelated: true,
      confidence: 0.5,
      reasoning: 'Classification failed, defaulting to document-related',
    });
  }
}
