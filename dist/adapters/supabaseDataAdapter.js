/**
 * Supabase Data Adapter
 *
 * DataAdapter implementation that uses Supabase for budgets, spend_events,
 * revenue_events, alerts, agent_task_requests, and agent_task_results.
 *
 * Requires @supabase/supabase-js as a peer dependency.
 */
/**
 * Create a Supabase-backed DataAdapter.
 * Pass a Supabase client with service role (or anon with appropriate RLS).
 */
export function createSupabaseDataAdapter(supabase) {
    return {
        async getFinancialContext() {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const [budgetsRes, spendRes, revenueRes] = await Promise.all([
                supabase.from('budgets').select('*'),
                supabase
                    .from('spend_events')
                    .select('*')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .order('created_at', { ascending: false }),
                supabase
                    .from('revenue_events')
                    .select('*')
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .order('created_at', { ascending: false }),
            ]);
            const budgets = (budgetsRes.data || []);
            const spendEvents = (spendRes.data || []);
            const revenueEvents = (revenueRes.data || []);
            const llmSpendEvents = spendEvents.filter((e) => e.category !== 'infra');
            const infraSpendEvents = spendEvents.filter((e) => e.category === 'infra');
            const llmSpend = llmSpendEvents.reduce((s, e) => s + Number(e.amount_usd || 0), 0);
            const infraSpendFromEvents = infraSpendEvents.reduce((s, e) => s + Number(e.amount_usd || 0), 0);
            const infraBudget = budgets.find((b) => b.scope === 'infra' && b.period === 'monthly');
            const infraBudgetLimit = infraBudget ? parseFloat(String(infraBudget.limit_usd)) : 0;
            const infrastructureCost30d = infraSpendFromEvents > 0 ? infraSpendFromEvents : infraBudgetLimit;
            const totalSpend = llmSpend + infrastructureCost30d;
            const totalRevenue = revenueEvents.reduce((s, e) => s + Number(e.amount_usd || 0), 0);
            const monthlyBurnRate = totalSpend / 30;
            return {
                budgets,
                spend_events: spendEvents,
                revenue_events: revenueEvents,
                total_spend_30d: totalSpend,
                llm_spend_30d: llmSpend,
                infrastructure_cost_30d: infrastructureCost30d,
                infrastructure_budget_limit: infraBudgetLimit,
                total_revenue_30d: totalRevenue,
                monthly_burn_rate: monthlyBurnRate,
            };
        },
        async insertAlerts(alerts) {
            const rows = alerts.map((a) => ({
                type: a.type,
                severity: a.severity,
                message: a.message,
                acknowledged: a.acknowledged,
            }));
            const { error } = await supabase.from('alerts').insert(rows);
            if (error)
                throw new Error(`Failed to insert alerts: ${error.message}`);
        },
        async submitRequest(request) {
            const { data, error } = await supabase
                .from('agent_task_requests')
                .insert({
                agent: request.agent,
                task_type: request.task,
                task_id: request.taskId ?? null,
                requested_model_tier: request.requestedModelTier,
                estimated_cost: {
                    llm_tokens: request.estimatedCost.llmTokens,
                    llm_calls: request.estimatedCost.llmCalls,
                    infra_hours: request.estimatedCost.infraHours,
                    api_calls: request.estimatedCost.apiCalls,
                },
                parameters: request.parameters ?? null,
                status: 'pending',
            })
                .select('id')
                .single();
            if (error)
                throw new Error(`Failed to submit task request: ${error.message}`);
            if (!data?.id)
                throw new Error('Failed to submit task request: no ID returned');
            return data.id;
        },
        async checkApproval(requestId) {
            const { data, error } = await supabase
                .from('agent_task_requests')
                .select('status, decision, approved_model_tier, decision_reason')
                .eq('id', requestId)
                .single();
            if (error)
                throw new Error(`Failed to check approval: ${error.message}`);
            if (!data)
                throw new Error(`Request not found: ${requestId}`);
            return {
                approved: data.decision === 'approved',
                tier: data.approved_model_tier,
                reason: data.decision_reason ?? undefined,
            };
        },
        async recordResult(result) {
            const { data, error } = await supabase
                .from('agent_task_results')
                .insert({
                request_id: result.requestId ?? null,
                agent: result.agent,
                task_type: result.task,
                task_id: result.taskId ?? null,
                status: result.status,
                actions: result.actions,
                artifacts_created: result.artifactsCreated,
                metrics: {
                    tokens_used: result.metrics.tokensUsed,
                    estimated_cost_usd: result.metrics.estimatedCostUsd,
                    response_time_ms: result.metrics.responseTimeMs,
                    ...result.metrics,
                },
                errors: result.errors,
                confidence: result.confidence,
            })
                .select('id')
                .single();
            if (error)
                throw new Error(`Failed to record task result: ${error.message}`);
            if (result.requestId && result.status === 'failed') {
                await supabase
                    .from('agent_task_requests')
                    .update({ status: 'cancelled' })
                    .eq('id', result.requestId)
                    .eq('status', 'approved');
            }
            return data?.id ?? null;
        },
        async getRequest(requestId) {
            const { data, error } = await supabase
                .from('agent_task_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            if (error)
                throw new Error(`Failed to get request: ${error.message}`);
            if (!data)
                throw new Error(`Request not found: ${requestId}`);
            return data;
        },
    };
}
//# sourceMappingURL=supabaseDataAdapter.js.map