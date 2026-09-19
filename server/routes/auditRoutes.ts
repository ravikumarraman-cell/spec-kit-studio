import { Router } from 'express';
import { Type } from '@google/genai';
import { getGeminiClient } from '../services/geminiClient';

export function createAuditRouter() {
  const router = Router();
  router.post('/api/audit/analyze', async (req, res) => {
    try {
      const { specContent, planContent, tasksContent, constitutionContent } = req.body;
      const prompt = `Analyze this GitHub Spec-Kit specification package for quality, completeness, clarity, testability, and edge cases.\nSpec Content: ${specContent || '(empty)'}\nPlan Content: ${planContent || '(empty)'}\nTasks Content: ${tasksContent || '(empty)'}\nConstitution Content: ${constitutionContent || '(empty)'}\nPerform a rigorous Spec-Kit Health Check audit: calculate scores, identify gaps and ambiguities, and offer 3-5 actionable recommendations.`;
      const response = await getGeminiClient().models.generateContent({ model: 'gemini-3.8-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: { type: Type.OBJECT, properties: { overallScore: { type: Type.NUMBER }, completenessScore: { type: Type.NUMBER }, clarityScore: { type: Type.NUMBER }, testabilityScore: { type: Type.NUMBER }, traceabilityScore: { type: Type.NUMBER }, summary: { type: Type.STRING }, gaps: { type: Type.ARRAY, items: { type: Type.STRING } }, ambiguities: { type: Type.ARRAY, items: { type: Type.STRING } }, recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, suggestion: { type: Type.STRING }, impact: { type: Type.STRING } } } } }, required: ['overallScore', 'summary', 'gaps', 'recommendations'] } } });
      res.json({ success: true, data: JSON.parse(response.text || '{}') });
    } catch (error: any) { console.error('Error performing audit:', error); res.status(500).json({ success: false, error: error.message || 'Failed to perform spec audit.' }); }
  });
  return router;
}
