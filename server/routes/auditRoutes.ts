import { Router } from 'express';
import { Type } from '@google/genai';
import { getGeminiClient } from '../services/geminiClient';
import { asyncRoute } from '../middleware/errorHandling';

export function createAuditRouter() {
  const router = Router();
  router.post('/api/audit/analyze', asyncRoute(async (request, response) => {
    const { specContent, planContent, tasksContent, constitutionContent } = request.body;
    const prompt = `Analyze this GitHub Spec-Kit specification package for quality, completeness, clarity, testability, and edge cases.\nSpec Content: ${specContent || '(empty)'}\nPlan Content: ${planContent || '(empty)'}\nTasks Content: ${tasksContent || '(empty)'}\nConstitution Content: ${constitutionContent || '(empty)'}\nPerform a rigorous Spec-Kit Health Check audit: calculate scores, identify gaps and ambiguities, and offer 3-5 actionable recommendations.`;
    const result = await getGeminiClient().models.generateContent({ model: 'gemini-3.8-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { overallScore: { type: Type.NUMBER }, completenessScore: { type: Type.NUMBER }, clarityScore: { type: Type.NUMBER }, testabilityScore: { type: Type.NUMBER }, traceabilityScore: { type: Type.NUMBER }, summary: { type: Type.STRING }, gaps: { type: Type.ARRAY, items: { type: Type.STRING } }, ambiguities: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, suggestion: { type: Type.STRING }, impact: { type: Type.STRING } } } } }, required: ['overallScore', 'summary', 'gaps', 'recommendations'] } } });
    response.json({ success: true, data: JSON.parse(result.text || '{}') });
  }));
  return router;
}
