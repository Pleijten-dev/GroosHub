/**
 * Memory System Prompts
 * Prompts for LLM to analyze conversations and extract/update user memory
 *
 * Inspired by Claude's memory system:
 * - Extract key facts, preferences, and patterns
 * - Keep memory brief and relevant (~500 tokens max)
 * - Focus on actionable context that improves responses
 */

import type { UIMessage } from 'ai';

// ============================================
// Memory Analysis Prompts
// ============================================

/**
 * Prompt for LLM to analyze conversation and extract memory
 * Returns structured memory content
 */
export function getMemoryExtractionPrompt(
  conversationMessages: UIMessage[],
  currentMemory: string,
  locale: 'nl' | 'en' = 'nl'
): string {
  const prompts = {
    nl: `Je bent een geheugensysteem dat belangrijke informatie over gebruikers extraheert uit gesprekken.

## Huidige Gebruikersgeheugen

${currentMemory || '(Nog geen geheugen - dit is de eerste keer)'}

## Recent Gesprek

${formatConversationForAnalysis(conversationMessages, 10)}

## Je Taak

Analyseer het recente gesprek en update het gebruikersgeheugen. Focus op:

1. **Basisinformatie**: Naam, rol, functie (als genoemd)
2. **Voorkeuren**: Hoe de gebruiker graag antwoorden ontvangt
   - Beknopt vs. gedetailleerd
   - Voorkeurstaal
   - Specifieke interesses in bepaalde data/analyses
3. **Patronen**: Terugkerende taken of workflows
   - Bijv: "Vertaalt vaak van Spaans naar Nederlands"
   - Bijv: "Analyseert regelmatig wijken in Amsterdam Noord"
4. **Context**: Huidige projecten of focusgebieden
   - Actieve projecten
   - Specifieke locaties of gebieden van interesse
5. **Interesses**: Onderwerpen die vaak terugkomen
   - Duurzaamheid, stedenbouw, specifieke architectuurstijlen, etc.

## Richtlijnen

- Houd het geheugen BEKNOPT: maximaal ~500 tokens (ongeveer 2000 tekens)
- Vermeld alleen **concrete, verifieerbare feiten** uit het gesprek
- Verwijder verouderde of niet-relevante informatie
- Als er geen nieuwe informatie is, retourneer het huidige geheugen ongewijzigd
- Gebruik een gestructureerd format met bullets en kopjes
- Wees specifiek maar bondig

## Output Format

Geef ALLEEN het bijgewerkte geheugen terug in dit format:

\`\`\`
Naam: [naam indien bekend]
Rol: [rol/functie indien bekend]

Voorkeuren:
- [voorkeur 1]
- [voorkeur 2]

Patronen:
- [patroon 1]
- [patroon 2]

Huidige Context:
- [context item 1]
- [context item 2]

Interesses:
- [interesse 1]
- [interesse 2]
\`\`\`

Als een sectie leeg is, laat deze dan weg. Retourneer ALLEEN de geheugeninhoud, geen uitleg of meta-commentaar.`,

    en: `You are a memory system that extracts important information about users from conversations.

## Current User Memory

${currentMemory || '(No memory yet - this is the first time)'}

## Recent Conversation

${formatConversationForAnalysis(conversationMessages, 10)}

## Your Task

Analyze the recent conversation and update the user memory. Focus on:

1. **Basic Information**: Name, role, function (if mentioned)
2. **Preferences**: How the user likes to receive answers
   - Brief vs. detailed
   - Preferred language
   - Specific interests in certain data/analyses
3. **Patterns**: Recurring tasks or workflows
   - E.g.: "Often translates from Spanish to Dutch"
   - E.g.: "Regularly analyzes Amsterdam Noord neighborhoods"
4. **Context**: Current projects or focus areas
   - Active projects
   - Specific locations or areas of interest
5. **Interests**: Topics that frequently come up
   - Sustainability, urban planning, specific architectural styles, etc.

## Guidelines

- Keep memory BRIEF: max ~500 tokens (about 2000 characters)
- Only mention **concrete, verifiable facts** from the conversation
- Remove outdated or irrelevant information
- If there's no new information, return current memory unchanged
- Use a structured format with bullets and headings
- Be specific but concise

## Output Format

Return ONLY the updated memory in this format:

\`\`\`
Name: [name if known]
Role: [role/function if known]

Preferences:
- [preference 1]
- [preference 2]

Patterns:
- [pattern 1]
- [pattern 2]

Current Context:
- [context item 1]
- [context item 2]

Interests:
- [interest 1]
- [interest 2]
\`\`\`

If a section is empty, omit it. Return ONLY the memory content, no explanation or meta-commentary.`
  };

  return prompts[locale];
}

/**
 * Format conversation messages for memory analysis
 * Includes last N messages with role and content
 */
function formatConversationForAnalysis(messages: UIMessage[], lastN: number = 10): string {
  const recentMessages = messages.slice(-lastN);

  return recentMessages
    .map(msg => {
      const textContent = msg.parts
        .filter(p => p.type === 'text')
        .map(p => ('text' in p ? p.text : ''))
        .join('\n');

      const roleLabel = msg.role === 'user' ? 'Gebruiker' : 'Assistent';
      return `${roleLabel}: ${textContent}`;
    })
    .join('\n\n');
}

/**
 * Prompt to analyze if conversation warrants a memory update
 * Returns boolean decision with brief reasoning
 */
export function getMemoryUpdateDecisionPrompt(
  conversationMessages: UIMessage[],
  currentMemory: string,
  locale: 'nl' | 'en' = 'nl'
): string {
  const prompts = {
    nl: `Analyseer of dit gesprek nieuwe informatie bevat die aan het gebruikersgeheugen toegevoegd moet worden.

## Huidige Gebruikersgeheugen

${currentMemory || '(Nog geen geheugen)'}

## Recent Gesprek

${formatConversationForAnalysis(conversationMessages, 5)}

## Vraag

Bevat dit gesprek nieuwe, waardevolle informatie die aan het geheugen toegevoegd moet worden?

Antwoord met JSON in dit format:
\`\`\`json
{
  "shouldUpdate": true/false,
  "reason": "Korte uitleg (max 100 tekens)",
  "newInformation": ["feit 1", "feit 2"] // alleen als shouldUpdate = true
}
\`\`\``,

    en: `Analyze if this conversation contains new information that should be added to user memory.

## Current User Memory

${currentMemory || '(No memory yet)'}

## Recent Conversation

${formatConversationForAnalysis(conversationMessages, 5)}

## Question

Does this conversation contain new, valuable information that should be added to memory?

Answer with JSON in this format:
\`\`\`json
{
  "shouldUpdate": true/false,
  "reason": "Brief explanation (max 100 chars)",
  "newInformation": ["fact 1", "fact 2"] // only if shouldUpdate = true
}
\`\`\``
  };

  return prompts[locale];
}

// ============================================
// System Prompt Enhancement
// ============================================

/**
 * Format memory for inclusion in system prompt
 * Adds memory section to existing system prompt
 */
export function enhanceSystemPromptWithMemory(
  baseSystemPrompt: string,
  memoryContent: string,
  locale: 'nl' | 'en' = 'nl'
): string {
  if (!memoryContent || memoryContent.trim().length === 0) {
    return baseSystemPrompt;
  }

  const memorySection = locale === 'nl'
    ? `

## Gebruikersgeheugen

Je hebt de volgende context over deze specifieke gebruiker. Gebruik deze informatie om je antwoorden te personaliseren:

${memoryContent}

Let op: Gebruik deze informatie op een natuurlijke manier. Vermeld niet expliciet dat je een "geheugen" hebt, maar pas je antwoorden aan op basis van de voorkeuren en context van de gebruiker.`
    : `

## User Memory

You have the following context about this specific user. Use this information to personalize your responses:

${memoryContent}

Note: Use this information naturally. Don't explicitly mention that you have "memory", but adapt your responses based on the user's preferences and context.`;

  return baseSystemPrompt + memorySection;
}
