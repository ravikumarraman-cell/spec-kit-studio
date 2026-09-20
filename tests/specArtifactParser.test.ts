import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpecKitArtifact } from '../src/lib/specArtifactParser';

test('imports official Spec-Kit stories and functional requirements for Studio review', () => {
  const parsed = parseSpecKitArtifact(`# Feature Specification: Funding visibility

## Problem Statement

Show funding status during onboarding.

## User Scenarios & Testing

### User Story 1 - Verify funding (Priority: P1)

As an onboarding user, I want to see funding status, so that I can make a decision.

**Acceptance Scenarios**:

1. **Given** funding exists, **When** I view it, **Then** it is visible.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST display the funding status.
`);
  assert.equal(parsed.title, 'Funding visibility');
  assert.equal(parsed.userStories?.[0].asA, 'onboarding user');
  assert.equal(parsed.userStories?.[0].acceptanceCriteria.length, 1);
  assert.equal(parsed.functionalRequirements?.[0].id, 'FR-001');
});
