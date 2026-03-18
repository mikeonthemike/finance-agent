/**
 * Supabase Data Adapter
 *
 * DataAdapter implementation that uses Supabase for budgets, spend_events,
 * revenue_events, alerts, agent_task_requests, and agent_task_results.
 *
 * Requires @supabase/supabase-js as a peer dependency.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DataAdapter } from '../config.js';
/**
 * Create a Supabase-backed DataAdapter.
 * Pass a Supabase client with service role (or anon with appropriate RLS).
 */
export declare function createSupabaseDataAdapter(supabase: SupabaseClient): DataAdapter;
//# sourceMappingURL=supabaseDataAdapter.d.ts.map