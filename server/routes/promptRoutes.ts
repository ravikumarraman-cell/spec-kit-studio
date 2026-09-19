import { Router } from 'express';
import { getGeminiClient } from '../services/geminiClient';

export function createPromptRouter() {
  const router = Router();
  router.post('/api/prompt/generate', async (req, res) => {
    try {
      const { targetAgent, taskId, taskTitle, specSummary, constitution, techStack } = req.body;
      const prompt = `Generate an optimized, highly effective AI Coding Agent Prompt for:
Target Agent: "${targetAgent || 'Claude / Gemini / Copilot / Cursor'}"
Task ID & Title: "${taskId}: ${taskTitle}"
Spec Summary: "${specSummary}"
Tech Stack Rules: "${JSON.stringify(techStack || [])}"
Constitution Rules: "${constitution || 'Follow best practices'}"

Provide a structured, step-by-step master prompt formatted for copy-pasting directly into an AI coding agent session.
Include system role instructions, task context, strict constraints, acceptance criteria verification, and code structure rules.`;
      const response = await getGeminiClient().models.generateContent({ model: 'gemini-3.8-flash', contents: prompt });
      res.json({ success: true, promptText: response.text });
    } catch (error: any) { console.error('Error generating prompt:', error); res.status(500).json({ success: false, error: error.message || 'Failed to generate AI agent prompt.' }); }
  });
  return router;
}
