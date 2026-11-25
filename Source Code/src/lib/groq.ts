// ============================================================
// Groq LLM Client — llama-3.1-8b-instant
// ============================================================

import Groq, { toFile } from 'groq-sdk';

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
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

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

/**
 * Transcribe an audio file using Groq's Whisper API.
 * Uses official Groq SDK with toFile buffer conversion and hallucination filtering.
 */
export async function transcribeAudio(file: File): Promise<string> {
  const client = getClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`[Whisper API] Received file: name=${file.name}, type=${file.type}, size=${buffer.length} bytes`);

  // Audio smaller than 1.5KB is unlikely to contain any audible speech
  if (buffer.length < 1500) {
    console.warn(`[Whisper API] Audio buffer too small (${buffer.length} bytes), returning empty transcript.`);
    return '';
  }

  const fileName = file.name && file.name.includes('.') ? file.name : 'audio.webm';
  const fileMime = file.type || 'audio/webm';

  const audioFile = await toFile(buffer, fileName, {
    type: fileMime,
  });

  try {
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      prompt: 'Interview candidate speaking in English about their professional experience and technical skills.',
      temperature: 0.0,
    });

    const text = (transcription.text || '').trim();
    console.log(`[Whisper API] Raw transcription: "${text}"`);

    // Whisper hallucinations on silence or quiet background noise
    const hallucinations = [
      'thank you', 'thanks', 'thank you.', 'thanks.',
      'thank you for watching', 'thanks for watching',
      'you', 'bye', 'goodbye', 'thank you so much',
      'thank you for listening', 'subtitles by',
      'please subscribe', 'subscribe', 'thumbs up',
    ];

    const normalized = text.toLowerCase().replace(/[.!?,]/g, '').trim();
    if (hallucinations.includes(normalized)) {
      console.warn(`[Whisper API] Filtered hallucination: "${text}"`);
      return '';
    }

    return text;
  } catch (err: any) {
    console.error('[Whisper API] Groq transcription error:', err);
    throw err;
  }
}

