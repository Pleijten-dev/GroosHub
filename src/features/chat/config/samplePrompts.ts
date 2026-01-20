/**
 * Sample Prompts Configuration
 *
 * A collection of example prompts shown on the AI assistant overview page.
 * Prompts are categorized and randomly selected to show variety.
 */

// ============================================================================
// Types
// ============================================================================

export interface SamplePrompt {
  id: string;
  category: 'location' | 'tasks' | 'documents' | 'general';
  icon: 'MapPin' | 'CheckSquare' | 'FileText' | 'Sparkles' | 'BarChart' | 'Building' | 'Users' | 'Calendar';
  text: {
    nl: string;
    en: string;
  };
}

// ============================================================================
// Sample Prompts Data
// ============================================================================

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  // Location Analysis
  {
    id: 'loc-1',
    category: 'location',
    icon: 'MapPin',
    text: {
      nl: 'Analyseer de demografische gegevens van Amsterdam Centrum',
      en: 'Analyze the demographic data of Amsterdam Centre',
    },
  },
  {
    id: 'loc-2',
    category: 'location',
    icon: 'BarChart',
    text: {
      nl: 'Vergelijk de veiligheidsscores van Utrecht en Rotterdam',
      en: 'Compare the safety scores of Utrecht and Rotterdam',
    },
  },
  {
    id: 'loc-3',
    category: 'location',
    icon: 'MapPin',
    text: {
      nl: 'Welke voorzieningen zijn beschikbaar binnen 1km van Centraal Station?',
      en: 'What amenities are available within 1km of Central Station?',
    },
  },
  {
    id: 'loc-4',
    category: 'location',
    icon: 'Building',
    text: {
      nl: 'Wat zijn de woningprijzen in de buurt van Zuidas?',
      en: 'What are the housing prices near Zuidas?',
    },
  },
  {
    id: 'loc-5',
    category: 'location',
    icon: 'MapPin',
    text: {
      nl: 'Geef een overzicht van de leefbaarheid in Den Haag Centrum',
      en: 'Give an overview of livability in The Hague Centre',
    },
  },

  // Task Management
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

  // Documents / RAG
  {
    id: 'doc-1',
    category: 'documents',
    icon: 'FileText',
    text: {
      nl: 'Zoek informatie over duurzaamheid in de projectdocumenten',
      en: 'Search for sustainability information in project documents',
    },
  },
  {
    id: 'doc-2',
    category: 'documents',
    icon: 'FileText',
    text: {
      nl: 'Vat het laatste projectrapport samen',
      en: 'Summarize the latest project report',
    },
  },
  {
    id: 'doc-3',
    category: 'documents',
    icon: 'FileText',
    text: {
      nl: 'Wat staat er in de bestemmingsplannen over maximale bouwhoogte?',
      en: 'What do the zoning plans say about maximum building height?',
    },
  },
  {
    id: 'doc-4',
    category: 'documents',
    icon: 'FileText',
    text: {
      nl: 'Welke milieuvoorwaarden worden genoemd in het rapport?',
      en: 'What environmental requirements are mentioned in the report?',
    },
  },

  // General Assistance
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
    text: {
      nl: 'Maak een SWOT-analyse voor dit project',
      en: 'Create a SWOT analysis for this project',
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
 * Get a random selection of prompts, ensuring variety across categories.
 * Tries to include one prompt from each category if possible.
 */
export function getRandomPrompts(locale: 'nl' | 'en', count: number = 4): Array<{
  id: string;
  category: string;
  icon: string;
  text: string;
}> {
  const categories = ['location', 'tasks', 'documents', 'general'] as const;
  const selected: SamplePrompt[] = [];
  const usedIds = new Set<string>();

  // First, try to get one from each category
  for (const category of categories) {
    if (selected.length >= count) break;

    const categoryPrompts = SAMPLE_PROMPTS.filter(
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
    const remaining = SAMPLE_PROMPTS.filter((p) => !usedIds.has(p.id));
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
 */
export function getPromptsByCategory(
  category: SamplePrompt['category'],
  locale: 'nl' | 'en'
): Array<{ id: string; icon: string; text: string }> {
  return SAMPLE_PROMPTS
    .filter((p) => p.category === category)
    .map((p) => ({
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
  general: {
    nl: { label: 'Algemeen', description: 'Algemene hulp en ondersteuning' },
    en: { label: 'General', description: 'General help and assistance' },
  },
};
