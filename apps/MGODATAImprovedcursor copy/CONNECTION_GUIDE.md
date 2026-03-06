# MGO Frontend + Backend + Geo Command Center Connection Guide

All three apps are connected. MGO frontend **funnels users** to Geo Command Center for client/location management and GEO tracking.

## Quick Start

### 1. Start the backend

```bash
# From repo root
npm run dev:mgo-backend
```

The mgo-scanner-backend runs on **http://localhost:3002**.

### 2. Start the frontend

```bash
# From repo root
npm run dev:mgo-frontend
```

The Vite dev server starts (usually **http://localhost:5173**). It proxies `/api`, `/admin`, `/docs`, and `/openapi.json` to the backend on port 3002.

### 3. Open the app

Visit **http://localhost:5173** in your browser. The frontend will talk to the backend via the Vite proxy.

---

## Alternative: Run from project folders

```bash
# Terminal 1 - Backend
cd "MGODATAImprovedcursor copy/mgo-scanner-backend"
npm install
npm run dev

# Terminal 2 - Frontend
cd "MGODATAImprovedcursor copy/mgodataImprovedthroughcursor"
npm install
npm run dev
```

### 3. Start Geo Command Center (Dashboard)

```bash
npm run dev:geo
```

Runs on **http://localhost:3000**. This is where MGO users are funneled to manage clients, locations, and GEO tracking.

---

## Funnel Flow

- **MGO Frontend** (Landing, Scan Results) → "Dashboard" / "Manage in Dashboard" buttons → **Geo Command Center** (clients, locations, GEO tracking)
- MGO Backend powers MEO/GEO scans; Geo Command Center is the agency operations dashboard.

---

## Ports

| Service | Port |
|---------|------|
| MGO Frontend (Vite) | 5173 |
| MGO Backend | 3002 |
| GEO Command Center | 3001 |
| Atlas GS | 3000 |

Port 3002 avoids conflicts when running Atlas GS or GEO Command Center alongside MGO.

---

## Environment

- **Backend** (`mgo-scanner-backend/.env`): `GOOGLE_PLACES_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, etc.
- **Frontend** (`mgodataImprovedthroughcursor/.env.local`):
  - `VITE_API_URL=http://localhost:3002`
  - `VITE_BACKEND_URL=http://localhost:3002`
  - `VITE_GEO_COMMAND_CENTER_URL=http://localhost:3000` (funnel target)

---

## Backend Setup

1. Ensure PostgreSQL is running (or use the Prisma local URL in `.env`).
2. Run `npm run db:generate` in the backend folder to generate the Prisma client.
3. Run `npm run db:migrate` for schema migrations.

---

## Connection Flow

```
Browser → http://localhost:5173 (Vite)
         ↓
         /api/* requests
         ↓
         Vite proxy forwards to http://localhost:3002
         ↓
         mgo-scanner-backend (Express)
```
