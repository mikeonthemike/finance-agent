-- Minimal seed data for Finance Agent schema (Postgres).
--
-- This is intentionally small and safe. Adjust values to your org.

-- Global monthly budget (required for meaningful approvals)
insert into public.budgets (scope, period, limit_usd)
values ('global', 'monthly', 250)
on conflict do nothing;

-- Example infra monthly budget (optional; used by adapter as a fallback for 30d infra cost)
insert into public.budgets (scope, period, limit_usd)
values ('infra', 'monthly', 30)
on conflict do nothing;

-- Example per-agent monthly budget (optional; scope is the agent name)
insert into public.budgets (scope, period, limit_usd)
values ('prompt-generator', 'monthly', 48)
on conflict do nothing;

