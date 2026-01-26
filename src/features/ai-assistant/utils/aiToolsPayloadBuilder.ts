/**
 * AI Tools Payload Builder
 *
 * Builds complete prompts for each AI tool with all required context data.
 * This allows testing tool prompts without making actual LLM API calls.
 */

import type { CompactLocationExport } from '@/features/location/utils/jsonExportCompact';

// ============================================
// Types
// ============================================

export type AIToolTab =
  | 'doelgroepen'
  | 'score'
  | 'demografie'
  | 'veiligheid'
  | 'gezondheid'
  | 'leefbaarheid'
  | 'voorzieningen'
  | 'woningmarkt'
  | 'kaarten'
  | 'pve'
  | 'genereer-rapport';

export interface AITool {
  id: string;
  tab: AIToolTab;
  label: string;
  labelNl: string;
  description: string;
  descriptionNl: string;
  icon: string;
  isPrimary?: boolean;
  isAgentic?: boolean; // Tools that support multi-turn conversation
  isDisabled?: boolean; // Tools that are not yet available
  disabledReason?: string;
  outputFormat: 'direct' | 'interactive' | 'table';
  requiresData: (keyof CompactLocationExport)[];
}

export interface AIToolPayload {
  tool: AITool;
  systemPrompt: string;
  userPrompt: string;
  contextData: Record<string, unknown>;
  fullPrompt: string; // Combined system + user + data for display
}

// ============================================
// All AI Tools Definition
// ============================================

export const AI_TOOLS: AITool[] = [
  // === DOELGROEPEN TAB ===
  {
    id: 'doelgroepen-explain-scenario',
    tab: 'doelgroepen',
    label: 'Explain Scenarios',
    labelNl: 'Leg scenario\'s uit',
    description: 'Explain why specific personas are matched to this location based on R-rank scoring',
    descriptionNl: 'Leg uit waarom specifieke persona\'s gekoppeld zijn aan deze locatie op basis van R-rank scoring',
    icon: 'cube',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['targetGroups', 'allPersonas', 'demographics', 'amenities'],
  },
  {
    id: 'doelgroepen-suggest-best',
    tab: 'doelgroepen',
    label: 'Suggest Best Fit',
    labelNl: 'Stel beste keuze voor',
    description: 'Recommend the optimal target group scenario based on all location data',
    descriptionNl: 'Adviseer het optimale doelgroepscenario op basis van alle locatiegegevens',
    icon: 'target',
    outputFormat: 'direct',
    requiresData: ['targetGroups', 'allPersonas', 'demographics', 'amenities', 'housingMarket'],
  },
  {
    id: 'doelgroepen-compare',
    tab: 'doelgroepen',
    label: 'Compare Options',
    labelNl: 'Vergelijk opties',
    description: 'Create a comparison table (✓/-/X) showing trade-offs between scenarios',
    descriptionNl: 'Maak een vergelijkingstabel (✓/-/X) met afwegingen tussen scenario\'s',
    icon: 'compare',
    outputFormat: 'table',
    requiresData: ['targetGroups', 'allPersonas'],
  },

  // === SCORE TAB ===
  {
    id: 'score-explain-breakdown',
    tab: 'score',
    label: 'Explain Breakdown',
    labelNl: 'Leg scores uit',
    description: 'Detail what factors contribute to each category score',
    descriptionNl: 'Leg uit welke factoren bijdragen aan elke categoriescore',
    icon: 'chart',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['demographics', 'health', 'safety', 'livability', 'amenities', 'housingMarket'],
  },
  {
    id: 'score-improvement-tips',
    tab: 'score',
    label: 'Improvement Tips',
    labelNl: 'Verbeterpunten',
    description: 'Actionable recommendations to improve weaker scores',
    descriptionNl: 'Concrete aanbevelingen om zwakkere scores te verbeteren',
    icon: 'target',
    outputFormat: 'direct',
    requiresData: ['demographics', 'health', 'safety', 'livability', 'amenities'],
  },
  {
    id: 'score-executive-summary',
    tab: 'score',
    label: 'Executive Summary (SWOT)',
    labelNl: 'Samenvatting (SWOT)',
    description: 'Generate SWOT analysis with strengths, weaknesses, opportunities, threats',
    descriptionNl: 'Genereer SWOT-analyse met sterktes, zwaktes, kansen en bedreigingen',
    icon: 'summary',
    outputFormat: 'direct',
    requiresData: ['metadata', 'demographics', 'health', 'safety', 'livability', 'amenities', 'housingMarket'],
  },

  // === DEMOGRAFIE TAB ===
  {
    id: 'demografie-population-profile',
    tab: 'demografie',
    label: 'Population Profile',
    labelNl: 'Bevolkingsprofiel',
    description: 'Summarize key demographic characteristics of the area',
    descriptionNl: 'Vat de belangrijkste demografische kenmerken van het gebied samen',
    icon: 'users',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['demographics', 'metadata'],
  },
  {
    id: 'demografie-service-recommendations',
    tab: 'demografie',
    label: 'Service Recommendations',
    labelNl: 'Aanbevelingen voorzieningen',
    description: 'Recommend services this population would benefit from',
    descriptionNl: 'Adviseer voorzieningen waar deze bevolking van zou profiteren',
    icon: 'building',
    outputFormat: 'direct',
    requiresData: ['demographics', 'amenities'],
  },
  {
    id: 'demografie-scenario-comparison',
    tab: 'demografie',
    label: 'Scenario Comparison',
    labelNl: 'Scenario vergelijking',
    description: 'Compare how different development scenarios match demographics',
    descriptionNl: 'Vergelijk hoe verschillende ontwikkelscenario\'s passen bij de demografie',
    icon: 'compare',
    outputFormat: 'table',
    requiresData: ['demographics', 'targetGroups', 'allPersonas'],
  },

  // === VEILIGHEID TAB ===
  {
    id: 'veiligheid-safety-assessment',
    tab: 'veiligheid',
    label: 'Safety Assessment',
    labelNl: 'Veiligheidsanalyse',
    description: 'Comprehensive safety risk analysis with key concerns',
    descriptionNl: 'Uitgebreide veiligheidsrisicoanalyse met belangrijkste zorgen',
    icon: 'shield',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['safety', 'metadata'],
  },
  {
    id: 'veiligheid-improvements',
    tab: 'veiligheid',
    label: 'Improvements',
    labelNl: 'Verbeteringen',
    description: 'Suggest design and community measures to improve safety',
    descriptionNl: 'Stel ontwerp- en gemeenschapsmaatregelen voor om de veiligheid te verbeteren',
    icon: 'check',
    outputFormat: 'direct',
    requiresData: ['safety', 'livability'],
  },
  {
    id: 'veiligheid-benchmarking',
    tab: 'veiligheid',
    label: 'Benchmarking',
    labelNl: 'Benchmark vergelijking',
    description: 'Compare safety metrics to municipal and national averages',
    descriptionNl: 'Vergelijk veiligheidsmetrieken met gemeentelijke en nationale gemiddelden',
    icon: 'compare',
    outputFormat: 'table',
    requiresData: ['safety'],
  },

  // === GEZONDHEID TAB ===
  {
    id: 'gezondheid-health-needs',
    tab: 'gezondheid',
    label: 'Health Needs',
    labelNl: 'Gezondheidsbehoeften',
    description: 'Identify priority health concerns for this population',
    descriptionNl: 'Identificeer prioritaire gezondheidsbehoeften voor deze populatie',
    icon: 'heart',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['health', 'demographics'],
  },
  {
    id: 'gezondheid-wellness-programs',
    tab: 'gezondheid',
    label: 'Wellness Programs',
    labelNl: 'Welzijnsprogramma\'s',
    description: 'Suggest wellness initiatives based on health profile',
    descriptionNl: 'Stel welzijnsinitiatieven voor op basis van het gezondheidsprofiel',
    icon: 'leaf',
    outputFormat: 'direct',
    requiresData: ['health', 'demographics', 'amenities'],
  },
  {
    id: 'gezondheid-facility-priorities',
    tab: 'gezondheid',
    label: 'Facility Priorities',
    labelNl: 'Faciliteitenprioriteiten',
    description: 'Prioritize health facilities needed in/near development',
    descriptionNl: 'Prioriteer gezondheidsvoorzieningen nodig in/nabij de ontwikkeling',
    icon: 'building',
    outputFormat: 'direct',
    requiresData: ['health', 'amenities'],
  },

  // === LEEFBAARHEID TAB ===
  {
    id: 'leefbaarheid-factors-analysis',
    tab: 'leefbaarheid',
    label: 'Livability Factors',
    labelNl: 'Leefbaarheidsfactoren',
    description: 'Analyze what positively and negatively affects quality of life',
    descriptionNl: 'Analyseer wat positief en negatief bijdraagt aan de levenskwaliteit',
    icon: 'home',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['livability', 'safety', 'amenities'],
  },
  {
    id: 'leefbaarheid-community-plan',
    tab: 'leefbaarheid',
    label: 'Community Plan',
    labelNl: 'Gemeenschapsplan',
    description: 'Suggest shared spaces and programs to enhance social cohesion',
    descriptionNl: 'Stel gedeelde ruimtes en programma\'s voor om sociale cohesie te versterken',
    icon: 'users',
    outputFormat: 'direct',
    requiresData: ['livability', 'demographics', 'targetGroups'],
  },
  {
    id: 'leefbaarheid-facility-improvements',
    tab: 'leefbaarheid',
    label: 'Facility Improvements',
    labelNl: 'Verbeteringen voorzieningen',
    description: 'Identify which public facilities need improvement',
    descriptionNl: 'Identificeer welke openbare voorzieningen verbetering nodig hebben',
    icon: 'building',
    outputFormat: 'direct',
    requiresData: ['livability', 'amenities'],
  },

  // === VOORZIENINGEN TAB (AGENTIC) ===
  {
    id: 'voorzieningen-amenity-gaps',
    tab: 'voorzieningen',
    label: 'Find Amenity Gaps',
    labelNl: 'Zoek ontbrekende voorzieningen',
    description: 'Identify missing or underrepresented amenities (can ask follow-up questions)',
    descriptionNl: 'Identificeer ontbrekende of ondervertegenwoordigde voorzieningen (kan vervolgvragen stellen)',
    icon: 'search',
    isPrimary: true,
    isAgentic: true,
    outputFormat: 'interactive',
    requiresData: ['amenities', 'demographics', 'targetGroups'],
  },
  {
    id: 'voorzieningen-recommendations',
    tab: 'voorzieningen',
    label: 'Recommend Amenities',
    labelNl: 'Adviseer voorzieningen',
    description: 'Suggest specific amenities to add based on target groups (interactive)',
    descriptionNl: 'Adviseer specifieke voorzieningen om toe te voegen op basis van doelgroepen (interactief)',
    icon: 'building',
    isAgentic: true,
    outputFormat: 'interactive',
    requiresData: ['amenities', 'demographics', 'targetGroups', 'allPersonas'],
  },
  {
    id: 'voorzieningen-local-guide',
    tab: 'voorzieningen',
    label: 'Local Guide',
    labelNl: 'Lokale gids',
    description: 'Create a resident-friendly overview of nearby amenities (can expand categories)',
    descriptionNl: 'Maak een bewonervriendelijk overzicht van nabije voorzieningen (kan categorieën uitbreiden)',
    icon: 'map',
    isAgentic: true,
    outputFormat: 'interactive',
    requiresData: ['amenities', 'metadata'],
  },

  // === WONINGMARKT TAB ===
  {
    id: 'woningmarkt-market-analysis',
    tab: 'woningmarkt',
    label: 'Market Analysis',
    labelNl: 'Marktanalyse',
    description: 'Comprehensive housing market analysis with trends and outlook',
    descriptionNl: 'Uitgebreide woningmarktanalyse met trends en vooruitzichten',
    icon: 'chart',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['housingMarket', 'metadata'],
  },
  {
    id: 'woningmarkt-investment-advice',
    tab: 'woningmarkt',
    label: 'Investment Advice',
    labelNl: 'Investeringsadvies',
    description: 'Evaluate location as investment with thesis and risks',
    descriptionNl: 'Evalueer locatie als investering met onderbouwing en risico\'s',
    icon: 'money',
    outputFormat: 'direct',
    requiresData: ['housingMarket', 'demographics', 'amenities', 'safety'],
  },
  {
    id: 'woningmarkt-demand-analysis',
    tab: 'woningmarkt',
    label: 'Demand Analysis',
    labelNl: 'Vraaganalyse',
    description: 'Analyze what unit types and price points are in demand',
    descriptionNl: 'Analyseer welke woningtypes en prijsklassen gewild zijn',
    icon: 'home',
    outputFormat: 'direct',
    requiresData: ['housingMarket', 'demographics', 'targetGroups'],
  },

  // === KAARTEN TAB ===
  {
    id: 'kaarten-site-constraints',
    tab: 'kaarten',
    label: 'Site Constraints',
    labelNl: 'Locatiebeperkingen',
    description: 'Summarize regulatory and environmental constraints from map layers',
    descriptionNl: 'Vat regelgevende en milieubeperkingen samen op basis van kaartlagen',
    icon: 'map',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['wmsLayers', 'metadata'],
  },
  {
    id: 'kaarten-environmental-risks',
    tab: 'kaarten',
    label: 'Environmental Risks',
    labelNl: 'Milieurisico\'s',
    description: 'Assess flood, noise, air quality and other environmental factors',
    descriptionNl: 'Beoordeel overstromings-, geluids-, luchtkwaliteits- en andere milieufactoren',
    icon: 'risk',
    outputFormat: 'direct',
    requiresData: ['wmsLayers'],
  },
  {
    id: 'kaarten-development-strategy',
    tab: 'kaarten',
    label: 'Development Strategy',
    labelNl: 'Ontwikkelstrategie',
    description: 'Recommend site utilization based on spatial analysis',
    descriptionNl: 'Adviseer locatiegebruik op basis van ruimtelijke analyse',
    icon: 'building',
    outputFormat: 'direct',
    requiresData: ['wmsLayers', 'amenities', 'demographics'],
  },

  // === PVE TAB ===
  {
    id: 'pve-program-mix',
    tab: 'pve',
    label: 'Program Mix',
    labelNl: 'Programmamix',
    description: 'Recommend optimal unit mix based on location data',
    descriptionNl: 'Adviseer optimale woningmix op basis van locatiegegevens',
    icon: 'target',
    isPrimary: true,
    outputFormat: 'direct',
    requiresData: ['pve', 'targetGroups', 'demographics', 'housingMarket'],
  },
  {
    id: 'pve-specifications',
    tab: 'pve',
    label: 'Specifications',
    labelNl: 'Specificaties',
    description: 'Generate detailed unit specifications for each type',
    descriptionNl: 'Genereer gedetailleerde woningspecificaties voor elk type',
    icon: 'document',
    outputFormat: 'direct',
    requiresData: ['pve', 'targetGroups', 'allPersonas'],
  },
  {
    id: 'pve-scenario-comparison',
    tab: 'pve',
    label: 'Scenario Comparison',
    labelNl: 'Scenario vergelijking',
    description: 'Compare different program scenarios for trade-offs',
    descriptionNl: 'Vergelijk verschillende programmascenario\'s voor afwegingen',
    icon: 'compare',
    outputFormat: 'table',
    requiresData: ['pve', 'housingMarket', 'targetGroups'],
  },

  // === GENEREER-RAPPORT TAB (DISABLED) ===
  {
    id: 'rapport-full-report',
    tab: 'genereer-rapport',
    label: 'Full Report',
    labelNl: 'Volledig rapport',
    description: 'Generate comprehensive development feasibility report',
    descriptionNl: 'Genereer uitgebreid ontwikkelhaalbaarheidsrapport',
    icon: 'document',
    isPrimary: true,
    isDisabled: true,
    disabledReason: 'Report generation system is not yet implemented',
    outputFormat: 'direct',
    requiresData: ['metadata', 'demographics', 'health', 'safety', 'livability', 'amenities', 'housingMarket', 'targetGroups', 'pve'],
  },
  {
    id: 'rapport-executive-summary',
    tab: 'genereer-rapport',
    label: 'Executive Summary',
    labelNl: 'Management samenvatting',
    description: 'Create one-page overview for decision makers',
    descriptionNl: 'Maak een samenvatting van één pagina voor besluitvormers',
    icon: 'summary',
    isDisabled: true,
    disabledReason: 'Report generation system is not yet implemented',
    outputFormat: 'direct',
    requiresData: ['metadata', 'demographics', 'amenities', 'housingMarket', 'targetGroups'],
  },
  {
    id: 'rapport-investor-pitch',
    tab: 'genereer-rapport',
    label: 'Investor Pitch',
    labelNl: 'Investeerderspitch',
    description: 'Create investment-ready summary document',
    descriptionNl: 'Maak een investeringsklare samenvattingsdocument',
    icon: 'money',
    isDisabled: true,
    disabledReason: 'Report generation system is not yet implemented',
    outputFormat: 'direct',
    requiresData: ['metadata', 'housingMarket', 'demographics', 'amenities'],
  },
];

// ============================================
// Tool Categories
// ============================================

export const TOOL_TABS: { id: AIToolTab; label: string; labelNl: string }[] = [
  { id: 'doelgroepen', label: 'Target Groups', labelNl: 'Doelgroepen' },
  { id: 'score', label: 'Score', labelNl: 'Score' },
  { id: 'demografie', label: 'Demographics', labelNl: 'Demografie' },
  { id: 'veiligheid', label: 'Safety', labelNl: 'Veiligheid' },
  { id: 'gezondheid', label: 'Health', labelNl: 'Gezondheid' },
  { id: 'leefbaarheid', label: 'Livability', labelNl: 'Leefbaarheid' },
  { id: 'voorzieningen', label: 'Amenities', labelNl: 'Voorzieningen' },
  { id: 'woningmarkt', label: 'Housing Market', labelNl: 'Woningmarkt' },
  { id: 'kaarten', label: 'Maps', labelNl: 'Kaarten' },
  { id: 'pve', label: 'Requirements', labelNl: 'PVE' },
  { id: 'genereer-rapport', label: 'Generate Report', labelNl: 'Genereer Rapport' },
];

// ============================================
// System Prompts
// ============================================

const SYSTEM_PROMPT_BASE = `You are an AI assistant for GroosHub, an urban development and location analysis platform.
You help architects, developers, and urban planners analyze locations for residential development projects in the Netherlands.

CRITICAL RULES:
1. You can ONLY use data provided in the context. Do NOT make up or retrieve any information.
2. All data comes from real Dutch sources: CBS (demographics), RIVM (health), Politie (safety), Google Places (amenities).
3. Be specific and reference actual numbers from the data.
4. Respond in the same language as the user's query (Dutch or English).
5. Format output for easy scanning - use headers, bullet points, and tables where appropriate.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  // Doelgroepen
  'doelgroepen-explain-scenario': `${SYSTEM_PROMPT_BASE}

TASK: Explain the target group scenarios based on R-rank scoring.
CONTEXT: The system ranks 27 housing personas based on 4 categories:
- Voorzieningen (amenities): How well local amenities match persona needs
- Leefbaarheid (livability): Quality of life factors
- Woningvoorraad (housing stock): Match with existing/planned housing
- Demografie (demographics): Fit with local population

Explain why the top-ranked personas are a good fit for this location. Reference specific scores and data points.`,

  'doelgroepen-suggest-best': `${SYSTEM_PROMPT_BASE}

TASK: Recommend the optimal target group scenario.
Analyze all data to determine which scenario (mix of personas) would be most successful for development at this location.
Consider market demand, demographic fit, amenity access, and livability factors.
Provide a clear recommendation with reasoning.`,

  'doelgroepen-compare': `${SYSTEM_PROMPT_BASE}

TASK: Create a comparison table of the different scenarios.
Format as a table with these columns:
- Scenario name
- Key personas included
- Average R-rank score
- Strengths (✓)
- Neutral aspects (-)
- Weaknesses (X)

Be objective and highlight trade-offs between scenarios.`,

  // Score
  'score-explain-breakdown': `${SYSTEM_PROMPT_BASE}

TASK: Explain what factors contribute to each category score.
For each category (demographics, health, safety, livability, amenities, housing market):
- What metrics are measured
- How this location performs vs municipal/national averages
- What the numbers mean for development potential`,

  'score-improvement-tips': `${SYSTEM_PROMPT_BASE}

TASK: Provide actionable recommendations to improve weaker scores.
Focus on practical steps the developer could take:
- Design choices
- Amenities to include
- Community programs
- Infrastructure improvements`,

  'score-executive-summary': `${SYSTEM_PROMPT_BASE}

TASK: Generate a SWOT analysis for this location.
Structure your response as:
- STRENGTHS: What makes this location attractive
- WEAKNESSES: Challenges to address
- OPPORTUNITIES: Potential for improvement/growth
- THREATS: External risks to consider`,

  // Demographics
  'demografie-population-profile': `${SYSTEM_PROMPT_BASE}

TASK: Summarize the demographic profile of this area.
Cover: age distribution, household types, income levels, migration background, marital status.
Compare to municipal and national averages. Identify what makes this population unique.`,

  'demografie-service-recommendations': `${SYSTEM_PROMPT_BASE}

TASK: Recommend services based on demographic needs.
Consider age groups, household types, income levels to suggest:
- Social services
- Retail/commercial
- Healthcare
- Education
- Recreation`,

  'demografie-scenario-comparison': `${SYSTEM_PROMPT_BASE}

TASK: Compare how different scenarios match local demographics.
Create a table showing demographic fit for each scenario.
Consider: age match, income match, household type match.`,

  // Veiligheid
  'veiligheid-safety-assessment': `${SYSTEM_PROMPT_BASE}

TASK: Provide a comprehensive safety risk assessment.
Analyze: total crimes, burglary rates, street safety, lighting, traffic accidents.
Compare to benchmarks. Identify key concerns for residents.`,

  'veiligheid-improvements': `${SYSTEM_PROMPT_BASE}

TASK: Suggest safety improvements for the development.
Consider: design features (CPTED), lighting, surveillance, community programs, neighborhood watch.`,

  'veiligheid-benchmarking': `${SYSTEM_PROMPT_BASE}

TASK: Create a safety benchmarking table.
Compare each safety metric to municipal and national averages.
Use colors/symbols: ✓ (better), - (similar), X (worse).`,

  // Gezondheid
  'gezondheid-health-needs': `${SYSTEM_PROMPT_BASE}

TASK: Identify priority health concerns for this population.
Analyze: physical health, mental health, loneliness, substance use, chronic conditions.
What health services would future residents need?`,

  'gezondheid-wellness-programs': `${SYSTEM_PROMPT_BASE}

TASK: Suggest wellness programs based on health profile.
Consider: fitness facilities, mental health support, social programs, preventive care.`,

  'gezondheid-facility-priorities': `${SYSTEM_PROMPT_BASE}

TASK: Prioritize health facilities needed in/near the development.
Consider: existing amenities (pharmacies, doctors, etc.), health data, target demographics.
Rank by importance and justify.`,

  // Leefbaarheid
  'leefbaarheid-factors-analysis': `${SYSTEM_PROMPT_BASE}

TASK: Analyze livability factors.
Cover: maintenance quality, youth facilities, social contact, volunteering, cohesion.
What enhances and what detracts from quality of life?`,

  'leefbaarheid-community-plan': `${SYSTEM_PROMPT_BASE}

TASK: Create a community development plan.
Suggest: shared spaces, community programs, design features for social cohesion.
Target the identified personas.`,

  'leefbaarheid-facility-improvements': `${SYSTEM_PROMPT_BASE}

TASK: Identify which public facilities need improvement.
Based on livability scores, what should the municipality or developer focus on?`,

  // Voorzieningen (Agentic)
  'voorzieningen-amenity-gaps': `${SYSTEM_PROMPT_BASE}

TASK: Identify amenity gaps.
Analyze what's missing or underrepresented. Consider proximity and count scores.
You may ask follow-up questions to clarify user priorities (e.g., "Would you like me to focus on essential amenities or lifestyle amenities?").`,

  'voorzieningen-recommendations': `${SYSTEM_PROMPT_BASE}

TASK: Recommend specific amenities to add.
Base recommendations on target group needs, demographic profile, and current gaps.
You may ask clarifying questions about priorities, budget, or space constraints.`,

  'voorzieningen-local-guide': `${SYSTEM_PROMPT_BASE}

TASK: Create a local amenities guide for prospective residents.
Highlight the best nearby shops, restaurants, parks, schools, healthcare, transport.
Format as a resident-friendly guide. You may offer to expand specific categories.`,

  // Woningmarkt
  'woningmarkt-market-analysis': `${SYSTEM_PROMPT_BASE}

TASK: Provide comprehensive housing market analysis.
Cover: price trends, property types, age of stock, price distribution.
What does the market data tell us about demand and pricing?`,

  'woningmarkt-investment-advice': `${SYSTEM_PROMPT_BASE}

TASK: Evaluate as an investment opportunity.
Consider: market conditions, demographics, amenities, safety, growth potential.
Provide investment thesis with risks and opportunities.`,

  'woningmarkt-demand-analysis': `${SYSTEM_PROMPT_BASE}

TASK: Analyze housing demand.
What unit types, sizes, and price points are in demand based on:
- Demographics (who lives here)
- Target groups (who would want to live here)
- Market data (what sells)`,

  // Kaarten
  'kaarten-site-constraints': `${SYSTEM_PROMPT_BASE}

TASK: Summarize site constraints from map layer analysis.
Cover: zoning, environmental factors, infrastructure.
What limitations affect development potential?`,

  'kaarten-environmental-risks': `${SYSTEM_PROMPT_BASE}

TASK: Environmental risk assessment.
Analyze: air quality (NO2, PM10, PM2.5), noise, flood risk, heat stress.
What mitigation measures might be needed?`,

  'kaarten-development-strategy': `${SYSTEM_PROMPT_BASE}

TASK: Recommend development strategy based on spatial analysis.
How should the site be utilized given constraints and opportunities?
Consider building placement, green space, access points.`,

  // PVE
  'pve-program-mix': `${SYSTEM_PROMPT_BASE}

TASK: Recommend optimal program mix (unit types and sizes).
Based on: demographics, market demand, target groups, current PVE settings.
Suggest allocation percentages with justification.`,

  'pve-specifications': `${SYSTEM_PROMPT_BASE}

TASK: Generate detailed unit specifications.
For each unit type in the program:
- Floor area
- Room count
- Target price
- Target persona
- Key features`,

  'pve-scenario-comparison': `${SYSTEM_PROMPT_BASE}

TASK: Compare different program scenarios.
Create a table showing trade-offs:
- Unit count vs size
- Revenue potential
- Market fit
- Target group coverage`,

  // Rapport (disabled)
  'rapport-full-report': `${SYSTEM_PROMPT_BASE}

TASK: Generate comprehensive feasibility report.
Include: executive summary, location analysis, market assessment, recommended program, risks.`,

  'rapport-executive-summary': `${SYSTEM_PROMPT_BASE}

TASK: Create one-page executive summary.
Key findings, recommendation, and next steps for decision makers.`,

  'rapport-investor-pitch': `${SYSTEM_PROMPT_BASE}

TASK: Create investor pitch document.
Investment thesis, market opportunity, expected returns, differentiators.`,
};

// ============================================
// Payload Builder Functions
// ============================================

/**
 * Extract relevant data from CompactLocationExport based on tool requirements
 */
function extractContextData(
  data: CompactLocationExport | null,
  requiredKeys: (keyof CompactLocationExport)[]
): Record<string, unknown> {
  if (!data) {
    return { error: 'No location data available' };
  }

  const context: Record<string, unknown> = {};

  for (const key of requiredKeys) {
    if (data[key] !== undefined) {
      context[key] = data[key];
    }
  }

  return context;
}

/**
 * Build user prompt for a specific tool
 */
function buildUserPrompt(tool: AITool, locale: 'nl' | 'en'): string {
  const prompts: Record<string, { nl: string; en: string }> = {
    'doelgroepen-explain-scenario': {
      nl: 'Leg de doelgroepscenario\'s uit voor deze locatie. Waarom zijn deze persona\'s geselecteerd op basis van de R-rank scores?',
      en: 'Explain the target group scenarios for this location. Why are these personas selected based on the R-rank scores?',
    },
    'doelgroepen-suggest-best': {
      nl: 'Welk doelgroepscenario zou je aanbevelen voor deze locatie en waarom?',
      en: 'Which target group scenario would you recommend for this location and why?',
    },
    'doelgroepen-compare': {
      nl: 'Vergelijk de verschillende scenario\'s in een tabel met voor- en nadelen.',
      en: 'Compare the different scenarios in a table with pros and cons.',
    },
    'score-explain-breakdown': {
      nl: 'Leg de locatiescores uit. Wat draagt bij aan elke categorie?',
      en: 'Explain the location scores. What contributes to each category?',
    },
    'score-improvement-tips': {
      nl: 'Wat zijn concrete aanbevelingen om de zwakkere scores te verbeteren?',
      en: 'What are concrete recommendations to improve the weaker scores?',
    },
    'score-executive-summary': {
      nl: 'Genereer een SWOT-analyse voor deze locatie.',
      en: 'Generate a SWOT analysis for this location.',
    },
    'demografie-population-profile': {
      nl: 'Geef een demografisch profiel van dit gebied.',
      en: 'Provide a demographic profile of this area.',
    },
    'demografie-service-recommendations': {
      nl: 'Welke diensten en voorzieningen zou deze bevolking nodig hebben?',
      en: 'What services and amenities would this population need?',
    },
    'demografie-scenario-comparison': {
      nl: 'Hoe passen de verschillende scenario\'s bij de lokale demografie?',
      en: 'How do the different scenarios match the local demographics?',
    },
    'veiligheid-safety-assessment': {
      nl: 'Geef een veiligheidsanalyse voor deze locatie.',
      en: 'Provide a safety assessment for this location.',
    },
    'veiligheid-improvements': {
      nl: 'Welke veiligheidsverbeteringen zou je voorstellen?',
      en: 'What safety improvements would you suggest?',
    },
    'veiligheid-benchmarking': {
      nl: 'Vergelijk de veiligheidsmetrieken met gemeentelijke en nationale gemiddelden.',
      en: 'Compare the safety metrics to municipal and national averages.',
    },
    'gezondheid-health-needs': {
      nl: 'Wat zijn de belangrijkste gezondheidsbehoeften van deze bevolking?',
      en: 'What are the key health needs of this population?',
    },
    'gezondheid-wellness-programs': {
      nl: 'Welke welzijnsprogramma\'s zou je voorstellen?',
      en: 'What wellness programs would you suggest?',
    },
    'gezondheid-facility-priorities': {
      nl: 'Welke gezondheidsvoorzieningen hebben prioriteit?',
      en: 'Which health facilities should be prioritized?',
    },
    'leefbaarheid-factors-analysis': {
      nl: 'Analyseer de leefbaarheidsfactoren voor dit gebied.',
      en: 'Analyze the livability factors for this area.',
    },
    'leefbaarheid-community-plan': {
      nl: 'Stel een gemeenschapsplan voor om sociale cohesie te versterken.',
      en: 'Suggest a community plan to enhance social cohesion.',
    },
    'leefbaarheid-facility-improvements': {
      nl: 'Welke openbare voorzieningen hebben verbetering nodig?',
      en: 'Which public facilities need improvement?',
    },
    'voorzieningen-amenity-gaps': {
      nl: 'Welke voorzieningen ontbreken in dit gebied?',
      en: 'What amenities are missing in this area?',
    },
    'voorzieningen-recommendations': {
      nl: 'Welke voorzieningen zou je toevoegen aan de ontwikkeling?',
      en: 'What amenities would you add to the development?',
    },
    'voorzieningen-local-guide': {
      nl: 'Maak een gids van lokale voorzieningen voor toekomstige bewoners.',
      en: 'Create a guide of local amenities for future residents.',
    },
    'woningmarkt-market-analysis': {
      nl: 'Geef een woningmarktanalyse voor dit gebied.',
      en: 'Provide a housing market analysis for this area.',
    },
    'woningmarkt-investment-advice': {
      nl: 'Is deze locatie een goede investering? Waarom?',
      en: 'Is this location a good investment? Why?',
    },
    'woningmarkt-demand-analysis': {
      nl: 'Welke woningtypes en prijsklassen zijn gewild in dit gebied?',
      en: 'What unit types and price points are in demand in this area?',
    },
    'kaarten-site-constraints': {
      nl: 'Wat zijn de belangrijkste locatiebeperkingen op basis van de kaartlagen?',
      en: 'What are the key site constraints based on the map layers?',
    },
    'kaarten-environmental-risks': {
      nl: 'Beoordeel de milieurisico\'s voor deze locatie.',
      en: 'Assess the environmental risks for this location.',
    },
    'kaarten-development-strategy': {
      nl: 'Wat is de aanbevolen ontwikkelstrategie op basis van de ruimtelijke analyse?',
      en: 'What is the recommended development strategy based on the spatial analysis?',
    },
    'pve-program-mix': {
      nl: 'Wat is de optimale programmamix voor deze ontwikkeling?',
      en: 'What is the optimal program mix for this development?',
    },
    'pve-specifications': {
      nl: 'Genereer gedetailleerde specificaties voor elk woningtype.',
      en: 'Generate detailed specifications for each unit type.',
    },
    'pve-scenario-comparison': {
      nl: 'Vergelijk verschillende programmascenario\'s.',
      en: 'Compare different program scenarios.',
    },
    'rapport-full-report': {
      nl: 'Genereer een volledig haalbaarheidsrapport.',
      en: 'Generate a full feasibility report.',
    },
    'rapport-executive-summary': {
      nl: 'Maak een management samenvatting.',
      en: 'Create an executive summary.',
    },
    'rapport-investor-pitch': {
      nl: 'Maak een investeerderspitch.',
      en: 'Create an investor pitch.',
    },
  };

  return prompts[tool.id]?.[locale] || (locale === 'nl' ? tool.descriptionNl : tool.description);
}

/**
 * Build complete payload for an AI tool
 */
export function buildToolPayload(
  tool: AITool,
  locationData: CompactLocationExport | null,
  locale: 'nl' | 'en' = 'nl'
): AIToolPayload {
  const systemPrompt = SYSTEM_PROMPTS[tool.id] || SYSTEM_PROMPT_BASE;
  const userPrompt = buildUserPrompt(tool, locale);
  const contextData = extractContextData(locationData, tool.requiresData);

  // Build full prompt for display
  const fullPrompt = `=== SYSTEM PROMPT ===
${systemPrompt}

=== CONTEXT DATA ===
${JSON.stringify(contextData, null, 2)}

=== USER QUERY ===
${userPrompt}`;

  return {
    tool,
    systemPrompt,
    userPrompt,
    contextData,
    fullPrompt,
  };
}

/**
 * Get all tools for a specific tab
 */
export function getToolsByTab(tab: AIToolTab): AITool[] {
  return AI_TOOLS.filter(tool => tool.tab === tab);
}

/**
 * Get all available (non-disabled) tools
 */
export function getAvailableTools(): AITool[] {
  return AI_TOOLS.filter(tool => !tool.isDisabled);
}

/**
 * Check if location data has required fields for a tool
 */
export function hasRequiredData(
  tool: AITool,
  locationData: CompactLocationExport | null
): { hasAll: boolean; missing: string[] } {
  if (!locationData) {
    return { hasAll: false, missing: tool.requiresData as string[] };
  }

  const missing: string[] = [];
  for (const key of tool.requiresData) {
    if (locationData[key] === undefined || locationData[key] === null) {
      missing.push(key);
    }
  }

  return { hasAll: missing.length === 0, missing };
}
