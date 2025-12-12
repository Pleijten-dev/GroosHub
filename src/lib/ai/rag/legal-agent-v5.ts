/**
 * Legal RAG Agent with Vercel AI SDK v5 Tool Calling
 *
 * Phase 4: Agentic Reasoning for Complex Legal Queries
 *
 * Uses Vercel AI SDK v5's native tool calling for more reliable agent behavior.
 * The agent can reformulate queries, search multiple times, and reason through results.
 */

import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { findRelevantContent } from './retriever';
import type { RetrievedChunk } from './retriever';

export interface AgentResult {
  answer: string;
  reasoning: string[];
  sources: RetrievedChunk[];
  confidence: 'high' | 'medium' | 'low';
  executionTimeMs: number;
}

export interface AgentOptions {
  projectId: string;
  query: string;
  maxSteps?: number;
  model?: string;
}

export class LegalRAGAgent {
  private projectId: string;
  private allSources: RetrievedChunk[] = [];
  private reasoning: string[] = [];

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Main agent execution with tool calling
   */
  async query(options: AgentOptions): Promise<AgentResult> {
    const startTime = Date.now();
    const model = options.model || 'gpt-4o';
    const maxSteps = options.maxSteps || 5;

    this.allSources = [];
    this.reasoning = [];

    console.log(`[Legal Agent] Starting query: "${options.query}"`);

    try {
      // Define tools the agent can use
      const tools = {
        // Tool 1: Search the Bouwbesluit
        search_bouwbesluit: tool({
          description: 'Zoekt artikelen, tabellen en paragrafen in het Bouwbesluit 2012. ' +
            'Gebruik dit om relevante informatie op te halen. ' +
            'Je kunt meerdere keren zoeken met verschillende zoekvragen.',
          parameters: z.object({
            query: z.string().describe('De zoekterm. Gebruik juridische terminologie zoals "verblijfsgebied", "verblijfsruimte", "woonfunctie".'),
            reasoning: z.string().describe('Waarom zoek je dit? Wat verwacht je te vinden?')
          }),
          execute: async ({ query, reasoning }) => {
            console.log(`[Legal Agent] Search: "${query}" (${reasoning})`);
            this.reasoning.push(`🔍 Zoeken: "${query}" - ${reasoning}`);

            const chunks = await findRelevantContent({
              projectId: this.projectId,
              query,
              topK: 5,
              similarityThreshold: 0.3,
              useHybridSearch: true
            });

            this.allSources.push(...chunks);

            const resultText = chunks.length > 0
              ? chunks.slice(0, 3).map((c, i) =>
                  `[${i + 1}] ${c.sourceFile} (score: ${(c.similarity * 100).toFixed(1)}%)\n${c.chunkText.substring(0, 300)}...`
                ).join('\n\n')
              : 'Geen resultaten gevonden voor deze zoekopdracht.';

            return resultText;
          }
        }),

        // Tool 2: Provide final answer
        provide_answer: tool({
          description: 'Geef het definitieve antwoord op de vraag. ' +
            'Gebruik dit alleen als je voldoende informatie hebt verzameld. ' +
            'Vermeld altijd de exacte artikel- en tabelnummers als bronnen.',
          parameters: z.object({
            answer: z.string().describe('Het complete antwoord met bronvermelding (artikel/tabel nummers)'),
            confidence: z.enum(['high', 'medium', 'low']).describe('Hoe zeker ben je van dit antwoord?'),
            reasoning: z.string().describe('Waarom is dit het juiste antwoord? Welke bronnen ondersteunen dit?')
          }),
          execute: async ({ answer, confidence, reasoning }) => {
            console.log(`[Legal Agent] Final answer (${confidence} confidence): ${answer.substring(0, 100)}...`);
            this.reasoning.push(`✅ Antwoord (${confidence}): ${reasoning}`);
            return { answer, confidence, reasoning };
          }
        })
      };

      // Execute agent with tool calling
      const result = await generateText({
        model: openai(model),
        tools,
        maxSteps,
        system: this.getSystemPrompt(),
        prompt: options.query,
        onStepFinish: (step) => {
          console.log(`[Legal Agent] Step ${step.stepNumber}: ${step.toolCalls?.length || 0} tool calls`);
          if (step.text) {
            console.log(`[Legal Agent] Reasoning: ${step.text.substring(0, 200)}...`);
          }
        }
      });

      const executionTimeMs = Date.now() - startTime;

      // Extract answer from tool results
      const answerTool = result.toolResults?.find(tr => tr.toolName === 'provide_answer');
      const answerData = answerTool?.result as { answer: string; confidence: string; reasoning: string } | undefined;

      const finalAnswer = answerData?.answer || result.text || 'Kon geen antwoord vinden.';
      const confidence = (answerData?.confidence as 'high' | 'medium' | 'low') || 'low';

      console.log(`[Legal Agent] Completed in ${executionTimeMs}ms with ${this.reasoning.length} steps`);

      return {
        answer: finalAnswer,
        reasoning: this.reasoning,
        sources: this.dedupeSources(this.allSources),
        confidence,
        executionTimeMs
      };

    } catch (error) {
      console.error('[Legal Agent] Error:', error);
      throw new Error(`Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * System prompt for the agent
   */
  private getSystemPrompt(): string {
    return `Je bent een juridisch assistent gespecialiseerd in het Bouwbesluit 2012.

Je helpt gebruikers door hun vragen te beantwoorden met behulp van de beschikbare tools.

BELANGRIJKE STRATEGIE:

1. **Query Reformulering**: Gebruikers gebruiken vaak alledaagse termen, maar het Bouwbesluit
   gebruikt juridische terminologie:
   - "verdiepingshoogte" → zoek naar "verblijfsgebied", "verblijfsruimte", "hoogte"
   - "woning" → zoek naar "woonfunctie"
   - "minimale afmetingen" → zoek naar tabellen met normwaarden

2. **Meerdere Zoekopdrachten**: Als je eerste zoekopdracht niet genoeg oplevert:
   - Probeer andere zoektermen
   - Zoek naar gerelateerde artikelen
   - Zoek specifiek naar tabelnummers als een artikel daarna verwijst

3. **Tabellen Interpreteren**: Als je een tabel vindt:
   - Lees de kolommen en rijen zorgvuldig
   - Let op de eenheden (m, m², etc.)
   - Let op verschillende subcategorieën (woonwagen vs andere woonfunctie)

4. **Bronvermelding**: Vermeld ALTIJD:
   - Exacte artikel nummer (bijv. "Artikel 4.164 lid 4")
   - Exacte tabel nummer (bijv. "Tabel 4.162")
   - Welke rij/kolom in de tabel (bijv. "woonfunctie - andere woonfunctie")

5. **Eerlijkheid**: Als je iets niet zeker weet of niet kunt vinden, zeg dat dan.

VOORBEELD WERKWIJZE:

Vraag: "Wat is de minimale vrije verdiepingshoogte voor een woning?"

Stap 1: Reformuleer - dit gaat over "hoogte" van "verblijfsgebied" voor "woonfunctie"
Stap 2: Zoek → "verblijfsgebied verblijfsruimte hoogte woonfunctie"
Stap 3: Vind Artikel 4.164 → verwijst naar Tabel 4.162
Stap 4: Zoek → "Tabel 4.162" om de exacte tabel te vinden
Stap 5: Lees tabel → woonfunctie "andere woonfunctie" heeft hoogte 2,6 m
Stap 6: Antwoord met bronnen

Begin met analyseren en zoeken!`;
  }

  /**
   * Deduplicate sources by chunk ID
   */
  private dedupeSources(sources: RetrievedChunk[]): RetrievedChunk[] {
    const seen = new Set<string>();
    return sources.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }
}
