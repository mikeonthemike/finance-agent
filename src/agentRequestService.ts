/**
 * Agent Request Service
 *
 * Manages agent task lifecycle: request submission, approval checking, result recording.
 * Uses pluggable DataAdapter - create via createAgentRequestService(adapter).
 */

import type { DataAdapter } from './config.js';
import type { AgentTaskRequest, AgentTaskResult } from './types.js';

export interface AgentRequestService {
  submitRequest(request: AgentTaskRequest): Promise<string>;
  checkApproval(requestId: string): Promise<{
    approved: boolean;
    tier?: string;
    reason?: string;
  }>;
  recordResult(result: AgentTaskResult & { requestId?: string }): Promise<string | null>;
  getRequest(requestId: string): Promise<Record<string, unknown>>;
}

/**
 * Create AgentRequestService backed by the given DataAdapter.
 */
export function createAgentRequestService(adapter: DataAdapter): AgentRequestService {
  return {
    submitRequest: (request) => adapter.submitRequest(request),
    checkApproval: (requestId) => adapter.checkApproval(requestId),
    recordResult: (result) => adapter.recordResult(result),
    getRequest: (requestId) => adapter.getRequest(requestId),
  };
}
