import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('local Studio Guide is provider-bounded and read-only', async () => {
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  assert.match(source, /\/v1\/studio-guide\/chat/);
  assert.match(source, /\['copilot', 'codex'\]/);
  assert.match(source, /agentAdapter\(agent, 'planning'\)/);
  assert.match(source, /never run commands, edit files, approve stages, create worktrees/i);
  assert.match(source, /STUDIO_GUIDE_QUESTION_LIMIT = 1_200/);
  assert.match(source, /STUDIO_GUIDE_RESPONSE_LIMIT = 1_800/);
  assert.match(source, /STUDIO_GUIDE_IMAGE_LIMIT = 2/);
  assert.match(source, /STUDIO_GUIDE_IMAGE_BYTES = 375_000/);
  assert.match(source, /Visual review requires exactly one reference image and one current-output image/);
  assert.match(source, /reference\.jpg/);
  assert.match(source, /current-output\.jpg/);
  assert.match(source, /at most 220 tokens/);
  assert.match(source, /fs\.mkdtemp\(path\.join\(os\.tmpdir\(\), 'spec-kit-studio-guide-'/);
  assert.match(source, /function studioGuideAdapterArgs/);
  assert.match(source, /--skip-git-repo-check/);
  assert.match(source, /studioGuideAdapterArgs\(selected, guideChatPrompt/);
  assert.match(source, /stdout: redactSensitiveOutput\(stdout\.trim\(\)\)/);
  assert.match(source, /result\.stdout \|\| result\.output/);
  assert.match(source, /tasks: Array\.isArray\(context\?\.tasks\)/);
  assert.match(source, /fs\.rm\(guideRoot, \{ recursive: true, force: true \}/);
  assert.match(source, /studio-guide-chat/);
});
