-- Finance Agent (Postgres) schema
--
-- This schema is designed to match the expectations of the built-in Supabase adapter:
-- - Reads: budgets, spend_events, revenue_events
-- - Writes: alerts, agent_task_requests, agent_task_results
--
-- Notes:
-- - Use UUID primary keys to align with Supabase defaults.
-- - Keep JSONB columns for flexible payloads/metrics without migrations for every field.
-- - Add RLS/policies as appropriate for your environment (not included here).

create extension if not exists "pgcrypto";

-- Budgets: global and per-agent (and optionally infra)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  scope text not null,               -- "global" | "<agent-name>" | "infra" | etc.
  scope_id text null,                -- reserved for future multi-tenant / org scoping
  period text not null,              -- "monthly" (required by library logic)
  limit_usd numeric not null check (limit_usd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budgets_scope_period_idx on public.budgets (scope, period);

-- Spend events: 30-day window queried; current-month window calculated in-library.
create table if not exists public.spend_events (
  id uuid primary key default gen_random_uuid(),
  agent text not null,               -- which agent incurred the spend (used for agent budgets)
  amount_usd numeric not null,        -- positive spend amount in USD
  category text null,                -- e.g. "llm" or "infra"; adapter treats category="infra" specially
  created_at timestamptz not null default now(),
  meta jsonb null                    -- optional details (provider, model, tokens, etc.)
);

create index if not exists spend_events_created_at_idx on public.spend_events (created_at desc);
create index if not exists spend_events_agent_created_at_idx on public.spend_events (agent, created_at desc);

-- Revenue events: optional, used for runway/context.
create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  amount_usd numeric not null,
  created_at timestamptz not null default now(),
  meta jsonb null
);

create index if not exists revenue_events_created_at_idx on public.revenue_events (created_at desc);

-- Alerts: written when Finance Agent triggers alerts or on critical failures.
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,                -- e.g. RUNWAY_WARNING, OPENAI_CREDIT_EXHAUSTED
  severity text not null,            -- "info" | "warning" | "critical"
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists alerts_created_at_idx on public.alerts (created_at desc);
create index if not exists alerts_acknowledged_idx on public.alerts (acknowledged);

-- Task requests: optional lifecycle dependency for orchestrators/UIs.
create table if not exists public.agent_task_requests (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  task_type text not null,
  task_id text null,
  requested_model_tier text not null, -- "premium" | "standard" | "cheap" | "emergency" | "thinking"
  estimated_cost jsonb not null,      -- { llm_tokens, llm_calls, infra_hours?, api_calls? }
  parameters jsonb null,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled' | etc.
  decision text null,                -- 'approved' | 'rejected' | 'partial'
  approved_model_tier text null,
  decision_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_task_requests_status_idx on public.agent_task_requests (status);
create index if not exists agent_task_requests_created_at_idx on public.agent_task_requests (created_at desc);

-- Task results: execution outcomes + metrics.
create table if not exists public.agent_task_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid null references public.agent_task_requests(id) on delete set null,
  agent text not null,
  task_type text not null,
  task_id text null,
  status text not null,              -- 'completed' | 'failed' | 'partial' | 'quality_rejected'
  actions jsonb not null default '[]'::jsonb,
  artifacts_created jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  confidence numeric null,
  created_at timestamptz not null default now()
);

create index if not exists agent_task_results_created_at_idx on public.agent_task_results (created_at desc);
create index if not exists agent_task_results_request_id_idx on public.agent_task_results (request_id);

