# Location Page Design System

**Version:** 1.0
**Last Updated:** 2025-11-06
**Purpose:** Unified design language for the GroosHub Location Analysis Page

---

## Design Principles

### Core Philosophy
1. **Modern & Sleek:** Clean lines, subtle effects, and sophisticated visual hierarchy
2. **Minimal Color Usage:** Black and cream offwhite as primary theme, with gradient accents
3. **Simple Grid Alignment:** Clear structure with large bold headlines and smaller body text
4. **Nested Panels:** Frosted glass outer panels with cream inner panels
5. **Consistent System:** Unified sizing, borders, text, and spacing
6. **No Emoticons:** Remove all emoji and symbol decorations for a professional appearance

---

## 1. Color System

### Primary Colors

#### Main Theme
```css
--color-primary-black: #000000;
--color-primary-cream: #f8eee4;
--color-background-light: #ffffff;
```

#### The Gradient Palette
Use these 5 colors for all data visualization, accents, and highlights:
```css
--gradient-1-darkest: #0c211a;  /* Deep forest green */
--gradient-2-dark: #48806a;     /* Teal green */
--gradient-3-mid: #477638;      /* Olive green */
--gradient-4-light: #8a976b;    /* Sage green */
--gradient-5-lightest: #f8eee4; /* Cream offwhite */
```

### Usage Guidelines

#### Text Colors
- **Headlines/Important:** `#000000` (black)
- **Body text:** `rgba(0, 0, 0, 0.87)` (high emphasis)
- **Secondary text:** `rgba(0, 0, 0, 0.60)` (medium emphasis)
- **Disabled/Hints:** `rgba(0, 0, 0, 0.38)` (low emphasis)

#### Panel Colors
- **Outer panel (frosted glass):**
  - Background: `rgba(255, 255, 255, 0.7)`
  - Backdrop filter: `blur(12px)`
  - Border: `1px solid rgba(0, 0, 0, 0.08)`

- **Inner panel (nested):**
  - Background: `#f8eee4` (cream)
  - Border: `1px solid rgba(0, 0, 0, 0.04)`

#### Data Visualization Colors
Use the 5-color gradient palette for:
- Chart colors (RadialChart, BarChart, etc.)
- Category indicators
- Progress/status indicators
- Score visualizations

**Scoring Color Scale:**
For continuous scores (-1 to +1), interpolate through the gradient:
- Worst (-1.0): `#0c211a` (darkest)
- Below average (-0.5): `#48806a`
- Average (0.0): `#477638`
- Above average (0.5): `#8a976b`
- Best (1.0): `#f8eee4` (lightest/cream)

#### Accent Usage
- **Links/Interactive elements:** `#477638` (mid green)
- **Hover states:** Slightly lighter shade or add opacity
- **Active/Selected states:** `#48806a` (dark green) with cream background

---

## 2. Background System

### Page Background
```css
.page-background {
  background-color: #f8eee4; /* Cream base */
  position: relative;
  overflow: hidden;
}

.page-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(12, 33, 26, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(72, 128, 106, 0.04) 0%, transparent 40%),
    radial-gradient(circle at 40% 80%, rgba(71, 118, 56, 0.03) 0%, transparent 40%),
    radial-gradient(circle at 70% 20%, rgba(138, 151, 107, 0.04) 0%, transparent 40%);
  z-index: 0;
  pointer-events: none;
}
```

### Panel Backgrounds

#### Outer Panel (Frosted Glass)
```css
.panel-outer {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
```

#### Inner Panel (Cream)
```css
.panel-inner {
  background: #f8eee4;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 12px;
}
```

---

## 3. Typography System

### Font Stack
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas,
             'Courier New', monospace;
```

### Type Scale

#### Display (Outside Panels)
```css
.display-1 {
  font-size: 3rem;      /* 48px */
  line-height: 1.1;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.02em;
}

.display-2 {
  font-size: 2.25rem;   /* 36px */
  line-height: 1.2;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.015em;
}
```

#### Headings (Inside Panels)
```css
.heading-1 {
  font-size: 1.875rem;  /* 30px */
  line-height: 1.3;
  font-weight: 700;
  color: #000000;
}

.heading-2 {
  font-size: 1.5rem;    /* 24px */
  line-height: 1.35;
  font-weight: 600;
  color: #000000;
}

.heading-3 {
  font-size: 1.25rem;   /* 20px */
  line-height: 1.4;
  font-weight: 600;
  color: #000000;
}

.heading-4 {
  font-size: 1rem;      /* 16px */
  line-height: 1.5;
  font-weight: 600;
  color: #000000;
}
```

#### Body Text
```css
.body-large {
  font-size: 1.125rem;  /* 18px */
  line-height: 1.6;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
}

.body-regular {
  font-size: 1rem;      /* 16px */
  line-height: 1.6;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
}

.body-small {
  font-size: 0.875rem;  /* 14px */
  line-height: 1.5;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.60);
}
```

#### Supporting Text
```css
.caption {
  font-size: 0.75rem;   /* 12px */
  line-height: 1.4;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.60);
}

.overline {
  font-size: 0.75rem;   /* 12px */
  line-height: 1.4;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, 0.60);
}
```

### Usage Guidelines
- **Outside panels:** Use Display styles for major section headings
- **Inside panels:** Use Heading styles for card titles and subsections
- **Paragraphs:** Use Body-regular as default, Body-small for secondary info
- **Labels:** Use Caption or Overline styles
- **Numbers/Data:** Use font-mono for tabular data and scores

---

## 4. Spacing System

### Base Unit: 4px

```css
--spacing-2xs: 4px;   /* 0.25rem */
--spacing-xs: 8px;    /* 0.5rem */
--spacing-sm: 12px;   /* 0.75rem */
--spacing-md: 16px;   /* 1rem */
--spacing-lg: 24px;   /* 1.5rem */
--spacing-xl: 32px;   /* 2rem */
--spacing-2xl: 48px;  /* 3rem */
--spacing-3xl: 64px;  /* 4rem */
```

### Application

#### Panel Padding
- **Outer panel:** `padding: var(--spacing-xl);` (32px)
- **Inner panel:** `padding: var(--spacing-lg);` (24px)
- **Card padding:** `padding: var(--spacing-md);` (16px)

#### Component Spacing
- **Section gaps:** `gap: var(--spacing-2xl);` (48px)
- **Card gaps:** `gap: var(--spacing-md);` (16px)
- **Element gaps:** `gap: var(--spacing-sm);` (12px)

#### Vertical Rhythm
- **After Display headings:** `margin-bottom: var(--spacing-xl);`
- **After Headings:** `margin-bottom: var(--spacing-lg);`
- **Between paragraphs:** `margin-bottom: var(--spacing-md);`
- **Between list items:** `gap: var(--spacing-xs);`

---

## 5. Layout & Grid System

### Container Widths
```css
.container-full {
  max-width: 100%;
  padding: 0 var(--spacing-lg);
}

.container-large {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.container-medium {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.container-small {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}
```

### Grid System
```css
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}
```

### Responsive Breakpoints
```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## 6. Border & Corner System

### Border Radius
```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-pill: 9999px;
```

### Border Widths
```css
--border-thin: 1px;
--border-medium: 2px;
--border-thick: 4px;
```

### Application
- **Outer panels:** `border-radius: var(--radius-lg);` (16px)
- **Inner panels:** `border-radius: var(--radius-md);` (12px)
- **Cards:** `border-radius: var(--radius-md);` (12px)
- **Buttons:** `border-radius: var(--radius-sm);` (8px)
- **Badges/Pills:** `border-radius: var(--radius-pill);`
- **Inputs:** `border-radius: var(--radius-sm);` (8px)

### Border Colors
- **Subtle borders:** `rgba(0, 0, 0, 0.08)`
- **Medium borders:** `rgba(0, 0, 0, 0.12)`
- **Emphasis borders:** `rgba(0, 0, 0, 0.20)`
- **Accent borders:** Use gradient colors (#477638, #48806a)

---

## 7. Component Patterns

### Card Pattern (Standard)
```css
.card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  transition: all 200ms ease;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
```

### Nested Card Pattern
```html
<div class="card-outer">
  <!-- Frosted glass container -->
  <div class="card-inner">
    <!-- Cream background content -->
  </div>
</div>
```

```css
.card-outer {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}

.card-inner {
  background: #f8eee4;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}
```

### Accent Border Pattern
For cards that need category/type indicators:
```css
.card-accent {
  border-left: 4px solid var(--gradient-3-mid); /* or other gradient color */
}
```

---

## 8. Button System

### Button Variants

#### Primary Button
```css
.button-primary {
  background: #477638;
  color: #ffffff;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.button-primary:hover {
  background: #48806a;
  box-shadow: 0 4px 12px rgba(71, 118, 56, 0.2);
  transform: translateY(-1px);
}

.button-primary:active {
  transform: translateY(0);
}
```

#### Secondary Button
```css
.button-secondary {
  background: transparent;
  color: #000000;
  border: 1px solid rgba(0, 0, 0, 0.20);
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.button-secondary:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #477638;
}
```

#### Ghost Button
```css
.button-ghost {
  background: transparent;
  color: rgba(0, 0, 0, 0.87);
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.button-ghost:hover {
  background: rgba(0, 0, 0, 0.04);
}
```

### Button Sizes
```css
.button-sm {
  padding: 8px 16px;
  font-size: 0.875rem;
}

.button-md {
  padding: 12px 24px;
  font-size: 1rem;
}

.button-lg {
  padding: 16px 32px;
  font-size: 1.125rem;
}
```

---

## 9. Form Elements

### Input Fields
```css
.input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.20);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.87);
  background: #ffffff;
  transition: all 200ms ease;
}

.input:focus {
  outline: none;
  border-color: #477638;
  box-shadow: 0 0 0 3px rgba(71, 118, 56, 0.1);
}

.input::placeholder {
  color: rgba(0, 0, 0, 0.38);
}
```

### Select Dropdowns
```css
.select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.20);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.87);
  background: #ffffff;
  cursor: pointer;
  transition: all 200ms ease;
}

.select:focus {
  outline: none;
  border-color: #477638;
  box-shadow: 0 0 0 3px rgba(71, 118, 56, 0.1);
}
```

### Search Input (with icon)
```css
.search-container {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: rgba(0, 0, 0, 0.38);
  pointer-events: none;
}

.search-input {
  padding-left: 44px; /* Space for icon */
}
```

---

## 10. Badge & Tag System

### Badge Variants

#### Status Badge
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-gradient-1 {
  background: rgba(12, 33, 26, 0.1);
  color: #0c211a;
  border: 1px solid rgba(12, 33, 26, 0.2);
}

.badge-gradient-2 {
  background: rgba(72, 128, 106, 0.1);
  color: #2d5c4a;
  border: 1px solid rgba(72, 128, 106, 0.2);
}

.badge-gradient-3 {
  background: rgba(71, 118, 56, 0.1);
  color: #3a5d2c;
  border: 1px solid rgba(71, 118, 56, 0.2);
}

.badge-gradient-4 {
  background: rgba(138, 151, 107, 0.15);
  color: #6b7956;
  border: 1px solid rgba(138, 151, 107, 0.3);
}
```

#### Priority Badge
```css
.badge-high {
  background: rgba(12, 33, 26, 0.1);
  color: #0c211a;
}

.badge-medium {
  background: rgba(71, 118, 56, 0.1);
  color: #3a5d2c;
}

.badge-low {
  background: rgba(138, 151, 107, 0.1);
  color: #6b7956;
}
```

---

## 11. Data Table System

### Table Structure
```css
.table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header {
  background: #f8eee4;
  border-bottom: 2px solid rgba(0, 0, 0, 0.08);
}

.table-header th {
  padding: 12px 16px;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.87);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-body tr {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  transition: background 150ms ease;
}

.table-body tr:hover {
  background: rgba(0, 0, 0, 0.02);
}

.table-body td {
  padding: 12px 16px;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.87);
}
```

### Score Cell
```css
.score-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid;
}

/* Use gradient colors for different score ranges */
```

---

## 12. Chart & Visualization System

### Radial Chart Styling
- Use 5-color gradient palette
- Apply subtle noise texture for visual interest
- Labels in black or white (based on contrast)
- Interactive hover states with scaling

### Bar Chart Styling
- Bars use gradient palette colors
- Average line in mid-green (#477638)
- Grid lines: `rgba(0, 0, 0, 0.06)`
- Labels in black

### Color Assignment for Categories
Distribute the 5-color gradient evenly across data categories:
1. Category 1: #0c211a
2. Category 2: #48806a
3. Category 3: #477638
4. Category 4: #8a976b
5. Category 5: #f8eee4
(Repeat if more than 5 categories)

---

## 13. Interactive States

### Hover States
```css
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
```

### Active/Selected States
```css
.selectable.is-active {
  background: #f8eee4;
  border-color: #477638;
  color: #000000;
}
```

### Focus States
```css
.focusable:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(71, 118, 56, 0.2);
}
```

### Disabled States
```css
.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
```

---

## 14. Transitions & Animations

### Standard Timing
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
--easing-in: cubic-bezier(0.4, 0, 1, 1);
--easing-out: cubic-bezier(0, 0, 0.2, 1);
```

### Common Transitions
```css
.transition-all {
  transition: all var(--duration-normal) var(--easing-default);
}

.transition-transform {
  transition: transform var(--duration-normal) var(--easing-default);
}

.transition-colors {
  transition: background-color var(--duration-normal) var(--easing-default),
              color var(--duration-normal) var(--easing-default),
              border-color var(--duration-normal) var(--easing-default);
}
```

---

## 15. Shadow System

### Elevation Levels
```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12);
```

### Application
- **Resting cards:** `shadow-sm`
- **Hover cards:** `shadow-lg`
- **Modal/Overlay:** `shadow-xl`
- **Subtle separation:** `shadow-xs`

---

## 16. Accessibility Guidelines

### Contrast Requirements
- **Body text on cream (#f8eee4):** Use black or very dark green (#0c211a)
- **Body text on white panels:** Use rgba(0, 0, 0, 0.87)
- **Minimum contrast ratio:** 4.5:1 for normal text, 3:1 for large text

### Focus Indicators
- Always visible focus rings
- Color: `#477638` with 0.2 opacity shadow
- Minimum 3px thickness

### Interactive Elements
- Minimum touch target: 44x44px
- Clear hover and active states
- Keyboard navigation support

### Text
- Minimum font size: 14px (0.875rem)
- Maximum line length: 75 characters
- Line height: 1.5 minimum for body text

---

## 17. Icon Guidelines

### NO Emoticons or Symbols
- **Remove all:** No emoji, decorative symbols, or icon fonts
- **Use instead:**
  - SVG icons for functional UI elements
  - Text labels with proper typography
  - Data visualization (charts) for metrics
  - Color coding for categories

### SVG Icon Styling
```css
.icon {
  width: 20px;
  height: 20px;
  stroke-width: 2px;
  color: currentColor;
}

.icon-sm { width: 16px; height: 16px; }
.icon-lg { width: 24px; height: 24px; }
```

### Icon Colors
- Default: `rgba(0, 0, 0, 0.60)`
- Active: `#477638`
- Disabled: `rgba(0, 0, 0, 0.38)`

---

## 18. Loading States

### Spinner
```css
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #477638;
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Skeleton Loading
```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.04) 25%,
    rgba(0, 0, 0, 0.08) 50%,
    rgba(0, 0, 0, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 19. Empty States

### Structure
```html
<div class="empty-state">
  <div class="empty-state-content">
    <h3 class="heading-3">No Data Available</h3>
    <p class="body-small">Enter an address to begin analysis</p>
    <button class="button-primary">Get Started</button>
  </div>
</div>
```

```css
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--spacing-2xl);
}

.empty-state-content {
  text-align: center;
  max-width: 400px;
}
```

---

## 20. Responsive Design

### Mobile First Approach
Start with mobile styles, add complexity for larger screens

### Key Breakpoints
- **sm (640px):** Small tablets
- **md (768px):** Tablets
- **lg (1024px):** Laptops
- **xl (1280px):** Desktops
- **2xl (1536px):** Large desktops

### Common Responsive Patterns
```css
/* Stack on mobile, side-by-side on tablet+ */
.responsive-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .responsive-stack {
    flex-direction: row;
  }
}

/* 1 column mobile, 2 tablet, 3 laptop, 4 desktop */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .responsive-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .responsive-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1280px) {
  .responsive-grid { grid-template-columns: repeat(4, 1fr); }
}
```

---

## 21. Z-Index Scale

```css
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;
```

---

## 22. Implementation Checklist

### Phase 1: Foundation
- [ ] Update CSS variables/Tailwind config with design tokens
- [ ] Create background gradient system
- [ ] Implement panel system (frosted glass + cream)
- [ ] Update typography scale

### Phase 2: Components
- [ ] Refactor button styles
- [ ] Update form elements (inputs, selects, search)
- [ ] Standardize card components
- [ ] Update badge system
- [ ] Refactor table styles

### Phase 3: Cleanup
- [ ] Remove all emoticons and decorative symbols
- [ ] Replace with SVG icons or text labels
- [ ] Update color usage to gradient palette
- [ ] Ensure consistent spacing

### Phase 4: Polish
- [ ] Add transitions and animations
- [ ] Test responsive layouts
- [ ] Verify accessibility
- [ ] Cross-browser testing

---

**END OF DESIGN SYSTEM**
