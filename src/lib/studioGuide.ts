import type { SpecKitProject, ViewTab } from '../types/speckit';
import { activeFeatureForProject, getJourneyStage } from './featureJourney';
import { featureDeliveryCompletionSource, parseFeatureDeliveryTasks } from './featureDeliveryTasks';

/** Default chat budget: a single focused question and a compact answer. */
export const STUDIO_GUIDE_QUESTION_LIMIT = 1_200;
export const STUDIO_GUIDE_RESPONSE_LIMIT = 1_800;
export const STUDIO_GUIDE_REQUEST_EVENT = 'spec-kit-studio:guide-request';
export const OUTCOME_REFINERY_REQUEST_EVENT = 'spec-kit-studio:outcome-refinery-request';
export const STUDIO_GUIDE_IMAGE_BYTES = 375_000;

export interface StudioGuidePreparedImage { role: 'reference' | 'output'; name: string; dataUrl: string; data: string; width: number; height: number; }

export interface StudioGuideContext {
  screen: ViewTab;
  projectName: string;
  featureTitle?: string;
  stage?: { id: number; title: string; ready: boolean; readyHint: string };
  tasks?: Array<{ id: string; state: 'reviewed' | 'checked' | 'planned'; title: string }>;
}

export interface StudioGuideMessage {
  id: string;
  role: 'guide' | 'user';
  content: string;
  source: 'deterministic' | 'copilot';
  provider?: 'copilot' | 'codex';
}

/**
 * Lets any screen offer contextual help without coupling workflow components
 * to the Guide drawer. The request only pre-fills a question; it never sends
 * text to a provider or changes workflow state on the user’s behalf.
 */
export function requestStudioGuide(question: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string>(STUDIO_GUIDE_REQUEST_EVENT, {
    detail: sanitizeStudioGuideText(question),
  }));
}

/** Opens the feature-scoped Refinery without coupling a screen to App routing.
 * It carries no prompts, source, screenshots, or credentials. */
export function requestOutcomeRefinery(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OUTCOME_REFINERY_REQUEST_EVENT));
}

/** Resize screenshots before they leave the browser. JPEG output keeps the
 * local-only visual-review request bounded and strips source metadata. */
export async function prepareStudioGuideImage(file: File, role: StudioGuidePreparedImage['role']): Promise<StudioGuidePreparedImage> {
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB. Studio will create a compact review copy locally.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Studio could not read this image. Use a PNG, JPEG, or WebP screenshot.'));
      element.src = objectUrl;
    });
    let longest = 1440;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, longest / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Studio could not prepare this image for visual review.');
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.5, 0.8 - attempt * 0.08));
      const data = dataUrl.split(',', 2)[1] || '';
      if (Math.floor(data.length * 0.75) <= STUDIO_GUIDE_IMAGE_BYTES) return { role, name: file.name || `${role}.jpg`, dataUrl, data, width, height };
      longest = Math.round(longest * 0.72);
    }
    throw new Error('This screenshot could not be compacted enough for private local review. Crop it to the relevant screen and try again.');
  } finally { URL.revokeObjectURL(objectUrl); }
}

/** Build deliberately small context. This is product state, not repository or
 * conversation history, so the local agent never receives secrets or source. */
export function studioGuideContext(project: SpecKitProject, screen: ViewTab): StudioGuideContext {
  const feature = activeFeatureForProject(project);
  const stageId = feature?.journey?.activeStage || project.journey?.activeStage;
  const stage = stageId ? getJourneyStage(stageId) : undefined;
  const reviewedTaskIds = new Set(feature?.implementationReceipts?.map((receipt) => receipt.taskId) || []);
  const tasks: NonNullable<StudioGuideContext['tasks']> = feature
    ? parseFeatureDeliveryTasks(feature.deliveryPlan?.content).slice(0, 40).map((task) => ({
      id: task.id,
      state: featureDeliveryCompletionSource(task, reviewedTaskIds) === 'reviewed-receipt'
        ? 'reviewed' as const
        : task.done ? 'checked' as const : 'planned' as const,
      title: task.title.slice(0, 180),
    }))
    : [];
  return {
    screen,
    projectName: project.name.slice(0, 80),
    featureTitle: feature?.title.slice(0, 120),
    stage: stage ? { id: stage.id, title: stage.title.slice(0, 80), ready: stage.ready(project), readyHint: stage.readyHint.slice(0, 240) } : undefined,
    tasks: tasks.length ? tasks : undefined,
  };
}

/** A no-token, no-network first response. It gives every user a useful answer
 * even when Copilot is unavailable or the connector is offline. */
export function studioGuideWelcome(context: StudioGuideContext): StudioGuideMessage {
  const stage = context.stage;
  const progress = stage
    ? `You are at Stage ${stage.id}: ${stage.title}. ${stage.ready ? 'The stage evidence is ready for your review.' : stage.readyHint}`
    : 'Connect a repository or select a feature to receive workflow-specific guidance.';
  return {
    id: 'welcome', role: 'guide', source: 'deterministic',
    content: `${progress}\n\nThis is token-light by default: Studio answers known workflow questions locally and sends neither chat history nor repository source. Ask me to explain an error, identify the safest next step, or improve a feature/story so its output is more precise. I will never run an agent, change a file, approve a stage, or expose credentials.`,
  };
}

export function sanitizeStudioGuideText(value: string, maxLength = STUDIO_GUIDE_QUESTION_LIMIT): string {
  return String(value || '')
    .replace(/(?:STUDIO_CONNECTOR_TOKEN|GITHUB_TOKEN|GH_TOKEN|OPENAI_API_KEY|GEMINI_API_KEY)\s*[=:]\s*[^\s"']+/gi, '[redacted credential]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Local recognition avoids an unnecessary LLM request for recurring setup
 * issues and gives wording that is consistent with Studio's enforcement. */
export function deterministicStudioGuideReply(question: string, context: StudioGuideContext): string | null {
  const value = sanitizeStudioGuideText(question).toLowerCase();
  if (/pairing token|connector token/.test(value)) return 'Open Connected Workspace, paste the matching pairing token, and scan again. Tokens are intentionally never shown, stored in chat history, or sent to Copilot.';
  if (/old connector|outdated connector|connector version/.test(value)) return 'The browser may have cached an earlier health check. Restart the connector from the updated Studio folder, return to this browser tab, then use “Check installed version now” in Connected Workspace. Studio refreshes health without HTTP caching.';
  if (/worktree|main checkout|source checkout/.test(value)) return 'Planning artifacts are isolated before promotion, and implementation must use the feature’s linked worktree. Do not point an implementation task at the main checkout; create or select the registered worktree in Connected Workspace first.';
  if (/tasks\.md|delivery plan|compact demo/.test(value)) return 'A delivery plan must pass the current Spec-Kit artifact checks before it can be approved. For a compact demo, use the configured task count and regenerate the plan; do not manually mark an invalid or legacy task file as approved.';
  if (/visual acceptance|reference image|no source|source.mapping|source mapping|raw list/.test(value)) return 'This feature has a binding visual contract. Keep the reference layout and information hierarchy, map every visible value to an authoritative Tenant Compass source, and render “No Source” whenever a source or value is absent. A generic card grid or ungrouped asset list must not be approved.';
  if (/template|missing required|artifact check|not ready for approval/.test(value)) return 'Studio found a file but could not verify it as a completed feature artifact. Open the retained diagnostic, correct the named structure or template issue, then regenerate or review the official file. Do not approve the stage while this warning is present.';
  if (/approve|approval|continue/.test(value) && context.stage && !context.stage.ready) return `Do not approve Stage ${context.stage.id} yet. ${context.stage.readyHint}`;
  return null;
}
