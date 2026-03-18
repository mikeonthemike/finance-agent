/**
 * OpenAI LLM Adapter
 *
 * Default LLM adapter using OpenAI API. Uses gpt-4o for Finance Agent (standard tier).
 */
import type { LLMAdapter } from '../config.js';
export interface OpenAILLMAdapterOptions {
    apiKey?: string;
    /** Default: gpt-4o */
    defaultModel?: string;
}
/**
 * Create OpenAI-based LLM adapter for Finance Agent.
 * Uses OPENAI_API_KEY from env if apiKey not provided.
 */
export declare function createOpenAILLMAdapter(options?: OpenAILLMAdapterOptions): LLMAdapter;
//# sourceMappingURL=openaiLLMAdapter.d.ts.map