-- TrimOut License System — Supabase Schema
-- Run this in Supabase SQL Editor to create the required tables.

-- ── licenses ────────────────────────────────────────────────────────────────
-- One row per sold license key
create table if not exists licenses (
  key              text primary key,           -- TRIM-XXXX-XXXX-XXXX-XXXX
  email            text not null,              -- buyer's email from Gumroad
  gumroad_sale_id  text unique,                -- Gumroad sale ID for refund matching
  max_activations  integer not null default 2, -- Solo=1, Pro=2, Team=5
  created_at       timestamptz not null default now(),
  revoked          boolean not null default false
);

-- Index for revoke lookup by sale ID
create index if not exists licenses_gumroad_sale_id_idx on licenses(gumroad_sale_id);
create index if not exists licenses_email_idx on licenses(email);

-- ── activations ─────────────────────────────────────────────────────────────
-- One row per machine activation per license
create table if not exists activations (
  id            bigserial primary key,
  license_key   text not null references licenses(key) on delete cascade,
  machine_id    text not null,                 -- SHA256 of per-machine UUID
  activated_at  timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (license_key, machine_id)             -- prevent duplicate rows
);

create index if not exists activations_license_key_idx on activations(license_key);
create index if not exists activations_machine_id_idx on activations(machine_id);

-- ── RLS: disable for service role (our API uses service key, bypasses RLS) ──
alter table licenses enable row level security;
alter table activations enable row level security;

-- Service role has full access (our serverless functions use SUPABASE_SERVICE_KEY)
-- No public policies needed since we don't expose the anon key.
