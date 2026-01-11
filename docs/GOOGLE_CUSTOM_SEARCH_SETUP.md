# Google Custom Search API Setup Guide

This guide will walk you through setting up the Google Custom Search API for the Project Search feature in GroosHub.

## Overview

The Project Search feature uses Google Custom Search API to find residential and architectural projects based on location. This allows users to discover:

- New construction projects (nieuwbouw)
- Apartment buildings
- Residential developments
- Commercial projects
- Architectural reference projects

## Cost & Limits

**Free Tier:**
- 100 queries per day
- Perfect for testing and low-volume usage

**Paid Tier:**
- $5 per 1,000 queries
- Maximum 10,000 queries per day
- Billing starts after free tier exhausted

**Current Usage in GroosHub:**
- Average: 1 query per address search
- With aggressive caching (30-day TTL), queries are minimized
- Estimated cost: ~$2-5/month for moderate usage

## Setup Steps

### Step 1: Enable Custom Search API in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for "Custom Search API"
5. Click **Enable**

### Step 2: Create API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Optional but recommended) Click **Edit API Key**:
   - Add **Application restrictions** (HTTP referrers or IP addresses)
   - Under **API restrictions**, select **Custom Search API**
   - Save

### Step 3: Create a Programmable Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/create)
2. Fill in the form:
   - **Search engine name**: "GroosHub Project Search" (or any name)
   - **What to search**:
     - Select **Search the entire web**
     - OR specify sites to include (e.g., architectenweb.nl, funda.nl, nieuwbouwprojecten.nl)
   - **Search settings**:
     - Enable **Image search**
     - Enable **Safe search** (optional)
     - Set **Language** to Dutch (nl) or English (en)

3. Click **Create**

4. On the next page, click **Customize**

5. Copy the **Search engine ID** (format: `xxxxxxxxxxxxxxx:yyyyyyyyyy`)

### Step 4: Configure Search Engine Settings (Optional but Recommended)

On the **Customize** page, you can optimize the search:

**Sites to search** (if not searching entire web):
```
architectenweb.nl
archined.nl
archdaily.com
funda.nl
nieuwbouwprojecten.nl
nieuwwoningen.nl
```

**Advanced Settings:**
- **Schema.org Structured Data**: Enable if available
- **Refinement labels**: Add custom filters (e.g., "Apartments", "Houses")

### Step 5: Add Environment Variables

Add the following to your `.env.local` file:

```bash
# Google Custom Search API
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSy...your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=xxxxxxxxxxxxxxx:yyyyyyyyyy
```

Replace with:
- Your API key from Step 2
- Your Search Engine ID from Step 3

### Step 6: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the admin project search page:
   ```
   http://localhost:3000/nl/admin/project-search
   ```

3. Enter an address and click **Search**

4. You should see project results with:
   - Project name
   - Image/render
   - Address
   - Type (apartments, houses, etc.)
   - Number of units
   - Additional features

### Step 7: Verify API Status

You can check if the API is properly configured:

```bash
curl http://localhost:3000/api/admin/search-projects
```

Response:
```json
{
  "configured": true,
  "usage": {
    "freeQueries": 100,
    "paidRate": "$5 per 1000 queries",
    "maxDaily": 10000
  },
  "message": "Google Custom Search API is configured and ready"
}
```

## Usage Best Practices

### 1. Caching Strategy

The system implements aggressive caching to minimize API calls:

```typescript
// Cache key format
`arch-projects-${buurtcode}-${radius}`

// TTL: 30 days (projects don't change frequently)
cache.set(cacheKey, results, 30 * 24 * 60 * 60 * 1000);
```

**Result**: Most searches hit cache, reducing API usage by 80-90%

### 2. Query Optimization

Search queries are optimized for Dutch residential projects:

```typescript
// Dutch query
nieuwbouw Amsterdam project (appartementen OR woningen OR "grondgebonden woningen")

// English query
new construction Amsterdam project (apartments OR housing OR residential)
```

### 3. Result Filtering

Results are filtered to ensure relevance:
- Valid project name and URL required
- Image URLs validated
- Project metadata extracted from snippets
- Duplicate results removed

### 4. Rate Limiting

Consider implementing rate limiting if deployed publicly:

```typescript
// Example: Max 10 searches per user per hour
const rateLimit = 10;
const windowMs = 60 * 60 * 1000; // 1 hour
```

## Troubleshooting

### Issue: "Google Custom Search API not configured"

**Cause**: Environment variables not set

**Solution**:
1. Check `.env.local` file exists
2. Verify `GOOGLE_CUSTOM_SEARCH_API_KEY` is set
3. Verify `GOOGLE_SEARCH_ENGINE_ID` is set
4. Restart development server

### Issue: "HTTP 400: API key not valid"

**Cause**: Invalid or restricted API key

**Solution**:
1. Verify API key is correct
2. Check API restrictions in Google Cloud Console
3. Ensure Custom Search API is enabled
4. Generate a new API key if needed

### Issue: "No results found"

**Cause**: Search query too specific or no projects in area

**Solution**:
1. Try a broader location (city instead of specific address)
2. Check if search engine is set to search entire web
3. Verify language settings match query language

### Issue: "Daily limit exceeded"

**Cause**: Used all 100 free queries

**Solution**:
1. Wait until next day (quota resets at midnight Pacific Time)
2. Enable billing to increase quota
3. Implement more aggressive caching

## Monitoring Usage

### Google Cloud Console

1. Go to **APIs & Services** → **Dashboard**
2. Select **Custom Search API**
3. View usage metrics:
   - Queries per day
   - Error rate
   - Latency

### Set Up Alerts

1. Go to **Monitoring** → **Alerting**
2. Create alert policy:
   - **Metric**: Custom Search API quota usage
   - **Threshold**: 80 queries per day
   - **Notification**: Email or Slack

## Cost Optimization Tips

1. **Enable Caching**: Cache results for 30 days
2. **Limit Results**: Request only 5-10 results per query
3. **Batch Searches**: Search by neighborhood instead of individual addresses
4. **Pre-populate Database**: Periodically scrape and cache popular areas
5. **Fallback to RSS**: Use free RSS feeds when possible

## Alternative Solutions

If you want to avoid Google Custom Search API costs:

### Option 1: RSS Feeds (Free)

```typescript
// Parse architectenweb.nl RSS feed
const feed = await fetch('https://architectenweb.nl/algemeen/rss.aspx');
const projects = parseRSS(feed);
```

**Pros**: Free, legal, recent projects
**Cons**: Limited coverage, manual filtering

### Option 2: Web Scraping (Free but risky)

```typescript
// Scrape architectenweb.nl project pages
const projects = await scrapeProjects('https://architectenweb.nl/projecten/');
```

**Pros**: Free, comprehensive
**Cons**: Legal gray area in Netherlands, maintenance overhead

### Option 3: Hybrid Approach (Recommended)

```typescript
// 1. Try cache first
if (cached) return cached;

// 2. Try RSS feed
const rssProjects = await fetchRSSProjects();
if (rssProjects.length > 0) return rssProjects;

// 3. Fallback to Google Custom Search (billable)
const searchProjects = await googleSearch();
return searchProjects;
```

**Pros**: Balances cost and coverage
**Cons**: More complex implementation

## Additional Resources

- [Custom Search JSON API Documentation](https://developers.google.com/custom-search/v1/overview)
- [Programmable Search Engine Help](https://support.google.com/programmable-search/)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

For issues or questions:
1. Check this documentation
2. Review API logs in Google Cloud Console
3. Test with curl/Postman to isolate issues
4. Create an issue in the GitHub repository

---

**Last Updated**: 2026-01-11
**Feature**: Admin Project Search
**API Version**: Custom Search JSON API v1
