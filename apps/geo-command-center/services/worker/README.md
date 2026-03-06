# Job Worker

Long-running Node.js + TypeScript worker that polls and processes jobs from the `jobs` table via `public.claim_jobs(worker_id, limit_n)`.

## Features

- **Concurrency limit**: 5 jobs at a time
- **Exponential backoff with jitter** on failure
- **job_runs** rows for each attempt
- **Job statuses**: `succeeded`, `failed`, `retrying`, `dead`
- **Structured JSON logging** to stdout

## Job Handlers

| Job Type | Description |
|----------|-------------|
| `RANK_REFRESH` | Refresh rankings from location_keywords; source `google_places_nearby_proxy` (cron) or `google_places_api` |
| `PLACE_DETAILS_REFRESH` | Refresh place details (reviews) for agency locations |
| `UPSELL_EVAL` | Evaluate upsell triggers, create opportunities |
| `HEALTH_SCORE_REFRESH` | Compute health scores for agency clients |
| `REPORT_RUN` | Generate PDF report, upload to storage, send email |
| `AI_QUERY_RUN` | Run AI query (stub), parse, insert ai_mentions |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `GOOGLE_MAPS_API_KEY` or `GOOGLE_PLACES_API_KEY` | For RANK_REFRESH, PLACE_DETAILS_REFRESH | Google Places API |
| `OPENAI_API_KEY` | Optional | For AI sentiment in AI_QUERY_RUN |
| `HOSTNAME` | Optional | Worker identifier (default: `local`) |

## Run Locally

```bash
# From apps/geo-command-center
npm run worker

# With .env.local
npm run worker:dev
```

## Deploy (Render / Fly / Railway)

### Render

1. **New Background Worker**
2. **Build command**: `npm install && npm run build` (or `npm install` only)
3. **Start command**: `npm run worker`
4. **Environment**: Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PLACES_API_KEY` (if needed)
5. **Health check**: Optional; worker has no HTTP server

### Fly.io

```bash
fly launch --no-deploy
# Edit fly.toml:
# [processes]
# app = "npm run start"
# worker = "npm run worker"
# [[services]]
#   processes = ["app"]
# [[services]]
#   processes = ["worker"]
#   internal_port = 8080  # dummy for worker
```

Or use a separate `fly.toml` for the worker:

```toml
# fly.worker.toml
app = "geo-worker"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["worker"]

  [[services.ports]]
    port = 8080

[[processes]]
  worker = "npm run worker"
```

### Railway

1. **New Service** → Deploy from repo
2. **Root directory**: `apps/geo-command-center`
3. **Build**: `npm install`
4. **Start**: `npm run worker`
5. **Variables**: Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.

### Docker (generic)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build  # if needed for report generation (React PDF)
CMD ["npm", "run", "worker"]
```

## Database Migration

Run the migration so `claim_jobs` includes `retrying` status:

```bash
# Apply migration
supabase db push
# Or paste apps/geo-command-center/supabase/migrations/20260302_claim_jobs_retrying.sql in Supabase SQL Editor
```

## Architecture

```
Cron routes (/api/cron/*)  →  enqueue jobs  →  jobs table
                                    ↑
Worker  ←  claim_jobs(worker_id, 5)  ←  poll
    ↓
handlers (RANK_REFRESH, etc.)
    ↓
job_runs (started_at, finished_at, status, error, logs)
    ↓
jobs (status: succeeded | failed | retrying | dead)
```
