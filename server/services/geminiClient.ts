import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../middleware/errorHandling';
import { loadRegulatoryModeConfig } from '../regulatoryMode';

let client: GoogleGenAI | null = null;

/** Lazily creates the AI client so non-AI routes remain usable without an API key. */
export function getGeminiClient(): GoogleGenAI {
  if (!loadRegulatoryModeConfig().allowExternalAiEgress) {
    throw new HttpError(503, 'AI_EGRESS_NOT_AUTHORIZED', 'External AI egress is disabled by the regulated deployment mode. Configure an approved in-boundary model adapter instead.');
  }
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(503, 'AI_PROVIDER_NOT_CONFIGURED', 'AI generation is not configured for this environment.');
    }
    client = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  }
  return client;
}
