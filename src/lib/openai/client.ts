import OpenAI from 'openai';

export const isMockMode = () => process.env.MOCK_OPENAI === 'true';

/**
 * LLM istemcisi. Varsayılan: OpenAI.
 * Gemini için: LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
 *              LLM_API_KEY=<gemini-key>
 *              OPENAI_MODEL=gemini-...-flash
 * Gemini'nin OpenAI-uyumlu endpoint'i streaming + json_object'i destekler.
 */
export function getOpenAI() {
  const baseURL = process.env.LLM_BASE_URL || undefined;
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  return new OpenAI({ apiKey, baseURL });
}

export const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';
