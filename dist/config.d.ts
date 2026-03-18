/**
 * Finance Agent Configuration
 *
 * Pluggable adapters and config passed to requireFinanceApproval and AgentRequestService.
 */
import type { FinancialContext, AgentTaskRequest, AgentTaskResult, ModelTier } from './types.js';
/** Adapter for fetching financial data and persisting alerts */
export interface DataAdapter {
    /** Fetch budgets, spend, revenue for Finance Agent decision */
    getFinancialContext(): Promise<FinancialContext>;
    /** Persist alerts (e.g. RUNWAY_WARNING, OPENAI_CREDIT_EXHAUSTED) */
    insertAlerts(alerts: Array<{
        type: string;
        severity: string;
        message: string;
        acknowledged: boolean;
    }>): Promise<void>;
    /** Submit task request; returns request ID */
    submitRequest(request: AgentTaskRequest): Promise<string>;
    /** Check approval status for a request */
    checkApproval(requestId: string): Promise<{
        approved: boolean;
        tier?: ModelTier;
        reason?: string;
    }>;
    /** Record task result and optionally update request status */
    recordResult(result: AgentTaskResult & {
        requestId?: string;
    }): Promise<string | null>;
    /** Get full request record by ID */
    getRequest(requestId: string): Promise<Record<string, unknown>>;
}
/** Adapter for LLM calls (Finance Agent prompt evaluation) */
export interface LLMAdapter {
    /** Call LLM with system prompt and user message; return parsed JSON result */
    complete(params: {
        systemPrompt: string;
        userMessage: string;
        model?: string;
        temperature?: number;
    }): Promise<{
        result: unknown;
    }>;
}
/** Adapter for cost calculation (token-to-USD) */
export interface CostCalculator {
    /** Calculate USD cost from tier and token usage */
    calculateUSDCost(tier: ModelTier, tokens: number | {
        promptTokens: number;
        completionTokens?: number;
    }): number;
}
/** Logger interface (default: console) */
export interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
    debug?(message: string, meta?: Record<string, unknown>): void;
}
/** Config passed to requireFinanceApproval */
export interface FinanceAgentConfig {
    dataAdapter: DataAdapter;
    llmAdapter: LLMAdapter;
    costCalculator: CostCalculator;
    /** Optional: custom path to finance-agent.md. Defaults to bundled governance. */
    governancePath?: string;
    logger?: Logger;
}
//# sourceMappingURL=config.d.ts.map