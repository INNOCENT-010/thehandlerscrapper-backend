# TheHandler School Lead Engine

A school prospecting pipeline for TheHandler. It is designed for field sales: discover schools by Nigerian location, enrich public school websites, score leads, and move them through contact/visit/demo stages.

## Architecture

- **Next.js** dashboard/API
- **Supabase/PostgreSQL** for leads, contacts, locations, crawl jobs and sales activity
- **Python worker** for Google Places discovery + public website crawling/extraction
- **Google Places API (New)** for school discovery
- Optional search provider can be added later for web discovery

## Important design choices

1. Location is data, not code. The dashboard can select country/state/city/LGA/area and the discovery job stores the exact location used.
2. Google Places is an adapter, not embedded throughout the app. Replace/add discovery providers without changing the CRM.
3. Crawl only publicly accessible pages. Respect robots.txt, rate limits and site terms. Do not scrape private/personal information.
4. Generic school contacts (info@, admissions@, admin@) are separated from named professional contacts.
5. The lead score is explainable: every score has signal rows.

## Quick start

### Web

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

### Worker

```bash
cd worker
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Database

Run the SQL in `supabase/migrations/001_initial.sql` and then `supabase/seed/nigeria_locations.sql` in Supabase SQL Editor.

## Environment variables

Web:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LEAD_WORKER_URL`

Worker:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_MAPS_API_KEY`
- `CRAWL_USER_AGENT`
- `CRAWL_MAX_PAGES_PER_SCHOOL`
- `CRAWL_DELAY_MS`

## Google setup

Enable **Places API (New)** and billing in Google Cloud, then create a server-side API key. The worker uses Text Search (New) and Place Details (New). Keep the key server-side.

The implementation intentionally uses a narrow field mask to control cost.

## Pipeline

`DISCOVER -> DEDUPE -> CRAWL -> EXTRACT -> SCORE -> REVIEW -> CONTACTED -> VISITED -> DEMO -> NEGOTIATION -> CUSTOMER`

Other terminal states: `NOT_INTERESTED`, `LOST`, `DO_NOT_CONTACT`.

## What is intentionally not included

- mass email sender
- automatic spam campaigns
- scraping behind logins
- social-account credential collection
- private personal data collection

The next sensible upgrade is a queue (Redis/Celery/RQ or a managed queue) once discovery/crawling volume becomes high.
