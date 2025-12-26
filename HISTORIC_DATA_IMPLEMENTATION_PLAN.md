# Historic Data Implementation Plan
## Adding Historical Data to Dutch Government Datasets (RIVM, POLITIE, CBS)

> **Created**: 2025-12-26
> **Status**: Planning Phase
> **Complexity**: High - Multi-dataset temporal architecture

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Available Historic Data](#available-historic-data)
3. [Data Retrieval Strategies](#data-retrieval-strategies)
4. [Storage Architecture](#storage-architecture)
5. [Code Changes Required](#code-changes-required)
6. [Implementation Phases](#implementation-phases)
7. [Technical Considerations](#technical-considerations)
8. [UI/UX Design](#uiux-design)

---

## Executive Summary

### Current State

- **Single Time Period**: Each data source fetches only the most recent year
- **Mixed Years**: Demographics (2023), Health (2022), Livability (2023), Safety (2024)
- **No Comparison**: Cannot analyze trends or year-over-year changes
- **Limited Versioning**: Database supports snapshots but no multi-temporal analysis

### Proposed Enhancement

Add comprehensive historic data support enabling:
- **Trend Analysis**: Year-over-year comparisons for all metrics
- **Time-Series Visualization**: Charts showing changes over time
- **Flexible Period Selection**: Users can select specific years or year ranges
- **Automated Data Updates**: Detect and fetch new data when available

### Impact

- **CBS Demographics**: Access to data from 2004-2024 (20+ years)
- **RIVM Health**: Access to 2012, 2016, 2020, 2022 (4 snapshots)
- **Politie Safety**: Access to 2012-2024 (13 years)
- **CBS Livability**: TBD (requires investigation)

---

## Available Historic Data

### 1. CBS Demographics (Kerncijfers wijken en buurten)

**Dataset Structure**: Each year is a **SEPARATE dataset** with unique table ID

| Year | Dataset ID | Status | Notes |
|------|------------|--------|-------|
| 2024 | 85984NED | ✅ Available | Most recent |
| 2023 | 85618NED | ✅ Available | Currently used |
| 2022 | 85318NED | ✅ Available | |
| 2021 | 85039NED | ✅ Available | |
| 2020 | 84799NED | ✅ Available | |
| 2019 | 84583NED | ✅ Available | |
| 2017 | 83765NED | ✅ Available | |
| 2013-2016 | Various | ✅ Available | Combined tables |
| 2009-2012 | Various | ✅ Available | Single combined table |
| 2004-2008 | Various | ✅ Available | Separate tables |

**Key Challenge**: Must query **different API endpoints** for each year

**Data Consistency**:
- 2013+ uses current structure (each year separate)
- 2009-2012 combined in one table
- All data normalized to 2025 geographic boundaries

### 2. RIVM Health (Gezondheid per wijk en buurt)

**Dataset ID**: 50120NED (single dataset)
**Dataset Structure**: Multiple years within **SAME dataset** via period parameter

| Year | Period Code | Status | Notes |
|------|-------------|--------|-------|
| 2022 | 2022JJ00 | ✅ Available | Currently used |
| 2020 | 2020JJ00 | ✅ Available | |
| 2016 | 2016JJ00 | ✅ Available | |
| 2012 | 2012JJ00 | ✅ Available | |

**Key Challenge**: Only 4 data points (not annual), based on periodic health surveys

**Data Source**: Model calculations by RIVM based on:
- Gezondheidsmonitor Volwassenen en Ouderen (2012, 2016, 2020)
- Corona Gezondheidsmonitor 2022

### 3. Politie Safety (Geregistreerde misdrijven)

**Dataset ID**: 47018NED (single dataset)
**Dataset Structure**: Multiple years within **SAME dataset** via period parameter

| Year Range | Period Codes | Status | Notes |
|------------|--------------|--------|-------|
| 2024 | 2024JJ00 | ✅ Available | Currently used |
| 2023 | 2023JJ00 | ✅ Available | |
| 2022 | 2022JJ00 | ✅ Available | |
| 2021 | 2021JJ00 | ✅ Available | |
| 2020 | 2020JJ00 | ✅ Available | COVID impact year |
| 2019 | 2019JJ00 | ✅ Available | |
| 2018 | 2018JJ00 | ✅ Available | |
| 2017 | 2017JJ00 | ✅ Available | |
| 2016 | 2016JJ00 | ✅ Available | |
| 2015 | 2015JJ00 | ✅ Available | |
| 2014 | 2014JJ00 | ✅ Available | |
| 2013 | 2013JJ00 | ✅ Available | |
| 2012 | 2012JJ00 | ✅ Available | Earliest |

**Key Challenge**: All data normalized to 2025 geographic boundaries

**Update Schedule**: Annual (2025 data to be added January 2026)

### 4. CBS Livability (Leefervaring en voorzieningen)

**Dataset ID**: 85146NED
**Status**: ⚠️ Requires investigation to determine historic availability

**Current**: 2023JJ00
**Expected**: Similar to health data (periodic surveys, not annual)

---

## Data Retrieval Strategies

### Strategy A: Multi-Dataset Approach (CBS Demographics)

Since each year is a separate dataset, we need to:

1. **Maintain Dataset Mapping**
   ```typescript
   const DEMOGRAPHICS_DATASETS: Record<number, string> = {
     2024: '85984NED',
     2023: '85618NED',
     2022: '85318NED',
     2021: '85039NED',
     2020: '84799NED',
     2019: '84583NED',
     2017: '83765NED',
     // ... older years
   };
   ```

2. **Dynamic Client Instantiation**
   ```typescript
   class CBSDemographicsHistoricClient {
     async fetchByYear(year: number, codes: GeographicCodes): Promise<RawData> {
       const datasetId = DEMOGRAPHICS_DATASETS[year];
       if (!datasetId) throw new Error(`No dataset for year ${year}`);

       const client = new CBSDemographicsClient(datasetId);
       return client.fetchMultiLevel(codes, `${year}JJ00`);
     }

     async fetchMultiYear(years: number[], codes: GeographicCodes): Promise<Map<number, RawData>> {
       const results = new Map();

       // Parallel fetch with rate limiting
       for (const year of years) {
         const data = await this.fetchByYear(year, codes);
         results.set(year, data);
         await this.rateLimiter.wait(); // Prevent API throttling
       }

       return results;
     }
   }
   ```

3. **Handle Dataset Structure Variations**
   - 2013+ years: Individual datasets
   - 2009-2012: Combined table (filter by period)
   - 2004-2008: Separate tables (different API structure)

### Strategy B: Multi-Period Approach (Health & Safety)

These use the same dataset with different period parameters:

```typescript
class HistoricDataClient {
  async fetchHistoricData(
    datasetId: string,
    codes: GeographicCodes,
    periods: string[]
  ): Promise<Map<string, RawData>> {
    const results = new Map();

    // Batch requests to reduce API calls
    const batchSize = 3;
    for (let i = 0; i < periods.length; i += batchSize) {
      const batch = periods.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(period => this.fetchByPeriod(codes, period))
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.set(batch[idx], result.value);
        }
      });

      await this.rateLimiter.wait();
    }

    return results;
  }
}
```

### Strategy C: Unified Historic Data API

Create a unified API that abstracts the different retrieval strategies:

```typescript
interface HistoricDataRequest {
  dataSource: 'demographics' | 'health' | 'safety' | 'livability';
  location: GeographicCodes;
  years?: number[];        // Specific years
  yearRange?: {            // Or year range
    start: number;
    end: number;
  };
}

class HistoricDataAggregator {
  async fetchHistoric(request: HistoricDataRequest): Promise<TimeSeriesData> {
    switch (request.dataSource) {
      case 'demographics':
        return this.fetchDemographicsHistoric(request);
      case 'health':
        return this.fetchHealthHistoric(request);
      case 'safety':
        return this.fetchSafetyHistoric(request);
      case 'livability':
        return this.fetchLivabilityHistoric(request);
    }
  }
}
```

---

## Storage Architecture

### Option 1: Expand Current Snapshot Model (Recommended)

Enhance the existing `location_snapshots` table to support multiple time periods:

```sql
-- Keep existing structure but add temporal fields
ALTER TABLE location_snapshots
ADD COLUMN data_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
ADD COLUMN is_historic BOOLEAN DEFAULT false,
ADD COLUMN time_series_id UUID;  -- Group related snapshots

-- Create index for temporal queries
CREATE INDEX idx_snapshots_temporal
ON location_snapshots(project_id, data_year, is_active);

-- Create time series grouping table
CREATE TABLE location_time_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  address TEXT NOT NULL,
  year_range INT4RANGE,  -- PostgreSQL range type
  available_years INTEGER[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits**:
- Minimal schema changes
- Reuses existing snapshot infrastructure
- Maintains data versioning capabilities
- Easy to query individual years

**Drawbacks**:
- Could create many rows for long time series
- More complex queries for trend analysis

### Option 2: Dedicated Time Series Storage

Create new tables specifically for historic data:

```sql
CREATE TABLE location_historic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  location_id UUID NOT NULL,  -- References location_snapshots
  data_source TEXT NOT NULL,  -- 'demographics', 'health', etc.

  -- Temporal data stored as JSONB array
  time_series JSONB NOT NULL,  -- [{ year: 2020, data: {...} }, { year: 2021, data: {...} }]

  -- Metadata
  year_range INT4RANGE,
  last_updated TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, location_id, data_source)
);

-- Example time_series structure:
{
  "demographics": [
    {
      "year": 2020,
      "period": "2020JJ00",
      "data": { /* normalized data */ },
      "fetchedAt": "2025-12-26T10:00:00Z"
    },
    {
      "year": 2021,
      "period": "2021JJ00",
      "data": { /* normalized data */ },
      "fetchedAt": "2025-12-26T10:00:00Z"
    }
  ]
}
```

**Benefits**:
- Optimized for time-series queries
- Compact storage (one row per location/source)
- Easier aggregation and trend calculation
- Built-in support for sparse data (Health: 2012, 2016, 2020, 2022)

**Drawbacks**:
- New tables to maintain
- JSONB query performance considerations
- More complex to implement initially

### Option 3: Hybrid Approach (Best of Both)

Combine both approaches:
- Use snapshots for "current" data
- Use time_series table for historic trends

```typescript
interface LocationDataWithHistory {
  current: LocationSnapshot;      // Most recent data
  history: TimeSeriesData;         // Historic trends
  availableYears: number[];
}
```

---

## Code Changes Required

### 1. Data Source Clients (`src/features/location/data/sources/`)

#### A. Create Historic Dataset Configuration

**New file**: `src/features/location/data/sources/historic-datasets.ts`

```typescript
export interface DatasetConfig {
  id: string;
  years: number[];
  baseUrl: string;
  notes?: string;
}

export const DEMOGRAPHICS_HISTORIC: Record<number, DatasetConfig> = {
  2024: { id: '85984NED', years: [2024], baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/' },
  2023: { id: '85618NED', years: [2023], baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/' },
  2022: { id: '85318NED', years: [2022], baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/' },
  // ... more years
};

export const HEALTH_HISTORIC = {
  datasetId: '50120NED',
  availableYears: [2012, 2016, 2020, 2022],
  getPeriodCode: (year: number) => `${year}JJ00`
};

export const SAFETY_HISTORIC = {
  datasetId: '47018NED',
  yearRange: { start: 2012, end: 2024 },
  getPeriodCode: (year: number) => `${year}JJ00`
};
```

#### B. Enhance Client Classes

**Modify**: `cbs-demographics/client.ts`

```typescript
export class CBSDemographicsClient {
  constructor(private datasetId: string = '85618NED') {}

  // Add new method for historic data
  async fetchHistoricData(
    codes: GeographicCodes,
    years: number[]
  ): Promise<Map<number, CBSDemographicsRawData>> {
    const results = new Map<number, CBSDemographicsRawData>();

    for (const year of years) {
      const config = DEMOGRAPHICS_HISTORIC[year];
      if (!config) {
        console.warn(`No dataset config for year ${year}`);
        continue;
      }

      // Create client with historic dataset ID
      const historicClient = new CBSDemographicsClient(config.id);
      const period = `${year}JJ00`;

      try {
        const data = await historicClient.fetchMultiLevel(codes, period);
        results.set(year, data);
      } catch (error) {
        console.error(`Failed to fetch demographics for ${year}:`, error);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }
}
```

**Modify**: `rivm-health/client.ts`, `politie-safety/client.ts`

```typescript
export class RIVMHealthClient {
  async fetchHistoricData(
    codes: GeographicCodes,
    years?: number[]
  ): Promise<Map<number, RIVMHealthRawData>> {
    const targetYears = years || HEALTH_HISTORIC.availableYears;
    const results = new Map();

    for (const year of targetYears) {
      if (!HEALTH_HISTORIC.availableYears.includes(year)) {
        console.warn(`Health data not available for ${year}`);
        continue;
      }

      const period = HEALTH_HISTORIC.getPeriodCode(year);

      try {
        const data = await this.fetchMultiLevel(codes, period);
        results.set(year, data);
      } catch (error) {
        console.error(`Failed to fetch health data for ${year}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }
}
```

### 2. Parsers (`src/features/location/data/parsers/`)

Parsers should remain mostly unchanged, but add support for year metadata:

```typescript
interface ParsedDataWithYear extends ParsedData {
  year: number;
  period: string;
  datasetId?: string;  // For demographics
  fetchedAt: Date;
}

export class DemographicsParser {
  parseHistoric(
    rawDataByYear: Map<number, RawData>
  ): Map<number, ParsedData> {
    const results = new Map();

    rawDataByYear.forEach((rawData, year) => {
      const parsed = this.parse(rawData);
      results.set(year, {
        ...parsed,
        year,
        period: `${year}JJ00`,
        fetchedAt: new Date()
      });
    });

    return results;
  }
}
```

### 3. Aggregator (`src/features/location/data/aggregator/`)

**Create**: `multiLevelHistoricAggregator.ts`

```typescript
export interface TimeSeriesDataPoint {
  year: number;
  data: UnifiedLocationData;
  changeFromPrevious?: {
    absolute: number;
    relative: number;
    percentage: number;
  };
}

export interface TimeSeriesResult {
  location: LocationData;
  timeSeries: TimeSeriesDataPoint[];
  availableYears: number[];
  trends: {
    demographics?: TrendAnalysis;
    health?: TrendAnalysis;
    safety?: TrendAnalysis;
    livability?: TrendAnalysis;
  };
}

export class MultiLevelHistoricAggregator {
  async aggregateHistoric(
    location: LocationData,
    years: number[]
  ): Promise<TimeSeriesResult> {
    // Fetch all years in parallel
    const [demographicsData, healthData, safetyData, livabilityData] =
      await Promise.all([
        this.demographicsClient.fetchHistoricData(location.codes, years),
        this.healthClient.fetchHistoricData(location.codes, years),
        this.safetyClient.fetchHistoricData(location.codes, years),
        this.livabilityClient.fetchHistoricData(location.codes, years)
      ]);

    // Parse and aggregate each year
    const timeSeries: TimeSeriesDataPoint[] = [];

    for (const year of years.sort()) {
      const yearData = await this.aggregateYear({
        year,
        demographics: demographicsData.get(year),
        health: healthData.get(year),
        safety: safetyData.get(year),
        livability: livabilityData.get(year)
      });

      timeSeries.push(yearData);
    }

    // Calculate trends
    const trends = this.calculateTrends(timeSeries);

    return {
      location,
      timeSeries,
      availableYears: years,
      trends
    };
  }

  private calculateTrends(timeSeries: TimeSeriesDataPoint[]): TrendAnalysis {
    // Implement trend calculation (linear regression, year-over-year changes, etc.)
  }
}
```

### 4. Cache (`src/features/location/data/cache/`)

**Enhance**: `locationDataCache.ts`

```typescript
export class LocationDataCache {
  // Add methods for historic data
  setHistoric(
    location: string,
    year: number,
    data: UnifiedLocationData
  ): void {
    const key = this.getHistoricKey(location, year);
    this.set(key, data, this.defaultTTL);
  }

  getHistoric(location: string, year: number): UnifiedLocationData | null {
    const key = this.getHistoricKey(location, year);
    return this.get(key);
  }

  getHistoricYears(location: string): number[] {
    const prefix = this.normalizeKey(location);
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));

    return keys
      .map(k => this.extractYear(k))
      .filter(y => y !== null)
      .sort();
  }

  private getHistoricKey(location: string, year: number): string {
    return `${this.normalizeKey(location)}_${year}`;
  }

  private extractYear(key: string): number | null {
    const match = key.match(/_(\d{4})$/);
    return match ? parseInt(match[1]) : null;
  }
}
```

### 5. Hooks (`src/features/location/hooks/`)

**Create**: `useHistoricLocationData.ts`

```typescript
export function useHistoricLocationData(
  location: LocationData | null,
  years: number[]
) {
  const [data, setData] = useState<TimeSeriesResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!location || years.length === 0) return;

    const fetchHistoric = async () => {
      setIsLoading(true);
      setError(null);
      setProgress({ current: 0, total: years.length });

      try {
        // Check cache first
        const cachedYears = new Set<number>();
        const uncachedYears: number[] = [];

        for (const year of years) {
          const cached = cache.getHistoric(location.address, year);
          if (cached) {
            cachedYears.add(year);
          } else {
            uncachedYears.push(year);
          }
        }

        // Fetch uncached years
        const aggregator = new MultiLevelHistoricAggregator();

        if (uncachedYears.length > 0) {
          const result = await aggregator.aggregateHistoric(
            location,
            uncachedYears,
            (current) => setProgress({ current, total: uncachedYears.length })
          );

          // Cache results
          result.timeSeries.forEach(point => {
            cache.setHistoric(location.address, point.year, point.data);
          });
        }

        // Combine cached + fetched
        const allData = await aggregator.aggregateHistoric(location, years);
        setData(allData);

      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoric();
  }, [location, years]);

  return { data, isLoading, error, progress };
}
```

### 6. Components (`src/features/location/components/`)

**Create**: `HistoricDataViewer.tsx`

```typescript
interface HistoricDataViewerProps {
  location: LocationData;
  dataSource: 'demographics' | 'health' | 'safety' | 'livability';
  locale: 'nl' | 'en';
}

export function HistoricDataViewer({
  location,
  dataSource,
  locale
}: HistoricDataViewerProps) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const { data, isLoading, error, progress } = useHistoricLocationData(
    location,
    selectedYears
  );

  return (
    <Card>
      <div className="space-y-base">
        {/* Year Selector */}
        <YearRangeSelector
          availableYears={getAvailableYears(dataSource)}
          selectedYears={selectedYears}
          onChange={setSelectedYears}
        />

        {/* Loading Progress */}
        {isLoading && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
          />
        )}

        {/* View Mode Toggle */}
        <ViewModeToggle value={viewMode} onChange={setViewMode} />

        {/* Data Display */}
        {data && viewMode === 'chart' && (
          <TimeSeriesChart data={data} dataSource={dataSource} />
        )}

        {data && viewMode === 'table' && (
          <TimeSeriesTable data={data} dataSource={dataSource} />
        )}
      </div>
    </Card>
  );
}
```

**Create**: `TimeSeriesChart.tsx`

```typescript
export function TimeSeriesChart({
  data,
  dataSource
}: {
  data: TimeSeriesResult;
  dataSource: string;
}) {
  const chartData = useMemo(() => {
    return data.timeSeries.map(point => ({
      year: point.year,
      ...extractMetrics(point.data, dataSource)
    }));
  }, [data, dataSource]);

  return (
    <div className="w-full h-[400px]">
      {/* Use existing chart components or new time-series specific ones */}
      <LineChart data={chartData} />
    </div>
  );
}
```

### 7. API Routes (`src/app/api/location/`)

**Create**: `historic/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, years, dataSources } = body;

    // Validate input
    const schema = z.object({
      location: z.object({
        address: z.string(),
        codes: z.object({
          neighborhood: z.string().optional(),
          district: z.string().optional(),
          municipality: z.string().optional()
        })
      }),
      years: z.array(z.number()),
      dataSources: z.array(z.enum(['demographics', 'health', 'safety', 'livability']))
    });

    const validated = schema.parse(body);

    // Fetch historic data
    const aggregator = new MultiLevelHistoricAggregator();
    const result = await aggregator.aggregateHistoric(
      validated.location,
      validated.years
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Historic data API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch historic data' },
      { status: 500 }
    );
  }
}
```

### 8. Database Migrations

**Create**: `src/lib/db/migrations/007_add_historic_data_support.sql`

```sql
-- Add temporal fields to location_snapshots
ALTER TABLE location_snapshots
ADD COLUMN data_year INTEGER,
ADD COLUMN is_historic BOOLEAN DEFAULT false,
ADD COLUMN time_series_id UUID;

-- Update existing records to mark them as current year
UPDATE location_snapshots
SET data_year = EXTRACT(YEAR FROM snapshot_date)
WHERE data_year IS NULL;

-- Make data_year NOT NULL after backfill
ALTER TABLE location_snapshots
ALTER COLUMN data_year SET NOT NULL;

-- Create index for temporal queries
CREATE INDEX idx_snapshots_temporal
ON location_snapshots(project_id, data_year, is_active);

-- Create time series grouping table
CREATE TABLE location_time_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  neighborhood_code VARCHAR(20),
  district_code VARCHAR(20),
  municipality_code VARCHAR(20),

  -- Year range coverage
  year_range INT4RANGE,
  available_years INTEGER[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, address)
);

CREATE INDEX idx_time_series_project ON location_time_series(project_id);
CREATE INDEX idx_time_series_years ON location_time_series USING GIN(available_years);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_time_series_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_location_time_series_timestamp
BEFORE UPDATE ON location_time_series
FOR EACH ROW
EXECUTE FUNCTION update_time_series_timestamp();
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Set up data retrieval infrastructure

- [ ] Create historic dataset configuration (`historic-datasets.ts`)
- [ ] Enhance client classes with `fetchHistoricData()` methods
- [ ] Add parser support for multi-year data
- [ ] Implement rate limiting for bulk historic requests
- [ ] Write unit tests for clients and parsers

**Estimated Effort**: 16-24 hours
**Files Changed**: ~8
**Risk**: Low - mostly additive changes

### Phase 2: Storage & Aggregation (Week 2)
**Goal**: Build storage and aggregation layer

- [ ] Run database migration for temporal support
- [ ] Create `MultiLevelHistoricAggregator`
- [ ] Enhance cache for historic data
- [ ] Implement trend calculation algorithms
- [ ] Add API endpoint for historic data
- [ ] Write integration tests

**Estimated Effort**: 20-28 hours
**Files Changed**: ~10
**Risk**: Medium - database schema changes

### Phase 3: UI Components (Week 3)
**Goal**: Build user interface for historic data

- [ ] Create `YearRangeSelector` component
- [ ] Build `TimeSeriesChart` component
- [ ] Create `TimeSeriesTable` component
- [ ] Add `HistoricDataViewer` container
- [ ] Implement progress indicators
- [ ] Add loading/error states
- [ ] Support both nl and en translations

**Estimated Effort**: 24-32 hours
**Files Changed**: ~12
**Risk**: Medium - new UI patterns

### Phase 4: Integration (Week 4)
**Goal**: Integrate historic data into existing location page

- [ ] Add historic view toggle to location page
- [ ] Create `useHistoricLocationData` hook
- [ ] Implement comparison mode (year vs year)
- [ ] Add export functionality (CSV/JSON)
- [ ] Update caching strategy for bulk data
- [ ] Add analytics tracking
- [ ] Performance optimization

**Estimated Effort**: 16-24 hours
**Files Changed**: ~8
**Risk**: Low - integration work

### Phase 5: Polish & Documentation (Week 5)
**Goal**: Production readiness

- [ ] Comprehensive testing (unit + integration + e2e)
- [ ] Performance optimization (lazy loading, pagination)
- [ ] Error handling improvements
- [ ] User documentation
- [ ] Technical documentation
- [ ] Code review and refactoring
- [ ] Accessibility audit

**Estimated Effort**: 12-16 hours
**Files Changed**: Various
**Risk**: Low

---

## Technical Considerations

### 1. API Rate Limiting

**Challenge**: Fetching 10+ years of data could trigger rate limits

**Solutions**:
- Implement exponential backoff
- Batch requests (max 3 concurrent)
- Add delay between requests (200ms)
- Cache aggressively (historic data rarely changes)
- Consider backend proxy for rate limit management

```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerSecond = 3;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.processing) return;

    this.processing = true;
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      await new Promise(resolve =>
        setTimeout(resolve, 1000 / this.requestsPerSecond)
      );
    }
    this.processing = false;
  }
}
```

### 2. Data Size & Caching

**Challenge**: Historic data for multiple years is large

**Storage Estimates**:
- Single year, single location: ~50KB (compressed)
- 10 years, single location: ~500KB
- 10 locations, 10 years: ~5MB (localStorage limit)

**Solutions**:
- Implement selective caching (last 3 years in localStorage)
- Use IndexedDB for larger datasets (quota: ~50MB)
- Add cache eviction policy (LRU)
- Compress JSONB data in PostgreSQL
- Consider separating "recent" vs "historic" storage

```typescript
class HybridCache {
  // Recent data (last 3 years) → LocalStorage
  private recentCache = new LocationDataCache();

  // Historic data (>3 years) → IndexedDB
  private historicDB: IDBDatabase;

  async set(location: string, year: number, data: any) {
    const age = new Date().getFullYear() - year;

    if (age <= 3) {
      this.recentCache.setHistoric(location, year, data);
    } else {
      await this.setHistoricDB(location, year, data);
    }
  }
}
```

### 3. Data Consistency

**Challenge**: Different datasets have different years available

**Issues**:
- Demographics: 2004-2024 (missing 2018)
- Health: 2012, 2016, 2020, 2022 (only 4 years)
- Safety: 2012-2024 (complete)
- Livability: Unknown

**Solutions**:
- Display data availability matrix to users
- Support "sparse" time series (gaps allowed)
- Implement interpolation for missing years (optional)
- Show data source metadata (last updated, coverage)

```typescript
interface DataAvailability {
  dataSource: string;
  availableYears: number[];
  gaps: number[];  // Years with no data
  coverage: {
    start: number;
    end: number;
    percentage: number;  // % of years covered
  };
}
```

### 4. Performance

**Challenge**: Parsing and aggregating multiple years is CPU-intensive

**Solutions**:
- Web Workers for data processing
- Progressive loading (load most recent first)
- Pagination for table views
- Virtual scrolling for long lists
- Memoization for expensive calculations

```typescript
// Use Web Worker for heavy processing
const worker = new Worker('/workers/data-processor.js');

worker.postMessage({
  type: 'PARSE_HISTORIC',
  data: rawHistoricData
});

worker.onmessage = (e) => {
  if (e.data.type === 'PARSE_COMPLETE') {
    setProcessedData(e.data.result);
  }
};
```

### 5. Geographic Boundary Changes

**Challenge**: CBS normalizes all data to current (2025) boundaries, but actual boundaries change over time

**Considerations**:
- All data is already normalized to 2025 boundaries (CBS handles this)
- No need to manually handle boundary changes
- However, some neighborhoods may not exist in older years
- Handle missing data gracefully

```typescript
function validateHistoricData(data: Map<number, any>, location: string): void {
  data.forEach((yearData, year) => {
    if (!yearData || Object.keys(yearData).length === 0) {
      console.warn(`No data for ${location} in ${year} - neighborhood may not have existed`);
    }
  });
}
```

---

## UI/UX Design

### 1. Year Selection Interface

**Option A: Range Slider**
```
┌─────────────────────────────────────┐
│ Select Year Range:                  │
│                                     │
│ 2012 ●════●════●════●════●══● 2024 │
│      └──────────────────────┘       │
│      2015                2022       │
│                                     │
│ Selected: 2015-2022 (8 years)      │
└─────────────────────────────────────┘
```

**Option B: Checkbox Grid**
```
┌─────────────────────────────────────┐
│ Select Years:                       │
│                                     │
│ □ 2012  ☑ 2015  ☑ 2018  ☑ 2021    │
│ ☑ 2013  ☑ 2016  ☑ 2019  ☑ 2022    │
│ ☑ 2014  ☑ 2017  ☑ 2020  ☑ 2023    │
│                          ☑ 2024    │
│                                     │
│ 12 years selected                   │
└─────────────────────────────────────┘
```

**Option C: Preset Ranges**
```
┌─────────────────────────────────────┐
│ Quick Select:                       │
│ • Last 3 years     • Last 10 years │
│ • Last 5 years     • All available │
│ • Custom range...                   │
└─────────────────────────────────────┘
```

**Recommendation**: Use Option C with expandable custom selector (combines A or B)

### 2. Data Visualization

**Line Chart** (Trend over time)
```
Population Growth: Neighborhood vs National

8000 ┤                        ╭─────
     │                    ╭───╯
7000 │                ╭───╯
     │            ╭───╯
6000 │        ╭───╯
     │    ╭───╯
5000 ┼────╯
     └─┬──┬──┬──┬──┬──┬──┬──┬──┬──┬─
      2012 2014 2016 2018 2020 2022 2024

── Neighborhood    ·· Municipality    -- National
```

**Bar Chart** (Year-over-year comparison)
```
Crime Rate by Year

2024 ████████████░░░░░░░░░░░ 45
2023 ██████████████░░░░░░░░░ 52
2022 ███████████████░░░░░░░░ 58
2021 █████████████████░░░░░░ 67
2020 ████████████████░░░░░░░ 61 (COVID)
     └─────────────────────────
     0   20   40   60   80   100

     Per 1000 residents
```

**Table View** (Detailed comparison)
```
┌──────┬────────────┬────────────┬────────────┬───────┐
│ Year │ Population │ Crime Rate │ Health (%) │ Trend │
├──────┼────────────┼────────────┼────────────┼───────┤
│ 2024 │ 7,845      │ 45.2       │ 78.5       │  ↑    │
│ 2023 │ 7,623      │ 52.1       │ 76.2       │  ↑    │
│ 2022 │ 7,402      │ 58.3       │ 74.8       │  →    │
│ 2021 │ 7,198      │ 67.5       │ 73.9       │  ↓    │
└──────┴────────────┴────────────┴────────────┴───────┘
```

### 3. Loading States

**Progressive Loading**
```
┌─────────────────────────────────────┐
│ Loading historic data...            │
│                                     │
│ ████████████████░░░░░░░░░░ 65%    │
│                                     │
│ ✓ 2024 Demographics                │
│ ✓ 2023 Demographics                │
│ ⏳ 2022 Demographics (fetching...)  │
│ ⌛ 2021 Demographics (pending)      │
│ ⌛ 2020 Demographics (pending)      │
└─────────────────────────────────────┘
```

### 4. Data Availability Indicator

```
┌─────────────────────────────────────┐
│ Data Availability Matrix            │
│                                     │
│           2012 2016 2020 2022 2024 │
│ Demographics  ✗    ✗    ✓    ✓    ✓│
│ Health        ✓    ✓    ✓    ✓    ✗│
│ Safety        ✓    ✓    ✓    ✓    ✓│
│ Livability    ✗    ✗    ✓    ✓    ✓│
│                                     │
│ ✓ Available  ✗ Not Available       │
└─────────────────────────────────────┘
```

### 5. Comparison Mode

Allow users to compare two specific years:

```
┌─────────────────────────────────────┐
│ Compare Years:                      │
│                                     │
│ Year A: [2020 ▼]  vs  Year B: [2024 ▼] │
│                                     │
│ ┌─────────────┬──────────┬──────────┐│
│ │ Metric      │ 2020     │ 2024     ││
│ ├─────────────┼──────────┼──────────┤│
│ │ Population  │ 7,123    │ 7,845    ││
│ │ Change      │          │ +722 (+10%) ││
│ ├─────────────┼──────────┼──────────┤│
│ │ Crime Rate  │ 61.2     │ 45.2     ││
│ │ Change      │          │ -16 (-26%) ││
│ └─────────────┴──────────┴──────────┘│
└─────────────────────────────────────┘
```

---

## Next Steps

### Immediate Actions

1. **Review & Approve Plan**
   - Stakeholder review of this document
   - Prioritize features (MVP vs nice-to-have)
   - Confirm timeline and resources

2. **Technical Validation**
   - Verify CBS API access for historic datasets
   - Test fetching older dataset IDs (83765NED, etc.)
   - Confirm data structure consistency across years
   - Investigate livability historic data availability

3. **Design Mockups**
   - Create UI mockups for year selector
   - Design time-series chart layouts
   - Plan mobile responsive views

4. **Database Planning**
   - Choose storage option (expand snapshots vs dedicated time-series table)
   - Plan migration strategy for existing data
   - Estimate storage requirements

### Implementation Kickoff

Once approved, start with **Phase 1** (Foundation):

```bash
# Create feature branch
git checkout -b claude/add-historic-government-data-<session-id>

# Create new files
mkdir -p src/features/location/data/sources/historic
touch src/features/location/data/sources/historic-datasets.ts

# Begin implementation...
```

### Success Metrics

How we'll measure success:

- **Technical**:
  - ✓ Can fetch data for any year 2012-2024
  - ✓ Cache hit rate >70% for historic data
  - ✓ Page load time <2s for 5-year range
  - ✓ API error rate <1%

- **User Experience**:
  - ✓ Intuitive year selection
  - ✓ Clear loading states
  - ✓ Meaningful trend visualizations
  - ✓ Responsive on mobile

- **Data Quality**:
  - ✓ 100% data accuracy (matches CBS sources)
  - ✓ Proper handling of missing years
  - ✓ Correct trend calculations

---

## References & Sources

### CBS Open Data Documentation
- [Kerncijfers wijken en buurten 2004-2025](https://www.cbs.nl/nl-nl/reeksen/publicatie/kerncijfers-wijken-en-buurten)
- [Wijk- en buurtstatistieken](https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/wijk-en-buurtstatistieken)
- [StatLine as open data](https://www.cbs.nl/en-gb/our-services/open-data/statline-as-open-data)

### RIVM Health Data
- [Gezondheid per wijk en buurt](https://data.overheid.nl/en/dataset/42936-gezondheid-per-wijk-en-buurt--2012-2016-2020-2022--indeling-2022-)
- [Open data: gezondheid per buurt, wijk en gemeente](https://www.rivm.nl/media/smap/opendata.html)

### Politie Safety Data
- [Geregistreerde misdrijven dataset](https://data.overheid.nl/en/dataset/5252-geregistreerde-misdrijven--soort-misdrijf--wijk--buurt--jaarcijfers)
- [Politie CBS Data Portal](https://politieopendata.cbs.nl/)

### Technical References
- [CBS OData API Documentation](https://www.cbs.nl/en-gb/our-services/open-data/statline-as-open-data/odata-api)
- [PostgreSQL Range Types](https://www.postgresql.org/docs/current/rangetypes.html)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**Document Version**: 1.0
**Last Updated**: 2025-12-26
**Next Review**: After stakeholder feedback
