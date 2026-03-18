/**
 * Finance Agent Approval
 *
 * Sends task to Finance Agent for approval, blocks execution if rejected.
 * Uses pluggable data, LLM, and cost adapters via config.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Use _currentDir to avoid conflict with CJS __dirname when running under Jest
const _currentDir = path.dirname(fileURLToPath(import.meta.url));
/** Thrown when OpenAI API returns 429 (quota/credit exhausted). Run must abort; do not fallback. */
export class OpenAICreditExhaustedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OpenAICreditExhaustedError';
    }
}
const ALERT_SEVERITY_MAP = {
    RUNWAY_WARNING: 'warning',
    RUNWAY_CRITICAL: 'critical',
    BUDGET_SPIKE: 'warning',
    AGENT_OVERRUN: 'warning',
    MODEL_DOWNGRADED: 'info',
    OPENAI_CREDIT_EXHAUSTED: 'critical',
};
const defaultLogger = {
    info: (msg, m) => console.info(msg, m ?? ''),
    warn: (msg, m) => console.warn(msg, m ?? ''),
    error: (msg, err, m) => console.error(msg, err, m ?? ''),
    debug: (msg, m) => console.debug(msg, m ?? ''),
};
/** Load bundled finance-agent.md governance file */
function loadBundledGovernance() {
    const packageRoot = path.resolve(_currentDir, '..');
    const governancePath = path.join(packageRoot, 'governance', 'finance-agent.md');
    try {
        return fs.readFileSync(governancePath, 'utf8');
    }
    catch (error) {
        throw new Error(`Failed to load Finance Agent system prompt from ${governancePath}: ${error}`);
    }
}
/**
 * Require Finance Approval
 *
 * Sends task to Finance Agent for approval. Blocks execution if rejected,
 * returns approved model tier otherwise.
 */
export async function requireFinanceApproval(request, config) {
    const logger = config.logger ?? defaultLogger;
    try {
        if (!request.agent || !request.task || !request.requestedModelTier || !request.estimatedCost) {
            throw new Error('Invalid task request: missing required fields');
        }
        logger.info('Querying financial context', { agent: request.agent, task: request.task });
        const financialContext = await config.dataAdapter.getFinancialContext();
        const globalBudget = (financialContext.budgets || []).find((b) => b.scope === 'global' && b.period === 'monthly');
        const agentBudget = (financialContext.budgets || []).find((b) => b.scope === request.agent && b.period === 'monthly');
        const monthlyLimit = globalBudget ? parseFloat(String(globalBudget.limit_usd)) : 0;
        const agentLimit = agentBudget ? parseFloat(String(agentBudget.limit_usd)) : 0;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthSpendEvents = (financialContext.spend_events || []).filter((e) => new Date(e.created_at) >= currentMonthStart);
        const currentMonthSpend = currentMonthSpendEvents.reduce((sum, e) => sum + Number(e.amount_usd || 0), 0);
        const agentCurrentMonthSpend = currentMonthSpendEvents
            .filter((e) => e.agent === request.agent)
            .reduce((sum, e) => sum + Number(e.amount_usd || 0), 0);
        const availableGlobalBudget = Math.max(0, monthlyLimit - currentMonthSpend);
        const availableAgentBudget = agentLimit > 0 ? Math.max(0, agentLimit - agentCurrentMonthSpend) : null;
        const estimatedCostUsd = request.totalEstimatedCostUsd ??
            config.costCalculator.calculateUSDCost(request.requestedModelTier, request.estimatedCost.llmTokens);
        logger.info('Finance Agent decision request - detailed context', {
            task: typeof request.task === 'string' ? request.task : String(request.task),
            requestDetails: {
                agent: request.agent,
                task: request.task,
                requestedTier: request.requestedModelTier,
                estimatedCost: request.estimatedCost,
                batchSize: request.batchSize,
                totalEstimatedCostUsd: request.totalEstimatedCostUsd,
                calculatedCostUsd: estimatedCostUsd,
                pipelineStages: request.pipelineStages,
            },
            financialContext: {
                globalBudget: {
                    monthlyLimit,
                    currentMonthSpend,
                    availableBudget: availableGlobalBudget,
                    utilizationPercent: monthlyLimit > 0 ? (currentMonthSpend / monthlyLimit) * 100 : 0,
                },
                agentBudget: agentLimit > 0
                    ? {
                        monthlyLimit: agentLimit,
                        currentMonthSpend: agentCurrentMonthSpend,
                        availableBudget: availableAgentBudget,
                        utilizationPercent: (agentCurrentMonthSpend / agentLimit) * 100,
                    }
                    : null,
                spend30d: {
                    total: financialContext.total_spend_30d,
                    llm: financialContext.llm_spend_30d,
                    infrastructure: financialContext.infrastructure_cost_30d,
                },
                revenue30d: financialContext.total_revenue_30d,
                monthlyBurnRate: financialContext.monthly_burn_rate,
            },
        });
        const financeAgentPrompt = config.governancePath
            ? fs.readFileSync(config.governancePath, 'utf8')
            : loadBundledGovernance();
        const taskPayload = {
            task_request: {
                agent: request.agent,
                task: request.task,
                requested_model_tier: request.requestedModelTier,
                estimated_cost: {
                    llm_tokens: request.estimatedCost.llmTokens,
                    llm_calls: request.estimatedCost.llmCalls,
                },
                batch_size: request.batchSize,
                total_estimated_cost_usd: request.totalEstimatedCostUsd ?? estimatedCostUsd,
                pipeline_stages: request.pipelineStages,
            },
            financial_context: financialContext,
            budget_calculations: {
                global_budget: {
                    monthly_limit: monthlyLimit,
                    current_month_spend: currentMonthSpend,
                    available_budget: availableGlobalBudget,
                    utilization_percent: monthlyLimit > 0 ? (currentMonthSpend / monthlyLimit) * 100 : 0,
                },
                agent_budget: agentLimit > 0
                    ? {
                        monthly_limit: agentLimit,
                        current_month_spend: agentCurrentMonthSpend,
                        available_budget: availableAgentBudget,
                        utilization_percent: (agentCurrentMonthSpend / agentLimit) * 100,
                    }
                    : null,
                spend_30d_context: {
                    total: financialContext.total_spend_30d,
                    llm_only: financialContext.llm_spend_30d,
                    infrastructure: financialContext.infrastructure_cost_30d,
                    note: 'total includes infrastructure - use only for global budget checks, NOT for agent-specific budgets',
                },
            },
        };
        logger.info('Calling Finance Agent', { agent: request.agent, task: request.task });
        const { result: response } = await config.llmAdapter.complete({
            systemPrompt: financeAgentPrompt,
            userMessage: JSON.stringify(taskPayload),
            model: 'gpt-4o',
            temperature: 0,
        });
        const resp = response;
        if (!resp.decision || !resp.approved_model_tier || !resp.reason) {
            throw new Error('Invalid Finance Agent response: missing required fields');
        }
        logger.info('Finance Agent response received', {
            response: {
                decision: resp.decision,
                approvedModelTier: resp.approved_model_tier,
                approvedBatchSize: resp.approved_batch_size,
                availableBudgetUsd: resp.available_budget_usd,
                reason: resp.reason,
                alertsTriggered: resp.alerts_triggered,
            },
        });
        if (resp.decision === 'rejected') {
            const errorMessage = `Finance Agent rejected task: ${resp.reason}`;
            logger.warn('Task rejected by Finance Agent - detailed analysis', {
                task: { agent: request.agent, task: request.task },
                reason: resp.reason,
            });
            throw new Error(errorMessage);
        }
        if (resp.alerts_triggered && resp.alerts_triggered.length > 0) {
            await config.dataAdapter.insertAlerts(resp.alerts_triggered.map((alertType) => ({
                type: alertType,
                severity: ALERT_SEVERITY_MAP[alertType] || 'info',
                message: `${alertType}: ${resp.reason}`,
                acknowledged: false,
            })));
        }
        logger.info('Task approved by Finance Agent', {
            agent: request.agent,
            task: request.task,
            approvedTier: resp.approved_model_tier,
            requestedTier: request.requestedModelTier,
        });
        return {
            approvedModelTier: resp.approved_model_tier,
            reason: resp.reason,
            alertsTriggered: resp.alerts_triggered || [],
            decision: resp.decision,
            approvedBatchSize: resp.approved_batch_size,
            availableBudgetUsd: resp.available_budget_usd,
        };
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Finance Agent rejected')) {
            throw error;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const is429 = errorMessage.includes('429') ||
            errorMessage.toLowerCase().includes('quota') ||
            errorMessage.toLowerCase().includes('billing');
        if (is429) {
            logger.error('Finance approval failed: OpenAI API credit exhausted (429)', error, {
                agent: request.agent,
                task: request.task,
            });
            await config.dataAdapter.insertAlerts([
                {
                    type: 'OPENAI_CREDIT_EXHAUSTED',
                    severity: 'critical',
                    message: `OpenAI API quota exceeded. Finance agent cannot approve tasks. Task: ${request.agent}/${request.task}. Add credit at platform.openai.com and retry.`,
                    acknowledged: false,
                },
            ]);
            throw new OpenAICreditExhaustedError(`OpenAI API credit exhausted (429). Run aborted. ${errorMessage}`);
        }
        logger.error('Finance approval failed', error, {
            agent: request.agent,
            task: request.task,
        });
        throw new Error(`Finance approval failed: ${errorMessage}`);
    }
}
//# sourceMappingURL=requireFinanceApproval.js.map