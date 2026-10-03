/**
 * The active stage owns a workflow screen. Supporting evidence is shown only
 * when a person can use it to make the current decision. Keeping this policy
 * independent of individual persona components prevents historical cards from
 * accumulating every time another persona is added.
 */
export type StageContextKind = 'persona-inputs' | 'operational-telemetry';

const contextStages: Readonly<Record<StageContextKind, readonly number[]>> = {
  // Persona evidence informs planning and the final receiving decision. It is
  // deliberately absent from execution and audit screens, but must return at
  // final handoff so a receiver can see whose accepted context shaped delivery.
  'persona-inputs': [3, 4, 5, 8],
  // Timing and attempt counts are useful for diagnosis, not for every action.
  'operational-telemetry': [1, 2, 3, 4, 5, 6, 7],
};

export function isStageContextRelevant(kind: StageContextKind, stageId: number): boolean {
  return contextStages[kind].includes(stageId);
}
