# Google Places API - Amenities Implementation

## Overview
This implementation adds Google Places API integration for searching and tracking 24 amenity categories across the Netherlands. The system includes centralized quota management using Neon SQL to ensure all users count towards the same monthly limit.

## ✅ Completed Components

### 1. Database Infrastructure
- **Schema** (`src/lib/db/schema.sql`)
  - `api_usage` table for tracking all API calls
  - Indexes for optimized queries
  - Views for monthly aggregation and current usage

- **Connection** (`src/lib/db/connection.ts`)
  - Neon PostgreSQL connection utility
  - Year-month helper functions

- **Migration Script** (`scripts/init-database.ts`)
  - Automated database initialization
  - Run with: `npm run db:migrate`

### 2. Type Definitions & Configuration
- **Types** (`src/features/location/data/sources/google-places/types.ts`)
  - Complete TypeScript interfaces for all data structures
  - Price levels enum
  - Search strategies and configurations

- **Amenity Categories** (`src/features/location/data/sources/google-places/amenity-search-config.ts`)
  - 24 Dutch amenity categories configured
  - 21 categories using Nearby Search (no quota impact)
  - 3 restaurant categories using Text Search with price filtering (count against 1,000/month quota)

### 3. Core Services

#### Usage Tracking (`usage-tracker.ts`)
- Records every API call in Neon SQL database
- Provides centralized quota management across all users
- Methods:
  - `recordUsage()` - Log API calls
  - `getMonthlyUsage()` - Get usage for current month
  - `getRemainingQuota()` - Check remaining quota
  - `canMakeRequest()` - Validate quota before request
  - `getUsageStats()` - Comprehensive statistics

#### Rate Limiter (`rate-limiter.ts`)
- Enforces quota limits (1,000 text searches/month)
- Respects Google's 50 QPS limit
- Warning thresholds at 80% usage
- Batch quota checking

#### Distance Calculator (`distance-calculator.ts`)
- Uses Turf.js for accurate distance calculations
- Sorts places by distance from search location
- Filters by radius
- Calculates averages and finds closest places

#### Response Parser (`response-parser.ts`)
- Transforms Google API responses to PlaceResult format
- Handles both old and new API formats
- Deduplicates results
- Merges nearby + text search results

#### Error Handler (`error-handler.ts`)
- Retry logic with exponential backoff
- Identifies retryable errors
- Quota exceeded detection
- Authentication error handling

### 4. Google Places Client (`client.ts`)
- **Nearby Search** - Unlimited usage
- **Text Search** - Quota protected (1,000/month)
- Field mask optimization to minimize costs
- Supports price level filtering (Text Search only)

### 5. API Routes

#### `/api/location/nearby-places-new` (POST)
- Searches nearby places using Google Places API (New)
- No quota restrictions
- Records usage in database
- Returns places sorted by distance

#### `/api/location/text-search` (POST)
- Text-based search with price filtering
- **QUOTA PROTECTED** - Checks quota before every request
- Returns 429 status when quota exceeded
- Tracks remaining quota in response

#### `/api/location/usage-stats` (GET)
- Returns current month's usage statistics
- Shows remaining quota
- Percentage used
- Category breakdown
- Quota reset date

### 6. Search Orchestrator (`search-orchestrator.ts`)
- Coordinates searches across all 24 categories
- Sequential execution with progress callbacks
- Handles quota exceeded gracefully
- 100ms delay between requests
- Continues on individual failures

## Quota Management

### Free Tier Limits
- **Text Search**: 1,000 requests/month (ALL USERS COMBINED)
- **Nearby Search**: Effectively unlimited

### Per Location Usage
- **Text Search**: 3 requests (restaurant price categories)
- **Nearby Search**: ~21 requests (all other categories)
- **Total**: ~24 API calls per location

### Monthly Capacity
- **Max locations**: ~333 locations/month (1000 / 3 = 333)
- **Unlimited** locations if skipping restaurant price searches

### Quota Exceeded Behavior
1. **At 80% usage**: Yellow warning banner
2. **At 100% usage**: Red error banner
3. **Text searches blocked**, nearby searches continue
4. **Database logs** all quota-exceeded attempts

## Environment Variables Required

```env
# Google Maps Places API
GOOGLE_PLACES_API_KEY=your_api_key_here

# Neon PostgreSQL (use one of these)
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NO_SSL=postgresql://...
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env.local`)

3. Run database migration:
```bash
npm run db:migrate
```

4. Verify migration:
```sql
SELECT * FROM api_usage LIMIT 5;
SELECT * FROM current_month_usage;
```

## Usage Example

```typescript
import { searchOrchestrator } from '@/features/location/data/sources/google-places/search-orchestrator';

// Search all categories for a location
const results = await searchOrchestrator.searchAllCategories(
  { lat: 52.3676, lng: 4.9041 }, // Amsterdam
  (completed, total, category) => {
    console.log(`Progress: ${completed}/${total} - ${category}`);
  }
);

console.log(`Found ${results.results.length} categories with results`);
console.log(`Quota remaining: ${results.quotaStatus?.textSearchRemaining}`);
```

## 🚧 Remaining Work

### Frontend Components
1. **Amenity Key Normalizer** - Display name normalization
2. **Multi-level Aggregator Update** - Integrate amenity data
3. **Frontend API Client** - React hooks for API calls
4. **Quota Context Provider** - Global quota state management
5. **Quota Warning Component** - User-facing quota warnings
6. **Update useLocationData Hook** - Fetch amenity data

### Testing
1. Test with real Google API key
2. Verify quota tracking accuracy
3. Test quota exceeded scenarios
4. Validate distance calculations
5. Test all 24 category searches

### Integration
1. Add amenities to LocationData interface
2. Display amenities on location page
3. Show distance to nearest amenities
4. Visualize amenities on map
5. Calculate amenity scores (0-100)

## API Call Costs (Estimated)

Based on $200/month free credit:

| Operation | Cost per 1000 | Free Monthly Calls |
|-----------|---------------|-------------------|
| Text Search | $32 | 6,250 |
| Nearby Search | $32 | 6,250 |
| **Combined Budget** | - | **~6,250 total** |

**However**: Free tier for Text Search is capped at **1,000 requests/month** regardless of credit.

## File Structure

```
src/
├── lib/db/
│   ├── schema.sql
│   └── connection.ts
├── app/api/location/
│   ├── nearby-places-new/route.ts
│   ├── text-search/route.ts
│   └── usage-stats/route.ts
└── features/location/data/sources/google-places/
    ├── types.ts
    ├── amenity-search-config.ts
    ├── client.ts
    ├── usage-tracker.ts
    ├── rate-limiter.ts
    ├── distance-calculator.ts
    ├── response-parser.ts
    ├── error-handler.ts
    └── search-orchestrator.ts

scripts/
└── init-database.ts
```

## Next Steps

1. Run migration: `npm run db:migrate`
2. Add Google API key to `.env.local`
3. Test API routes individually
4. Implement frontend components
5. Integrate with location page
6. Add amenity scoring logic

## Notes

- All API calls are server-side only (API key protected)
- Database tracks usage across all users centrally
- Quota resets on the 1st of each month
- Failed requests are logged but don't count against quota
- System continues working even if quota is exceeded (skips text searches)

## Support

For issues or questions:
1. Check database migration ran successfully
2. Verify environment variables are set
3. Check API key has Places API (New) enabled
4. Review usage stats: `GET /api/location/usage-stats`
