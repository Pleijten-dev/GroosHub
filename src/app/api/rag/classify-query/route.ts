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
import { getProjectSourceFiles } from '@/lib/db/queries/project-doc-chunks';

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

    // 3. Fetch actual documents in project to make classification context-aware
    const sourceFiles = await getProjectSourceFiles(projectId);

    if (sourceFiles.length === 0) {
      // No documents in project - skip agent
      console.log('[Query Classifier] No documents in project - returning not document-related');
      return NextResponse.json({
        isDocumentRelated: false,
        confidence: 1.0,
        reasoning: 'Project has no documents uploaded',
      });
    }

    // Build rich document context from actual files with metadata
    const documentContext = sourceFiles
      .map(f => {
        let desc = `- ${f.sourceFile} (${f.chunkCount} chunks)`;
        if (f.documentType) desc += `\n  Type: ${f.documentType}`;
        if (f.summary) desc += `\n  Summary: ${f.summary}`;
        if (f.topics && f.topics.length > 0) desc += `\n  Topics: ${f.topics.join(', ')}`;
        if (f.keyConcepts && f.keyConcepts.length > 0) desc += `\n  Key concepts: ${f.keyConcepts.slice(0, 5).join(', ')}`;
        return desc;
      })
      .join('\n\n');

    console.log(`[Query Classifier] Project has ${sourceFiles.length} document(s) with metadata:\n${documentContext}`);

    // 4. Use cheap model to classify with project-specific context
    // GPT-4o-mini is 60x cheaper than GPT-4o and very fast
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0, // Deterministic classification
      system: `Je bent een query classificatie assistent voor een RAG systeem.

TAAK: Bepaal of een gebruikersvraag gaat over de documenten die in dit project zijn geüpload.

PROJECT DOCUMENTEN:
${documentContext}

CLASSIFICATIE REGELS:

✅ DOCUMENT-RELATED (roep agent aan):
- Vragen over inhoud van de geüploade documenten
- Vragen over specifieke artikelen, paragrafen, tabellen, secties
- Vragen over normen, voorschriften, eisen, regels uit de documenten
- Vragen over specifieke waarden, afmetingen, percentages uit de documenten
- Technische vragen die waarschijnlijk in de documenten staan
- Verzoeken om citaten of verwijzingen naar de documenten
- Voorbeelden (afhankelijk van documenttypen):
  * Bouwbesluit: "Wat is de minimale verdiepingshoogte?" → JA
  * Parkeernorm: "Hoeveel parkeerplaatsen zijn vereist?" → JA
  * Beeldkwaliteitsplan: "Wat zijn de geveleisen?" → JA
  * Stedenbouwkundig plan: "Wat is de maximale bouwhoogte?" → JA
  * Algemeen: "Wat staat er in artikel X?" → JA
  * Algemeen: "Welke eisen gelden voor Y?" → JA

❌ NIET DOCUMENT-RELATED (skip agent, gebruik tools/kennis):
- Vragen over locatieanalyse, demografie, criminaliteit, gezondheid, leefbaarheid
- Vragen over "mijn opgeslagen locaties", "mijn projecten", "mijn data"
- Verzoeken om kaarten, grafieken, visualisaties te tonen
- Vragen over externe data (CBS, RIVM, Google Places, etc.)
- Algemene kennisv ragen die niet specifiek over de documenten gaan
- Chitchat, begroetingen, algemene conversatie
- Tool-based operaties (vergelijken, analyseren van locaties)
- Voorbeelden:
  * "Toon demografie voor mijn locatie" → NEE
  * "Wat is de criminaliteit in Amsterdam?" → NEE
  * "Vergelijk twee locaties" → NEE
  * "Wat is het weer vandaag?" → NEE
  * "Hallo, hoe gaat het?" → NEE
  * "Visualiseer veiligheidsdata" → NEE

BELANGRIJK:
- Als de vraag waarschijnlijk beantwoord kan worden met de geüploade documenten → isDocumentRelated: true
- Als de vraag NIET gaat over de documenten maar over andere data/functionaliteit → isDocumentRelated: false
- Wees specifiek: als iemand vraagt over "parkeren" en er is een parkeernorm document → document-related
- Wees specifiek: als iemand vraagt over "parkeren" maar er zijn alleen Bouwbesluit documenten → mogelijk niet document-related (tenzij Bouwbesluit parkeereisen heeft)

OUTPUT FORMAT:
{
  "isDocumentRelated": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Korte uitleg waarom, vermeld welk document relevant is"
}`,
      prompt: `Classificeer deze query:

"${query}"

Geef antwoord in JSON formaat.`,
    });

    // 5. Parse classification result
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

    // 6. Return classification
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
