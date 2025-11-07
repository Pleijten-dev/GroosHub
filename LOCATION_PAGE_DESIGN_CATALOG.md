# Location Page Design Catalog

**Last Updated:** 2025-11-06
**Purpose:** Comprehensive catalog of all UI elements on the location page for design unification

---

## 1. Page Layout & Structure

### Main Container
- **File:** `src/app/[locale]/location/page.tsx`
- Full-screen flex layout (`h-screen w-screen`)
- Background: white
- Three main areas: Sidebar (left), Main Content (center), Right Menu (right)

### Sidebar (Left)
- **Component:** `Sidebar` from `shared/components/UI/Sidebar`
- **Width:** 320px (expanded), 60px (collapsed)
- **Position:** Fixed left
- **Colors:** Currently varies
- **Sections:**
  - Address Search section with autocomplete input
  - Navigation buttons for main sections
  - Expandable subsections (Score submenu)

### Main Content Area
- **Dynamic margin:** `ml-[60px]` or `ml-[320px]` based on sidebar state
- **Padding:** `p-lg` on most views
- **Overflow:** `overflow-auto h-full`
- **Background:** white

### Right Menu (Optional)
- **Width:** Fixed width
- **Position:** Fixed right, translates in/out
- **Background:** `bg-white/80 backdrop-blur-md`
- **Border:** `border-l border-gray-200/50`
- Toggle button with arrow indicator

---

## 2. Data Display Components

### A. Loading States

#### Main Loading Indicator
- **Location:** Main content area during data fetch
- **Elements:**
  - Spinning animation (16x16, blue border)
  - Primary text: "Fetching data..."
  - Checklist of data sources being loaded with symbols (✓ and →)
- **Colors:**
  - Spinner: `border-primary`
  - Text: `text-text-secondary` (main), `text-text-muted` (list items)

#### Error State
- **Elements:**
  - Large warning emoji (⚠️, 6xl)
  - Error title (2xl, bold)
  - Error message list
  - Retry button with primary colors
- **Colors:**
  - Warning: `text-red-500`
  - Button: `bg-primary text-white hover:bg-primary-hover`

### B. Welcome/Empty State
- **Elements:**
  - Large emoji (🗺️, 6xl)
  - Title (4xl, bold, gray-900)
  - Description text (lg, text-secondary)
  - Information grid (2 columns, gray-50 background)
- **Layout:** Centered, max-w-2xl

---

## 3. Tab-Specific Components

### Tab 1: Doelgroepen (Target Groups)

#### DoelgroepenGrid
**File:** `src/features/location/components/Doelgroepen/DoelgroepenGrid.tsx`

**Header Section:**
- Title: 2xl, bold, gray-900
- Subtitle: gray-600

**View Tabs:**
- Horizontal tabs with bottom borders
- Active: blue-600 border and text
- Inactive: transparent border, gray-600 text

**Search & Filters:**
- Search input with icon (left-positioned magnifying glass)
- Border: gray-300, Focus: blue-500 ring
- Filter dropdowns (Income Level, Household Type, Age Group)
- Results count display

**Persona Cards Grid:**
- Grid: responsive (1/2/3/4 columns)
- Gap: 4

#### DoelgroepenCard
**File:** `src/features/location/components/Doelgroepen/DoelgroepenCard.tsx`

**Structure:**
- White background, rounded-lg, gray-200 border
- Left border (4px) colored by income level:
  - Low income: blue-500 (#3b82f6)
  - Average: green-500 (#22c55e)
  - High: purple-500 (#a855f7)
- Hover: shadow-lg

**Elements:**
- Name (lg, semibold, gray-900)
- Badges:
  - Income level (rounded-full, xs, colored backgrounds)
  - Age group (orange-100 background)
- Description paragraph (sm, gray-700)
- Household info with icon
- Current situation section (blue icon)
- Desired situation section (green icon)
- Property type tags

**Scoring Tables (when location data available):**

#### SummaryRankingTable
- Table with selectable rows
- Columns: Rank, Name, Total Score, Category Scores
- Score badges with color coding

#### DetailedScoringTable
- Expanded scoring breakdown
- Category weights displayed
- Individual metric scores

#### CubeVisualization
- 3D cube with WebGL/Three.js
- Interactive rotation
- Color-coded personas on fixed positions
- Green gradient palette (27 shades)

---

### Tab 2: Score Overview

#### MultiLevelDataTable
**File:** `src/features/location/components/DataTables/MultiLevelDataTable.tsx`

**Location Info Panel:**
- Background: gray-50, rounded-lg
- Padding: p-base
- Grid layout (2 columns) for address details
- Text: sm, with muted labels and medium values

**Filter Controls:**
- Geographic Level dropdown
- Data Source dropdown (demographics, health, safety, etc.)
- Row count indicator

**Data Table:**
- Full-width table with rounded border
- Header: gray-50 background
- Columns:
  - Source (colored badges)
  - Indicator
  - Original value
  - Absolute value
  - Relative value
  - Score (colored, continuous -1 to +1)
  - Comparison type (Rel/Abs)
  - Margin

**Source Badges:**
- Demographics: blue-100/blue-700
- Health: green-100/green-700
- Livability: purple-100/purple-700
- Safety: red-100/red-700
- Residential: orange-100/orange-700

**Score Colors (gradient system):**
- ≥ 0.67: green-100/green-800
- ≥ 0.33: green-50/green-700
- > 0: yellow-50/yellow-700
- = 0: gray-100/gray-700
- > -0.33: orange-50/orange-700
- > -0.67: orange-100/orange-800
- ≤ -0.67: red-100/red-800

**Legend Section:**
- Blue-50 background panel
- Gradient scale visualization
- Score range explanations

---

### Tab 3: Voorzieningen (Amenities)

#### AmenitiesGrid
**File:** `src/features/location/components/Amenities/AmenitiesGrid.tsx`

**Header Panel:**
- Gradient background: blue-50 to purple-50
- Border: blue-200
- Statistics grid (3 columns):
  - Categories count
  - Total places
  - Coverage percentage

**Quota Warning (if applicable):**
- Background: yellow-50 or red-50
- Border: yellow-200 or red-200
- Warning icon and text

**Filter Buttons:**
- Rounded-full pills
- Active: blue-500 white text
- Inactive: gray-100 gray-700 text
- Filters: All, Essential, High, Medium, Low

**Search Input:**
- Right-aligned
- Border: gray-300
- Focus: blue-500 ring

**Grid Layout:**
- Responsive grid (1/2/3/4 columns)
- Gap: 4

#### AmenityCard
**File:** `src/features/location/components/Amenities/AmenityCard.tsx`

**Structure:**
- White background, rounded-lg
- Gray-200 border with colored left border (4px, category color)
- Hover: shadow-lg
- Clickable with cursor-pointer

**Header:**
- Icon (2xl emoji)
- Display name (sm, semibold, gray-900)
- Result count (xs, gray-500)
- Priority badge (rounded-full, xs):
  - Essential: red-100/red-700
  - High: orange-100/orange-700
  - Medium: blue-100/blue-700
  - Low: gray-100/gray-700

**Closest Place Panel:**
- Background: gray-50, rounded
- Place name (sm, medium, gray-900)
- Distance with 📍 icon
- Rating with ⭐ icon
- Open/Closed status (green/red indicators)

**Quick Stats Grid (2 columns):**
- Average distance (blue-50 background)
- Walking distance count (green-50 background)

**Other Options List:**
- Border-top separator
- Truncated place names with distances

**Scoring Section:**
- Border-top separator
- Count score badge
- Proximity bonus badge
- Combined score percentage

**Footer:**
- Search strategy indicator
- Click hint (blue-600 text)

#### AmenitiesSummary (on Score tab)
**File:** `src/features/location/components/Amenities/AmenitiesSummary.tsx`

**Summary Cards (3 columns):**
- Card 1: Overview (blue gradient)
- Card 2: Essential Services (green gradient)
- Card 3: Quota Status (purple/yellow/red gradient)

**Scoring Summary Panel:**
- Indigo-50 to purple-50 gradient
- Border: indigo-200
- Grid of score metrics (4 columns):
  - Average count score
  - Proximity bonus
  - Combined score
  - Categories with no amenities

**Essential Services List:**
- White background, gray-200 border
- Grid layout (2 columns)
- Service icons with names and distances

**Closest Places List:**
- White background, gray-200 border
- Numbered list with place details

---

### Tab 4: Woningmarkt (Housing Market)

#### ResidentialGrid
**File:** `src/features/location/components/Residential/ResidentialGrid.tsx`

**Header Panel:**
- Gradient: blue-50 to indigo-50
- Border: blue-200
- Title (2xl, bold)
- Target property info grid (2 columns)
- Property characteristic badges (white background)

**Market Data Table:**
- Separate component with statistics

**Filter and Sort Panel:**
- White background, gray-200 border
- Filter buttons:
  - All (blue-600 when active)
  - < 1 km (green-600 when active)
  - < 5 km (blue-600 when active)
- House type dropdown
- Sort dropdown (Distance, Price, Similarity, Build Year)
- Results count

**Reference Houses Grid:**
- Responsive grid (1/2/3/4 columns)
- Gap: 4

#### ReferenceCard
- White background, rounded-lg
- Gray-200 border
- Hover: shadow-lg
- Address header
- Price display (blue-700, semibold)
- Detail icons with data (distance, house type, year, surface)

#### ResidentialSummary (on Score tab)
**File:** `src/features/location/components/Residential/ResidentialSummary.tsx`

**Summary Cards (3 columns):**
- Average Reference Price (indigo gradient)
- Comparable Properties (purple gradient)
- Market Activity (pink gradient)

**Market Statistics Panel:**
- White background, gray-200 border
- Grid of stats (4 columns)

**Closest References List:**
- White background, gray-200 border
- Numbered list with property cards

---

### Tab 5: PVE (Requirements Program)

#### Chart Components

**General Chart Containers:**
- White background, rounded-lg
- Shadow-sm, gray-200 border
- Base padding

#### RadialChart
**File:** `src/shared/components/common/RadialChart/RadialChart.tsx`

**Features:**
- SVG-based D3.js visualization
- Circular radial bars
- **Current colors:** Using gradient (#0c211a, #48806a, #477638, #8a976b, #f8eee4) with noise texture
- Interactive hover effects:
  - Hovered slice: 1.1x scale
  - Other slices: 0.95x scale
- Labels with values and names
- Average circle indicator (dashed white line)
- Corner radius on bars
- Background bars (gray-50)

#### BarChart
- Vertical bar chart
- Colored bars from gradient palette
- Average line indicator
- Value labels
- Grid lines

#### DensityChart
- Two modes: Area chart and Histogram
- Side-by-side display
- Grid labels

---

## 4. Shared UI Components

### Buttons
**File:** `src/shared/components/UI/Button/Button.tsx`

**Variants:**
- Primary: bg-primary, text-white, hover:bg-primary-hover
- Ghost: transparent, hover:bg-gray-100
- Rounded corners
- Padding: px-base py-sm

### Input Fields

#### Standard Input
- Border: gray-300
- Focus ring: blue-500
- Rounded corners
- Padding: px-4 py-2

#### AddressAutocomplete
**File:** `src/features/location/components/AddressAutocomplete/AddressAutocomplete.tsx`
- Dropdown with suggestions
- Keyboard navigation
- Loading states

### Cards (Base)
**File:** `src/shared/components/UI/Card/Card.tsx`
- White background
- Rounded-lg
- Gray-200 border
- Hover: shadow-lg

### Status Badges
- Rounded-full or rounded
- Various color schemes based on context
- Text: xs, font-medium
- Padding: px-2 py-1

---

## 5. Typography System (Current)

### Headings
- **H1 (Page titles):** 4xl, font-bold, gray-900
- **H2 (Section titles):** 2xl, font-bold, gray-900
- **H3 (Subsection titles):** lg, font-semibold, gray-900
- **H4 (Card titles):** sm or text-base, font-medium or font-semibold

### Body Text
- **Large:** lg, gray-900 or text-secondary
- **Medium:** sm, gray-600 or gray-700
- **Small:** xs, gray-500 or text-muted
- **Muted labels:** xs or sm, text-muted or gray-400

### Special Text
- **Font-mono:** Used for numeric scores
- **Font-medium:** Used for emphasis
- **Font-bold:** Used for important numbers

---

## 6. Color Palette (Current Usage)

### Primary Colors
- **Primary:** Used for buttons, active states (likely blue)
- **Primary-hover:** Hover state for primary elements
- **Primary-light:** Light backgrounds for active items

### Grays
- gray-50 (backgrounds)
- gray-100 (hover states, badges)
- gray-200 (borders)
- gray-400 (muted text)
- gray-500 (secondary text)
- gray-600 (body text)
- gray-700 (dark text)
- gray-900 (headings)

### Semantic Colors
- **Blue:** Demographics, info, links (50, 100, 500, 600, 700)
- **Green:** Health, success, positive (50, 100, 200, 500, 600, 700, 800)
- **Purple:** Livability (50, 100, 500, 700)
- **Red:** Safety, errors (50, 100, 500, 600, 700, 800)
- **Orange:** Age groups, warnings (50, 100, 700, 800)
- **Yellow:** Caution, neutral scores (50, 700)
- **Indigo:** Residential data (50, 100, 200, 700, 900)
- **Pink:** Market activity (50, 100, 700, 800)

### Gradient Palette (Radial Chart & Target)
- #0c211a (darkest green)
- #48806a (medium-dark green)
- #477638 (olive green)
- #8a976b (sage green)
- #f8eee4 (cream/offwhite)

---

## 7. Spacing & Layout

### Container Spacing
- **p-base:** Standard padding
- **p-sm:** Small padding
- **p-lg:** Large padding (main content areas)
- **p-4, p-6:** Specific padding values

### Gaps
- **gap-xs:** Extra small gap
- **gap-sm:** Small gap
- **gap-base:** Base gap
- **gap-lg:** Large gap
- **gap-2, gap-3, gap-4:** Specific gap values

### Margins
- **mb-xs, mb-sm, mb-base, mb-lg:** Various margin bottoms
- **mt-xs, mt-sm, mt-base, mt-lg:** Various margin tops

---

## 8. Interactive States

### Hover Effects
- **Cards:** shadow-lg transition
- **Buttons:** Background color changes
- **Table rows:** bg-gray-50 transition

### Focus States
- **Inputs:** ring-2 ring-blue-500

### Active States
- **Tabs:** Colored border-b-2, colored text
- **Buttons:** Colored background, border

### Disabled States
- Reduced opacity or grayed out

---

## 9. Transitions & Animations

### Common Transitions
- **duration-fast:** Quick transitions
- **duration-300:** Standard transitions (0.3s)
- **duration-200:** Quick transitions (0.2s)
- **transition-all:** All properties
- **transition-colors:** Color changes only
- **transition-shadow:** Shadow changes
- **transition-transform:** Transform changes

### Animations
- **Spinner:** animate-spin
- **Radial chart hover:** Scale transforms (1.1x, 0.95x)
- **Sidebar:** translate-x transforms

---

## 10. Special Effects

### Glassmorphism (Right Menu)
- **Background:** white/80 (80% opacity white)
- **Backdrop:** backdrop-blur-md
- **Border:** gray-200/50 (50% opacity)

### Shadows
- **shadow-sm:** Subtle shadow (cards at rest)
- **shadow-lg:** Large shadow (hover states, elevated elements)

### Borders
- **Rounded corners:**
  - rounded (4px)
  - rounded-md (6px)
  - rounded-lg (8px)
  - rounded-full (fully rounded pills)

---

## 11. Icons & Emojis

### Emoji Usage
- Large state indicators (6xl): 🗺️, ⚠️, 🏠, 🏪
- Category indicators (text-2xl or text-lg): Various category emojis
- Inline indicators: ✓, →, 📍, ⭐, 🟢, 🔴, etc.

### SVG Icons
- Navigation arrows
- Household/people icons
- Building/property icons
- Search icons (magnifying glass)
- Various UI icons (chevrons, etc.)

---

## 12. Responsive Breakpoints

### Grid Columns
- **Default (mobile):** 1 column
- **md:** 2 columns
- **lg:** 3 columns
- **xl:** 4 columns

### Layout Adjustments
- Sidebar auto-collapse on mobile
- Flexible grid layouts
- Responsive padding and gaps

---

## 13. Data Visualization Elements

### Score Indicators
- Colored badges with borders
- Numeric display (font-mono)
- +/- prefixes for positive/negative
- Gradient color scales

### Progress/Status Indicators
- Percentage displays
- Count displays
- Distance formatting (m/km)
- Price formatting (EUR)

### Charts (Summary)
1. **RadialChart:** Circular bar chart with gradient noise texture
2. **BarChart:** Vertical bars with average line
3. **DensityChart:** Area and histogram modes
4. **3D Cube:** WebGL visualization for target groups

---

## Design Notes & Observations

### Inconsistencies to Address
1. **Color system:** Mix of Tailwind grays and custom gradient colors
2. **Typography:** Some variation in heading sizes and weights
3. **Spacing:** Mix of Tailwind and custom spacing variables
4. **Border styles:** Varying border widths and colors
5. **Card designs:** Different styling approaches across components
6. **Button styles:** Need unification of primary/secondary styles

### Strengths to Preserve
1. **Gradient palette:** The #0c211a to #f8eee4 gradient is distinctive
2. **Left-border cards:** Nice visual hierarchy with colored borders
3. **Badge system:** Good semantic color coding
4. **Interactive elements:** Hover effects are well-implemented
5. **Grid layouts:** Responsive and consistent

### Areas for Enhancement
1. Consistent panel/card system with frosted glass outer panels
2. Unified background with subtle gradient blobs
3. Consistent text hierarchy (large bold vs. small paragraphs)
4. Standardized spacing system
5. Consistent border radius system
6. Unified color application from gradient palette

---

**END OF CATALOG**
