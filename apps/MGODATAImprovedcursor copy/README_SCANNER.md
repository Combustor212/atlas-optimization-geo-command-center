# MGO Visibility Score Scanner

A Python script that calculates the proprietary MGO Visibility Score (0-100) for local businesses using Google Places API (MEO) and OpenAI API (GEO).

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. (Optional) Create a `.env` file with your API keys:
```bash
# The script includes default API keys, but you can override them with environment variables
GOOGLE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

**Note**: The script includes default API keys from the project configuration. You can override them by setting environment variables or creating a `.env` file.

## Usage

```bash
python mgo_scanner.py \
  --business-name "Starbucks" \
  --target-address "123 Main St, New York, NY 10001" \
  --website-url "https://www.starbucks.com" \
  --place-id "ChIJN1t_tDeuEmsRUsoyG83frY4"
```

### Required Arguments

- `--business-name`: Name of the business
- `--target-address`: Full address of the business
- `--place-id`: Google Place ID (find using Google Places API or Google Maps)

### Optional Arguments

- `--website-url`: Business website URL (recommended for accurate scoring)

## Scoring Breakdown

### MEO Score (100 points)
- **NAP Consistency (40 pts)**: Compares phone/address between website and Google listing
- **Review Volume (20 pts)**: Based on number of reviews (100+ = 20, 50-99 = 10, <50 = 0)
- **Star Rating (20 pts)**: Based on rating (>4.5 = 20, 4.0-4.4 = 10, <4.0 = 0)
- **Listing Completeness (20 pts)**: Requires photos AND multiple categories

### GEO Score (100 points)
- **Schema Architecture (30 pts)**: Checks for LocalBusiness/MedicalBusiness JSON-LD schema
- **Trust Signals (20 pts)**: Looks for Privacy Policy, Terms, Licensed, or Copyright in footer
- **AI Recommendation Test (50 pts)**: Uses OpenAI GPT-4o-mini to analyze homepage for service areas and specific services

### Final Score
- **MGO Visibility Score**: (MEO Score + GEO Score) / 2
- **Status**: 
  - Green (>85): Excellent
  - Yellow (50-84): Needs Improvement
  - Red (<50): Critical

## Output

The script prints a detailed terminal report with:
- MEO score breakdown
- GEO score breakdown
- Total MGO Visibility Score
- Status indicator
- Action plan with specific recommendations

### Debug Mode

The script includes extensive debug logging to stderr. To see debug information:
```bash
python mgo_scanner.py --business-name "..." --target-address "..." --place-id "..." 2>&1 | tee output.log
```

This will show you:
- API call status
- Data extracted from websites
- Scoring calculations
- Any errors encountered

## Example Output

```
======================================================================
MGO VISIBILITY SCORE REPORT
======================================================================

Business: Starbucks

MEO SCORE (Map Engine Optimization): 75/100
----------------------------------------------------------------------
  Nap Consistency.................  40/40  - Exact NAP match
  Review Volume...................  20/20  - 250 reviews
  Star Rating.....................  20/20  - 4.7 stars
  Listing Completeness............   0/20  - Missing: photos

GEO SCORE (Generative Engine Optimization): 60/100
----------------------------------------------------------------------
  Schema Architecture.............  30/30  - Found LocalBusiness schema
  Trust Signals...................  20/20  - Trust signals found in footer
  Ai Recommendation...............  10/50  - AI recommendation score: 10/50

======================================================================
TOTAL MGO VISIBILITY: 67/100
Status: NEEDS IMPROVEMENT
======================================================================

ACTION PLAN:
----------------------------------------------------------------------
  1. Complete Listing - Add photos and multiple business categories
  2. Optimize for AI - Clearly state service areas and specific services on homepage
```

