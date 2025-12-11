/**
 * Legal RAG Agent
 *
 * Phase 4: Agentic Reasoning for Complex Legal Queries
 *
 * PROBLEM: Complex queries like "wat is de minimale vrije verdiepingshoogte?"
 *          require multi-step reasoning that standard RAG can't handle.
 *
 * SOLUTION: Agent that can:
 *           1. Analyze query complexity
 *           2. Break down into sub-questions
 *           3. Execute retrieval tools
 *           4. Reason about results
 *           5. Follow cross-references
 *           6. Synthesize final answer
 *
 * ARCHITECTURE: ReAct Pattern (Reason → Act → Observe)
 *
 * Based on 2024 research:
 * - ReAct (Reason + Act): https://arxiv.org/abs/2210.03629
 * - Multi-agent legal RAG: https://medium.com/enterprise-rag/legal-document-rag-multi-graph-multi-agent-recursive-retrieval-through-legal-clauses-c90e073e0052
 * - Agent frameworks: LangChain, LlamaIndex, Vercel AI SDK agents
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { multiHopRetrieve } from './multi-hop-retriever';
import type { RetrievedChunk } from './retriever';

export interface AgentStep {
  stepNumber: number;
  thought: string;      // Agent's reasoning
  action: string;       // What action to take
  actionInput: string;  // Input for the action
  observation: string;  // Result of the action
  isComplete: boolean;  // Is this the final answer?
}

export interface AgentResult {
  answer: string;
  steps: AgentStep[];
  sources: RetrievedChunk[];
  confidence: 'high' | 'medium' | 'low';
  executionTimeMs: number;
}

export interface AgentOptions {
  projectId: string;
  query: string;
  maxSteps?: number;      // Default: 5
  model?: string;         // Default: 'gpt-4o-mini'
}

export class LegalRAGAgent {
  private readonly MAX_STEPS = 5;

  /**
   * System prompt for the legal reasoning agent
   */
  private getSystemPrompt(): string {
    return `Je bent een juridisch assistent gespecialiseerd in het Bouwbesluit 2012.

Je taak is om vragen over het Bouwbesluit te beantwoorden door stap-voor-stap te redeneren
en gebruik te maken van de beschikbare tools.

BESCHIKBARE TOOLS:

1. search(query: string)
   - Zoekt relevante artikelen, tabellen en paragrafen in het Bouwbesluit
   - Gebruik dit om informatie op te halen
   - Voorbeeld: search("artikel 4.162 verblijfsgebied")

2. follow_reference(reference: string)
   - Volg een kruisverwijzing naar een artikel of tabel
   - Gebruik dit als een artikel verwijst naar een andere bron
   - Voorbeeld: follow_reference("Tabel 4.162")

3. answer(tekst: string)
   - Geef het definitieve antwoord
   - Gebruik dit alleen als je genoeg informatie hebt
   - Vermeld altijd bronnen (artikel/tabelnummers)

REDENEER METHODE (ReAct):

Bij elke stap, geef je output in dit formaat:

Gedachte: [Wat denk ik nu? Wat weet ik al? Wat moet ik nog uitzoeken?]
Actie: [Welke tool ga ik gebruiken: search, follow_reference, of answer]
Actie Input: [De input voor die tool]

BELANGRIJKE REGELS:

1. Als een artikel verwijst naar een tabel, MOET je die tabel ook ophalen
2. Als een vraag over afmetingen gaat, zoek naar tabellen met normwaarden
3. Citeer altijd de exacte artikel- en tabelnummers
4. Als je het antwoord niet zeker weet, zeg dat dan eerlijk
5. Gebruik maximaal 5 stappen

VOORBEELD REDENERING:

Vraag: "Wat is de minimale vrije verdiepingshoogte voor een woning?"

Stap 1:
Gedachte: Dit gaat over hoogte-eisen voor woningen. In het Bouwbesluit staan normen voor verblijfsgebied/verblijfsruimte in Afdeling 4.1. Ik moet zoeken naar artikelen over hoogte.
Actie: search
Actie Input: hoogte verblijfsgebied verblijfsruimte woonfunctie

Stap 2:
Gedachte: Ik heb Artikel 4.164 gevonden dat zegt "hebben ten minste de in tabel 4.162 aangegeven hoogte". Dit artikel verwijst naar Tabel 4.162. Ik moet die tabel ophalen.
Actie: follow_reference
Actie Input: Tabel 4.162

Stap 3:
Gedachte: Ik heb nu Tabel 4.162. Voor "woonfunctie – andere woonfunctie" staat bij hoogte: 2,6 m. Dit is het antwoord.
Actie: answer
Actie Input: De minimale vrije verdiepingshoogte voor een woonfunctie (woning) is 2,6 meter. Dit geldt voor verblijfsgebied en verblijfsruimte, conform Artikel 4.164 lid 4 in samenhang met Tabel 4.162 (rij "woonfunctie – andere woonfunctie", kolom afmetingen verblijfsgebied en verblijfsruimte).

Begin nu met redeneren!`;
  }

  /**
   * Parse agent's response to extract thought, action, and action input
   */
  private parseAgentResponse(response: string): {
    thought: string;
    action: string;
    actionInput: string;
  } | null {
    try {
      // Extract thought
      const thoughtMatch = response.match(/Gedachte:\s*(.+?)(?=\nActie:|\Z)/is);
      const thought = thoughtMatch ? thoughtMatch[1].trim() : '';

      // Extract action
      const actionMatch = response.match(/Actie:\s*(\w+)/i);
      const action = actionMatch ? actionMatch[1].toLowerCase() : '';

      // Extract action input
      const inputMatch = response.match(/Actie Input:\s*(.+?)$/is);
      const actionInput = inputMatch ? inputMatch[1].trim() : '';

      if (!action) return null;

      return { thought, action, actionInput };
    } catch (error) {
      console.error('[Agent] Failed to parse response:', error);
      return null;
    }
  }

  /**
   * Execute an agent action
   */
  private async executeAction(
    action: string,
    actionInput: string,
    projectId: string,
    allRetrievedChunks: RetrievedChunk[]
  ): Promise<{ observation: string; newChunks: RetrievedChunk[] }> {
    console.log(`[Agent] Executing action: ${action}("${actionInput}")`);

    if (action === 'search') {
      // Execute multi-hop search
      const chunks = await multiHopRetrieve({
        projectId,
        initialQuery: actionInput,
        maxHops: 2,
        topKPerHop: 5
      });

      const observation = chunks.length > 0
        ? `Gevonden ${chunks.length} relevante stukken:\n\n` +
          chunks.slice(0, 3).map((c, i) =>
            `[${i + 1}] ${c.sourceFile}\n${c.text.substring(0, 300)}...\n`
          ).join('\n')
        : 'Geen relevante informatie gevonden.';

      return { observation, newChunks: chunks };
    }

    if (action === 'follow_reference') {
      // Search for specific reference
      const chunks = await multiHopRetrieve({
        projectId,
        initialQuery: actionInput,
        maxHops: 1,
        topKPerHop: 3
      });

      const observation = chunks.length > 0
        ? `Gevonden: ${actionInput}\n\n${chunks[0].text.substring(0, 500)}...`
        : `${actionInput} niet gevonden.`;

      return { observation, newChunks: chunks };
    }

    if (action === 'answer') {
      // Final answer
      return {
        observation: `FINAL ANSWER: ${actionInput}`,
        newChunks: []
      };
    }

    return {
      observation: `Onbekende actie: ${action}`,
      newChunks: []
    };
  }

  /**
   * Run the agent loop
   */
  async run(options: AgentOptions): Promise<AgentResult> {
    const startTime = Date.now();
    const maxSteps = options.maxSteps || this.MAX_STEPS;
    const model = options.model || 'gpt-4o-mini';

    const steps: AgentStep[] = [];
    const allChunks: RetrievedChunk[] = [];

    let conversationHistory = `Vraag: ${options.query}\n\n`;

    console.log(`[Agent] Starting reasoning for: "${options.query}"`);

    for (let stepNum = 1; stepNum <= maxSteps; stepNum++) {
      console.log(`[Agent] Step ${stepNum}/${maxSteps}`);

      // Generate agent's reasoning
      const { text } = await generateText({
        model: openai(model),
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: conversationHistory }
        ],
        temperature: 0.1 // Low temperature for consistent reasoning
      });

      console.log(`[Agent] Response:\n${text}`);

      // Parse response
      const parsed = this.parseAgentResponse(text);

      if (!parsed) {
        console.error('[Agent] Failed to parse response, stopping');
        break;
      }

      // Check if this is the final answer
      const isComplete = parsed.action === 'answer';

      // Execute action
      const { observation, newChunks } = await this.executeAction(
        parsed.action,
        parsed.actionInput,
        options.projectId,
        allChunks
      );

      allChunks.push(...newChunks);

      // Record step
      steps.push({
        stepNumber: stepNum,
        thought: parsed.thought,
        action: parsed.action,
        actionInput: parsed.actionInput,
        observation,
        isComplete
      });

      // Update conversation history
      conversationHistory += `\n${text}\nObservatie: ${observation}\n\n`;

      // Stop if agent gave final answer
      if (isComplete) {
        console.log(`[Agent] Final answer reached at step ${stepNum}`);
        break;
      }
    }

    const executionTime = Date.now() - startTime;

    // Extract final answer
    const finalStep = steps[steps.length - 1];
    const answer = finalStep?.isComplete
      ? finalStep.actionInput
      : 'Ik kon geen definitief antwoord vinden binnen de beschikbare stappen.';

    // Assess confidence
    const confidence = this.assessConfidence(steps, allChunks);

    console.log(`[Agent] Complete in ${steps.length} steps (${executionTime}ms)`);

    return {
      answer,
      steps,
      sources: allChunks,
      confidence,
      executionTimeMs: executionTime
    };
  }

  /**
   * Assess confidence in the answer
   */
  private assessConfidence(
    steps: AgentStep[],
    chunks: RetrievedChunk[]
  ): 'high' | 'medium' | 'low' {
    // High confidence if:
    // - Agent found relevant chunks
    // - Agent followed references
    // - Agent completed within step limit

    const foundRelevantInfo = chunks.length > 0;
    const followedReferences = steps.some(s => s.action === 'follow_reference');
    const completedSuccessfully = steps[steps.length - 1]?.isComplete;

    if (foundRelevantInfo && followedReferences && completedSuccessfully) {
      return 'high';
    }

    if (foundRelevantInfo && completedSuccessfully) {
      return 'medium';
    }

    return 'low';
  }
}

/**
 * Convenience function for single-call agent execution
 */
export async function askLegalAgent(
  projectId: string,
  query: string
): Promise<AgentResult> {
  const agent = new LegalRAGAgent();
  return agent.run({ projectId, query });
}
