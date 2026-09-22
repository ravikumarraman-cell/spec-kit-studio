import { StudioProcessCase, StudioProcessKind } from '../types/speckit';

export interface ProcessStep { title: string; artifact: string; command: (item: StudioProcessCase) => string; writeScope: 'read-only' | 'source-change'; }

/**
 * Studio owns these focused workflows. They do not rely on non-standard
 * Spec-Kit extensions; the connected workspace handles official CLI setup.
 */
export const processDefinitions: Record<StudioProcessKind, { label: string; description: string; root: (slug: string) => string; steps: ProcessStep[] }> = {
  bug: {
    label: 'Fix a bug', description: 'Diagnose a broken behavior, apply a scoped repair, then prove the original problem is resolved.',
    root: (slug) => `.specify/bugs/${slug}/`,
    steps: [
      { title: 'Assess the problem', artifact: 'assessment.md', writeScope: 'read-only', command: (item) => `Assess the report and record the findings in .specify/bugs/${item.slug}/assessment.md.` },
      { title: 'Apply the scoped fix', artifact: 'fix.md', writeScope: 'source-change', command: (item) => `Apply the smallest safe repair and document it in .specify/bugs/${item.slug}/fix.md.` },
      { title: 'Verify the original report', artifact: 'test.md', writeScope: 'read-only', command: (item) => `Reproduce and verify the original report, then record the result in .specify/bugs/${item.slug}/test.md.` },
    ],
  },
  assessment: {
    label: 'Assess an idea', description: 'Decide whether an idea merits investment before creating a feature specification or changing code.',
    root: (slug) => `.specify/assessments/${slug}/`,
    steps: [
      { title: 'Capture the idea', artifact: 'intake.md', writeScope: 'read-only', command: (item) => `Capture the idea and context in .specify/assessments/${item.slug}/intake.md.` },
      { title: 'Research for and against it', artifact: 'research.md', writeScope: 'read-only', command: (item) => `Research the case for and against the idea in .specify/assessments/${item.slug}/research.md.` },
      { title: 'Define the problem', artifact: 'problem.md', writeScope: 'read-only', command: (item) => `Define the problem and affected users in .specify/assessments/${item.slug}/problem.md.` },
      { title: 'Compare concepts', artifact: 'concept.md', writeScope: 'read-only', command: (item) => `Compare viable concepts in .specify/assessments/${item.slug}/concept.md.` },
      { title: 'Record a decision', artifact: 'decision.md', writeScope: 'read-only', command: (item) => `Record the recommendation and rationale in .specify/assessments/${item.slug}/decision.md.` },
    ],
  },
};

export function processSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'untitled-work'; }

/** An agent may exit cleanly after reporting an intentional workflow block. */
export function isWorkflowBlockedOutput(output: string): boolean {
  // A completed agent report may legitimately include an “Unresolved
  // limitations” section. Only an explicit blocked status is terminal.
  return /##\s+status\s*\n+[\s\S]{0,180}\bblocked\b/i.test(output);
}

/** A connector result may be marked failed by an older Studio classifier even
 * though the agent created the requested artifact and recorded passing checks. */
export function isRecoverableWorkflowSuccess(output: string, artifact: string): boolean {
  const escapedArtifact = artifact.replace('.', '\\.');
  const created = new RegExp(`(?:created(?:/updated)?|updated)\\s+(?:only\\s+)?(?:\\[[^\\]]*${escapedArtifact}|[^\\n]*${escapedArtifact})`, 'i').test(output);
  if (!created || isWorkflowBlockedOutput(output)) return false;
  if (/^(intake|research|problem|concept|decision)\.md$/i.test(artifact)) return true;
  return /(?:tests? passed|tests? passed:\s*\d+\/\d+|focused .* passed|test suites?:\s*\d+\s+passed|\bpass\s+\S+\.test|verification passed|git diff --check passed)/i.test(output);
}

/** The artifact itself can recover an interrupted UI session after refresh. */
export function isRecoverableArtifactReceipt(content: string, artifact: string): boolean {
  if (/^(intake|research|problem|concept|decision)\.md$/i.test(artifact)) return !isWorkflowBlockedOutput(content) && /^#\s+\S/m.test(content) && content.trim().length > 80;
  return /(?:tests?:\s*\d+\s+passed|tests? passed:\s*\d+\/\d+|focused .* passed|test suites?:\s*\d+\s+passed|\bpass\s+\S+\.test)/i.test(content);
}

export function isAssessmentVerdict(value: unknown): value is NonNullable<StudioProcessCase['verdict']> {
  return value === 'go' || value === 'needs-clarification' || value === 'kill';
}

/**
 * Extracts the source-file inventory from a Studio bug-fix artifact. Keeping
 * this parser here makes recovery after a refresh deterministic: Studio can
 * rebuild the read-only code review from the durable `fix.md`, rather than
 * relying on transient agent-job state.
 */
export function changedFilesFromWorkflowArtifact(content: string): string[] {
  const heading = content.search(/^##\s+changed files\s*$/im);
  const section = heading < 0 ? '' : content.slice(heading).replace(/^.*\r?\n/, '').split(/^##\s+/im)[0];
  const paths = [...section.matchAll(/`([^`\r\n]+)`/g)].map((match) => match[1].trim());
  return [...new Set(paths.filter((path) => !path.startsWith('.') && !path.includes('..') && path.length <= 500))].slice(0, 100);
}

/** A receipt is required before a human can approve a step. */
export function hasSuccessfulProcessReceipt(item: StudioProcessCase, step = item.currentStep): boolean {
  const receipt = item.stepReceipts?.find((candidate) => candidate.step === step);
  return Boolean(receipt && !isWorkflowBlockedOutput(receipt.summary || ''));
}

/** A workflow is complete only when every configured step has both evidence and review. */
export function isProcessCaseComplete(item: StudioProcessCase): boolean {
  const stepCount = processDefinitions[item.kind].steps.length;
  return item.completedSteps.length === stepCount
    && item.completedSteps.every((step, index) => step === index)
    && Array.from({ length: stepCount }, (_, step) => hasSuccessfulProcessReceipt(item, step)).every(Boolean)
    && (item.kind !== 'assessment' || isAssessmentVerdict(item.verdict));
}

/**
 * Repairs stale or malformed browser-persisted workflow state without deleting
 * artifacts in the connected repository. A blocked historical receipt is
 * intentionally reopened, so it can never masquerade as a completed fix.
 */
export function normalizeProcessCase(item: StudioProcessCase): StudioProcessCase {
  const flow = processDefinitions[item.kind];
  const maxStep = flow.steps.length - 1;
  const candidateReceipts = (item.stepReceipts || [])
    .filter((receipt) => Number.isInteger(receipt.step) && receipt.step >= 0 && receipt.step <= maxStep)
    .filter((receipt) => !isWorkflowBlockedOutput(receipt.summary || ''))
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .filter((receipt, index, all) => all.findIndex((candidate) => candidate.step === receipt.step) === index)
    .sort((left, right) => left.step - right.step);
  // A later result is not valid workflow evidence when an earlier required
  // step is absent (for example, a fix run before assessment was retained).
  const receipts = candidateReceipts.filter((receipt) => Array.from({ length: receipt.step }, (_, step) => step).every((step) => candidateReceipts.some((candidate) => candidate.step === step)));
  const receiptSteps = new Set(receipts.map((receipt) => receipt.step));
  const completedSteps = [...new Set(item.completedSteps || [])]
    .filter((step) => Number.isInteger(step) && step >= 0 && step <= maxStep && receiptSteps.has(step))
    .filter((step) => item.kind !== 'assessment' || step !== maxStep || isAssessmentVerdict(item.verdict))
    .sort((left, right) => left - right);
  const firstUnreviewed = Array.from({ length: flow.steps.length }, (_, step) => step).find((step) => !completedSteps.includes(step));
  const currentStep = firstUnreviewed ?? maxStep;
  return { ...item, currentStep, completedSteps, stepReceipts: receipts, verdict: item.kind === 'assessment' && completedSteps.length === flow.steps.length ? item.verdict : undefined };
}

export function normalizeProcessCases(items: StudioProcessCase[] | undefined): StudioProcessCase[] | undefined {
  if (!items) return undefined;
  return items
    .filter((item): item is StudioProcessCase => Boolean(item && (item.kind === 'bug' || item.kind === 'assessment') && item.id && item.slug))
    .map(normalizeProcessCase);
}
export function createProcessCase(kind: StudioProcessKind, title: string, input: string, now = new Date().toISOString()): StudioProcessCase {
  return { id: `${kind}-${now}-${Math.random().toString(36).slice(2, 8)}`, kind, slug: processSlug(title), title: title.trim(), input: input.trim(), currentStep: 0, completedSteps: [], createdAt: now, updatedAt: now };
}
export function approveProcessStep(item: StudioProcessCase, verdict?: StudioProcessCase['verdict']): StudioProcessCase {
  if (!hasSuccessfulProcessReceipt(item)) return item;
  const definition = processDefinitions[item.kind]; const completedSteps = [...new Set([...item.completedSteps, item.currentStep])];
  if (item.kind === 'assessment' && item.currentStep === definition.steps.length - 1 && !isAssessmentVerdict(verdict)) return item;
  return { ...item, completedSteps, currentStep: Math.min(item.currentStep + 1, definition.steps.length - 1), verdict: verdict || item.verdict, updatedAt: new Date().toISOString() };
}

/** Records an agent result without silently treating generated output as reviewed. */
export function retainProcessStepReceipt(item: StudioProcessCase, summary?: string, evidence?: { changedFiles?: string[]; diffStat?: string; repositoryStatus?: string }, command?: string): StudioProcessCase {
  if (isWorkflowBlockedOutput(summary || '')) return item;
  const receipt = { step: item.currentStep, completedAt: new Date().toISOString(), summary: summary?.slice(0, 2_000), changedFiles: evidence?.changedFiles, diffStat: evidence?.diffStat, repositoryStatus: evidence?.repositoryStatus, command };
  const stepReceipts = [...(item.stepReceipts || []).filter((existing) => existing.step !== item.currentStep), receipt];
  return { ...item, stepReceipts, updatedAt: receipt.completedAt };
}

/**
 * Reopens a completed step for revision. Evidence files remain in the repository,
 * but approvals and execution receipts from that step forward are invalidated so
 * the workflow cannot claim later conclusions still reflect the edited input.
 */
export function reopenProcessStep(item: StudioProcessCase, step: number): StudioProcessCase {
  const safeStep = Math.max(0, Math.min(step, processDefinitions[item.kind].steps.length - 1));
  return {
    ...item,
    currentStep: safeStep,
    completedSteps: item.completedSteps.filter((completed) => completed < safeStep),
    stepReceipts: item.stepReceipts?.filter((receipt) => receipt.step < safeStep),
    verdict: undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * A report remains editable throughout its life. Changing it does not rename
 * its durable artifact folder; when evidence has been reviewed, the affected
 * workflow is safely reopened from assessment instead of losing history.
 */
export function reviseProcessCase(item: StudioProcessCase, title: string, input: string): StudioProcessCase {
  const revised = { ...item, title: title.trim(), input: input.trim(), updatedAt: new Date().toISOString() };
  return item.completedSteps.length || item.stepReceipts?.length ? reopenProcessStep(revised, 0) : revised;
}
