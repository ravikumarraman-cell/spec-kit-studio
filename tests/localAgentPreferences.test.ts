import assert from "node:assert/strict";
import test from "node:test";
import { describeLocalAgentScan } from "../src/components/settings/LocalAgentPreferences";

test("agent status distinguishes unchecked, checking, and failed live checks", () => {
  const unchecked = { scanned: false, agents: [], source: "none" as const };
  assert.match(describeLocalAgentScan(unchecked, false, null), /Not checked yet/);
  assert.match(describeLocalAgentScan(unchecked, true, null), /Checking the local connector now/);
  assert.match(describeLocalAgentScan(unchecked, false, "Connector offline"), /Live check failed: Connector offline/);
});

test("agent status names dynamic adapters and identifies the verification source", () => {
  const scan = {
    scanned: true,
    source: "connector" as const,
    checkedAt: "2026-10-02T12:00:00.000Z",
    agents: [{ id: "aider", label: "Aider", installed: true, capabilities: ["planning" as const] }],
  };
  const status = describeLocalAgentScan(scan, false, null);
  assert.match(status, /Aider reported ready by the local connector/);
  assert.doesNotMatch(status, /workspace/);
});

test("failed revalidation does not claim cached agents are currently ready", () => {
  const scan = {
    scanned: true,
    source: "workspace" as const,
    checkedAt: "2026-10-02T12:00:00.000Z",
    agents: [{ id: "codex", label: "Codex", installed: true }],
  };
  const status = describeLocalAgentScan(scan, false, "Timed out");
  assert.match(status, /Live check failed: Timed out/);
  assert.match(status, /Last successful check/);
  assert.doesNotMatch(status, /ready/);
});