/**
 * OpenAI LLM Adapter
 *
 * Default LLM adapter using OpenAI API. Uses gpt-4o for Finance Agent (standard tier).
 */
import OpenAI from 'openai';
const TIER_MODELS = {
    premium: 'gpt-4o',
    standard: 'gpt-4o',
    cheap: 'gpt-4o-mini',
    emergency: 'gpt-4o-mini',
    thinking: 'gpt-5',
};
/** Extract JSON from LLM response (handles markdown-wrapped JSON) */
function cleanJsonResponse(response) {
    let cleaned = response.trim();
    const markdownJsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownJsonMatch?.[1]) {
        cleaned = markdownJsonMatch[1].trim();
    }
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
        let braceCount = 0;
        let endBrace = -1;
        for (let i = firstBrace; i < cleaned.length; i++) {
            if (cleaned[i] === '{')
                braceCount++;
            if (cleaned[i] === '}')
                braceCount--;
            if (braceCount === 0) {
                endBrace = i;
                break;
            }
        }
        if (endBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, endBrace + 1);
        }
    }
    return cleaned.trim();
}
/**
 * Create OpenAI-based LLM adapter for Finance Agent.
 * Uses OPENAI_API_KEY from env if apiKey not provided.
 */
export function createOpenAILLMAdapter(options = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    const defaultModel = options.defaultModel ?? TIER_MODELS.standard;
    return {
        async complete(params) {
            if (!apiKey) {
                throw new Error('OpenAI LLM adapter: OPENAI_API_KEY required');
            }
            const client = new OpenAI({ apiKey });
            const model = params.model ?? defaultModel;
            const completion = await client.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: params.systemPrompt },
                    { role: 'user', content: params.userMessage },
                ],
                temperature: params.temperature ?? 0,
                response_format: { type: 'json_object' },
                max_completion_tokens: 2000,
            });
            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('OpenAI LLM adapter: empty response');
            }
            const cleaned = cleanJsonResponse(content);
            const parsed = JSON.parse(cleaned);
            return { result: parsed };
        },
    };
}
//# sourceMappingURL=openaiLLMAdapter.js.map