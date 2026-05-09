import OpenAI from 'openai';

export const isMockMode = () => process.env.MOCK_OPENAI === 'true';

export function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';
