/**
 * @mikeonthemike/finance-agent
 *
 * Budget-aware task approval with pluggable data and LLM adapters.
 * Bundle for independent deployment.
 */
export { requireFinanceApproval, OpenAICreditExhaustedError } from './requireFinanceApproval.js';
export type { FinanceApprovalResult } from './types.js';
export { createAgentRequestService } from './agentRequestService.js';
export type { AgentRequestService } from './agentRequestService.js';
export { createSupabaseDataAdapter } from './adapters/supabaseDataAdapter.js';
export { createOpenAILLMAdapter } from './adapters/openaiLLMAdapter.js';
export type { TaskRequest, FinanceAgentResponse, ModelTier, AgentTaskRequest, AgentTaskResult, FinancialContext, } from './types.js';
export type { FinanceAgentConfig, DataAdapter, LLMAdapter, CostCalculator, Logger, } from './config.js';
//# sourceMappingURL=index.d.ts.map