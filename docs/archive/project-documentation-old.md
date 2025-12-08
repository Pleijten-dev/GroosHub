# GroosHub - Complete Project Documentation

**Version:** 0.1.0
**Framework:** Next.js 15.5.4 with React 19.1.0
**Last Updated:** 2025-10-23

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Design System](#design-system)
6. [Core Components](#core-components)
7. [LocationPage Framework - Deep Dive](#locationpage-framework---deep-dive)
8. [Internationalization (i18n)](#internationalization-i18n)
9. [How to Add New Features](#how-to-add-new-features)
10. [Development Guidelines](#development-guidelines)
11. [Common Patterns](#common-patterns)

---

## Project Overview

GroosHub is a **comprehensive urban development and project analysis platform** built with Next.js 15. The application provides various analytical tools for urban planning, location analysis, and project management, with a strong focus on data visualization and internationalization support.

### Key Features

- **Multi-language Support**: Dutch (nl) and English (en)
- **Location Analysis**: Deep location analytics with CBS data integration
- **Modular Architecture**: Feature-based structure for scalability
- **Design System**: Comprehensive CSS custom properties system
- **Reusable Components**: Shared UI component library
- **Glass Morphism UI**: Modern frosted glass effects

---

## Technology Stack

### Core Technologies

- **Next.js 15.5.4**: React framework with App Router
- **React 19.1.0**: UI library
- **TypeScript 5.x**: Type safety
- **Tailwind CSS 3.4.0**: Utility-first CSS framework
- **PostCSS 8.x**: CSS processing

### Development Tools

- **ESLint**: Code linting
- **Turbopack**: Fast bundler (used for dev and build)
- **Autoprefixer**: CSS vendor prefixing

### Key Next.js 15 Features Used

- **App Router**: File-based routing with `app/` directory
- **Server Components**: Default server-side rendering
- **Async Params**: `params` is now a Promise in layouts/pages
- **Type-safe Routing**: Full TypeScript support

---

## Project Structure

```
GroosHub/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── [locale]/                 # Internationalized routes
│   │   │   ├── layout.tsx            # Locale-specific layout
│   │   │   ├── page.tsx              # Home page
│   │   │   └── location/             # Location analysis feature
│   │   │       ├── page.tsx          # Main location page
│   │   │       └── LocationPage.module.css
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Root page (redirects)
│   │   ├── globals.css               # Global styles & design system
│   │   └── favicon.ico
│   │
│   ├── features/                     # Feature-specific code
│   │   └── location/                 # Location analysis feature
│   │       └── components/
│   │           ├── LocationPage/     # Main page component
│   │           ├── LocationSidebar/  # Sidebar content & logic
│   │           │   ├── LocationSidebarContent.tsx
│   │           │   └── index.ts
│   │           ├── TabContent/       # Tab content components
│   │           └── Maps/             # Map components
│   │
│   ├── shared/                       # Shared/common code
│   │   ├── components/
│   │   │   └── UI/                   # Reusable UI components
│   │   │       ├── Button/
│   │   │       │   └── Button.tsx
│   │   │       ├── Input/
│   │   │       │   └── Input.tsx
│   │   │       ├── Card/
│   │   │       │   └── Card.tsx
│   │   │       ├── NavigationBar/
│   │   │       │   ├── NavigationBar.tsx
│   │   │       │   ├── NavigationItem.tsx
│   │   │       │   ├── types.ts
│   │   │       │   ├── constants.ts
│   │   │       │   └── index.ts
│   │   │       ├── Sidebar/          # Reusable sidebar component
│   │   │       │   ├── Sidebar.tsx
│   │   │       │   ├── types.ts
│   │   │       │   └── index.ts
│   │   │       ├── StatusBadge/
│   │   │       │   └── StatusBadge.tsx
│   │   │       └── index.ts
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── useDesignSystem.ts    # Design system hook
│   │   │   ├── useSidebar.ts         # Sidebar state management
│   │   │   └── useTranslation.ts     # i18n hook
│   │   │
│   │   └── utils/                    # Utility functions
│   │       └── cn.ts                 # Class name utility
│   │
│   ├── lib/                          # Third-party integrations
│   │   └── i18n/
│   │       └── config.ts             # i18n configuration
│   │
│   └── i18n/                         # Translation files
│       ├── nl/
│       │   └── common.json
│       └── en/
│           └── common.json
│
├── public/                           # Static assets
│   ├── next.svg
│   └── vercel.svg
│
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── tailwind.config.js                # Tailwind configuration
├── next.config.ts                    # Next.js configuration
└── postcss.config.js                 # PostCSS configuration
```

### Directory Organization Principles

1. **`app/`**: Next.js routing and page components
2. **`features/`**: Feature-specific components and logic (domain-driven)
3. **`shared/`**: Reusable components, hooks, and utilities
4. **`lib/`**: Third-party library configurations
5. **`i18n/`**: Translation files

---

## Architecture & Design Patterns

### 1. Feature-Based Architecture

The project uses a **feature-based modular architecture** where each major feature lives in its own directory under `src/features/`:

```
src/features/location/
├── components/         # Feature-specific components
├── hooks/             # Feature-specific hooks (if needed)
├── utils/             # Feature-specific utilities
└── types/             # Feature-specific types
```

**Benefits:**
- Better code organization
- Easy to locate feature-related code
- Scalable for large applications
- Clear separation of concerns

### 2. Component Architecture

#### Three-Tier Component Structure

1. **Page Components** (`app/[locale]/*/page.tsx`)
   - Entry points for routes
   - Orchestrate feature components
   - Handle routing and params

2. **Feature Components** (`features/*/components/`)
   - Business logic for specific features
   - Compose shared UI components
   - Feature-specific state management

3. **Shared UI Components** (`shared/components/UI/`)
   - Generic, reusable components
   - No business logic
   - Pure presentational components

### 3. State Management

**Local State:**
- React `useState` for component-local state
- Custom hooks for shared logic (`useSidebar`, `useDesignSystem`)

**State Persistence:**
- `localStorage` for UI preferences (sidebar collapsed state)
- Custom hooks handle persistence logic

### 4. Styling Architecture

**CSS-in-JS Approach using Tailwind + CSS Custom Properties:**

1. **CSS Variables** (`globals.css`): Define design tokens
2. **Tailwind Config**: Map variables to Tailwind utilities
3. **Component Classes**: Use design system hook or Tailwind classes
4. **Utility Classes**: Predefined component classes in `globals.css`

---

## Design System

The project implements a comprehensive **design system** based on CSS custom properties (CSS variables).

### Design System Structure

Location: `src/app/globals.css`

#### 1. Spacing System

```css
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-base: 16px
--space-lg: 20px
--space-xl: 24px
--space-2xl: 32px
--space-3xl: 48px
--space-4xl: 64px
```

**Usage in Tailwind:**
```jsx
<div className="p-base">         {/* 16px padding */}
<div className="mb-lg">          {/* 20px margin-bottom */}
<div className="gap-sm">         {/* 8px gap */}
```

#### 2. Color System

**Brand Colors:**
- `--color-primary`: #3b82f6 (Blue)
- `--color-primary-hover`: #2563eb
- `--color-primary-light`: #dbeafe

**Status Colors:**
- `--color-success`: #10b981 (Green)
- `--color-warning`: #f59e0b (Orange)
- `--color-error`: #ef4444 (Red)
- `--color-info`: #06b6d4 (Cyan)

**Support Colors (Brand Palette):**
- `--support-blue`: #B2C3B8
- `--support-red`: #F59D94
- `--support-brown`: #B39059
- `--support-green`: #97B269
- `--support-yellow`: #E5BC72

**Semantic Colors:**
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Background: `--bg-primary`, `--bg-secondary`, `--bg-muted`
- Border: `--border-color`, `--border-color-hover`

#### 3. Typography System

**Font Sizes:**
```css
--text-xs: 12px
--text-sm: 14px
--text-base: 16px
--text-lg: 18px
--text-xl: 20px
--text-2xl: 24px
--text-3xl: 30px
--text-4xl: 36px
```

**Font Weights:**
- Light: 300
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700

#### 4. Shadow System

```css
--shadow-xs: Subtle shadow
--shadow-sm: Small shadow
--shadow-base: Base shadow
--shadow-md: Medium shadow
--shadow-lg: Large shadow
--shadow-xl: Extra large shadow
--shadow-2xl: 2X large shadow
```

#### 5. Border Radius

```css
--radius-sm: 3px
--radius-base: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 16px
--radius-full: 9999px
```

#### 6. Transitions

```css
--duration-fast: 150ms
--duration-normal: 300ms
--duration-slow: 500ms
```

**Easing Functions:**
- `--ease-linear`
- `--ease-in`
- `--ease-out`
- `--ease-in-out`

### Using the Design System

#### Option 1: Direct Tailwind Classes

```tsx
<div className="p-base bg-primary text-white rounded-md shadow-lg">
  Content
</div>
```

#### Option 2: useDesignSystem Hook

Location: `src/shared/hooks/useDesignSystem.ts`

```tsx
import { useDesignSystem } from '@/shared/hooks/useDesignSystem';

function MyComponent() {
  const { classBuilders, tokens, utils } = useDesignSystem();

  return (
    <button className={classBuilders.button('primary', 'base')}>
      Click me
    </button>
  );
}
```

#### Option 3: Predefined Component Classes

```tsx
// These classes are defined in globals.css
<button className="btn btn-primary btn-base">Button</button>
<input className="input" />
<div className="card card-hover">Card content</div>
```

### Glass Morphism Effects

```tsx
// Glass effect utility classes
<div className="glass">              {/* Light glass effect */}
<div className="glass-strong">       {/* Strong glass effect */}
<div className="glass-panel">        {/* Glass with shadow */}
<div className="glass-nav">          {/* Glass for navigation */}
```

Properties:
- Background: Semi-transparent white
- Backdrop filter: Blur effect
- Border: Subtle border

---

## Core Components

### 1. NavigationBar

**Location:** `src/shared/components/UI/NavigationBar/NavigationBar.tsx`

**Purpose:** Main navigation bar with locale switching and user menu.

**Features:**
- Fixed positioning at top
- Glass morphism effect
- Locale switcher (NL/EN)
- User menu dropdown
- Responsive design
- Active state indication

**Usage:**
```tsx
import { NavigationBar } from '@/shared/components/UI';

<NavigationBar
  locale="nl"
  currentPath="/nl/location"
/>
```

**Key Files:**
- `NavigationBar.tsx`: Main component
- `NavigationItem.tsx`: Individual navigation items
- `types.ts`: TypeScript interfaces
- `constants.ts`: Navigation items configuration

### 2. Sidebar (Reusable)

**Location:** `src/shared/components/UI/Sidebar/Sidebar.tsx`

**Purpose:** Generic, reusable sidebar component for any feature.

**Features:**
- Collapsible with smooth transitions
- Configurable width (expanded/collapsed)
- Section-based content organization
- Persistent state (localStorage)
- Responsive (auto-collapse on mobile)
- Left/right positioning support

**Props Interface:**
```typescript
interface SidebarProps {
  isCollapsed: boolean;           // Collapse state
  onToggle: () => void;            // Toggle function
  sections: SidebarSection[];      // Content sections
  className?: string;              // Custom classes
  position?: 'left' | 'right';    // Sidebar position
  expandedWidth?: string;          // Width when expanded
  collapsedWidth?: string;         // Width when collapsed
  headerContent?: ReactNode;       // Custom header
  showToggleButton?: boolean;      // Show/hide toggle
  customToggleButton?: ReactNode;  // Custom toggle button
  title?: string;                  // Sidebar title
  subtitle?: string;               // Sidebar subtitle
}

interface SidebarSection {
  id: string;              // Unique section ID
  title: string;           // Section title
  description?: string;    // Optional description
  content: ReactNode;      // Section content (any JSX)
  className?: string;      // Custom section classes
}
```

**Usage Example:**
```tsx
import { Sidebar, useSidebar } from '@/shared/components/UI/Sidebar';

function MyPage() {
  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: false,
    persistState: true,
    storageKey: 'my-page-sidebar',
  });

  const sections = [
    {
      id: 'section-1',
      title: 'Section Title',
      description: 'Section description',
      content: <div>Your content here</div>,
    },
  ];

  return (
    <Sidebar
      isCollapsed={isCollapsed}
      onToggle={toggle}
      sections={sections}
      title="Sidebar Title"
      subtitle="Subtitle text"
      position="left"
    />
  );
}
```

### 3. useSidebar Hook

**Location:** `src/shared/hooks/useSidebar.ts`

**Purpose:** Manage sidebar state with persistence and responsive behavior.

**Features:**
- State persistence in localStorage
- Auto-collapse on mobile
- Window resize handling
- Type-safe API

**Interface:**
```typescript
interface UseSidebarOptions {
  defaultCollapsed?: boolean;      // Initial state
  persistState?: boolean;          // Enable localStorage
  storageKey?: string;             // localStorage key
  autoCollapseMobile?: boolean;    // Auto-collapse on mobile
  mobileBreakpoint?: number;       // Mobile breakpoint (px)
}

interface UseSidebarReturn {
  isCollapsed: boolean;            // Current state
  toggle: () => void;              // Toggle function
  setCollapsed: (collapsed: boolean) => void;  // Set state
  isMobile: boolean;               // Mobile detection
}
```

### 4. Button

**Location:** `src/shared/components/UI/Button/Button.tsx`

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'base' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}
```

**Usage:**
```tsx
<Button variant="primary" size="base">
  Click me
</Button>

<Button variant="ghost" loading={true}>
  Loading...
</Button>
```

### 5. Input

**Location:** `src/shared/components/UI/Input/Input.tsx`

**Props:**
```typescript
interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

**Usage:**
```tsx
<Input
  label="Email Address"
  placeholder="Enter your email"
  error={errors.email}
  helperText="We'll never share your email"
/>
```

---

## LocationPage Framework - Deep Dive

The **LocationPage** is the primary framework used throughout the project for building analytical pages with sidebars. It demonstrates the best practices for structuring feature pages.

**Location:** `src/app/[locale]/location/page.tsx`

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              NavigationBar (Top)                     │
├─────────────┬───────────────────────────┬───────────┤
│             │                           │           │
│  Sidebar    │    Main Content           │  Right    │
│  (Left)     │    Area                   │  Menu     │
│             │                           │           │
│ - Search    │ - Active Tab Content      │ - Tools   │
│ - Tabs      │ - Visualizations          │ - Export  │
│             │ - Metrics                 │ - Help    │
│             │                           │           │
└─────────────┴───────────────────────────┴───────────┘
```

### Key Components of LocationPage

#### 1. Page Configuration

**Main Sections:**
```typescript
const MAIN_SECTIONS = [
  { id: 'doelgroepen', nl: 'Doelgroepen', en: 'Target Groups' },
  { id: 'score', nl: 'Score', en: 'Score' },
  { id: 'voorzieningen', nl: 'Voorzieningen', en: 'Amenities' },
  { id: 'kaarten', nl: 'Kaarten', en: 'Maps' },
  { id: 'pve', nl: 'Programma van Eisen', en: 'Requirements Program' }
];
```

**Score Subsections:**
```typescript
const SCORE_SUBSECTIONS = [
  { id: 'demografie', nl: 'Demografie', en: 'Demographics' },
  { id: 'woningmarkt', nl: 'Woningmarkt', en: 'Housing Market' },
  { id: 'veiligheid', nl: 'Veiligheid', en: 'Safety' },
  { id: 'gezondheid', nl: 'Gezondheid', en: 'Health' },
  { id: 'leefbaarheid', nl: 'Leefbaarheid', en: 'Livability' }
];
```

#### 2. State Management

```typescript
const [activeTab, setActiveTab] = useState<TabName>('doelgroepen');
const [locale, setLocale] = useState<Locale>('nl');
const [showRightMenu, setShowRightMenu] = useState<boolean>(false);

// Sidebar state from hook
const { isCollapsed, toggle } = useSidebar({
  defaultCollapsed: false,
  persistState: true,
  storageKey: 'location-sidebar-collapsed',
  autoCollapseMobile: true,
});
```

#### 3. Sidebar Integration

**Using the Reusable Sidebar Component:**

```tsx
// Get sidebar sections from custom hook
const sidebarSections = useLocationSidebarSections({
  locale,
  activeTab,
  onTabChange: handleTabChange,
});

// Render sidebar
<Sidebar
  isCollapsed={isCollapsed}
  onToggle={toggle}
  sections={sidebarSections}
  title={locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
  subtitle={locale === 'nl' ? 'Adres & Data Analyse' : 'Address & Data Analysis'}
  position="left"
  expandedWidth="320px"
  collapsedWidth="60px"
/>
```

#### 4. LocationSidebarContent Hook

**Location:** `src/features/location/components/LocationSidebar/LocationSidebarContent.tsx`

**Purpose:** Generate sidebar sections for location analysis.

**Returns:** Array of `SidebarSection` objects

**Sections Created:**
1. **Search Section**: Address input and data fetch button
2. **Navigation Section**: Main tabs and expandable score subsections

**Key Features:**
- Address search input
- Tab navigation with active state
- Expandable "Score" section with subsections
- Fully internationalized

**Usage:**
```typescript
const sidebarSections = useLocationSidebarSections({
  locale: 'nl',
  activeTab: 'doelgroepen',
  onTabChange: (tab) => setActiveTab(tab),
});
```

#### 5. Main Content Area

The main content area adjusts its left margin based on sidebar state:

```tsx
const mainContentMargin = isCollapsed ? 'ml-[60px]' : 'ml-[320px]';

<main className={`
  flex-1 flex flex-col overflow-hidden bg-white transition-all duration-300
  ${mainContentMargin}
`}>
  {/* Content based on activeTab */}
</main>
```

#### 6. Right Menu (Optional)

Sliding panel for additional tools:

```tsx
<aside className={`
  fixed right-0 top-navbar h-[calc(100vh-var(--navbar-height))] z-40
  bg-white/80 backdrop-blur-md border-l border-gray-200/50
  transition-transform duration-300 w-70 flex flex-col shadow-lg
  ${showRightMenu ? 'translate-x-0' : 'translate-x-full'}
`}>
  {/* Tools, export options, help */}
</aside>
```

### LocationPage Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    User Action                       │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────┐
│   handleTabChange(tab) in LocationPage            │
│   - Updates activeTab state                        │
│   - Triggers re-render                             │
└───────────────┬───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────┐
│   useLocationSidebarSections hook                  │
│   - Receives activeTab as prop                     │
│   - Generates sections with active state           │
│   - Returns updated sections array                 │
└───────────────┬───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────┐
│   Sidebar Component                                │
│   - Renders sections                               │
│   - Highlights active tab                          │
└───────────────┬───────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────┐
│   Main Content Area                                │
│   - Displays content for activeTab                 │
│   - Shows visualizations and metrics               │
└───────────────────────────────────────────────────┘
```

---

## Internationalization (i18n)

The project supports **Dutch (nl)** and **English (en)** locales.

### i18n Configuration

**Location:** `src/lib/i18n/config.ts`

```typescript
export const defaultLocale = 'nl' as const;
export const locales = ['nl', 'en'] as const;
export type Locale = (typeof locales)[number];

export const localeConfig = {
  nl: {
    name: 'Nederlands',
    flag: '🇳🇱',
    dir: 'ltr' as const,
  },
  en: {
    name: 'English',
    flag: '🇺🇸',
    dir: 'ltr' as const,
  },
};
```

### URL Structure

All routes are prefixed with locale:
- `/{locale}/` → Home page
- `/{locale}/location` → Location analysis
- Example: `/nl/location`, `/en/location`

### Locale Routing

**Layout Structure:**
```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale-specific layout
│   └── page.tsx        # Localized page
```

**Handling Params (Next.js 15):**

```tsx
// pages must be async and await params
const HomePage: React.FC<HomePageProps> = async ({ params }) => {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  // Use locale
};
```

### Translation Patterns

#### Pattern 1: Inline Translations

```tsx
const text = locale === 'nl' ? 'Nederlandse tekst' : 'English text';
```

#### Pattern 2: Translation Objects

```tsx
const translations = {
  nl: { greeting: 'Hallo' },
  en: { greeting: 'Hello' }
};

const greeting = translations[locale].greeting;
```

#### Pattern 3: Configuration Objects with Locales

```tsx
const SECTIONS = [
  { id: 'home', nl: 'Home', en: 'Home' },
  { id: 'about', nl: 'Over Ons', en: 'About Us' }
];

const getSectionText = (section) => section[locale];
```

#### Pattern 4: Translation Hook

**Location:** `src/shared/hooks/useTranslation.ts`

```tsx
const { t } = useTranslation(locale);
const text = t('nav.home');
```

### Translation Files

**Location:** `src/i18n/{locale}/common.json`

```json
{
  "nav": {
    "home": "Home",
    "about": "Over Ons"
  }
}
```

### Language Switching

Handled in NavigationBar component:

```tsx
const handleLanguageSwitch = (newLocale: Locale) => {
  const pathWithoutLocale = pathname.replace(`/${locale}`, '');
  const newPath = `/${newLocale}${pathWithoutLocale}`;
  router.push(newPath);
};
```

---

## How to Add New Features

### Adding a New Page

Follow the **LocationPage framework** as a template.

#### Step 1: Create Feature Directory

```
src/features/my-feature/
├── components/
│   ├── MyFeaturePage/
│   │   └── index.ts
│   └── MyFeatureSidebar/
│       ├── MyFeatureSidebarContent.tsx
│       └── index.ts
└── types/
    └── index.ts
```

#### Step 2: Create Page Route

**File:** `src/app/[locale]/my-feature/page.tsx`

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar, useSidebar } from '@/shared/components/UI/Sidebar';
import { useMyFeatureSidebarSections } from '@/features/my-feature/components/MyFeatureSidebar';
import { Locale } from '@/lib/i18n/config';

interface MyFeaturePageProps {
  params: Promise<{ locale: Locale }>;
}

const MyFeaturePage: React.FC<MyFeaturePageProps> = ({ params }) => {
  const [locale, setLocale] = useState<Locale>('nl');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Resolve params
  useEffect(() => {
    params.then(({ locale: resolvedLocale }) => {
      setLocale(resolvedLocale);
    });
  }, [params]);

  // Sidebar state
  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: false,
    persistState: true,
    storageKey: 'my-feature-sidebar',
  });

  // Get sidebar sections
  const sidebarSections = useMyFeatureSidebarSections({
    locale,
    activeTab,
    onTabChange: setActiveTab,
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden relative bg-white">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        sections={sidebarSections}
        title={locale === 'nl' ? 'Mijn Feature' : 'My Feature'}
        subtitle={locale === 'nl' ? 'Beschrijving' : 'Description'}
        position="left"
      />

      <main className={`
        flex-1 overflow-auto transition-all duration-300
        ${isCollapsed ? 'ml-[60px]' : 'ml-[320px]'}
      `}>
        {/* Your content here based on activeTab */}
      </main>
    </div>
  );
};

export default MyFeaturePage;
```

#### Step 3: Create Sidebar Content Hook

**File:** `src/features/my-feature/components/MyFeatureSidebar/MyFeatureSidebarContent.tsx`

```tsx
"use client";

import React, { useState } from 'react';
import { Locale } from '@/lib/i18n/config';
import { SidebarSection } from '@/shared/components/UI/Sidebar/types';
import { Button, Input } from '@/shared/components/UI';

interface MyFeatureSidebarContentProps {
  locale: Locale;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const useMyFeatureSidebarSections = ({
  locale,
  activeTab,
  onTabChange,
}: MyFeatureSidebarContentProps): SidebarSection[] => {

  const sections: SidebarSection[] = [
    {
      id: 'navigation',
      title: locale === 'nl' ? 'Navigatie' : 'Navigation',
      content: (
        <div className="space-y-xs">
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onTabChange('overview')}
          >
            {locale === 'nl' ? 'Overzicht' : 'Overview'}
          </Button>
          {/* Add more tabs */}
        </div>
      ),
    },
  ];

  return sections;
};
```

#### Step 4: Add Navigation Item (Optional)

**File:** `src/shared/components/UI/NavigationBar/constants.ts`

```tsx
export const NAVIGATION_ITEMS = [
  // Existing items...
  {
    id: 'my-feature',
    labelKey: 'nav.myFeature',
    href: '/my-feature',
  },
];
```

Add translations in `src/i18n/{locale}/common.json`:
```json
{
  "nav": {
    "myFeature": "My Feature"
  }
}
```

### Adding a New UI Component

#### Step 1: Create Component File

**File:** `src/shared/components/UI/MyComponent/MyComponent.tsx`

```tsx
import React from 'react';
import { useDesignSystem } from '@/shared/hooks/useDesignSystem';
import { cn } from '@/shared/utils/cn';

export interface MyComponentProps {
  variant?: 'default' | 'alternative';
  size?: 'sm' | 'base' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  variant = 'default',
  size = 'base',
  className = '',
  children,
}) => {
  const { tokens, utils } = useDesignSystem();

  return (
    <div className={cn(
      'p-base rounded-md',
      variant === 'default' && 'bg-primary text-white',
      variant === 'alternative' && 'bg-secondary text-text-primary',
      size === 'sm' && 'text-sm',
      size === 'base' && 'text-base',
      size === 'lg' && 'text-lg',
      className
    )}>
      {children}
    </div>
  );
};

export default MyComponent;
```

#### Step 2: Create Index File

**File:** `src/shared/components/UI/MyComponent/index.ts`

```tsx
export { MyComponent } from './MyComponent';
export type { MyComponentProps } from './MyComponent';
```

#### Step 3: Export from UI Index

**File:** `src/shared/components/UI/index.ts`

```tsx
export * from './MyComponent';
// Other exports...
```

### Adding a New Hook

#### Step 1: Create Hook File

**File:** `src/shared/hooks/useMyHook.ts`

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseMyHookOptions {
  option1?: boolean;
  option2?: string;
}

interface UseMyHookReturn {
  data: any;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMyHook({
  option1 = true,
  option2 = 'default',
}: UseMyHookOptions = {}): UseMyHookReturn {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Your logic here
      setData(/* fetched data */);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [option1, option2]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

### Adding Translations

#### Step 1: Add Keys to Translation Files

**File:** `src/i18n/nl/common.json`
```json
{
  "myFeature": {
    "title": "Mijn Feature Titel",
    "description": "Beschrijving"
  }
}
```

**File:** `src/i18n/en/common.json`
```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "Description"
  }
}
```

#### Step 2: Use Translations

```tsx
import { useTranslation } from '@/shared/hooks/useTranslation';

function MyComponent({ locale }: { locale: Locale }) {
  const { t } = useTranslation(locale);

  return (
    <div>
      <h1>{t('myFeature.title')}</h1>
      <p>{t('myFeature.description')}</p>
    </div>
  );
}
```

---

## Development Guidelines

### Code Style

1. **Use TypeScript** for all new files
2. **Explicit types** for component props
3. **Functional components** with hooks
4. **Arrow functions** for component definitions
5. **Descriptive names** for variables and functions

### Component Guidelines

1. **Single Responsibility**: Each component should do one thing
2. **Props Interface**: Define explicit TypeScript interfaces
3. **Default Props**: Use default parameter values
4. **Ref Forwarding**: Use `forwardRef` for form components
5. **Display Name**: Set `displayName` for debugging

### File Naming

- **Components**: PascalCase (e.g., `MyComponent.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useMyHook.ts`)
- **Utilities**: camelCase (e.g., `myUtil.ts`)
- **Types**: PascalCase with `.types.ts` suffix (e.g., `MyComponent.types.ts`)

### Import Order

```tsx
// 1. React and Next.js imports
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import clsx from 'clsx';

// 3. Absolute imports from project
import { Button } from '@/shared/components/UI';
import { useDesignSystem } from '@/shared/hooks/useDesignSystem';

// 4. Relative imports
import { MyLocalComponent } from './MyLocalComponent';
import styles from './styles.module.css';

// 5. Types
import type { MyType } from './types';
```

### State Management Best Practices

1. **Local state first**: Use `useState` for component-local state
2. **Custom hooks**: Extract reusable state logic
3. **Prop drilling**: Keep prop chains short (max 2-3 levels)
4. **Derived state**: Compute values instead of storing them
5. **Memoization**: Use `useMemo` and `useCallback` for expensive operations

### Performance Best Practices

1. **Server Components**: Use Server Components by default (no "use client")
2. **Client Components**: Add "use client" only when needed (hooks, events)
3. **Code Splitting**: Use dynamic imports for large components
4. **Image Optimization**: Use Next.js `<Image>` component
5. **Avoid Large Bundles**: Check bundle size regularly

---

## Common Patterns

### Pattern 1: Page with Sidebar

```tsx
"use client";

import { Sidebar, useSidebar } from '@/shared/components/UI/Sidebar';

function MyPage() {
  const { isCollapsed, toggle } = useSidebar({
    storageKey: 'my-page-sidebar',
  });

  const sections = [
    /* sidebar sections */
  ];

  return (
    <div className="flex h-screen">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        sections={sections}
        title="Page Title"
      />
      <main className={isCollapsed ? 'ml-[60px]' : 'ml-[320px]'}>
        {/* content */}
      </main>
    </div>
  );
}
```

### Pattern 2: Internationalized Component

```tsx
interface Props {
  locale: Locale;
}

const TEXTS = {
  nl: { title: 'Titel', description: 'Beschrijving' },
  en: { title: 'Title', description: 'Description' }
};

function MyComponent({ locale }: Props) {
  const t = TEXTS[locale];

  return (
    <div>
      <h1>{t.title}</h1>
      <p>{t.description}</p>
    </div>
  );
}
```

### Pattern 3: Form with Input

```tsx
import { Input, Button } from '@/shared/components/UI';
import { useState } from 'react';

function MyForm() {
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // validation and submit logic
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-base">
      <Input
        label="Email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={errors.email}
        placeholder="Enter email"
      />
      <Button type="submit" variant="primary">
        Submit
      </Button>
    </form>
  );
}
```

### Pattern 4: Conditional Rendering with Tabs

```tsx
function MyComponent() {
  const [activeTab, setActiveTab] = useState('tab1');

  const renderContent = () => {
    switch (activeTab) {
      case 'tab1':
        return <Tab1Content />;
      case 'tab2':
        return <Tab2Content />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex gap-sm">
        <Button
          variant={activeTab === 'tab1' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('tab1')}
        >
          Tab 1
        </Button>
        <Button
          variant={activeTab === 'tab2' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('tab2')}
        >
          Tab 2
        </Button>
      </div>
      <div className="mt-base">
        {renderContent()}
      </div>
    </div>
  );
}
```

### Pattern 5: Loading States

```tsx
function MyComponent() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <div>{/* render data */}</div>;
}
```

### Pattern 6: Responsive Design

```tsx
function MyComponent() {
  return (
    <div className={cn(
      'p-base',                    // Mobile: 16px padding
      'md:p-lg',                   // Tablet: 20px padding
      'lg:p-xl',                   // Desktop: 24px padding
      'flex flex-col',             // Mobile: column
      'md:flex-row',               // Tablet+: row
      'gap-base md:gap-lg'         // Responsive gap
    )}>
      {/* content */}
    </div>
  );
}
```

---

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Development Server

Open [http://localhost:3000](http://localhost:3000) to view the application.

Default locale routes:
- `http://localhost:3000/nl` - Dutch home page
- `http://localhost:3000/en` - English home page
- `http://localhost:3000/nl/location` - Location analysis (Dutch)

---

## Key Takeaways

1. **LocationPage is the Template**: Use it as a framework for building new analytical pages
2. **Reusable Sidebar Component**: The `Sidebar` component is generic and can be used for any feature
3. **Design System First**: Always use design tokens from `globals.css` via Tailwind classes
4. **Feature-Based Architecture**: Organize code by features, not by technical layers
5. **Type Safety**: Use TypeScript interfaces for all props and state
6. **Internationalization**: Support both NL and EN locales from the start
7. **State Management**: Use local state with custom hooks for reusable logic
8. **Consistent Patterns**: Follow established patterns for consistency

---

## File Reference Quick Links

### Core Configuration
- **Next.js Config**: `/next.config.ts`
- **Tailwind Config**: `/tailwind.config.js`
- **TypeScript Config**: `/tsconfig.json`
- **Global Styles**: `/src/app/globals.css`

### Key Components
- **NavigationBar**: `/src/shared/components/UI/NavigationBar/NavigationBar.tsx`
- **Sidebar**: `/src/shared/components/UI/Sidebar/Sidebar.tsx`
- **Button**: `/src/shared/components/UI/Button/Button.tsx`
- **Input**: `/src/shared/components/UI/Input/Input.tsx`

### Key Hooks
- **useSidebar**: `/src/shared/hooks/useSidebar.ts`
- **useDesignSystem**: `/src/shared/hooks/useDesignSystem.ts`
- **useTranslation**: `/src/shared/hooks/useTranslation.ts`

### Feature Example
- **LocationPage**: `/src/app/[locale]/location/page.tsx`
- **LocationSidebar**: `/src/features/location/components/LocationSidebar/LocationSidebarContent.tsx`

### Configuration
- **i18n Config**: `/src/lib/i18n/config.ts`
- **Translations NL**: `/src/i18n/nl/common.json`
- **Translations EN**: `/src/i18n/en/common.json`

---

## Next Steps

1. **Explore the LocationPage**: Understand how it uses the Sidebar component
2. **Review the Design System**: Check `globals.css` for available design tokens
3. **Build a New Feature**: Follow the "Adding a New Page" guide
4. **Customize Components**: Extend existing UI components for your needs
5. **Add Translations**: Support additional locales if needed

---

**Happy Coding!** 🚀
