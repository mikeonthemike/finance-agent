/**
 * Finance Agent Approval
 *
 * Sends task to Finance Agent for approval, blocks execution if rejected.
 * Uses pluggable data, LLM, and cost adapters via config.
 */
import type { TaskRequest, FinanceApprovalResult } from './types.js';
import type { FinanceAgentConfig } from './config.js';
/** Thrown when OpenAI API returns 429 (quota/credit exhausted). Run must abort; do not fallback. */
export declare class OpenAICreditExhaustedError extends Error {
    constructor(message: string);
}
/**
 * Require Finance Approval
 *
 * Sends task to Finance Agent for approval. Blocks execution if rejected,
 * returns approved model tier otherwise.
 */
export declare function requireFinanceApproval(request: TaskRequest, config: FinanceAgentConfig): Promise<FinanceApprovalResult>;
//# sourceMappingURL=requireFinanceApproval.d.ts.map