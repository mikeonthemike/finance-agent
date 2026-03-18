/**
 * Finance Agent Types
 *
 * Core types for the Finance Agent package. Kept minimal for portability.
 */
export type ModelTier = 'premium' | 'standard' | 'cheap' | 'emergency' | 'thinking';
/** Task request sent to Finance Agent for approval */
export interface TaskRequest {
    agent: string;
    task: string;
    requestedModelTier: ModelTier;
    estimatedCost: {
        llmTokens: number;
        llmCalls: number;
    };
    /** Optional batch context for partial approvals */
    batchSize?: number;
    totalEstimatedCostUsd?: number;
    pipelineStages?: Array<{
        stage: string;
        agent: string;
        estimated_cost_usd: number;
    }>;
}
/** Finance Agent LLM response structure */
export interface FinanceAgentResponse {
    decision: 'approved' | 'rejected' | 'partial';
    approved_model_tier: ModelTier;
    approved_batch_size?: number;
    available_budget_usd?: number;
    reason: string;
    alerts_triggered: string[];
}
/** Result returned to callers after approval */
export interface FinanceApprovalResult {
    approvedModelTier: ModelTier;
    reason: string;
    alertsTriggered: string[];
    decision: 'approved' | 'rejected' | 'partial';
    approvedBatchSize?: number;
    availableBudgetUsd?: number;
}
/** Agent task request (for AgentRequestService) */
export interface AgentTaskRequest {
    agent: string;
    task: string;
    requestedModelTier: ModelTier;
    estimatedCost: {
        llmTokens: number;
        llmCalls: number;
        infraHours?: number;
        apiCalls?: number;
    };
    parameters?: Record<string, unknown>;
    taskId?: string;
}
/** Agent task result (for AgentRequestService) */
export interface AgentTaskResult {
    agent: string;
    task: string;
    taskId?: string;
    status: 'completed' | 'failed' | 'partial' | 'quality_rejected';
    actions: AgentAction[];
    artifactsCreated: AgentArtifact[];
    metrics: AgentMetrics;
    errors: AgentTaskError[];
    confidence: number;
}
export interface AgentAction {
    action: string;
    [key: string]: unknown;
}
export interface AgentArtifact {
    type: string;
    id: string;
    table: string;
    status?: string;
}
export interface AgentMetrics {
    tokensUsed: number;
    estimatedCostUsd: number;
    responseTimeMs: number;
    [key: string]: unknown;
}
export interface AgentTaskError {
    code: string;
    message: string;
    recoverable: boolean;
    suggestedAction?: string;
}
/** Financial context used by Finance Agent for decisions */
export interface FinancialContext {
    budgets: Budget[];
    spend_events: SpendEvent[];
    revenue_events: RevenueEvent[];
    total_spend_30d: number;
    llm_spend_30d: number;
    infrastructure_cost_30d: number;
    infrastructure_budget_limit: number;
    total_revenue_30d: number;
    monthly_burn_rate: number;
}
export interface Budget {
    id?: string;
    scope: string;
    scope_id?: string | null;
    period: string;
    limit_usd: number;
    [key: string]: unknown;
}
export interface SpendEvent {
    id?: string;
    agent: string;
    amount_usd: number;
    category?: string;
    created_at: string;
    [key: string]: unknown;
}
export interface RevenueEvent {
    id?: string;
    amount_usd: number;
    created_at: string;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map