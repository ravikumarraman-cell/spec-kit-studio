import fs from 'node:fs/promises';
import path from 'node:path';

export const SPEC_KIT_CONFORMANCE_VERSION = '1.0.6';

const requiredArtifactHeadings = {
  spec: [/^# Feature Specification:/m, /^## User Scenarios & Testing/m, /^## Requirements/m, /^### Functional Requirements/m, /^## Success Criteria/m, /^### Measurable Outcomes/m],
  plan: [/^# Implementation Plan:/m, /^## Summary/m, /^## Technical Context/m, /^## Constitution Check/m, /^## Project Structure/m],
  tasks: [/^# Tasks:/m, /^## Phase 1:/m, /^## Dependencies\s+(?:&|and)\s+Execution Order/im, /^## (?:Implementation|MVP) Strategy/im],
};

/**
 * Repairs only pre-approved, semantics-preserving document omissions before
 * conformance validation. This is deliberately declarative and opt-in per
 * artifact kind: Studio must never invent requirements, tasks, source paths,
 * acceptance criteria, or implementation claims to make an agent result pass.
 */
const safeStructureNormalizers = {
  tasks: [{
    id: 'implementation-strategy-heading',
    present: /^##\s+(?:Implementation|MVP) Strategy\b/im,
    append: '## Implementation Strategy\n\nExecute the planned tasks in dependency order, keep changes within the approved feature scope, and verify each task before recording its receipt.',
  }],
};

export function normalizeRequiredArtifactStructure(kind, content) {
  let normalized = String(content || '').trim();
  const applied = [];
  for (const normalizer of safeStructureNormalizers[kind] || []) {
    if (normalizer.present.test(normalized)) continue;
    normalized = `${normalized}\n\n${normalizer.append}`;
    applied.push(normalizer.id);
  }
  return { content: normalized, applied };
}

/**
 * Validates one artifact before the connector promotes it from an isolated
 * worktree. Keeping this gate next to the story conformance rules prevents a
 * process exit from being mistaken for a reviewable Spec-Kit document.
 */
export function validateRequiredArtifactConformance(kind, content) {
  const headings = requiredArtifactHeadings[kind];
  if (!headings) return [`Studio does not recognize the requested ${kind} artifact.`];
  const missing = headings.filter((heading) => !heading.test(String(content || ''))).map((heading) => heading.source);
  return missing.length ? [`Missing required Spec-Kit structure: ${missing.join(', ')}.`] : [];
}

export function versionAtLeast(actual, required) {
  const actualParts = String(actual || '').match(/\d+\.\d+\.\d+/)?.[0].split('.').map(Number);
  const requiredParts = required.split('.').map(Number);
  if (!actualParts) return false;
  for (let index = 0; index < requiredParts.length; index += 1) {
    if (actualParts[index] > requiredParts[index]) return true;
    if (actualParts[index] < requiredParts[index]) return false;
  }
  return true;
}

export async function validateStorySpecKitConformance(root, feature, installedVersionOutput) {
  const errors = [];
  if (!/^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(feature.slug || ''))) {
    errors.push({ code: 'speckit-feature-identity', message: 'Story delivery requires an official numbered feature identity such as 001-export-inventory.' });
    return errors;
  }
  const setupExists = await fs.stat(path.join(root, '.specify')).then((stat) => stat.isDirectory()).catch(() => false);
  if (!setupExists) errors.push({ code: 'speckit-not-initialized', message: 'Run official `specify init` for this repository before implementing the story.' });
  if (!versionAtLeast(installedVersionOutput, SPEC_KIT_CONFORMANCE_VERSION)) errors.push({ code: 'speckit-version', message: `Spec-Kit ${SPEC_KIT_CONFORMANCE_VERSION} or newer is required for strict story conformance.` });
  const artifactRoot = path.join(root, 'specs', feature.slug);
  for (const kind of ['spec', 'plan', 'tasks']) {
    const relative = `specs/${feature.slug}/${kind}.md`;
    const content = await fs.readFile(path.join(artifactRoot, `${kind}.md`), 'utf8').catch(() => '');
    if (!content) { errors.push({ code: `${kind}-missing`, message: `Missing official ${relative}.` }); continue; }
    if (validateRequiredArtifactConformance(kind, content).length) errors.push({ code: `${kind}-structure`, message: `${relative} does not match the required Spec-Kit structure.` });
    if (/\[(?:FEATURE NAME|###-feature-name|Brief Title|ACTION REQUIRED)\]/i.test(content)) errors.push({ code: `${kind}-placeholder`, message: `${relative} still contains template placeholders.` });
    if (/\[NEEDS CLARIFICATION(?::[^\]]*)?\]/i.test(content)) errors.push({ code: `${kind}-clarification`, message: `${relative} still contains unresolved clarification markers.` });
    if (kind === 'spec' && (content.match(/^### User Story \d+\b/gm) || []).length !== 1) errors.push({ code: 'story-count', message: `${relative} must contain exactly one independently testable user story.` });
    if (kind === 'tasks' && !/^- \[[ xX]\] T\d{3,} (?:\[P\] )?\[US1\] /m.test(content)) errors.push({ code: 'task-traceability', message: `${relative} must map implementation tasks to [US1] with official T001-style IDs.` });
  }
  return errors;
}
