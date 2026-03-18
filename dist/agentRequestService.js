/**
 * Agent Request Service
 *
 * Manages agent task lifecycle: request submission, approval checking, result recording.
 * Uses pluggable DataAdapter - create via createAgentRequestService(adapter).
 */
/**
 * Create AgentRequestService backed by the given DataAdapter.
 */
export function createAgentRequestService(adapter) {
    return {
        submitRequest: (request) => adapter.submitRequest(request),
        checkApproval: (requestId) => adapter.checkApproval(requestId),
        recordResult: (result) => adapter.recordResult(result),
        getRequest: (requestId) => adapter.getRequest(requestId),
    };
}
//# sourceMappingURL=agentRequestService.js.map