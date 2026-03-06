# Worker Environment Variables

Required for the job worker to run:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes* | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes* | Alternative (used if SUPABASE_URL not set) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key; bypasses RLS for jobs/job_runs |

*At least one of SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set.

Optional (per handler):

| Variable | Handler(s) | Description |
|----------|------------|-------------|
| `GOOGLE_MAPS_API_KEY` | RANK_REFRESH, PLACE_DETAILS_REFRESH | Google Maps/Places API key |
| `GOOGLE_PLACES_API_KEY` | RANK_REFRESH, PLACE_DETAILS_REFRESH | Alternative to GOOGLE_MAPS_API_KEY |
| `OPENAI_API_KEY` | AI_QUERY_RUN | For sentiment analysis (falls back to rule-based if unset) |
| `HOSTNAME` | - | Worker ID prefix (default: `local`) |

Report generation and email delivery may require additional env vars; see `src/lib/reports/` for details.
