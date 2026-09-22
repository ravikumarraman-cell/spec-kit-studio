import { StudioProcessCase, StudioProcessKind } from '../types/speckit';

export interface ProcessStep { title: string; artifact: string; command: (item: StudioProcessCase) => string; writeScope: 'read-only' | 'source-change'; }

const quotedInput = (value: string) => JSON.stringify(value.trim());

export const processDefinitions: Record<StudioProcessKind, { label: string; description: string; root: (slug: string) => string; setup: string; steps: ProcessStep[] }> = {
  bug: {
    label: 'Fix a bug', description: 'Diagnose a broken behavior, apply a scoped repair, then prove the original problem is resolved.',
    root: (slug) => `.specify/bugs/${slug}/`, setup: 'specify extension add bug',
    steps: [
      { title: 'Assess the problem', artifact: 'assessment.md', writeScope: 'read-only', command: (item) => `/speckit-bug-assess ${quotedInput(item.input)} slug=${item.slug}` },
      { title: 'Apply the scoped fix', artifact: 'fix.md', writeScope: 'source-change', command: (item) => `/speckit-bug-fix slug=${item.slug}` },
      { title: 'Verify the original report', artifact: 'test.md', writeScope: 'read-only', command: (item) => `/speckit-bug-test slug=${item.slug}` },
    ],
  },
  assessment: {
    label: 'Assess an idea', description: 'Decide whether an idea merits investment before creating a feature specification or changing code.',
    root: (slug) => `.specify/assessments/${slug}/`, setup: 'specify extension add assess',
    steps: [
      { title: 'Capture the idea', artifact: 'intake.md', writeScope: 'read-only', command: (item) => `/speckit-assess-intake ${quotedInput(item.input)} slug=${item.slug}` },
      { title: 'Research for and against it', artifact: 'research.md', writeScope: 'read-only', command: (item) => `/speckit-assess-research slug=${item.slug}` },
      { title: 'Define the problem', artifact: 'problem.md', writeScope: 'read-only', command: (item) => `/speckit-assess-define slug=${item.slug}` },
      { title: 'Compare concepts', artifact: 'concept.md', writeScope: 'read-only', command: (item) => `/speckit-assess-shape slug=${item.slug}` },
      { title: 'Record a decision', artifact: 'decision.md', writeScope: 'read-only', command: (item) => `/speckit-assess-decide slug=${item.slug}` },
    ],
  },
};

export function processSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled-work'; }
export function createProcessCase(kind: StudioProcessKind, title: string, input: string, now = new Date().toISOString()): StudioProcessCase {
  return { id: `${kind}-${now}-${Math.random().toString(36).slice(2, 8)}`, kind, slug: processSlug(title), title: title.trim(), input: input.trim(), currentStep: 0, completedSteps: [], createdAt: now, updatedAt: now };
}
export function approveProcessStep(item: StudioProcessCase, verdict?: StudioProcessCase['verdict']): StudioProcessCase {
  const definition = processDefinitions[item.kind]; const completedSteps = [...new Set([...item.completedSteps, item.currentStep])];
  return { ...item, completedSteps, currentStep: Math.min(item.currentStep + 1, definition.steps.length - 1), verdict: verdict || item.verdict, updatedAt: new Date().toISOString() };
}
