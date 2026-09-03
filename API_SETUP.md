# API / service setup

## Required

### 1. Supabase
Create a project, then run:
- `supabase/migrations/001_initial.sql`
- `supabase/seed/nigeria_locations.sql`

The Python worker uses the Supabase service-role key server-side only.

### 2. Google Maps Platform
Enable **Places API (New)** and billing. Create a server-side API key and set `GOOGLE_MAPS_API_KEY` in `worker/.env`.

The worker uses Places Text Search (New) for discovery and is ready for Place Details (New) expansion. It sends a narrow field mask rather than `*` to avoid unnecessary data/cost.

### 3. Nigeria locations
After installing worker requirements, run:

```bash
python scripts/import_open_admin_data.py
```

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` first. This imports the national state/LGA hierarchy from Open Admin Data. The database is intentionally hierarchical so cities/areas can be added later without changing the dashboard.

## Optional later APIs

- **Search API** (Serper, Tavily, Brave, etc.): discover schools whose websites are not well indexed in Places.
- **Email verification** (Hunter, ZeroBounce, NeverBounce): only when you actually need outreach; do not make it a discovery dependency.
- **Geocoding / Routes**: useful later for visit planning and territory optimization.

## Production secrets

Never put `GOOGLE_MAPS_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` variables or browser code.
