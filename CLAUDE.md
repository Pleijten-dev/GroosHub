# CLAUDE.md - AI Assistant Guide for GroosHub

> **Last Updated**: 2025-11-21
> **Project**: GroosHub - Urban Development & Location Analysis Platform
> **Framework**: Next.js 15.5.4 with React 19 and TypeScript

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Reference](#quick-reference)
3. [Codebase Structure](#codebase-structure)
4. [Development Setup](#development-setup)
5. [Key Technologies](#key-technologies)
6. [Architectural Patterns](#architectural-patterns)
7. [Coding Conventions](#coding-conventions)
8. [Component Development](#component-development)
9. [Data Handling Patterns](#data-handling-patterns)
10. [API Development](#api-development)
11. [Git Workflow](#git-workflow)
12. [Common Tasks](#common-tasks)
13. [Important Files](#important-files)
14. [Best Practices](#best-practices)

---

## Project Overview

**GroosHub** is a comprehensive urban development and location analysis platform that provides data-driven insights for urban planning, location analysis, and project management. The application features:

- **Location Analysis**: Multi-source data aggregation (demographics, health, safety, livability, amenities, housing)
- **AI Assistant**: Multi-provider chatbot with streaming responses
- **Interactive Maps**: Leaflet-based visualization with GeoJSON layers
- **3D Charts**: Three.js powered data visualizations
- **Multi-language Support**: Dutch (nl) and English (en)
- **Authentication**: NextAuth v5 with role-based access
- **Admin Panel**: User management and system administration

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
npm run db:migrate       # Initialize database

# Git (Feature branches start with 'claude/')
git checkout -b claude/feature-name-<session-id>
git add .
git commit -m "Description"
git push -u origin claude/feature-name-<session-id>
```

### Key Paths

```
/home/user/GroosHub/
├── src/app/                    # Next.js App Router (pages & API routes)
├── src/features/               # Feature modules (location, chat)
├── src/shared/                 # Reusable components, hooks, utils
├── src/lib/                    # Third-party integrations (auth, i18n, db)
├── src/i18n/                   # Translation files (nl, en)
└── public/                     # Static assets
```

### Import Alias

Always use the `@/` alias for imports:

```typescript
import { Button } from '@/shared/components/UI/Button/Button';
import { useTranslation } from '@/shared/hooks/useTranslation';
```

---

## Codebase Structure

### Directory Organization

```
/home/user/GroosHub/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── [locale]/                     # Internationalized routes
│   │   │   ├── location/                 # Location analysis page
│   │   │   ├── ai-assistant/             # AI chatbot page
│   │   │   ├── admin/                    # Admin panel
│   │   │   └── login/                    # Authentication page
│   │   ├── api/                          # API routes
│   │   │   ├── location/                 # Location data endpoints
│   │   │   ├── chat/                     # AI chat endpoints
│   │   │   ├── auth/[...nextauth]/       # NextAuth endpoints
│   │   │   └── admin/                    # Admin endpoints
│   │   └── globals.css                   # Design system (150+ CSS vars)
│   │
│   ├── features/                         # Feature-based modules
│   │   ├── location/                     # Location analysis feature
│   │   │   ├── components/               # Demographics, Health, Safety, etc.
│   │   │   ├── data/                     # Data layer
│   │   │   │   ├── sources/              # API clients (CBS, RIVM, Google, Altum)
│   │   │   │   ├── parsers/              # Transform raw API data
│   │   │   │   ├── normalizers/          # Standardize field names
│   │   │   │   ├── scoring/              # Calculate comparison scores
│   │   │   │   ├── cache/                # LocalStorage caching (24h TTL)
│   │   │   │   └── aggregator/           # Multi-level geographic aggregation
│   │   │   ├── hooks/                    # Feature-specific hooks
│   │   │   └── utils/                    # Utilities
│   │   │
│   │   └── chat/                         # AI chatbot feature
│   │       ├── components/               # ChatMessages, ChatInput, ChatSidebar
│   │       ├── lib/                      # Chat logic
│   │       │   ├── ai/                   # AI model configuration
│   │       │   ├── db/                   # Database queries
│   │       │   └── utils/                # Utilities
│   │       ├── hooks/                    # useChat, etc.
│   │       └── types/                    # TypeScript types
│   │
│   ├── shared/                           # Shared/reusable code
│   │   ├── components/
│   │   │   ├── UI/                       # Generic UI components
│   │   │   │   ├── Button/
│   │   │   │   ├── Card/
│   │   │   │   ├── Input/
│   │   │   │   ├── Sidebar/              # Reusable sidebar component
│   │   │   │   ├── NavigationBar/
│   │   │   │   └── Panel/                # Glassmorphic panels
│   │   │   └── common/                   # Common components
│   │   │       ├── RadialChart/          # 3D circular charts (Three.js)
│   │   │       ├── BarChart/             # 3D bar charts (Three.js)
│   │   │       └── DensityChart/         # Distribution charts
│   │   ├── hooks/                        # Shared hooks
│   │   │   ├── useSidebar.ts
│   │   │   ├── useDesignSystem.ts
│   │   │   └── useTranslation.ts
│   │   └── utils/                        # Shared utilities
│   │       └── cn.ts                     # Tailwind class merger
│   │
│   ├── lib/                              # Third-party integrations
│   │   ├── auth.ts                       # NextAuth configuration
│   │   ├── i18n/                         # i18n configuration
│   │   └── db/                           # Database connection (Neon)
│   │
│   └── i18n/                             # Translation files
│       ├── nl/common.json                # Dutch translations
│       └── en/common.json                # English translations
│
├── public/                               # Static assets
├── scripts/                              # Utility scripts
│   └── init-database.ts                  # Database initialization
│
├── Documentation/                        # Extensive documentation
│   ├── PROJECT_DOCUMENTATION.md
│   ├── SCORING_SYSTEM.md
│   ├── CACHING_SYSTEM.md
│   └── [20+ other .md files]
│
└── Configuration Files
    ├── package.json                      # Dependencies & scripts
    ├── tsconfig.json                     # TypeScript config
    ├── next.config.ts                    # Next.js config
    ├── tailwind.config.js                # Tailwind customization
    ├── eslint.config.mjs                 # ESLint config
    └── .env.local.example                # Environment variables template
```

### Feature-Based Architecture

Code is organized by **features** rather than technical layers:

- **Good**: `features/location/components/Demographics.tsx`
- **Bad**: `components/location/Demographics.tsx`

Each feature contains all its related code: components, data layer, hooks, types, and utilities.

---

## Development Setup

### Environment Variables

Create `.env.local` in the project root with these required variables:

```bash
# Google Places API (for amenities search)
GOOGLE_PLACES_API_KEY=your_key_here

# Altum AI API (for housing market data)
# Get from: https://mopsus.altum.ai
Altum_AI_Key=your_key_here

# PostgreSQL Database (Neon)
POSTGRES_URL=your_postgres_url_here
POSTGRES_URL_NON_POOLING=your_postgres_non_pooling_url_here

# NextAuth (generate secret: openssl rand -base64 32)
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000

# AI Chat (xAI Grok - default provider)
# Get from: https://console.x.ai
XAI_API_KEY=your_key_here

# Optional AI Providers
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
# GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
# MISTRAL_API_KEY=your_key_here
```

### Installation & Running

```bash
# Install dependencies
npm install

# Initialize database
npm run db:migrate

# Start development server
npm run dev
# Opens at http://localhost:3000
```

### Development Server

- Uses **Turbopack** for fast builds
- Hot Module Replacement (HMR) enabled
- Default port: 3000
- Locale routes: `/nl/location`, `/en/location`

---

## Key Technologies

### Core Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.4 | React framework with App Router |
| **React** | 19.1.0 | UI library (Server Components) |
| **TypeScript** | 5.x | Type safety |
| **Turbopack** | Latest | Fast bundler |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS |

### Data & APIs

- **Google Places API** - Amenities and POI data
- **Altum AI API** - Housing market/residential data
- **CBS Open Data** - Dutch statistics (demographics, livability)
- **RIVM** - Health data
- **Politie** - Safety/crime data

### Mapping & Geospatial

- **Leaflet** 1.9.4 - Interactive maps
- **React Leaflet** 5.0.0 - React integration
- **Turf.js** - Geospatial analysis
- **Proj4** - Coordinate transformations
- **GeoJSON** - Geographic data format

### 3D Visualization

- **Three.js** - 3D rendering engine
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components

### AI & Chat

- **Vercel AI SDK** - AI integration framework
- **@ai-sdk/xai** - xAI Grok (default)
- **@ai-sdk/openai** - OpenAI GPT
- **@ai-sdk/anthropic** - Claude
- **@ai-sdk/google** - Gemini
- **@ai-sdk/mistral** - Mistral

### Database & Auth

- **Neon** (@neondatabase/serverless) - PostgreSQL
- **NextAuth** 5.0.0-beta - Authentication
- **bcryptjs** - Password hashing

### Utilities

- **zod** 4.1.12 - Schema validation
- **date-fns** 4.1.0 - Date manipulation
- **nanoid** 5.1.6 - ID generation
- **clsx** - Conditional classes
- **tailwind-merge** - Merge Tailwind classes

---

## Architectural Patterns

### 1. Feature-Based Organization

**Principle**: Group code by feature, not by technical layer.

```
features/location/
├── components/       # UI components
├── data/            # Data layer (sources, parsers, cache)
├── hooks/           # Custom hooks
├── types/           # TypeScript types
└── utils/           # Utilities
```

### 2. Three-Tier Component Structure

**Level 1: Page Components** (`app/[locale]/*/page.tsx`)
- Route entry points
- Orchestrate features
- Handle routing params
- Minimal logic

**Level 2: Feature Components** (`features/*/components/`)
- Business logic
- State management
- Compose shared UI
- Feature-specific

**Level 3: Shared UI Components** (`shared/components/UI/`)
- Generic, reusable
- No business logic
- Pure presentational
- Design system compliant

### 3. Data Pipeline Pattern

External API → Client → Parser → Normalizer → Scorer → Aggregator → Cache → Component

**Example**:
```typescript
// 1. Fetch from CBS API
const raw = await demographicsClient.fetch(params);

// 2. Parse to structured format
const parsed = demographicsParser.parse(raw);

// 3. Normalize field names
const normalized = normalizer.normalize(parsed);

// 4. Calculate scores
const scored = scorer.score(normalized, baseValues);

// 5. Aggregate multi-level data
const aggregated = aggregator.combine(neighborhood, district, municipality);

// 6. Cache result
cache.set(cacheKey, aggregated);

// 7. Render in component
return <DemographicsView data={aggregated} />;
```

### 4. Design Token System

**CSS Custom Properties → Tailwind → Components**

```css
/* 1. Define in globals.css */
:root {
  --space-base: 1rem;
  --color-primary: #477638;
  --radius-base: 4px;
}

/* 2. Map in tailwind.config.js */
theme: {
  spacing: { 'base': 'var(--space-base)' },
  colors: { 'primary': 'var(--color-primary)' },
  borderRadius: { 'base': 'var(--radius-base)' }
}

/* 3. Use in components */
<div className="p-base bg-primary rounded-base">
```

**Benefits**:
- Single source of truth
- Easy theming
- No runtime overhead
- Type-safe with Tailwind

### 5. Server/Client Component Strategy

**Next.js 15 best practices**:

- **Server Components** (default - no "use client"):
  - Data fetching
  - Static content
  - SEO-critical pages
  - No interactivity

- **Client Components** ("use client"):
  - React hooks (useState, useEffect, etc.)
  - Event handlers (onClick, onChange)
  - Browser APIs (window, localStorage)
  - Third-party libraries requiring browser

```typescript
// Server Component (default)
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Next.js 15: params must be awaited
  return <LocationPage locale={locale} />;
}

// Client Component
'use client';
export function InteractiveMap() {
  const [center, setCenter] = useState([51.5, -0.1]);
  return <MapContainer center={center} />;
}
```

### 6. Internationalization Pattern

**Locale-based routing**: `/{locale}/path`

```typescript
// URL structure
/nl/location  → Dutch
/en/location  → English

// Translation patterns

// 1. Inline ternary
const text = locale === 'nl' ? 'Locatie' : 'Location';

// 2. Translation objects
const translations = {
  nl: { title: 'Locatie Analyse' },
  en: { title: 'Location Analysis' }
};
const text = translations[locale].title;

// 3. useTranslation hook
const { t } = useTranslation(locale);
const text = t('location.title');
```

### 7. Caching Strategy

**LocalStorage-based with TTL**:

```typescript
const cache = new LocationDataCache({
  defaultTTL: 24 * 60 * 60 * 1000,  // 24 hours
  maxSize: 5 * 1024 * 1024           // 5MB
});

// Auto-features:
// - Address normalization for cache keys
// - Automatic expiration cleanup
// - Size management (LRU eviction)
// - Statistics tracking
```

**Benefits**:
- 50-90% reduction in API calls
- Faster page loads
- Offline capability
- User-specific caching

---

## Coding Conventions

### TypeScript Best Practices

#### 1. Explicit Type Annotations

```typescript
// Good: Explicit types for function parameters and returns
export async function fetchDemographics(
  location: LatLng,
  level: GeographicLevel
): Promise<DemographicsData> {
  // ...
}

// Avoid: Implicit any
export async function fetchData(location, level) {
  // ...
}
```

#### 2. Interface vs Type

- **Use `interface`** for object shapes (can be extended)
- **Use `type`** for unions, intersections, primitives

```typescript
// Interface for objects
export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'base' | 'lg';
  children: React.ReactNode;
}

// Type for unions
export type GeographicLevel = 'neighborhood' | 'district' | 'municipality' | 'national';
```

#### 3. Type Imports

```typescript
// Good: Separate type imports
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Avoid: Mixed imports
import { NextRequest, NextResponse } from 'next/server';
```

### Component Conventions

#### 1. File Structure

```typescript
// Component file: ComponentName.tsx

// 1. Imports
import React from 'react';
import { cn } from '@/shared/utils/cn';

// 2. Type definitions
export interface ComponentNameProps {
  // ...
}

// 3. Component definition
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // 4. Hooks at top
  const [state, setState] = useState();

  // 5. Event handlers
  const handleClick = () => {
    // ...
  };

  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 7. Display name for debugging
ComponentName.displayName = 'ComponentName';

// 8. Default export (optional)
export default ComponentName;
```

#### 2. Component Naming

- **PascalCase** for components: `Button`, `LocationPage`, `ChatMessages`
- **camelCase** for functions/variables: `handleClick`, `userData`
- **SCREAMING_SNAKE_CASE** for constants: `API_BASE_URL`, `MAX_RETRIES`

#### 3. Props Destructuring

```typescript
// Good: Destructure with defaults
export function Button({
  variant = 'primary',
  size = 'base',
  children
}: ButtonProps) {
  // ...
}

// Avoid: Accessing via props object
export function Button(props: ButtonProps) {
  return <button className={props.variant}>
    {props.children}
  </button>;
}
```

#### 4. Conditional Rendering

```typescript
// Good: Explicit conditions
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data ? <DataView data={data} /> : <EmptyState />}

// Avoid: Nested ternaries
{loading ? <Spinner /> : error ? <Error /> : data ? <View /> : null}
```

### Styling Conventions

#### 1. Tailwind Class Order

Use consistent ordering for readability:

```typescript
// Order: Layout → Spacing → Typography → Colors → Effects
className="flex items-center gap-base px-base py-sm text-base font-medium text-primary bg-white rounded-base shadow-sm hover:shadow-md transition-shadow"
```

#### 2. Use Design System Tokens

```typescript
// Good: Design system tokens
<div className="p-base gap-sm rounded-base shadow-md">

// Avoid: Arbitrary values
<div className="p-[16px] gap-[8px] rounded-[4px]">
```

#### 3. Conditional Classes with cn()

```typescript
import { cn } from '@/shared/utils/cn';

// Good: Use cn() utility
<button className={cn(
  'px-base py-sm rounded-base',
  variant === 'primary' && 'bg-primary text-white',
  variant === 'secondary' && 'bg-secondary text-gray-700',
  disabled && 'opacity-50 cursor-not-allowed'
)}>
```

### Naming Conventions

#### Files & Directories

- **Components**: `ComponentName/ComponentName.tsx`
- **Hooks**: `useHookName.ts`
- **Utils**: `utilityName.ts`
- **Types**: `types.ts` or `ComponentName.types.ts`
- **Constants**: `constants.ts`

#### Variables & Functions

```typescript
// Boolean variables: is/has/should prefix
const isLoading = false;
const hasError = true;
const shouldRender = false;

// Event handlers: handle prefix
const handleClick = () => {};
const handleSubmit = () => {};
const handleChange = () => {};

// Async functions: descriptive verb
async function fetchUserData() {}
async function createPost() {}
async function deleteComment() {}
```

### Import Organization

```typescript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal absolute imports (using @/)
import { Button } from '@/shared/components/UI/Button/Button';
import { useTranslation } from '@/shared/hooks/useTranslation';

// 3. Relative imports
import { parseData } from './utils';
import type { LocalType } from './types';

// 4. Style imports (if any)
import styles from './Component.module.css';
```

---

## Component Development

### Creating a New Shared UI Component

#### 1. Component Structure

```
shared/components/UI/ComponentName/
├── ComponentName.tsx       # Main component
├── ComponentName.types.ts  # TypeScript types (optional)
└── index.ts               # Re-export
```

#### 2. Template

```typescript
// shared/components/UI/ComponentName/ComponentName.tsx

import React from 'react';
import { cn } from '@/shared/utils/cn';
import { useDesignSystem } from '@/shared/hooks/useDesignSystem';

export interface ComponentNameProps {
  variant?: 'default' | 'variant1' | 'variant2';
  size?: 'sm' | 'base' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export function ComponentName({
  variant = 'default',
  size = 'base',
  className,
  children,
  ...props
}: ComponentNameProps) {
  const { classBuilders } = useDesignSystem();

  return (
    <div
      className={cn(
        // Base styles
        'relative',

        // Variant styles
        variant === 'default' && 'bg-white',
        variant === 'variant1' && 'bg-gray-50',

        // Size styles
        size === 'sm' && 'p-sm text-sm',
        size === 'base' && 'p-base text-base',
        size === 'lg' && 'p-lg text-lg',

        // Custom className
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

ComponentName.displayName = 'ComponentName';

export default ComponentName;
```

#### 3. Index Export

```typescript
// shared/components/UI/ComponentName/index.ts
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';
export default ComponentName;
```

### Using Design System

#### Available Design Tokens

```typescript
// Spacing (9 levels)
--space-xs     // 4px
--space-sm     // 8px
--space-md     // 12px
--space-base   // 16px
--space-lg     // 20px
--space-xl     // 24px
--space-2xl    // 32px
--space-3xl    // 48px
--space-4xl    // 64px

// Typography (8 levels)
--text-xs      // 12px
--text-sm      // 14px
--text-base    // 16px
--text-lg      // 18px
--text-xl      // 20px
--text-2xl     // 24px
--text-3xl     // 30px
--text-4xl     // 36px

// Border Radius
--radius-sm    // 3px
--radius-base  // 4px
--radius-md    // 6px
--radius-lg    // 8px
--radius-xl    // 16px

// Shadows (7 levels)
--shadow-xs
--shadow-sm
--shadow-base
--shadow-md
--shadow-lg
--shadow-xl
--shadow-2xl

// Colors
--color-primary         // #477638
--color-secondary       // #86a67d
--color-accent          // #d4af37
--color-success         // #10b981
--color-warning         // #f59e0b
--color-error           // #ef4444
--color-info            // #3b82f6
```

#### Using in Tailwind

```typescript
// All tokens are available as Tailwind utilities
<div className="p-base text-lg text-primary bg-white rounded-base shadow-md">
  Content
</div>
```

### Creating Feature Components

Feature components have business logic and use shared UI components.

```typescript
// features/location/components/Demographics.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';
import { useDemographicsData } from '../hooks/useDemographicsData';
import type { LatLng } from '../types';

export interface DemographicsProps {
  location: LatLng;
  locale: 'nl' | 'en';
}

export function Demographics({ location, locale }: DemographicsProps) {
  const { data, isLoading, error, refetch } = useDemographicsData(location);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Card>
      <h2 className="text-2xl font-semibold mb-base">
        {locale === 'nl' ? 'Demografie' : 'Demographics'}
      </h2>

      {/* Render data */}
      {data && (
        <div className="grid gap-base">
          {/* Component content */}
        </div>
      )}

      <Button onClick={refetch} variant="secondary" size="sm">
        {locale === 'nl' ? 'Vernieuwen' : 'Refresh'}
      </Button>
    </Card>
  );
}

export default Demographics;
```

---

## Data Handling Patterns

### 1. API Client Pattern

Create dedicated clients for each external API:

```typescript
// features/location/data/sources/DemographicsClient.ts

export class DemographicsClient {
  private baseUrl = 'https://opendata.cbs.nl/...';

  async fetch(params: FetchParams): Promise<RawDemographicsData> {
    const response = await fetch(`${this.baseUrl}?${new URLSearchParams(params)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 2. Parser Pattern

Transform raw API data to structured format:

```typescript
// features/location/data/parsers/DemographicsParser.ts

export interface ParsedValue {
  value: number | string;
  label: string;
  unit?: string;
}

export class DemographicsParser {
  parse(rawData: RawDemographicsData): Map<string, ParsedValue> {
    const result = new Map<string, ParsedValue>();

    rawData.value.forEach(item => {
      result.set(item.key, {
        value: item.value,
        label: this.getLabel(item.key),
        unit: this.getUnit(item.key)
      });
    });

    return result;
  }

  private getLabel(key: string): string {
    // Label mapping logic
  }

  private getUnit(key: string): string | undefined {
    // Unit detection logic
  }
}
```

### 3. Normalizer Pattern

Standardize field names across datasets:

```typescript
// features/location/data/normalizers/DemographicsKeyNormalizer.ts

export class DemographicsKeyNormalizer {
  private keyMap: Record<string, string> = {
    'Bevolking_1': 'Totale bevolking',
    'MannenEnJongens_2': 'Mannen',
    'VrouwenEnMeisjes_3': 'Vrouwen',
    // ... more mappings
  };

  normalize(rawKey: string): string {
    return this.keyMap[rawKey] || rawKey;
  }
}
```

### 4. Scoring Pattern

Calculate comparative scores (-1 to +1 scale):

```typescript
// features/location/data/scoring/calculateScore.ts

export interface ScoringConfig {
  comparisonType: 'relatief' | 'absoluut';
  baseValue: number | null;
  direction: 'positive' | 'negative';  // Higher is better vs lower is better
  margin: number;  // ±20% default
}

export function calculateScore(
  actualValue: number,
  config: ScoringConfig
): number {
  if (config.baseValue === null) return 0;

  const difference = actualValue - config.baseValue;
  const normalizedDiff = difference / config.margin;

  // Flip score if lower is better
  const score = config.direction === 'negative'
    ? -normalizedDiff
    : normalizedDiff;

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, score));
}
```

### 5. Aggregator Pattern

Combine multi-level geographic data:

```typescript
// features/location/data/aggregator/MultiLevelAggregator.ts

export interface MultiLevelData {
  neighborhood?: ParsedDataset;
  district?: ParsedDataset;
  municipality?: ParsedDataset;
  national?: ParsedDataset;
}

export class MultiLevelAggregator {
  aggregate(data: MultiLevelData): AggregatedDataset {
    return {
      levels: {
        neighborhood: data.neighborhood,
        district: data.district,
        municipality: data.municipality,
        national: data.national
      },
      primary: data.neighborhood || data.district || data.municipality,
      comparison: data.national || data.municipality
    };
  }
}
```

### 6. Caching Pattern

LocalStorage-based caching with TTL:

```typescript
// features/location/data/cache/LocationDataCache.ts

export class LocationDataCache {
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions) {
    this.defaultTTL = options.defaultTTL;
    this.maxSize = options.maxSize;
  }

  set(key: string, data: any, ttl?: number): void {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    localStorage.setItem(this.normalizeKey(key), JSON.stringify(entry));
    this.cleanup();
  }

  get(key: string): any | null {
    const item = localStorage.getItem(this.normalizeKey(key));
    if (!item) return null;

    const entry = JSON.parse(item);
    const age = Date.now() - entry.timestamp;

    if (age > entry.ttl) {
      localStorage.removeItem(this.normalizeKey(key));
      return null;
    }

    return entry.data;
  }

  private normalizeKey(key: string): string {
    // Normalize address format for consistent cache keys
    return key.toLowerCase().replace(/\s+/g, '-');
  }

  private cleanup(): void {
    // Remove expired entries and enforce size limit
  }
}
```

---

## API Development

### API Route Structure

```typescript
// app/api/endpoint/route.ts

import { NextRequest, NextResponse } from 'next/server';
import type { RequestBody, ResponseData } from './types';

// POST handler
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body: RequestBody = await request.json();

    // 2. Validate input (use Zod)
    const validated = requestSchema.parse(body);

    // 3. Process request
    const result = await processData(validated);

    // 4. Return response
    return NextResponse.json<ResponseData>({
      success: true,
      data: result
    });

  } catch (error) {
    // 5. Error handling
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET handler
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const param = searchParams.get('param');

  // ... handle GET request
}
```

### Protected API Routes

Use middleware or manual session checks:

```typescript
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check authorization (admin only)
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // ... proceed with request
}
```

### Rate Limiting

For external API calls (e.g., Google Places):

```typescript
class RateLimiter {
  private requests: number = 0;
  private resetTime: number = Date.now() + 1000;
  private maxRequestsPerSecond: number = 50;

  async limit(): Promise<void> {
    if (Date.now() > this.resetTime) {
      this.requests = 0;
      this.resetTime = Date.now() + 1000;
    }

    if (this.requests >= this.maxRequestsPerSecond) {
      const waitTime = this.resetTime - Date.now();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.limit();
    }

    this.requests++;
  }
}
```

### Error Handling

Consistent error responses:

```typescript
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Usage
return NextResponse.json<ApiError>(
  {
    success: false,
    error: 'Invalid parameters',
    code: 'VALIDATION_ERROR',
    details: validationErrors
  },
  { status: 400 }
);
```

---

## Git Workflow

### Branch Naming Convention

All feature branches **MUST** start with `claude/` and end with the session ID:

```bash
# Pattern
claude/<feature-description>-<session-id>

# Examples
claude/add-amenities-filter-01Bk3YvUV1yAHD2kHvtyc7QD
claude/fix-restaurant-search-bug-019KCm5NPKUgR5QtufRrNHad
claude/update-kaarten-card-style-013UTfd4vPZV4VpU38pc2Hr6
```

**IMPORTANT**: Push will fail with 403 if branch doesn't follow this pattern.

### Commit Message Guidelines

Use clear, descriptive commit messages:

```bash
# Good examples
git commit -m "Add distance filter to amenities search"
git commit -m "Fix restaurant category search returning no results"
git commit -m "Update doelgroepen card style to simpler design"
git commit -m "Prevent text wrapping in navigation items"

# Avoid vague messages
git commit -m "fix bug"
git commit -m "update code"
git commit -m "changes"
```

### Standard Workflow

```bash
# 1. Create feature branch
git checkout -b claude/feature-name-<session-id>

# 2. Make changes and commit
git add .
git commit -m "Clear description of changes"

# 3. Push to remote (MUST use -u flag)
git push -u origin claude/feature-name-<session-id>

# 4. Create pull request (if needed)
# Use GitHub UI or gh CLI (if available)
```

### Handling Push Failures

If push fails due to network errors, retry with exponential backoff:

```bash
# Retry sequence: 2s, 4s, 8s, 16s
git push -u origin <branch-name> || \
  (sleep 2 && git push -u origin <branch-name>) || \
  (sleep 4 && git push -u origin <branch-name>) || \
  (sleep 8 && git push -u origin <branch-name>) || \
  (sleep 16 && git push -u origin <branch-name>)
```

### Pull Request Guidelines

When creating PRs:

1. **Title**: Clear, concise description
2. **Description**:
   - Summary of changes
   - Test plan
   - Related issues (if any)
3. **Base branch**: Usually `main` or specified main branch
4. **Reviewers**: Tag relevant team members

---

## Common Tasks

### Adding a New Page

```typescript
// 1. Create page component
// app/[locale]/new-page/page.tsx

export default async function NewPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params; // Next.js 15: await params

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### Adding a New API Endpoint

```typescript
// app/api/new-endpoint/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Process request

  return NextResponse.json({ success: true });
}
```

### Adding a Translation

```typescript
// 1. Add to translation files
// i18n/nl/common.json
{
  "newKey": "Nederlandse tekst"
}

// i18n/en/common.json
{
  "newKey": "English text"
}

// 2. Use in component
const text = locale === 'nl'
  ? translations.nl.newKey
  : translations.en.newKey;
```

### Adding a New Feature Module

```bash
# Create feature directory structure
mkdir -p features/new-feature/{components,hooks,types,utils}

# Create index files
touch features/new-feature/components/FeaturePage.tsx
touch features/new-feature/hooks/useFeatureData.ts
touch features/new-feature/types/index.ts
```

### Integrating a New External API

```typescript
// 1. Create API client
// features/feature-name/data/sources/NewApiClient.ts

export class NewApiClient {
  private apiKey = process.env.NEW_API_KEY;

  async fetch(params: Params): Promise<RawData> {
    // Implementation
  }
}

// 2. Create parser
// features/feature-name/data/parsers/NewApiParser.ts

export class NewApiParser {
  parse(raw: RawData): ParsedData {
    // Implementation
  }
}

// 3. Create API route
// app/api/feature-name/endpoint/route.ts

export async function POST(request: NextRequest) {
  const client = new NewApiClient();
  const parser = new NewApiParser();

  const raw = await client.fetch(params);
  const parsed = parser.parse(raw);

  return NextResponse.json({ data: parsed });
}

// 4. Add environment variable
// .env.local
NEW_API_KEY=your_api_key_here
```

### Adding a Chart Component

```typescript
// Use existing chart components or create new ones

import { RadialChart } from '@/shared/components/common/RadialChart/RadialChart';
import { BarChart } from '@/shared/components/common/BarChart/BarChart';

// Usage
<RadialChart
  data={[
    { label: 'Category A', value: 30, color: '#477638' },
    { label: 'Category B', value: 70, color: '#86a67d' }
  ]}
  height={400}
/>
```

---

## Important Files

### Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `package.json` | Dependencies & scripts | Scripts: dev, build, start, lint |
| `tsconfig.json` | TypeScript config | Paths: `@/*` → `./src/*` |
| `next.config.ts` | Next.js config | Minimal configuration |
| `tailwind.config.js` | Tailwind customization | Maps all CSS custom properties |
| `eslint.config.mjs` | ESLint config | Extends next/core-web-vitals |
| `.env.local` | Environment variables | API keys, database URLs |

### Design System

| File | Purpose |
|------|---------|
| `src/app/globals.css` | **150+ CSS custom properties** - spacing, colors, typography, shadows |
| `tailwind.config.js` | Maps CSS vars to Tailwind utilities |
| `src/shared/hooks/useDesignSystem.ts` | Design system utilities hook |

### Documentation

Located in project root:

- `PROJECT_DOCUMENTATION.md` - Complete project guide
- `SCORING_SYSTEM.md` - Primary scoring logic
- `HOW_SCORING_WORKS.md` - Secondary scoring explained
- `CACHING_SYSTEM.md` - Cache implementation details
- `LOCATION_PAGE_DESIGN_SYSTEM.md` - UI/UX patterns
- `API_URL_REFERENCE.md` - All API endpoints
- `AUTH_SETUP.md` - Authentication setup
- `AI_CHATBOT_SETUP.md` - Chat feature setup

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Sidebar` | `shared/components/UI/Sidebar/` | Reusable collapsible sidebar |
| `NavigationBar` | `shared/components/UI/NavigationBar/` | Top navigation |
| `Card` | `shared/components/UI/Card/` | Container with glass effect |
| `Button` | `shared/components/UI/Button/` | Primary button component |
| `RadialChart` | `shared/components/common/RadialChart/` | 3D circular charts |
| `BarChart` | `shared/components/common/BarChart/` | 3D bar charts |

---

## Best Practices

### Do's ✅

1. **Always use absolute imports** with `@/` alias
2. **Follow feature-based organization** - keep related code together
3. **Use TypeScript strictly** - explicit types, no implicit any
4. **Leverage design system** - use CSS custom properties via Tailwind
5. **Cache external API calls** - use LocationDataCache
6. **Handle errors gracefully** - user-friendly error messages
7. **Support both locales** - always provide nl and en translations
8. **Use Server Components** by default - only use "use client" when needed
9. **Await params in Server Components** - Next.js 15 requirement
10. **Write descriptive commit messages** - explain what and why
11. **Test responsive behavior** - mobile-first approach
12. **Document complex logic** - use comments for non-obvious code
13. **Validate API inputs** - use Zod schemas
14. **Follow git branch naming** - `claude/<desc>-<session-id>`

### Don'ts ❌

1. **Don't create new files unnecessarily** - edit existing when possible
2. **Don't use inline styles** - use Tailwind classes
3. **Don't hardcode values** - use design tokens
4. **Don't skip error handling** - always handle errors
5. **Don't forget loading states** - provide feedback to users
6. **Don't mix Server/Client** - be deliberate about component boundaries
7. **Don't ignore TypeScript errors** - fix them immediately
8. **Don't use "use client"** unnecessarily - impacts performance
9. **Don't commit sensitive data** - never commit .env.local
10. **Don't bypass authentication** - always check session for protected routes
11. **Don't use arbitrary Tailwind values** - use design system tokens
12. **Don't create duplicate components** - reuse existing shared components
13. **Don't push to wrong branch** - always use claude/ prefix
14. **Don't skip code review** - create PRs for significant changes

### Performance Optimization

1. **Use Server Components** for static content
2. **Implement caching** for external API calls
3. **Lazy load heavy components** with dynamic imports
4. **Optimize images** with Next.js Image component
5. **Minimize client-side JavaScript** - use Server Components when possible
6. **Use streaming** for AI chat responses (already implemented)
7. **Implement pagination** for large datasets
8. **Cache static assets** - leverage Next.js built-in caching

### Security Best Practices

1. **Never expose API keys** in client-side code
2. **Validate all user inputs** using Zod schemas
3. **Sanitize data** before rendering
4. **Use environment variables** for sensitive data
5. **Implement rate limiting** for external APIs
6. **Check authentication** for protected routes
7. **Use HTTPS** in production
8. **Hash passwords** with bcryptjs (already implemented)
9. **Implement CORS** appropriately
10. **Keep dependencies updated** - check for security vulnerabilities

### Code Quality

1. **Write self-documenting code** - clear names, simple logic
2. **Extract complex logic** into utility functions
3. **Keep components small** - single responsibility principle
4. **Use custom hooks** for reusable logic
5. **Write meaningful comments** - explain why, not what
6. **Follow consistent formatting** - ESLint + Prettier
7. **Test edge cases** - handle null, undefined, empty arrays
8. **Avoid premature optimization** - make it work, then make it fast
9. **Use meaningful variable names** - no `x`, `temp`, `data2`
10. **Keep functions pure** when possible - no side effects

---

## Working with AI Assistants

### Context Understanding

When starting a new task:

1. **Read relevant documentation** - check PROJECT_DOCUMENTATION.md and related files
2. **Explore existing code** - understand current patterns before adding new code
3. **Check for similar implementations** - reuse existing patterns
4. **Understand the feature module** - know which feature you're working in
5. **Review design system** - use existing tokens and components

### Making Changes

1. **Always read before writing** - use Read tool before Edit/Write
2. **Prefer editing to creating** - modify existing files when possible
3. **Follow established patterns** - match existing code style
4. **Test changes mentally** - think through edge cases
5. **Provide context in comments** - explain non-obvious decisions

### Common Pitfalls to Avoid

1. **Creating duplicate components** - check shared/components first
2. **Not using design system** - always use CSS custom properties
3. **Hardcoding translations** - support both nl and en
4. **Ignoring caching** - implement caching for external APIs
5. **Mixing Server/Client incorrectly** - understand component boundaries
6. **Not handling loading states** - always show feedback
7. **Skipping error handling** - handle all error cases
8. **Breaking type safety** - maintain strict TypeScript
9. **Not testing responsive** - consider mobile layout
10. **Forgetting git workflow** - use correct branch naming

### Questions to Ask

Before implementing a feature:

1. **Does a similar feature exist?** - Can I reuse code?
2. **Which feature module does this belong to?** - location, chat, or new?
3. **Is this a shared component or feature-specific?** - Where should it live?
4. **Does it need to be a Client Component?** - Or can it be Server?
5. **What are the edge cases?** - Null data, errors, loading?
6. **Does it need caching?** - External API calls should be cached
7. **Is it responsive?** - Mobile and desktop layouts?
8. **Does it need translations?** - Support nl and en?
9. **What's the error handling?** - User-friendly messages?
10. **Does it follow the design system?** - Use existing tokens?

---

## Conclusion

This guide provides comprehensive information for AI assistants working with the GroosHub codebase. Key takeaways:

- **Feature-based organization** - code is grouped by feature, not layer
- **Design system first** - use CSS custom properties via Tailwind
- **TypeScript strict** - explicit types, no shortcuts
- **Server Components default** - use "use client" sparingly
- **Cache external APIs** - implement caching with TTL
- **Multi-language support** - always provide nl and en
- **Git workflow** - branch naming is critical
- **Documentation** - extensive .md files provide context

For additional information, refer to:
- Project-specific docs in the root directory
- Component-specific comments in source files
- Design system definitions in `globals.css`
- API documentation in `API_URL_REFERENCE.md`

Happy coding! 🚀
