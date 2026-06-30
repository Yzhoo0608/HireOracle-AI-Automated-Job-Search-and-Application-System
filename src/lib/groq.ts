// ============================================================
// Groq LLM Client — llama-3.1-8b-instant
// ============================================================

import Groq from 'groq-sdk';

let _client: Groq | null = null;

function getClient(): Groq {
  if (!_client) {
    _client = new Groq({
      apiKey: process.env.GROQ_API_KEY || '',
    });
  }
  return _client;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

/**
 * Send a chat completion request to Groq.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const client = getClient();
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });

  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Ask the LLM a single question with an optional system prompt.
 */
export async function ask(
  prompt: string,
  systemPrompt?: string,
  options: ChatOptions = {}
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });
  return chat(messages, options);
}

/**
 * Ask the LLM to return structured JSON. Parses the response automatically.
 */
export async function askJSON<T = unknown>(
  prompt: string,
  systemPrompt?: string,
  options: ChatOptions = {}
): Promise<T> {
  const result = await ask(prompt, systemPrompt, {
    ...options,
    jsonMode: true,
    temperature: options.temperature ?? 0.3,
  });

  try {
    return JSON.parse(result) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }
    throw new Error(`Failed to parse LLM JSON response: ${result.slice(0, 200)}`);
  }
}
