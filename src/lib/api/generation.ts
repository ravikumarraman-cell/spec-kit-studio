import { postApi } from './client';
import { asString, requireObjectField } from './guards';
import { FeatureSpec, ImplementationPlan, TaskBreakdown } from '../../types/speckit';

export interface PromptGenerationRequest { targetAgent: string; taskId?: string; taskTitle?: string; specSummary: string; constitution: string; techStack: string[]; }
export interface PromptGenerationResponse { success: true; promptText?: string; }
export interface AuditGenerationRequest { specContent: string; planContent: string; tasksContent: string; constitutionContent: string; }
export interface AuditGenerationResponse { success: true; data: { overallScore?: number; completenessScore?: number; clarityScore?: number; testabilityScore?: number; traceabilityScore?: number; summary?: string; gaps?: string[]; ambiguities?: string[]; recommendations?: { category: string; suggestion: string; impact: 'High' | 'Medium' | 'Low' }[]; }; }

const parseData = <T>(envelope: Record<string, unknown>) => ({ success: true as const, data: requireObjectField(envelope, 'data') as T });

export const generationApi = {
  generatePrompt: (request: PromptGenerationRequest) => postApi<PromptGenerationResponse, PromptGenerationRequest>('/api/prompt/generate', request, (envelope) => ({ success: true, promptText: asString(envelope.promptText) })),
  runAudit: (request: AuditGenerationRequest) => postApi<AuditGenerationResponse, AuditGenerationRequest>('/api/audit/analyze', request, parseData<AuditGenerationResponse['data']>),
  generateSpec: (request: { topic: string; existingSpec: string; focusAreas: string[] }) => postApi<{ success: true; data: Partial<FeatureSpec> }, typeof request>('/api/spec/generate', request, parseData<Partial<FeatureSpec>>),
  generatePlan: (request: { specTitle: string; specSummary?: string; requirements: unknown[] }) => postApi<{ success: true; data: ImplementationPlan }, typeof request>('/api/plan/generate', request, parseData<ImplementationPlan>),
  generateTasks: (request: { specTitle: string; functionalRequirements: unknown[]; techStack: unknown[] }) => postApi<{ success: true; data: TaskBreakdown }, typeof request>('/api/tasks/generate', request, parseData<TaskBreakdown>),
};
