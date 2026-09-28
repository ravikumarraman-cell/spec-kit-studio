import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../middleware/errorHandling';

let client: GoogleGenAI | null = null;

/** Lazily creates the AI client so non-AI routes remain usable without an API key. */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(503, 'AI_PROVIDER_NOT_CONFIGURED', 'AI generation is not configured for this environment.');
    }
    client = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  }
  return client;
}
