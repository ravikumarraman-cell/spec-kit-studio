/**
 * Transport-safe requirements for any official artifact written by a local
 * agent. Keep these rules independent of React, a connector, and a specific
 * Spec-Kit command so every generation entry point can share them.
 */
export type ArtifactGenerationKind = 'spec' | 'plan' | 'tasks';

export interface ArtifactGenerationContractOptions {
  kind: ArtifactGenerationKind;
  path: string;
  requiresVisualContract?: boolean;
}

/**
 * An agent response is not evidence that a file was written. This proof is
 * appended near the end of each bounded packet, where the common transport
 * compactor preserves it.
 */
export function artifactWriteProof(path: string): string {
  return `\n\n## Studio physical artifact proof — required\nThe only successful outcome is a non-empty file at \`${path}\` in the current workspace. If a Spec-Kit command reports missing prerequisites or cannot run, do not spend time repairing the toolchain and do not merely describe a proposed file: directly write the completed artifact at that exact path. Before your final response, run \`test -s '${path}'\` and read the file back. Do not claim that the artifact was created unless that command succeeds. Do not write application code.`;
}

/**
 * Repeats only the acceptance conditions Studio will enforce after an agent
 * run. Appending it after the write proof makes the contract survive a long
 * source brief being compacted before it reaches a local agent.
 */
export function artifactFinalValidationContract({ kind, path, requiresVisualContract = false }: ArtifactGenerationContractOptions): string {
  const visualValidation = requiresVisualContract && (kind === 'plan' || kind === 'tasks')
    ? `\n\nThis feature has an attached reference image. The completed \`${path}\` must contain the exact heading \`## Visual Acceptance Contract\`. Under that heading, explicitly cover source/data mapping for every visible field, exact \`No Source\` behavior, ordered visual hierarchy/components, existing design-system tokens and contrast/accessibility, desktop plus narrow/mobile behavior, and reference-image screenshot verification.${kind === 'tasks' ? ' Include at least one named T001-style visual-verification task with desktop and narrow viewport evidence; do not leave this only as prose.' : ''} Re-read the file after writing it. If any item is absent, repair that same file before returning.`
    : '';

  return `\n\n## Studio final artifact validation — required\nBefore returning, re-read \`${path}\` and confirm it is the single completed official ${kind} artifact for this feature, has no unresolved template markers, and satisfies every required heading and contract in this packet.${visualValidation}`;
}
