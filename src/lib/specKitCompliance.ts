import { FeatureInboxItem } from '../types/speckit';
import { slugify } from './projectIdentity';
import { compactDemoPlanIssue } from './featureDeliveryTasks';

/** Official GitHub Spec Kit release pinned for Studio's strict adapter. */
export const SPECKIT_VERSION = '1.0.6';
export const SPECKIT_RELEASE_TAG = `v${SPECKIT_VERSION}`;

export type SpecKitCoreArtifactKind = 'spec' | 'plan' | 'tasks';

export interface SpecKitConformanceIssue {
  code: string;
  message: string;
}

export interface SpecKitConformanceArtifact {
  path: string;
  kind: string;
  content: string;
}

const requiredHeadings: Record<SpecKitCoreArtifactKind, RegExp[]> = {
  spec: [
    /^# Feature Specification:/m,
    /^## User Scenarios & Testing/m,
    /^## Requirements/m,
    /^### Functional Requirements/m,
    /^## Success Criteria/m,
    /^### Measurable Outcomes/m,
  ],
  plan: [
    /^# Implementation Plan:/m,
    /^## Summary/m,
    /^## Technical Context/m,
    /^## Constitution Check/m,
    /^## Project Structure/m,
  ],
  tasks: [
    /^# Tasks:/m,
    /^## Phase 1:/m,
    // Official template revisions and supported agents use equivalent prose
    // here. Require the decision-bearing sections, not one punctuation or
    // capitalization variant, while retaining the strict task traceability
    // rules below.
    /^## Dependencies\s+(?:&|and)\s+Execution Order/im,
    /^## (?:Implementation|MVP) Strategy/im,
  ],
};

/** Compact delivery is a deliberate Studio mode, not an incomplete detailed
 * Spec-Kit task document. Keep its contract narrow so ordinary task files
 * cannot bypass the normal structure and traceability requirements. */
function isValidStudioCompactDeliveryPlan(content: string): boolean {
  return /^#\s+Tasks:/im.test(content)
    && /^##\s+Studio Compact Delivery Plan$/im.test(content)
    && compactDemoPlanIssue(content) === undefined
    && (content.match(/^\s*-\s+\[ \]\s+T00[1-3]\s+\[US1\]\s+/gim) || []).length === 3;
}

export function specKitFeatureSlug(title: string, ordinal: number): string {
  return `${String(Math.max(1, ordinal)).padStart(3, '0')}-${slugify(title)}`;
}

export function isCanonicalSpecKitFeatureSlug(value: string | undefined): boolean {
  return /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || '');
}

export function officialFeatureDirectoryFromSpecPath(artifactPath: string): string | undefined {
  return artifactPath.replace(/\\/g, '/').match(/(?:^|\/)specs\/(\d{3,}-[a-z0-9][a-z0-9-]*)\/spec\.md$/i)?.[1].toLowerCase();
}

export function validateSpecKitArtifacts(
  item: FeatureInboxItem,
  artifacts: SpecKitConformanceArtifact[],
  requiredKinds: SpecKitCoreArtifactKind[] = ['spec', 'plan', 'tasks'],
): SpecKitConformanceIssue[] {
  const issues: SpecKitConformanceIssue[] = [];
  if (!isCanonicalSpecKitFeatureSlug(item.slug)) {
    issues.push({ code: 'feature-directory', message: 'Use the official numbered feature identity format, for example 001-export-inventory.' });
    return issues;
  }

  const root = `specs/${item.slug}/`;
  for (const kind of requiredKinds) {
    const expectedPath = `${root}${kind}.md`;
    const artifact = artifacts.find((candidate) => candidate.path === expectedPath && candidate.kind === kind);
    if (!artifact) {
      issues.push({ code: `${kind}-missing`, message: `Missing official ${expectedPath}.` });
      continue;
    }
    const compactTasks = kind === 'tasks' && isValidStudioCompactDeliveryPlan(artifact.content);
    if (!compactTasks) {
      for (const heading of requiredHeadings[kind]) {
        if (!heading.test(artifact.content)) {
          issues.push({ code: `${kind}-structure`, message: `${expectedPath} is missing required Spec-Kit structure (${heading.source}).` });
          break;
        }
      }
    }
    if (/\[(?:FEATURE NAME|###-feature-name|Brief Title|ACTION REQUIRED)\]/i.test(artifact.content)) {
      issues.push({ code: `${kind}-placeholder`, message: `${expectedPath} still contains an official template placeholder.` });
    }
    if (/\[NEEDS CLARIFICATION(?::[^\]]*)?\]/i.test(artifact.content)) {
      issues.push({ code: `${kind}-clarification`, message: `${expectedPath} still contains an unresolved clarification.` });
    }
  }

  const spec = artifacts.find((artifact) => artifact.path === `${root}spec.md` && artifact.kind === 'spec');
  if (item.scope === 'user-story' && spec) {
    const storyHeadings = spec.content.match(/^### User Story \d+\b/gm) || [];
    if (storyHeadings.length !== 1) {
      issues.push({ code: 'story-count', message: `${root}spec.md must contain exactly one independently testable user story.` });
    }
  }

  const tasks = artifacts.find((artifact) => artifact.path === `${root}tasks.md` && artifact.kind === 'tasks');
  if (item.scope === 'user-story' && tasks && !isValidStudioCompactDeliveryPlan(tasks.content)) {
    const taskLines = tasks.content.split('\n').filter((line) => /^- \[[ xX]\] T\d{3,}\b/.test(line));
    if (!taskLines.length || taskLines.some((line) => !/ T\d{3,} (?:\[P\] )?\[US1\] /.test(line) || !/\b[\w.-]+\/[\w./-]+/.test(line))) {
      issues.push({ code: 'task-traceability', message: `${root}tasks.md must map every task to [US1] with an official T001-style ID and exact file path.` });
    }
  }
  return issues;
}
