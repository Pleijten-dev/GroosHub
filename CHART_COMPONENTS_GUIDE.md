# Chart Components Usage Guide

This guide shows how to use the three modular chart components: **RadialChart**, **BarChart**, and **DensityChart**.

## Overview

All charts are designed to be **drop-in components** - just import, configure props, and render!

```typescript
import { RadialChart, BarChart, DensityChart } from '@/shared/components/common';
```

---

## 1. RadialChart (Circular/Polar Chart)

### Basic Usage

```tsx
<RadialChart
  data={[
    { name: 'Safety', value: 85, color: '#48806a' },
    { name: 'Access', value: 72, color: '#477638' },
    { name: 'Green', value: 90, color: '#8a976b' }
  ]}
  width={600}
  height={500}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `RadialChartData[]` | **Required** | Array of data points |
| `width` | `number` | `500` | Chart width in pixels |
| `height` | `number` | `400` | Chart height in pixels |
| `showLabels` | `boolean` | `true` | Show slice labels |
| `isSimple` | `boolean` | `false` | Use simpler style (larger inner radius) |
| `className` | `string` | `''` | Additional CSS classes |
| `onSliceHover` | `(name: string \| null) => void` | `undefined` | Callback when slice is hovered |

### Data Format

```typescript
interface RadialChartData {
  name: string;   // Label for the slice
  value: number;  // Numeric value (determines size)
  color: string;  // Hex color (ignored - uses procedural texture)
}
```

### Easy Adjustments

**Add more slices?** Just add more data items:
```tsx
const data = [
  { name: 'Item 1', value: 85, color: '#48806a' },
  { name: 'Item 2', value: 72, color: '#477638' },
  { name: 'Item 3', value: 90, color: '#8a976b' },
  { name: 'Item 4', value: 65, color: '#0c211a' }, // ← Just add more!
  // ... add as many as you want
];
```

**Change slice sizes?** Just change the `value`:
```tsx
{ name: 'Safety', value: 95, color: '#48806a' } // Bigger slice
{ name: 'Safety', value: 30, color: '#48806a' } // Smaller slice
```

**Resize the entire chart?** Just change width/height:
```tsx
<RadialChart data={data} width={800} height={700} /> // Bigger
<RadialChart data={data} width={300} height={250} /> // Smaller
```

**Dense layout (12+ slices)?** Automatically adjusts labels and spacing!

---

## 2. BarChart (Horizontal Bars)

### Basic Usage

```tsx
<BarChart
  data={[
    { name: 'Week 1', value: 45, color: '#48806a' },
    { name: 'Week 2', value: 62, color: '#477638' },
    { name: 'Week 3', value: 58, color: '#8a976b' }
  ]}
  width={700}
  height={400}
  minValue={0}
  maxValue={100}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `BarChartData[]` | **Required** | Array of data points |
| `width` | `number` | `600` | Chart width in pixels |
| `height` | `number` | `400` | Chart height in pixels |
| `minValue` | `number` | `auto` | Minimum value for scale |
| `maxValue` | `number` | `auto` | Maximum value for scale |
| `showLabels` | `boolean` | `true` | Show bar labels |
| `showAverageLine` | `boolean` | `true` | Show zero/average line |
| `barSpacing` | `number` | `0.02` | Spacing between bars (0-1) |
| `className` | `string` | `''` | Additional CSS classes |
| `onBarHover` | `(name: string \| null) => void` | `undefined` | Callback when bar is hovered |

### Data Format

```typescript
interface BarChartData {
  name: string;   // Label for the bar
  value: number;  // Numeric value (determines height)
  color: string;  // Hex color (ignored - uses procedural texture)
}
```

### Easy Adjustments

**Add more bars?** Just add more data items:
```tsx
const data = [
  { name: 'Jan', value: 45, color: '#48806a' },
  { name: 'Feb', value: 62, color: '#477638' },
  // ... add 12 months, 52 weeks, or any amount!
];
```

**Change bar heights?** Just change the `value`:
```tsx
{ name: 'Week 1', value: 95, color: '#48806a' } // Taller bar
{ name: 'Week 1', value: 20, color: '#48806a' } // Shorter bar
```

**Adjust bar spacing?** Use `barSpacing`:
```tsx
<BarChart data={data} barSpacing={0.1} />  // More spacing
<BarChart data={data} barSpacing={0} />    // No spacing (touching)
```

**Support negative values?** Set `minValue`:
```tsx
<BarChart
  data={data}
  minValue={-50}  // Bars can go negative
  maxValue={100}
/>
```

---

## 3. DensityChart (Area/Histogram)

### Basic Usage

**Area Chart (Smooth Curve):**
```tsx
<DensityChart
  data={[
    { x: 0, y: 5 },
    { x: 10, y: 12 },
    { x: 20, y: 28 },
    { x: 30, y: 45 }
  ]}
  width={450}
  height={300}
  mode="area"
/>
```

**Histogram (Bars):**
```tsx
<DensityChart
  data={distributionData}
  width={450}
  height={300}
  mode="histogram"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `DensityChartData[]` | **Required** | Array of x,y points |
| `width` | `number` | `500` | Chart width in pixels |
| `height` | `number` | `300` | Chart height in pixels |
| `mode` | `'area' \| 'histogram'` | `'area'` | Visualization style |
| `showLabels` | `boolean` | `true` | Show first/last x-axis labels |
| `showGrid` | `boolean` | `true` | Show grid lines |
| `title` | `string` | `undefined` | Optional chart title |
| `className` | `string` | `''` | Additional CSS classes |

### Data Format

```typescript
interface DensityChartData {
  x: number;  // X-axis value
  y: number;  // Y-axis value (height)
}
```

### Easy Adjustments

**Add more data points?** Just add more x,y pairs:
```tsx
const data = [
  { x: 0, y: 5 },
  { x: 5, y: 8 },
  { x: 10, y: 12 },
  // ... add as many points as needed for smoothness
];
```

**Change distribution shape?** Adjust `y` values:
```tsx
// Bell curve
const bellCurve = [
  { x: 0, y: 5 },
  { x: 50, y: 95 },  // Peak in middle
  { x: 100, y: 5 }
];

// Right skew
const rightSkew = [
  { x: 0, y: 80 },   // High on left
  { x: 100, y: 10 }  // Low on right
];
```

**Switch between area/histogram?** Just change `mode`:
```tsx
<DensityChart data={data} mode="area" />      // Smooth curve
<DensityChart data={data} mode="histogram" /> // Bars
```

---

## Complete Examples

### Example 1: RadialChart with 8 slices

```tsx
const RadialExample = () => {
  const data = [
    { name: 'Safety', value: 85, color: '#48806a' },
    { name: 'Access', value: 72, color: '#477638' },
    { name: 'Amenities', value: 90, color: '#8a976b' },
    { name: 'Green', value: 65, color: '#0c211a' },
    { name: 'Mobility', value: 78, color: '#48806a' },
    { name: 'Social', value: 68, color: '#477638' },
    { name: 'Livability', value: 82, color: '#8a976b' },
    { name: 'Sustain', value: 74, color: '#0c211a' }
  ];

  return <RadialChart data={data} width={600} height={500} />;
};
```

### Example 2: BarChart with 12 months

```tsx
const MonthlyBarChart = () => {
  const months = [
    { name: 'Jan', value: 45, color: '#48806a' },
    { name: 'Feb', value: 52, color: '#477638' },
    { name: 'Mar', value: 61, color: '#8a976b' },
    { name: 'Apr', value: 68, color: '#0c211a' },
    { name: 'May', value: 75, color: '#48806a' },
    { name: 'Jun', value: 82, color: '#477638' },
    { name: 'Jul', value: 88, color: '#8a976b' },
    { name: 'Aug', value: 84, color: '#0c211a' },
    { name: 'Sep', value: 73, color: '#48806a' },
    { name: 'Oct', value: 65, color: '#477638' },
    { name: 'Nov', value: 52, color: '#8a976b' },
    { name: 'Dec', value: 48, color: '#0c211a' }
  ];

  return (
    <BarChart
      data={months}
      width={900}
      height={400}
      minValue={0}
      maxValue={100}
      showAverageLine={true}
    />
  );
};
```

### Example 3: Side-by-Side Distribution Charts

```tsx
const DistributionComparison = () => {
  const distribution = [
    { x: 0, y: 5 },
    { x: 10, y: 12 },
    { x: 20, y: 28 },
    { x: 30, y: 45 },
    { x: 40, y: 68 },
    { x: 50, y: 85 },
    { x: 60, y: 92 },
    { x: 70, y: 78 },
    { x: 80, y: 52 },
    { x: 90, y: 28 },
    { x: 100, y: 12 },
    { x: 110, y: 5 }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      <DensityChart
        data={distribution}
        width={450}
        height={300}
        mode="area"
        showLabels={true}
      />
      <DensityChart
        data={distribution}
        width={450}
        height={300}
        mode="histogram"
        showLabels={true}
      />
    </div>
  );
};
```

---

## Key Features

✅ **Fully Responsive** - All charts scale with container
✅ **Auto-adjusting** - Automatically handles dense layouts (12+ items)
✅ **Type-safe** - Full TypeScript support
✅ **Interactive** - Hover effects built-in
✅ **Customizable** - Every aspect can be configured
✅ **Procedural Textures** - RadialChart & BarChart use noise textures
✅ **Clean Design** - Minimal, professional appearance

---

## Tips

1. **More data points = smoother curves** (especially for DensityChart area mode)
2. **RadialChart works best with 4-24 slices** (automatically optimizes)
3. **BarChart can handle any number of bars** (spacing auto-adjusts)
4. **All props have sensible defaults** - only specify what you need to change
5. **Color prop in data is ignored** for RadialChart/BarChart (uses procedural textures)

---

## Need Help?

All components are in `src/shared/components/common/`:
- `RadialChart/RadialChart.tsx`
- `BarChart/BarChart.tsx`
- `DensityChart/DensityChart.tsx`

Just import and use! 🎨
