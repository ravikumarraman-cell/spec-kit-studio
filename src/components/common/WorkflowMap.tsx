import { Check, Flag } from 'lucide-react';
import type { CSSProperties } from 'react';

export type WorkflowMapStepId = string | number;

export interface WorkflowMapStep {
  id: WorkflowMapStepId;
  label: string;
  detail?: string;
}

interface WorkflowMapProps {
  /** Ordered, finite steps in a delivery or review workflow. */
  steps: readonly WorkflowMapStep[];
  activeStepId: WorkflowMapStepId;
  completedStepIds?: readonly WorkflowMapStepId[];
  /** A completed workflow has no current task; callers supply its durable outcome. */
  isComplete?: boolean;
  completionTitle?: string;
  ariaLabel: string;
}

/**
 * A read-only, responsive map for any linear workflow. It deliberately owns
 * state presentation (complete / current / upcoming) while callers own their
 * workflow rules. That keeps delivery, review, and future approval maps
 * visually consistent without coupling them to a specific persona.
 */
export function WorkflowMap({ steps, activeStepId, completedStepIds = [], isComplete = false, completionTitle, ariaLabel }: WorkflowMapProps) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeStepId));
  const completeIds = new Set(completedStepIds);
  const currentStep = steps[activeIndex];
  const currentStepId = currentStep?.id;
  // The connector represents *approved* work, not merely the position of the
  // current cursor. This leaves the segment leading into the current stage
  // visibly pending, so users can distinguish completed delivery from work
  // they have arrived at but have not yet approved.
  const completedThroughIndex = isComplete
    ? steps.length - 1
    : steps.reduce((latest, step, index) => (completeIds.has(step.id) || index < activeIndex ? index : latest), -1);
  const progress = isComplete ? 100 : steps.length > 1 && completedThroughIndex >= 0
    ? (completedThroughIndex / (steps.length - 1)) * 100
    : 0;

  return (
    <div className="workflow-map" aria-label={ariaLabel}>
      <div className="workflow-map__summary" aria-live="polite">
        <span className="workflow-map__summary-kicker">{isComplete ? 'Complete' : 'Now'}</span>
        <span className="workflow-map__summary-title">{isComplete ? completionTitle || 'Workflow complete' : currentStep?.label ?? 'In progress'}</span>
        <span className="workflow-map__summary-count">{isComplete ? `All ${steps.length} steps complete` : `Step ${activeIndex + 1} of ${steps.length}`}</span>
      </div>

      <div className="workflow-map__viewport">
        <ol className="workflow-map__track" style={{ '--workflow-map-completion': `${progress / 100}` } as CSSProperties}>
          {steps.map((step, index) => {
            const complete = isComplete || completeIds.has(step.id) || index < activeIndex;
            const current = !isComplete && step.id === currentStepId;
            const state = complete ? 'complete' : current ? 'current' : 'upcoming';
            return (
              <li key={step.id} className={`workflow-map__step workflow-map__step--${state}`} aria-current={current ? 'step' : undefined}>
                <span className="workflow-map__node" aria-hidden="true">
                  {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>
                <span className="workflow-map__label">{step.label}</span>
                {current && <span className="workflow-map__state">Current</span>}
              </li>
            );
          })}
          <li className="workflow-map__finish" aria-hidden="true"><Flag className="h-3.5 w-3.5" /></li>
        </ol>
      </div>
    </div>
  );
}
