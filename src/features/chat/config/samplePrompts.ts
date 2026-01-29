/**
 * Sample Prompts Configuration
 *
 * A collection of example prompts shown on the AI assistant overview page.
 * Prompts are categorized and randomly selected to show variety.
 *
 * Context types:
 * - 'project': Only shown in project chat (ProjectOverviewPage)
 * - 'personal': Only shown in personal chat (OverviewPage)
 * - 'both': Shown in both contexts (default)
 */

// ============================================================================
// Types
// ============================================================================

export type PromptContext = 'project' | 'personal' | 'both';

export interface SamplePrompt {
  id: string;
  category: 'location' | 'tasks' | 'documents' | 'general' | 'notes';
  icon: 'MapPin' | 'CheckSquare' | 'FileText' | 'Sparkles' | 'BarChart' | 'Building' | 'Users' | 'Calendar' | 'Search' | 'StickyNote';
  context?: PromptContext; // Default: 'both'
  text: {
    nl: string;
    en: string;
  };
}

// ============================================================================
// Sample Prompts Data
// ============================================================================

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  // ============================================================================
  // Location Analysis - Project Context (uses project's saved location data)
  // ============================================================================
  {
    id: 'loc-proj-1',
    category: 'location',
    icon: 'MapPin',
    context: 'project',
    text: {
      nl: 'Analyseer de demografische gegevens van deze locatie',
      en: 'Analyze the demographic data of this location',
    },
  },
  {
    id: 'loc-proj-2',
    category: 'location',
    icon: 'BarChart',
    context: 'project',
    text: {
      nl: 'Wat zijn de veiligheidsscores voor deze projectlocatie?',
      en: 'What are the safety scores for this project location?',
    },
  },
  {
    id: 'loc-proj-3',
    category: 'location',
    icon: 'MapPin',
    context: 'project',
    text: {
      nl: 'Welke voorzieningen zijn er in de buurt van de projectlocatie?',
      en: 'What amenities are available near the project location?',
    },
  },
  {
    id: 'loc-proj-4',
    category: 'location',
    icon: 'Building',
    context: 'project',
    text: {
      nl: 'Wat zijn de woningprijzen in dit gebied?',
      en: 'What are the housing prices in this area?',
    },
  },
  {
    id: 'loc-proj-5',
    category: 'location',
    icon: 'MapPin',
    context: 'project',
    text: {
      nl: 'Geef een overzicht van de leefbaarheid op deze locatie',
      en: 'Give an overview of livability at this location',
    },
  },
  {
    id: 'loc-proj-6',
    category: 'location',
    icon: 'Users',
    context: 'project',
    text: {
      nl: 'Welke doelgroepen passen het beste bij deze locatie?',
      en: 'Which target groups best fit this location?',
    },
  },

  // ============================================================================
  // Location Analysis - Personal Context (CBS database search for any location)
  // ============================================================================
  {
    id: 'loc-search-1',
    category: 'location',
    icon: 'Search',
    context: 'personal',
    text: {
      nl: 'Zoek CBS gegevens voor Amsterdam Centrum',
      en: 'Search CBS data for Amsterdam Centre',
    },
  },
  {
    id: 'loc-search-2',
    category: 'location',
    icon: 'Search',
    context: 'personal',
    text: {
      nl: 'Wat zijn de bevolkingscijfers van Utrecht Overvecht?',
      en: 'What are the population statistics for Utrecht Overvecht?',
    },
  },
  {
    id: 'loc-search-3',
    category: 'location',
    icon: 'Search',
    context: 'personal',
    text: {
      nl: 'Zoek veiligheidscijfers voor Rotterdam Zuid',
      en: 'Search safety statistics for Rotterdam South',
    },
  },
  {
    id: 'loc-search-4',
    category: 'location',
    icon: 'Search',
    context: 'personal',
    text: {
      nl: 'Toon de leefbaarheidsscores van Den Haag Centrum',
      en: 'Show livability scores for The Hague Centre',
    },
  },

  // ============================================================================
  // Task Management (works in both contexts)
  // ============================================================================
  {
    id: 'task-1',
    category: 'tasks',
    icon: 'CheckSquare',
    text: {
      nl: 'Toon alle openstaande taken voor deze week',
      en: 'Show all open tasks for this week',
    },
  },
  {
    id: 'task-2',
    category: 'tasks',
    icon: 'CheckSquare',
    text: {
      nl: 'Welke taken hebben de hoogste prioriteit?',
      en: 'Which tasks have the highest priority?',
    },
  },
  {
    id: 'task-3',
    category: 'tasks',
    icon: 'Calendar',
    text: {
      nl: 'Wat zijn de deadlines voor de komende 2 weken?',
      en: 'What are the deadlines for the next 2 weeks?',
    },
  },
  {
    id: 'task-4',
    category: 'tasks',
    icon: 'Users',
    text: {
      nl: 'Aan wie zijn de meeste taken toegewezen?',
      en: 'Who has the most tasks assigned?',
    },
  },
  {
    id: 'task-5',
    category: 'tasks',
    icon: 'Calendar',
    text: {
      nl: 'Welke taken zijn achterstallig?',
      en: 'Which tasks are overdue?',
    },
  },

  // ============================================================================
  // Documents / RAG (project context only - requires uploaded documents)
  // ============================================================================
  {
    id: 'doc-1',
    category: 'documents',
    icon: 'FileText',
    context: 'project',
    text: {
      nl: 'Zoek informatie over duurzaamheid in de projectdocumenten',
      en: 'Search for sustainability information in project documents',
    },
  },
  {
    id: 'doc-2',
    category: 'documents',
    icon: 'FileText',
    context: 'project',
    text: {
      nl: 'Wat staat er in de bestemmingsplannen over maximale bouwhoogte?',
      en: 'What do the zoning plans say about maximum building height?',
    },
  },
  {
    id: 'doc-3',
    category: 'documents',
    icon: 'FileText',
    context: 'project',
    text: {
      nl: 'Welke milieuvoorwaarden worden genoemd in de documenten?',
      en: 'What environmental requirements are mentioned in the documents?',
    },
  },

  // ============================================================================
  // Notes (works in both contexts)
  // ============================================================================
  {
    id: 'note-1',
    category: 'notes',
    icon: 'StickyNote',
    text: {
      nl: 'Vat mijn laatste notities samen',
      en: 'Summarize my latest notes',
    },
  },
  {
    id: 'note-2',
    category: 'notes',
    icon: 'StickyNote',
    text: {
      nl: 'Maak een notitie over de voortgang van vandaag',
      en: 'Create a note about today\'s progress',
    },
  },
  {
    id: 'note-3',
    category: 'notes',
    icon: 'StickyNote',
    context: 'project',
    text: {
      nl: 'Wat zijn de belangrijkste punten uit mijn projectnotities?',
      en: 'What are the key points from my project notes?',
    },
  },

  // ============================================================================
  // General Assistance (works in both contexts)
  // ============================================================================
  {
    id: 'gen-1',
    category: 'general',
    icon: 'Sparkles',
    text: {
      nl: 'Help me een projectplanning opstellen',
      en: 'Help me create a project schedule',
    },
  },
  {
    id: 'gen-2',
    category: 'general',
    icon: 'Sparkles',
    text: {
      nl: 'Schrijf een e-mail naar de stakeholders over de voortgang',
      en: 'Write an email to stakeholders about progress',
    },
  },
  {
    id: 'gen-3',
    category: 'general',
    icon: 'Sparkles',
    text: {
      nl: 'Geef tips voor een effectieve teamvergadering',
      en: 'Give tips for an effective team meeting',
    },
  },
  {
    id: 'gen-4',
    category: 'general',
    icon: 'BarChart',
    context: 'project',
    text: {
      nl: 'Maak een SWOT-analyse voor deze projectlocatie',
      en: 'Create a SWOT analysis for this project location',
    },
  },
  {
    id: 'gen-5',
    category: 'general',
    icon: 'Sparkles',
    text: {
      nl: 'Hoe kan ik de samenwerking in het team verbeteren?',
      en: 'How can I improve team collaboration?',
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter prompts by context.
 * - 'project': Include prompts with context 'project' or 'both' (or undefined)
 * - 'personal': Include prompts with context 'personal' or 'both' (or undefined)
 */
function filterByContext(prompts: SamplePrompt[], context: PromptContext): SamplePrompt[] {
  return prompts.filter((p) => {
    const promptContext = p.context || 'both';
    return promptContext === 'both' || promptContext === context;
  });
}

/**
 * Get a random selection of prompts, ensuring variety across categories.
 * Tries to include one prompt from each category if possible.
 *
 * @param locale - Language for prompt text ('nl' or 'en')
 * @param count - Number of prompts to return (default: 4)
 * @param context - Context for filtering prompts ('project' or 'personal', default: 'personal')
 */
export function getRandomPrompts(
  locale: 'nl' | 'en',
  count: number = 4,
  context: 'project' | 'personal' = 'personal'
): Array<{
  id: string;
  category: string;
  icon: string;
  text: string;
}> {
  // Filter prompts by context first
  const availablePrompts = filterByContext(SAMPLE_PROMPTS, context);

  // Determine which categories to use based on context
  const categories = context === 'project'
    ? ['location', 'tasks', 'documents', 'notes', 'general'] as const
    : ['location', 'tasks', 'notes', 'general'] as const;

  const selected: SamplePrompt[] = [];
  const usedIds = new Set<string>();

  // First, try to get one from each category
  for (const category of categories) {
    if (selected.length >= count) break;

    const categoryPrompts = availablePrompts.filter(
      (p) => p.category === category && !usedIds.has(p.id)
    );

    if (categoryPrompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * categoryPrompts.length);
      const prompt = categoryPrompts[randomIndex];
      selected.push(prompt);
      usedIds.add(prompt.id);
    }
  }

  // If we need more, fill with random prompts
  while (selected.length < count) {
    const remaining = availablePrompts.filter((p) => !usedIds.has(p.id));
    if (remaining.length === 0) break;

    const randomIndex = Math.floor(Math.random() * remaining.length);
    const prompt = remaining[randomIndex];
    selected.push(prompt);
    usedIds.add(prompt.id);
  }

  // Shuffle the final selection
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected.map((p) => ({
    id: p.id,
    category: p.category,
    icon: p.icon,
    text: p.text[locale],
  }));
}

/**
 * Get all prompts for a specific category.
 *
 * @param category - The category to filter by
 * @param locale - Language for prompt text
 * @param context - Optional context filter ('project' or 'personal')
 */
export function getPromptsByCategory(
  category: SamplePrompt['category'],
  locale: 'nl' | 'en',
  context?: 'project' | 'personal'
): Array<{ id: string; icon: string; text: string }> {
  let prompts = SAMPLE_PROMPTS.filter((p) => p.category === category);

  // Apply context filter if provided
  if (context) {
    prompts = filterByContext(prompts, context);
  }

  return prompts.map((p) => ({
    id: p.id,
    icon: p.icon,
    text: p.text[locale],
  }));
}

/**
 * Category metadata for display.
 */
export const CATEGORY_META = {
  location: {
    nl: { label: 'Locatie Analyse', description: 'Analyseer locaties en gebieden' },
    en: { label: 'Location Analysis', description: 'Analyze locations and areas' },
  },
  tasks: {
    nl: { label: 'Taken', description: 'Beheer je taken en deadlines' },
    en: { label: 'Tasks', description: 'Manage your tasks and deadlines' },
  },
  documents: {
    nl: { label: 'Documenten', description: 'Zoek in je projectdocumenten' },
    en: { label: 'Documents', description: 'Search your project documents' },
  },
  notes: {
    nl: { label: 'Notities', description: 'Beheer je notities' },
    en: { label: 'Notes', description: 'Manage your notes' },
  },
  general: {
    nl: { label: 'Algemeen', description: 'Algemene hulp en ondersteuning' },
    en: { label: 'General', description: 'General help and assistance' },
  },
};
