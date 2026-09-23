import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandling';
import { getGeminiClient } from '../services/geminiClient';

export function createPromptRouter() {
  const router = Router();
  router.post('/api/prompt/generate', asyncRoute(async (request, response) => {
    const { targetAgent, taskId, taskTitle, specSummary, constitution, techStack } = request.body;
    const prompt = `Generate an optimized, highly effective AI Coding Agent Prompt for:
Target Agent: "${targetAgent || 'Claude / Gemini / Copilot / Cursor'}"
Task ID & Title: "${taskId}: ${taskTitle}"
Spec Summary: "${specSummary}"
Tech Stack Rules: "${JSON.stringify(techStack || [])}"
Constitution Rules: "${constitution || 'Follow best practices'}"

Provide a structured, step-by-step master prompt formatted for copy-pasting directly into an AI coding agent session.
Include system role instructions, task context, strict constraints, acceptance criteria verification, and code structure rules.`;
    const result = await getGeminiClient().models.generateContent({ model: 'gemini-3.8-flash', contents: prompt });
    response.json({ success: true, promptText: result.text });
  }));
  return router;
}
