import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

/** Lazily creates the AI client so non-AI routes remain usable without an API key. */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is missing in environment variables.');
    client = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  }
  return client;
}
