# MGO Scanner Backend Service

Backend service for calculating MEO (Map Engine Optimization), GEO (Generative Engine Optimization), and Combined scores for local businesses.

## Features

- **MEO Scoring (0-100)**: Profile completeness, reputation, trust & eligibility
- **GEO Scoring (0-100)**: NAP consistency, structured data, content clarity
- **Combined Score**: Weighted average (55% MEO + 45% GEO)
- **Directory Citation Checking**: Yelp, BBB, YellowPages, Facebook, MapQuest, ChamberOfCommerce, Foursquare, Hotfrog
- **OpenAI Integration**: AI-powered website analysis and NAP extraction
- **Caching**: LRU cache for Places, websites, and directory results
- **Error Handling**: Retries, timeouts, partial results

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Required:
- `GOOGLE_PLACES_API_KEY` or `PLACES_API_KEY`
- `OPENAI_API_KEY`

Optional:
- `SCANNER_USER_AGENT` (default: "MGODataScanner/1.0")
- `DIRECTORY_TIMEOUT_MS` (default: 8000)
- `PORT` (default: 3000)

### 3. Build

```bash
npm run build
```

### 4. Run

Development (with hot reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### POST /api/scan

Calculate MEO, GEO, and Combined scores for a business.

**Request Body:**
```json
{
  "query": "Amazing Smiles Dental Mason OH",
  "placeId": "ChIJ...",
  "websiteOverride": "https://example.com"
}
```

**Rules:**
- If `placeId` is provided, use it directly
- Else if `query` is provided, resolve `placeId` via Places "Find Place From Text"
- `websiteOverride` is optional (uses website from Places if not provided)

**Response:**
```json
{
  "place": {
    "name": "Amazing Smiles Dental",
    "address": "123 Main St, Mason, OH 45040",
    "phone": "+15551234567",
    "website": "https://example.com"
  },
  "scores": {
    "meo": {
      "score": 85,
      "breakdown": {
        "profile_completeness": {
          "phone": 6,
          "website": 6,
          "opening_hours": 8,
          "types": 6,
          "photos": 14,
          "total": 40
        },
        "reputation": {
          "rating_quality": 20,
          "rating_volume": 20,
          "total": 40
        },
        "trust_eligibility": {
          "business_status": 10,
          "address_geometry": 5,
          "total": 15
        }
      }
    },
    "geo": {
      "score": 72,
      "breakdown": {
        "nap_consistency": {
          "website_nap_match": 15,
          "directory_citations": 25,
          "total": 40
        },
        "structured_data": {
          "localbusiness_schema": 15,
          "sameAs": 7,
          "service_area_clarity": 10,
          "total": 32
        },
        "content_clarity": {
          "what_where_clarity": 10,
          "faq_signals": 10,
          "total": 20
        }
      }
    },
    "combined": {
      "score": 79,
      "formula": "round(0.55*MEO + 0.45*GEO)"
    }
  },
  "checks": {
    "directories": [
      {
        "directory": "Yelp",
        "best_listing_url": "https://...",
        "extracted_nap": { ... },
        "match_quality": "match"
      }
    ],
    "website": { ... }
  },
  "timing": {
    "places_fetch_ms": 250,
    "website_fetch_ms": 1200,
    "meo_calculation_ms": 5,
    "geo_calculation_ms": 3500,
    "total_ms": 4955
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "mgo-scanner-backend"
}
```

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Starbucks Seattle WA",
    "websiteOverride": "https://www.starbucks.com"
  }'
```

### Using placeId

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4"
  }'
```

## Scoring Details

### MEO Score (0-100)

**Profile Completeness (40 points):**
- Phone exists: 6
- Website exists: 6
- Opening hours exists: 8
- Types/categories exists: 6
- Photos: 0→0, 1-3→4, 4-9→9, 10+→14

**Reputation (45 points):**
- Rating quality (25): Maps rating 3.5-5.0 to 0-25 linearly
- Rating volume (20): 0-4→0, 5-19→6, 20-99→13, 100+→20

**Trust & Eligibility (15 points):**
- Business status OPERATIONAL: 10
- Address & geometry: 5

### GEO Score (0-100)

**NAP Consistency (45 points):**
- Website NAP match (15): match→15, partial→8, mismatch/missing→0
- Directory citations (30): Based on match quality across directories

**Structured Data & Entity Signals (35 points):**
- LocalBusiness schema: present+valid+has_nap→15, present+has_nap→10, present→5
- SameAs links: 0→0, 1-2→4, 3-5→7, 6+→10
- Service area clarity: clear→10, some→5

**Content Clarity for AI (20 points):**
- What/where clarity: clear→10, some→5
- FAQ signals: present→10

### Combined Score

```
combined = round(0.55 * MEO + 0.45 * GEO)
```

## Caching

- **Places Details**: Cached for 24 hours by `placeId`
- **Website Analysis**: Cached for 6 hours by URL
- **Directory Results**: Cached for 6 hours by directory+query

## Error Handling

- Network timeouts: 8 seconds (configurable)
- Retries: 1 retry for transient failures
- Partial results: Directory failures don't fail the entire scan
- Graceful degradation: Missing data returns 0 for affected score components

## Project Structure

```
src/
├── api/
│   └── scan.ts              # Main scan route handler
├── lib/
│   ├── cache.ts             # LRU cache implementation
│   ├── fetchHtml.ts         # HTML fetching utilities
│   ├── openai.ts            # OpenAI client and helpers
│   ├── places.ts            # Google Places API helpers
│   └── scoring/
│       ├── meo.ts           # MEO scoring logic
│       ├── geo.ts           # GEO scoring logic
│       └── combined.ts      # Combined score calculation
├── config/
│   └── directories.ts       # Directory configuration
├── types.ts                # TypeScript types
└── index.ts                # Express app entry point
```

## Testing

```bash
npm test
```

## License

ISC

