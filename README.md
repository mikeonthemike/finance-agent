# Finance Agent

Budget-aware task approval for agentic systems. `requireFinanceApproval()` calls a “Finance Agent” (LLM + governance prompt) to approve/reject work based on your budgets, spend, and runway—using pluggable adapters so you can bring your own database and LLM provider.

## History

At the start of 2026 I ran an experiment to see how AI would approach running a business. I put up some constraints and prompted, but let the AI take as many decisions as possible. Part of the constraint set was a requirement for fiscal responsibility. The AI came up with a finance approval process, whereby agent requests would need to ask for permission to do something based on estimated token usage and the available budget. This evolved into a tiered model, whereby the AI could delegate sub-tasks to different tiers of model, depending on the nature of the task and how much budget is available. It worked pretty well. It wasn't really necessary, as the cost of what the AI was doing was extremely low and it never got close to spending the budget. (It did have cashflow issues, as it was running against a PAYG API key without auto-top-up, which is another story).

So this is published as a real implementation of an experiment that was successful. It may be useful to consider in an orchestrated workflow. Conscious of the bitter lesson, but that's really about solving difficult problems, where this is about cost-effective use of LLMs in automated workflows.

## Install

This is intended to be published (see Issues) and is not yet done

```bash
npm i @mikeonthemike/finance-agent
```

Optional (if you want the Supabase adapter):

```bash
npm i @supabase/supabase-js
```

## What this library does

- **Gates work behind approval**: you submit a task request; the Finance Agent returns `approved` / `rejected` (and may trigger alerts).
- **Keeps you budget-aware**: the approval prompt is driven by your financial context (budgets + spend/revenue events).
- **Pluggable architecture**:
  - **`DataAdapter`**: reads financial context + persists alerts and task lifecycle records
  - **`LLMAdapter`**: calls the LLM and returns a parsed JSON decision
  - **`CostCalculator`**: converts token usage to USD
- **Governance prompt included**: `governance/finance-agent.md` is bundled and used by default; you can override it via `governancePath` for tuning.

## Quickstart (core usage)

```ts
import {
  requireFinanceApproval,
  createOpenAILLMAdapter,
  createSupabaseDataAdapter,
} from '@mikeonthemike/finance-agent';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const dataAdapter = createSupabaseDataAdapter(supabase);
const llmAdapter = createOpenAILLMAdapter(); // uses OPENAI_API_KEY

// You own cost modeling. Keep it simple and conservative.
const costCalculator = {
  calculateUSDCost(_tier: 'premium' | 'standard' | 'cheap' | 'emergency' | 'thinking', tokens: number | { promptTokens: number; completionTokens?: number }) {
    const t = typeof tokens === 'number' ? tokens : tokens.promptTokens + (tokens.completionTokens ?? 0);
    // Example placeholder: $0.00001/token. Replace with your real rates.
    return t * 0.00001;
  },
};

const approval = await requireFinanceApproval(
  {
    agent: 'prompt-generator',
    task: 'generate-prompts',
    requestedModelTier: 'standard',
    estimatedCost: { llmTokens: 40300, llmCalls: 100 },
    // Optional: provide your own precomputed USD estimate to avoid rate drift
    // totalEstimatedCostUsd: 1.91425,
  },
  { dataAdapter, llmAdapter, costCalculator }
);

console.log('Approved tier:', approval.approvedModelTier, 'Reason:', approval.reason);
```

## API overview

- **`requireFinanceApproval(request, config)`**: calls the Finance Agent and returns an approval result.
  - Throws on `decision: "rejected"`.
  - Throws **`OpenAICreditExhaustedError`** when OpenAI returns quota/credit exhaustion signals (the run should abort; no fallback).
- **`createAgentRequestService(adapter)`**: a convenience wrapper around the `DataAdapter` task lifecycle methods (submit/check/result/get).

## Adapters and configuration

The main entrypoint takes a `FinanceAgentConfig`:

- **`dataAdapter`**: required. Supplies financial context and persists alerts / request lifecycle.
- **`llmAdapter`**: required. Makes the approval call and returns parsed JSON.
- **`costCalculator`**: required. Used if `totalEstimatedCostUsd` isn’t supplied.
- **`governancePath`**: optional. Path to an alternate governance prompt for tuning.
- **`logger`**: optional. Defaults to console.

### OpenAI adapter

```ts
import { createOpenAILLMAdapter } from '@mikeonthemike/finance-agent/openai';
```

- **Environment**: `OPENAI_API_KEY` is required (unless you pass `apiKey`).

### Supabase adapter

```ts
import { createSupabaseDataAdapter } from '@mikeonthemike/finance-agent/supabase';
```

- Expects a Supabase client connected to a Postgres database with the tables described below.

## Database schema (Postgres / Supabase)

This package is opinionated about table *names* and the *minimum columns* needed for the built-in Supabase adapter.

- **Recommended**: use `schema.sql` + `seed.sql` in this repo as a starting point.
- **Required tables**:
  - **`budgets`**: stores monthly limits for `global`, per-agent, and optionally `infra`
  - **`spend_events`**: stores spend events (LLM and optional infra)
  - **`revenue_events`**: stores revenue events (optional but supported)
  - **`alerts`**: stores alerts triggered by approvals or failures
  - **`agent_task_requests`**: stores pending/approved/rejected requests
  - **`agent_task_results`**: stores execution outcomes

If you don’t want these exact tables, implement your own `DataAdapter` instead of using the Supabase adapter.

## Governance prompt tuning

The bundled governance prompt lives at `governance/finance-agent.md` and enforces:

- strict **JSON-only** responses
- tier guidelines (`premium` / `standard` / `cheap` / `emergency` / `thinking`)
- budget and runway decision rules

You can override it via `governancePath` in `FinanceAgentConfig` to tune decision-making for your org (keep the output schema identical).

## Platform / runtime compatibility

- **Node**: `>= 20`
- **Module system**: ESM (`"type": "module"`)
- **Note**: the repo’s internal scripts may include Unix-style commands (e.g. `rm -rf`). They’re not required for library consumers.

## License

MIT. See `LICENSE`.

