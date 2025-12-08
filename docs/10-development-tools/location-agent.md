# Location Agent - Detailed Capability Outline
## Based on Current GroosHub Implementation

**Last Updated**: 2024-11-28
**Agent Context**: AI Assistant Page (separate from Location Page)
**Focus**: Data interpretation and guidance (NO data creation)

---

## 1. Agent Overview

### 1.1 Core Purpose
An **interpretive assistant** that helps users understand and navigate location analysis data. The agent operates from the AI Assistant page and helps users work with the separate Location Analysis page.

The agent:
- **Explains** what existing data means
- **Guides** users through available features on the Location page
- **Answers questions** about location analysis
- **Helps navigate** between different data views
- **Does NOT create new data** (only explains what exists)
- **Only generates scenarios/reports when explicitly asked**
- **Maintains professional tone** (no emoticons)

### 1.2 Important Context

**Agent Location**: The agent lives on the AI Assistant page (`/[locale]/ai-assistant`), NOT on the Location page.

**Implications**:
- Users may NOT have a location currently loaded in the Location page
- Users likely have multiple saved locations in the database
- Agent must clarify WHICH location the user is asking about
- Agent guides users to navigate TO the Location page when needed

### 1.3 Primary Competencies
- **Data Explanation**: "What does this safety score mean?"
- **Persona Interpretation**: "Which personas fit best and why?"
- **Navigation Helper**: "How do I see the schools in this area?"
- **Feature Guide**: "What is the Program of Requirements?"
- **Comparative Analysis**: "How do these neighborhoods compare?"
- **Data Source Education**: "Where does this health data come from?"

---

## 2. Critical Agent Behaviors

### 2.1 Context Awareness - "Which Location?"

**IMPORTANT**: When users ask about "this location" or "my location", the agent must determine which location they mean.

**Decision Tree**:

```typescript
User asks: "Tell me about this location"

Agent checks:
1. Is there a currently active location in the Location page?
   - YES → Proceed to explain that location
   - NO → Ask which location they mean

2. If NO active location:
   Query user's saved locations from database

   If user has saved locations:
   Response: "You have [N] saved locations in your account. Which one would you like to know more about?

   - Project Centrum Utrecht (Domstraat 12, Utrecht)
   - Amsterdam West Potential (Mercatorplein 1, Amsterdam)
   - Rotterdam Kop van Zuid (Wilhelminakade 51, Rotterdam)
   - Den Haag Centrum (Shared - view only)

   Please specify which location you'd like to explore."

   If user has NO saved locations:
   Response: "You don't have any saved locations yet. Would you like to:
   - Create a new location analysis (provide an address)
   - Learn how to use the Location Analysis page"
```

### 2.2 Guiding to Location Page

Since the agent is on the AI Assistant page, it should guide users to the Location page when needed.

**Example Interactions**:

```
User: "What can I do on this page?"

Agent: "I'm your AI assistant for GroosHub. I can help you understand and navigate the Location Analysis features.

What I Can Help With:

LOCATION ANALYSIS GUIDANCE:
- Explain location data (demographics, safety, health, amenities, housing)
- Interpret persona fit scores
- Guide you through the Program of Requirements
- Explain generated building programs
- Compare your saved locations
- Answer questions about data sources

LOCATION PAGE FEATURES:
The Location Analysis page has 4 main sections:

1. DOELGROEPEN (Target Groups)
   - See which of 30 personas fit a location
   - Compare 3 automatic scenarios
   - Create custom persona selections
   - View connection graphs between personas

2. OMGEVING (Environment) - 8 Data Categories
   - Demographics: Age, income, household types
   - Health: Air quality, life expectancy
   - Safety: Crime rates, traffic safety
   - Livability: Playgrounds, youth facilities
   - Amenities: Restaurants, shops, services, schools
   - Housing: Market prices, typologies, ownership
   - Maps: Interactive visualization
   - Charts: Visual data representations

3. PROGRAMMA VAN EISEN (Program of Requirements)
   - Define your development mix
   - Allocate percentages across building types
   - Set total project size
   - Use presets or create custom configurations

4. GENEREER RAPPORT (Generate Report)
   - Create AI-powered building programs
   - Get 3 automatic scenarios
   - See recommended housing units
   - View suggested communal/public spaces

TO GET STARTED:
- Navigate to the Location page using the navigation menu
- Or ask me about any of your saved locations
- Or ask me to explain any location analysis concept

You currently have [N] saved locations. Would you like to explore one of them?"
```

```
User: "Show me the schools nearby"

Agent: "I can help you find schools near a specific location.

Which location would you like to check? You have 4 saved locations:
- Project Centrum Utrecht
- Amsterdam West Potential
- Rotterdam Kop van Zuid
- Den Haag Centrum

Once you specify, I can tell you:
- How many schools are nearby
- Their distances
- School types (primary, secondary, higher education)
- How to view them on the interactive map in the Location page

Alternatively, if you want to analyze a new address, please provide the full address and I'll guide you through creating a new location analysis."
```

---

## 3. Data Access Requirements

### 3.1 Context Detection

```typescript
interface AgentContext {
  // User context
  userId: string;
  userRole: 'user' | 'admin';

  // Saved locations available to this user
  savedLocations: SavedLocation[];

  // Currently active location (if user is on Location page)
  activeLocation?: {
    address: string;
    isFromSaved: boolean;
    savedLocationId?: string;
  };

  // OR specify location by query
  requestedLocationId?: string;
}
```

### 3.2 Current Location Data Access

**Only accessible when user has specified which location to discuss**

```typescript
interface CurrentLocationContext {
  // Basic info
  address: string;
  coordinates: {
    wgs84: { lat: number; lon: number };
    rd: { x: number; y: number };
  };

  // Geographic hierarchy
  geographicCodes: {
    municipality: string;
    district?: string;
    neighborhood?: string;
  };

  // Multi-level demographics data
  demographics: {
    national?: UnifiedDataRow[];
    municipality?: UnifiedDataRow[];
    district?: UnifiedDataRow[];
    neighborhood?: UnifiedDataRow[];
  };

  // Health data (from RIVM)
  health: {
    national?: UnifiedDataRow[];
    municipality?: UnifiedDataRow[];
    district?: UnifiedDataRow[];
    neighborhood?: UnifiedDataRow[];
  };

  // Safety data (from Politie)
  safety: {
    national?: UnifiedDataRow[];
    municipality?: UnifiedDataRow[];
    district?: UnifiedDataRow[];
    neighborhood?: UnifiedDataRow[];
  };

  // Livability data (CBS)
  livability: {
    national?: UnifiedDataRow[];
    municipality?: UnifiedDataRow[];
  };

  // Residential/housing market (Altum AI)
  residential: ResidentialData | null;

  // Amenities (Google Places)
  amenities: UnifiedDataRow[];

  // Metadata
  fetchedAt: Date;
}

interface UnifiedDataRow {
  source: string;
  geographicLevel: "national" | "municipality" | "district" | "neighborhood";
  geographicCode: string;
  geographicName: string;

  key: string;
  title: string;
  titleNl: string;
  titleEn: string;

  value: number | string | null;
  absolute?: number;
  relative?: number;
  unit?: string;

  displayValue?: string;
  displayAbsolute?: string;
  displayRelative?: string;

  scoring?: {
    type: 'relatief' | 'absoluut';
    direction: 'positive' | 'negative';
  };
  calculatedScore?: number; // -1 to +1

  metadata?: {
    count?: number;
    total?: number;
    distribution?: Record<string, number>;
    isAverage?: boolean;
    isDistribution?: boolean;
  };
}
```

### 3.3 Saved Locations Database Access

```typescript
interface SavedLocation {
  id: string;
  userId: string;
  name: string;
  address: string;
  coordinates: { lat: number; lon: number };

  // Full cached data snapshot
  locationData: UnifiedLocationData;
  amenitiesData: UnifiedDataRow[];

  // User's PVE configuration
  selectedPVE: {
    apartments: number;      // Percentage (0-100)
    commercial: number;
    hospitality: number;
    social: number;
    communal: number;
    offices: number;
    totalArea: number;       // Total m²
  } | null;

  // Selected personas for this location
  selectedPersonas: string[] | null; // Array of persona IDs

  // Generated building program (if exists)
  llmRapport: BuildingProgram | null;

  // Status tracking
  completionStatus: 'location_only' | 'with_personas' | 'with_pve' | 'with_personas_pve' | 'complete';
  dataVersion: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### 3.4 Housing Personas (Static JSON)

Located at: `/src/features/location/data/sources/housing-personas.json`

```typescript
interface HousingPersona {
  id: string;                    // e.g., "jonge-starters"
  name: string;                  // e.g., "Jonge Starters"
  income_level: string;          // "Laag inkomen", "Midden inkomen", "Hoog inkomen"
  household_type: string;        // "1-persoonshuishouden", "2-persoonshuishouden", etc.
  age_group: string;             // "20-35 jaar", "35-55 jaar", "55+ jaar"
  description: string;
  current_situation: string;
  desired_situation: string;
  current_property_types: string[];
  desired_property_types: string[];
  imageUrl: string;
}

// Total: 30+ personas across income levels and household types
```

**All 30+ personas include:**
- Jonge Starters (young starters)
- De Doorzetter (the persister)
- Senior op Budget (budget senior)
- De Groeiers (the growers)
- Bescheiden Stellen (modest couples)
- Jonge Gezinnen met Beperkt Budget (young families on budget)
- Stabiele Gezinnen op Budget (stable families on budget)
- Stedelijke Professionals (urban professionals)
- ...and 22+ more

### 3.5 Housing Typologies (Static JSON)

Located at: `/src/features/location/data/sources/housing-typologies.json`

```typescript
interface HousingTypology {
  id: string;                    // e.g., "studio-35"
  name: string;                  // e.g., "Studio 35m²"
  description: string;
  size_m2: number;
  rooms: number;
  suitable_for: string[];
  price_category: string;
}

// Total: 20+ typologies from studios (35m²) to large apartments (200m²+)
```

### 3.6 Building Amenities (Static JSON)

Located at: `/src/features/location/data/sources/building-amenities.json`

```typescript
interface BuildingAmenity {
  id: string;
  name: string;
  category: string;
  typical_size_m2: number;
  description: string;
  target_users: string[];
}

// Includes: fitness rooms, coworking spaces, community kitchens,
// kids playrooms, rooftop terraces, bike storage, parking, etc.
```

### 3.7 Communal & Public Spaces (Static JSON)

Located at:
- `/src/features/location/data/sources/communal-spaces.json`
- `/src/features/location/data/sources/public-spaces.json`

```typescript
interface CommunalSpace {
  id: string;
  name_nl: string;
  name_en: string;
  description_nl: string;
  description_en: string;
  category: string;
  area_min_m2: number;
  area_max_m2: number;
  m2_per_resident?: number;
  target_groups: string[];
}

interface PublicSpace {
  id: string;
  name_nl: string;
  name_en: string;
  description_nl: string;
  description_en: string;
  category: string;
  area_min_m2: number;
  area_max_m2: number;
  m2_per_resident?: number;
  target_groups: string[];
}
```

### 3.8 Generated Building Program (When Exists)

Generated via `/api/generate-building-program` using Claude Anthropic AI.

```typescript
interface BuildingProgram {
  scenarios: Scenario[];         // 3 automatic scenarios + custom (if selected)
}

interface Scenario {
  scenario_number: number;
  scenario_name: string;
  scenario_description: string;
  target_groups: string[];       // Persona IDs

  housing_units: {
    typology_id: string;
    quantity: number;
    total_m2: number;
    rationale: string;
  }[];

  communal_spaces: {
    space_id: string;
    size_m2: number;
    category: string;
    rationale: string;
  }[];

  public_spaces: {
    space_id: string;
    size_m2: number;
    category: string;
    rationale: string;
  }[];

  key_insights: string[];
  demographics_considerations: string;
}
```

---

## 4. Agent Capabilities (Professional Responses)

### 4.1 Explain Current Location Data

#### Capability: Summarize Location (with context checking)

**User Intent**: "Tell me about this location"

**Agent Actions**:
1. Check if user has specified which location
2. If not, list saved locations and ask for clarification
3. If specified, provide summary

**Agent Response (no location specified)**:
```
You have 4 saved locations in your account. Which one would you like to know more about?

1. Project Centrum Utrecht
   Address: Domstraat 12, Utrecht
   Status: Complete (with building program)
   Saved: 3 days ago

2. Amsterdam West Potential
   Address: Mercatorplein 1, Amsterdam
   Status: With personas (no PVE configured)
   Saved: 1 week ago

3. Rotterdam Kop van Zuid
   Address: Wilhelminakade 51, Rotterdam
   Status: Location only
   Saved: 2 weeks ago (data may be stale)

4. Den Haag Centrum (Shared with you)
   Address: Grote Marktstraat 1, Den Haag
   Status: Complete (view only)
   Shared: 5 days ago

Please specify which location you'd like to explore, or provide a new address to analyze.
```

**Agent Response (location specified)**:
```
Current Location: Domstraat 12, Utrecht

Geographic Hierarchy:
- Neighborhood: Binnenstad-Oost (3,200 residents)
- District: Binnenstad (12,400 residents)
- Municipality: Utrecht (361,000 residents)

Data Available:
- Demographics (neighborhood level)
- Health (municipality level)
- Safety (neighborhood level)
- Livability (municipality level)
- Residential/Housing (postal code level)
- Amenities (500m radius - 142 places found)

Data Freshness: Loaded 2 hours ago

Key Highlights:
- Young urban neighborhood (45% age 25-44, 22% age 15-24)
- High single-person household rate (62%)
- Low family presence (8%)
- Above-average safety (score: 0.4)
- Premium housing market (median: €450,000)
- Excellent amenities (23 restaurants, 8 supermarkets, 3 schools nearby)

Top Persona Fits:
1. Jonge Starters: 8.7/10
2. De Doorzetter: 8.5/10
3. De Groeiers: 8.3/10

What would you like to explore?
- Detailed demographics breakdown
- Safety analysis
- Amenity categories
- Housing market details
- Persona fit explanations
```

#### Capability: Explain Specific Data Category

**User Intent**: "What does the demographics data show for Amsterdam West?"

**Agent Actions**:
1. Confirm location (Amsterdam West Potential)
2. Load demographics data
3. Parse key metrics
4. Explain in plain language

**Agent Response**:
```
Demographics Analysis - Amsterdam West (Mercatorplein 1)
Neighborhood: Mercatorbuurt

Population Overview:
- Total population: 12,800 residents
- Population density: High (typical for Amsterdam)
- Compared to Amsterdam average: Slightly above average density

Age Distribution:
- 0-14 years: 22% (2,816 people) - HIGH family presence
- 15-24 years: 15% (1,920 people)
- 25-44 years: 38% (4,864 people) - Largest group
- 45-64 years: 18% (2,304 people)
- 65+ years: 7% (896 people)

Interpretation: This is a FAMILY-ORIENTED neighborhood with strong representation of children (22% vs typical 15% in urban areas). The 25-44 age group dominance suggests young to mid-career parents.

Household Composition:
- Single-person households: 38%
- Couples without children: 32%
- Families with children: 24% - SIGNIFICANTLY HIGHER than urban average
- Other household types: 6%

What this means: Unlike typical city center areas dominated by singles, this neighborhood has substantial family presence. One in four households has children.

Income Distribution:
- Low income: 42%
- Middle income: 48%
- High income: 10%

This is a MIDDLE TO LOWER-MIDDLE income area. Affordability is important for residents.

Marital Status:
- Married: 48%
- Unmarried: 35%
- Divorced: 12%
- Widowed: 5%

Higher marriage rate aligns with family orientation.

Migration Background:
- Dutch background: 52%
- Western migration background: 18%
- Non-western migration background: 30%

This is a DIVERSE neighborhood with significant immigrant communities.

Development Implications:
- PRIORITY: Family-sized units (2-3 bedrooms, not studios)
- PRIORITY: Child-friendly amenities (playgrounds, schools, safe streets)
- PRIORITY: Affordable price points (middle-income focus)
- CONSIDERATION: Diverse community spaces
- LESS NEED: Luxury finishes, high-end amenities

Best Persona Matches Based on Demographics:
1. Jonge Gezinnen met Beperkt Budget (young families on budget)
2. Stabiele Gezinnen op Budget (stable families on budget)
3. Bescheiden Stellen (modest couples preparing for family)

This contrasts sharply with city center locations that favor singles and professionals.

Would you like to:
- Compare this to another saved location?
- See the safety or amenity data for this area?
- Understand how this affects building program recommendations?
```

#### Capability: Explain Scores

**User Intent**: "Why is the safety score 0.4 for Utrecht?"

**Agent Actions**:
1. Confirm location (Project Centrum Utrecht)
2. Retrieve safety score data
3. Identify scoring type (relative to national average)
4. Explain calculation and context

**Agent Response**:
```
Safety Score Explanation - Domstraat 12, Utrecht

Current Score: 0.4 (Better than Average)

Understanding the Score:
Our safety scores use RELATIVE scoring, which compares this location to the national average.

Score Scale:
- +1.0 = Much better than national average (safest)
- +0.5 = Better than average
- 0.0 = Exactly at national average
- -0.5 = Worse than average
- -1.0 = Much worse than national average (least safe)

Your score of 0.4 means this location is BETTER than the typical Dutch neighborhood.

The Underlying Data:
- Crime incidents at this location: 15 per 1,000 residents
- National average: 18 per 1,000 residents
- Difference: -17% (fewer crimes than average)

Context:
This translates to a 1.5% annual crime rate, meaning:
- In a building with 100 residents, statistically 1-2 incidents per year
- This is GOOD for an urban city center location
- City centers typically have higher rates due to density, nightlife, and foot traffic

Crime Type Breakdown (if available):
- Property crimes: Majority of incidents
- Violent crimes: Below average
- Traffic-related: Average for urban area

Contributing Factors to Safety:
- High foot traffic provides natural surveillance
- Good street lighting in city center
- Active commercial area (eyes on the street)
- Police presence in central locations

Important Notes:
1. Higher reporting does not always mean less safety - it can indicate better reporting culture
2. Urban areas naturally have more incidents due to population density
3. This score compares favorably to other city center locations
4. The neighborhood data (Binnenstad-Oost) is more accurate than municipality-wide averages

Comparison to Other Saved Locations:
- Amsterdam West Potential: Score 0.2 (average)
- Rotterdam Kop van Zuid: Score 0.3 (above average)
- Utrecht Domstraat: Score 0.4 (better than average) - SAFEST of your locations

For Development Planning:
This safety level is SUITABLE for:
- Family housing (adequate safety for children)
- Young professionals (urban lifestyle, acceptable risk)
- Senior housing (safe enough for older residents)

NOT a concern for:
- Insurance purposes
- Marketing as family-friendly
- Premium pricing (safety not a deterrent)

Would you like to:
- See detailed crime type breakdown?
- Compare safety across all your saved locations?
- Understand how safety affects persona fit scores?
```

#### Capability: Explain Geographic Levels

**User Intent**: "Why do you show neighborhood and municipality data?"

**Agent Response**:
```
Geographic Levels Explained

We display data at multiple administrative levels because:
1. Not all data is available at all levels
2. Different government agencies report at different scales
3. More granular data = more accurate for your specific location

The Four Levels:

LEVEL 1: NEIGHBORHOOD (Buurt) - Most Specific
- Size: Approximately 1,000-5,000 residents
- Example: "Binnenstad-Oost" (3,200 residents)
- Best for: Understanding your immediate surroundings
- Available data: Demographics, Safety
- Accuracy: HIGHEST - this is your actual micro-location

LEVEL 2: DISTRICT (Wijk) - Medium Scope
- Size: Approximately 5,000-25,000 residents
- Example: "Binnenstad" (12,400 residents)
- Best for: Understanding the broader area
- Available data: Demographics, Safety
- Accuracy: MEDIUM - useful when neighborhood data unavailable

LEVEL 3: MUNICIPALITY (Gemeente) - City/Town
- Size: Thousands to hundreds of thousands
- Example: "Utrecht" (361,000 residents)
- Best for: City-wide policies, services, infrastructure
- Available data: ALL categories (Demographics, Health, Safety, Livability)
- Accuracy: LOWER for specific location, but necessary for some data types

LEVEL 4: NATIONAL (Nederland) - Comparison Baseline
- Size: 17.5 million residents
- Purpose: Provides the average for comparison
- Used in: Relative scoring (is your location above or below average?)
- Example: "National average crime rate: 18 per 1,000"

Why Multiple Levels Matter:

DATA AVAILABILITY VARIES:
- CBS Demographics: Available at neighborhood, district, municipality, national
- RIVM Health: Only municipality and national
- Politie Safety: Available at neighborhood, district, municipality, national
- CBS Livability: Only municipality and national
- Altum AI Housing: Postal code level (cuts across neighborhoods)
- Google Places Amenities: Radius-based (not administrative boundaries)

ACCURACY HIERARCHY:
For your location at Domstraat 12, Utrecht:

Demographics: Using NEIGHBORHOOD data (Binnenstad-Oost)
- Most accurate
- Reflects your immediate area
- 3,200 residents

Safety: Using NEIGHBORHOOD data (Binnenstad-Oost)
- Most accurate
- Crime data specific to your area

Health: Using MUNICIPALITY data (Utrecht)
- Less accurate for your specific street
- But neighborhood-level health data not collected by RIVM
- Still relevant (air quality, noise similar across nearby areas)

Livability: Using MUNICIPALITY data (Utrecht)
- Playground/facility counts are city-wide
- Not as granular as demographics

National: Used as COMPARISON BASELINE
- "Your neighborhood has 15 crimes per 1,000 vs national average of 18"
- Helps you understand if your location is above or below typical

When We Show Each Level:
- PRIMARY: Neighborhood (if available) - this is your location
- FALLBACK: District or Municipality (when neighborhood unavailable)
- COMPARISON: National (always shown for context)

Example - How Levels Differ:
For safety in Utrecht:

National: 18 incidents per 1,000 (baseline)
Municipality (Utrecht): 16 per 1,000 (better than national)
District (Binnenstad): 17 per 1,000 (close to national)
Neighborhood (Binnenstad-Oost): 15 per 1,000 (best of all levels)

If we only showed municipality data (16), we would MISS that your specific neighborhood (15) is even safer.

Trade-offs:
- More granular = more accurate BUT less data available
- More general = more data available BUT less specific to your location

We always use the MOST GRANULAR level available for each data category.

Would you like to:
- See which level is used for each data category?
- Understand why certain agencies only report at municipality level?
- Compare your location across different geographic levels?
```

---

### 4.2 Persona Guidance (Interpret Existing)

#### Capability: List Available Personas

**User Intent**: "What personas are available?"

**Agent Response**:
```
Available Housing Personas (30 total)

Organized by Income Level and Household Type:

LAAG INKOMEN (Low Income) - 10 personas

Single-Person Households:
- Jonge Starters (20-35 jaar) - Young adults, just starting career/studies
- De Doorzetter (35-55 jaar) - Established singles, modest long-term income
- Senior op Budget (55+ jaar) - Retirees with limited pension

Two-Person Households:
- De Groeiers (20-35 jaar) - Young couples or roommates
- Bescheiden Stellen (35-55 jaar) - Established couples, stable modest income
- Ontspannen Senioren (55+ jaar) - Retired couples, basic comfort

Families (3+ persons):
- Jonge Gezinnen met Beperkt Budget (20-35 jaar) - Young families, tight finances
- Stabiele Gezinnen op Budget (35-55 jaar) - Established families, careful budgeting
- Grote Gezinnen met Beperkte Middelen (35-55 jaar) - Larger families, financial constraints
- Senioren met Volwassen Kinderen (55+ jaar) - Older parents with adult children at home

MIDDEN INKOMEN (Middle Income) - 10 personas

Single-Person Households:
- Jonge Professionals (20-35 jaar) - Career-focused, disposable income
- Gevestigde Professionals (35-55 jaar) - Established careers, comfortable
- Actieve Senioren (55+ jaar) - Well-off retirees, active lifestyle

Two-Person Households:
- Stedelijke Stellen (20-35 jaar) - Urban couples, dual income
- Comfort Stellen (35-55 jaar) - Settled couples, quality of life focus
- Welvarende Senioren (55+ jaar) - Well-off retired couples

Families:
- Groeiende Gezinnen (20-35 jaar) - Growing families, career advancement
- Gevestigde Gezinnen (35-55 jaar) - Established families, stable careers
- Uitgebreide Gezinnen (35-55 jaar) - Larger families, good income
- Brede Generaties (55+ jaar) - Multi-generational households

HOOG INKOMEN (High Income) - 10 personas

Single-Person Households:
- Elite Starters (20-35 jaar) - High earners, luxury preferences
- Top Professionals (35-55 jaar) - Executives, premium lifestyle
- Welgestelde Senioren (55+ jaar) - Wealthy retirees

Two-Person Households:
- Power Couples (20-35 jaar) - Dual high incomes, urban luxury
- Premium Stellen (35-55 jaar) - Affluent couples, quality-focused
- Luxe Senioren (55+ jaar) - Wealthy retired couples, premium care

Families:
- Ambitieuze Gezinnen (20-35 jaar) - High-earning young families
- Welgestelde Gezinnen (35-55 jaar) - Affluent established families
- Ruime Gezinnen (35-55 jaar) - Large affluent families
- Multi-Generatie Welgestelden (55+ jaar) - Wealthy multi-gen households

All personas include:
- Detailed descriptions
- Current and desired housing situations
- Property type preferences
- Income and household characteristics
- Visual persona cards

Would you like to:
- See detailed information about a specific persona?
- Find out which personas best fit one of your saved locations?
- Understand what each persona is looking for in housing?
```

#### Capability: Explain Specific Persona

**User Intent**: "Tell me about Jonge Starters"

**Agent Actions**:
1. Load persona from housing-personas.json
2. Extract and format details
3. Provide comprehensive explanation

**Agent Response**:
```
Persona Profile: Jonge Starters

BASIC CHARACTERISTICS
Name: Jonge Starters
Age Group: 20-35 years
Income Level: Low income (Laag inkomen)
Household Type: Single person (1-persoonshuishouden)

DESCRIPTION
Young adults with limited financial resources, just beginning their careers or still studying. They seek affordable small homes close to urban amenities and employment/education opportunities.

CURRENT HOUSING SITUATION
- Small rented apartment or studio in the city
- Possibly living with parents to save money
- Very limited living space (often under 40m²)
- Tight budget constraints
- Shared facilities common
- Basic furnishings and amenities

HOUSING ASPIRATIONS
- Continue renting (homeownership largely out of reach at this life stage)
- Desire slightly larger affordable apartment
- Prefer to remain in urban area for work/social access
- Need good public transport connectivity
- Value proximity to amenities over space

PROPERTY TYPE PROGRESSION

Current Property Types:
- Cheap 1-room apartment (Studio 35-40m²)
- Basic facilities
- Minimal privacy
- Often older building stock

Desired Property Types:
- Cheap 2-room apartment (Studio or 1-bedroom, 50-65m²)
- Separate bedroom (key improvement)
- Still affordable rent range (€800-1,100/month)
- Better maintained building
- Safe neighborhood

KEY HOUSING NEEDS

CRITICAL (Must-Have):
- Affordability (rent under €1,100/month or purchase under €250k)
- Public transport access (within 400m of station/stop)
- Proximity to work/university (under 30 min commute)
- Basic amenities nearby (supermarket within 500m)

HIGH PRIORITY:
- Safe neighborhood (adequate security)
- Internet connectivity (essential for work/study)
- Laundry facilities (in-unit or building)
- Bike storage (secure)

MEDIUM PRIORITY:
- Social spaces to meet others
- Nearby cafes/restaurants for socializing
- Fitness facilities (affordable gym)
- Small outdoor space (balcony valued but not essential)

LOW PRIORITY:
- Car parking (most don't own cars)
- Large living space (trading space for location)
- Premium finishes (function over form)
- Private outdoor space (garden)

LIFESTYLE CHARACTERISTICS
- Urban-oriented
- Socially active
- Career/education focused
- Limited financial flexibility
- Values experiences over possessions
- Environmentally conscious (uses bikes/public transport)
- Tech-savvy

DEVELOPMENT IMPLICATIONS

Unit Mix Recommendations:
- Studios (35-45m²): Primary offering
- 1-bedroom (50-65m²): Secondary offering
- Focus on efficiency and functionality
- Clever storage solutions essential

Price Positioning:
- Rental: €900-1,200/month range
- Purchase: €225k-€300k range
- Affordability is CRITICAL differentiator

Building Amenities Valued:
- Bike storage (essential - 90% use bikes)
- Package lockers (many shop online)
- Communal workspace/coworking
- Social lounge
- Shared laundry
- Fast internet included

Location Requirements:
- Urban core or well-connected suburb
- Transit within 400m (walking distance)
- Mixed-use area (live/work/play)
- Vibrant street life
- Access to affordable dining/groceries

NOT Important for This Persona:
- Car parking (low car ownership)
- Large family amenities
- Quiet suburban setting
- Luxury finishes
- Private gardens

FINANCIAL PROFILE
- Income: €1,800-2,400/month gross (entry-level salary or study grant + part-time work)
- Rent affordability: Max 30-35% of income = €600-840
- Often stretches to €900-1,100 with careful budgeting
- Limited savings for deposits
- High sensitivity to cost increases

LIFE STAGE TRAJECTORY
This is a TRANSITIONAL persona (3-7 year timeframe):

Progression Path:
1. Jonge Starters (current)
2. May progress to "De Doorzetter" if single and income stabilizes
3. May progress to "De Groeiers" if partnering up
4. May progress to "Jonge Professionals" (middle income) with career advancement

This means:
- High turnover in units (3-5 year average tenancy)
- Need for flexible lease terms
- Opportunity for upselling to larger units as they progress
- Build community to retain residents through life transitions

COMPATIBILITY WITH LOCATIONS

Best Location Characteristics:
- City center or inner-ring neighborhoods
- High walkability scores
- Strong transit connectivity
- Active street life with cafes, shops
- Diverse population
- Bike-friendly infrastructure
- Affordable retail (not luxury boutiques)

Poor Fit Locations:
- Car-dependent suburbs
- Quiet residential-only areas
- Areas requiring >30 min commute to jobs/university
- Luxury neighborhoods (price mismatch)
- Limited rental stock areas
- Low amenity density

MARKETING ANGLES FOR THIS PERSONA
- "Affordable urban living"
- "Start your independent life"
- "Everything you need nearby"
- "Built for your lifestyle"
- "Community of young professionals/students"
- "No car needed"

EXAMPLE SUCCESSFUL APPEALS
- Rooftop terraces for socializing
- Communal kitchens for events
- Co-working spaces for remote work
- Bike repair stations
- Package delivery systems
- App-based building management
- Flexible furniture packages
- Utilities-included rent

Would you like to:
- See how well this persona fits one of your saved locations?
- Compare this persona to similar ones (De Doorzetter, De Groeiers)?
- Understand what housing typologies best match this persona?
- See example building programs optimized for Jonge Starters?
```

[Due to length limits, I'll continue with remaining sections in a structured summary format]

---

### 4.3 Navigation & Feature Guidance

**Key Response Pattern**: Since agent is on AI page, always clarify navigation to Location page

```
User: "How do I see the PVE?"

Agent: "The Program of Requirements (PVE) feature is located on the Location Analysis page.

To access it:
1. Navigate to the Location page from the main menu
2. Load one of your saved locations or create a new analysis
3. Click the 'Programma van Eisen' tab

What the PVE Feature Does:
[Explanation of PVE functionality...]

Would you like me to explain how to configure a PVE, or do you have a specific location in mind to work with?"
```

---

### 4.4 Program of Requirements (PVE) Guidance

**Always check which location first**:
```
User: "What PVE should I use?"

Agent: "I can help recommend a PVE configuration based on location demographics and persona fits.

Which location would you like PVE guidance for?
- Project Centrum Utrecht
- Amsterdam West Potential
- Rotterdam Kop van Zuid
- Den Haag Centrum (shared)

Or provide a new address to analyze."
```

---

### 4.5 Professional Tone - No Emoticons

**All responses maintain professional language**:

```
WRONG (emoticon-heavy):
"🎯 Great news! This is a 🏆 perfect match for young professionals! 🎉"

CORRECT (professional):
"This location is an excellent match for young professionals, with a fit score of 8.7 out of 10."
```

```
WRONG:
"⚠️ Warning: Limited schools nearby 🏫"

CORRECT:
"Note: There are only 2 schools within the standard 500m radius, which may be a constraint for family-oriented development."
```

---

## 5. Agent Functions/Actions Needed

### 5.1 Context & Location Management

```typescript
// Get user's saved locations
listUserSavedLocations(userId: string): SavedLocation[]

// Get specific saved location
getSavedLocationById(id: string): SavedLocation | null

// Find saved location by name (fuzzy matching)
findSavedLocationByName(userId: string, name: string): SavedLocation | null

// Get currently active location (if user is on Location page)
getCurrentActiveLocation(): CurrentLocationContext | null

// Determine which location user is referring to
resolveLocationReference(userQuery: string, userId: string): SavedLocation | 'needs_clarification'
```

### 5.2 Data Retrieval Functions

```typescript
// Get data for specific location and category
getLocationData(
  locationId: string,
  category: 'demographics' | 'health' | 'safety' | 'livability' | 'residential' | 'amenities'
): UnifiedDataRow[]

// Get specific metric
getMetricValue(locationId: string, category: string, key: string): UnifiedDataRow | null

// Search amenities by category
searchAmenitiesForLocation(
  locationId: string,
  category: string,
  filters?: { maxDistance?: number }
): UnifiedDataRow[]
```

### 5.3 Persona Functions

```typescript
// List all personas (with optional filters)
listPersonas(filters?: {
  income_level?: string,
  household_type?: string,
  age_group?: string
}): HousingPersona[]

// Get specific persona
getPersona(id: string): HousingPersona | null

// Get persona by name (fuzzy matching)
findPersonaByName(name: string): HousingPersona | null
```

### 5.4 Comparison Functions

```typescript
// Compare two locations
compareLocations(
  locationId1: string,
  locationId2: string,
  aspects?: string[]
): ComparisonResult

// Compare multiple locations
batchCompareLocations(locationIds: string[]): MultiComparisonResult
```

### 5.5 Educational/Helper Functions

```typescript
// Explain data source
explainDataSource(source: 'CBS' | 'RIVM' | 'Politie' | 'Google Places' | 'Altum AI'): DataSourceInfo

// Explain scoring type
explainScoringType(type: 'relatief' | 'absoluut'): string

// Explain geographic level
explainGeographicLevel(level: 'national' | 'municipality' | 'district' | 'neighborhood'): string

// Get feature explanation
explainFeature(feature: 'pve' | 'doelgroepen' | 'building_program' | 'scenarios'): string
```

---

## 6. What the Agent Should NOT Do

### 6.1 Never Create New Data

WRONG:
```
"Based on trends, I estimate this location will have 30 restaurants by next year"
```

CORRECT:
```
"Current data shows 23 restaurants within 500m. I cannot predict future changes."
```

### 6.2 Never Use Emoticons (Professional Tool)

WRONG:
```
"Great location! 🎉 Perfect for families 👨‍👩‍👧"
```

CORRECT:
```
"This location is well-suited for families, with a persona fit score of 9.1/10."
```

### 6.3 Never Generate Reports Unless Explicitly Asked

WRONG:
```
"I've generated a building program for you"
```

CORRECT:
```
"Would you like me to generate a building program? This will create 3 scenarios based on your PVE configuration and location data. The generation takes approximately 30-60 seconds."
```

### 6.4 Never Assume Which Location

WRONG:
```
User: "What are the demographics?"
Agent: "The demographics show..." [proceeds without confirming which location]
```

CORRECT:
```
User: "What are the demographics?"
Agent: "I can help with demographics analysis. Which location would you like to review?
- Project Centrum Utrecht
- Amsterdam West Potential
- Rotterdam Kop van Zuid
- Den Haag Centrum"
```

---

## 7. Summary

**Agent Role**: Professional interpretive guide on AI Assistant page

**Core Function**: Help users understand and navigate location analysis data

**Key Behaviors**:
- Always clarify which location user is asking about
- Maintain professional tone (no emoticons)
- Explain existing data, never invent
- Guide to Location page features
- Only generate reports when explicitly requested

**Context Awareness**:
- Agent lives on AI Assistant page (separate from Location page)
- Users likely have multiple saved locations
- Must determine which location is relevant before answering

**Professional Standards**:
- Clear, concise language
- No emoticons or excessive enthusiasm
- Data-driven responses
- Educational and helpful

**Primary Use Cases**:
1. "Which of my locations is best for young families?"
2. "What does the safety score mean for Utrecht?"
3. "Explain the demographics data"
4. "How do I configure a PVE?"
5. "Compare Amsterdam and Rotterdam locations"
6. "Where does this health data come from?"
7. "What personas are available?"
8. "Walk me through the building program for Utrecht"
