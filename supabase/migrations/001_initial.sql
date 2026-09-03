create extension if not exists pgcrypto;

create type public.location_type as enum ('country','state','city','lga','area');
create type public.school_status as enum ('NEW','CONTACTED','INTERESTED','VISITED','DEMO','NEGOTIATION','CUSTOMER','NOT_INTERESTED','LOST','DO_NOT_CONTACT');
create type public.contact_type as enum ('generic','professional','decision_maker');

create table public.locations (
 id uuid primary key default gen_random_uuid(),
 parent_id uuid references public.locations(id) on delete cascade,
 name text not null,
 slug text not null,
 type public.location_type not null,
 country_code text not null default 'NG',
 latitude double precision,
 longitude double precision,
 metadata jsonb not null default '{}',
 unique(parent_id,slug,type)
);
create index locations_parent_idx on public.locations(parent_id);
create index locations_type_idx on public.locations(type);

create table public.schools (
 id uuid primary key default gen_random_uuid(),
 school_name text not null,
 google_place_id text unique,
 website text,
 phone text,
 email text,
 address text,
 state_id uuid references public.locations(id),
 city_id uuid references public.locations(id),
 lga_id uuid references public.locations(id),
 area_id uuid references public.locations(id),
 latitude double precision,
 longitude double precision,
 school_type text,
 levels text[] not null default '{}',
 student_estimate integer,
 has_online_registration boolean,
 has_online_payment boolean,
 existing_software text,
 lead_score integer not null default 0 check (lead_score between 0 and 100),
 priority text not null default 'low',
 status public.school_status not null default 'NEW',
 source text,
 source_url text,
 first_seen_at timestamptz not null default now(),
 last_enriched_at timestamptz,
 notes text,
 metadata jsonb not null default '{}',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index schools_score_idx on public.schools(lead_score desc);
create index schools_status_idx on public.schools(status);
create index schools_state_idx on public.schools(state_id);
create index schools_city_idx on public.schools(city_id);

create table public.school_contacts (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 full_name text,
 role text,
 email text,
 phone text,
 contact_type public.contact_type not null default 'generic',
 source_url text,
 verified_at timestamptz,
 opted_out boolean not null default false,
 notes text,
 created_at timestamptz not null default now(),
 unique(school_id,email)
);
create index school_contacts_school_idx on public.school_contacts(school_id);

create table public.school_pages (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 url text not null,
 title text,
 http_status integer,
 content_hash text,
 extracted_text text,
 crawled_at timestamptz not null default now(),
 unique(school_id,url)
);

create table public.lead_signals (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 code text not null,
 points integer not null,
 detail text,
 created_at timestamptz not null default now()
);
create index lead_signals_school_idx on public.lead_signals(school_id);

create table public.discovery_runs (
 id uuid primary key default gen_random_uuid(),
 state_id uuid references public.locations(id),
 city_id uuid references public.locations(id),
 lga_id uuid references public.locations(id),
 area_id uuid references public.locations(id),
 school_type text,
 provider text not null default 'google_places',
 query text,
 status text not null default 'queued',
 result_count integer not null default 0,
 error text,
 started_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now()
);

create table public.crawl_jobs (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 status text not null default 'queued',
 attempts integer not null default 0,
 next_attempt_at timestamptz,
 error text,
 created_at timestamptz not null default now(),
 completed_at timestamptz
);

create table public.sales_activities (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 activity_type text not null,
 outcome text,
 note text,
 occurred_at timestamptz not null default now()
);
create index sales_activities_school_idx on public.sales_activities(school_id,occurred_at desc);

create table public.visits (
 id uuid primary key default gen_random_uuid(),
 school_id uuid not null references public.schools(id) on delete cascade,
 scheduled_for timestamptz,
 completed_at timestamptz,
 contact_name text,
 outcome text,
 notes text,
 created_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger schools_updated_at before update on public.schools for each row execute function public.set_updated_at();

alter table public.locations enable row level security;
alter table public.schools enable row level security;
alter table public.school_contacts enable row level security;
alter table public.school_pages enable row level security;
alter table public.lead_signals enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.crawl_jobs enable row level security;
alter table public.sales_activities enable row level security;
alter table public.visits enable row level security;

-- For the first internal prototype, use Supabase Auth and replace these policies with your team/org rules.
create policy "authenticated read locations" on public.locations for select to authenticated using (true);
create policy "authenticated manage schools" on public.schools for all to authenticated using (true) with check (true);
create policy "authenticated manage contacts" on public.school_contacts for all to authenticated using (true) with check (true);
create policy "authenticated manage pages" on public.school_pages for all to authenticated using (true) with check (true);
create policy "authenticated manage signals" on public.lead_signals for all to authenticated using (true) with check (true);
create policy "authenticated manage discovery" on public.discovery_runs for all to authenticated using (true) with check (true);
create policy "authenticated manage crawl" on public.crawl_jobs for all to authenticated using (true) with check (true);
create policy "authenticated manage activities" on public.sales_activities for all to authenticated using (true) with check (true);
create policy "authenticated manage visits" on public.visits for all to authenticated using (true) with check (true);
