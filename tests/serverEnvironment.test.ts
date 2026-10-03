import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadRuntimeEnvironment } from '../server/environment';

test('runtime environment keeps shell values and gives .env.local precedence over .env', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'spec-kit-studio-env-'));
  const localPath = path.join(directory, '.env.local');
  const fallbackPath = path.join(directory, '.env');

  try {
    await writeFile(localPath, 'STUDIO_ENV_TEST_VALUE=local\n');
    await writeFile(fallbackPath, 'STUDIO_ENV_TEST_VALUE=fallback\nSTUDIO_ENV_FALLBACK_ONLY=available\n');

    const localEnvironment: NodeJS.ProcessEnv = {};
    loadRuntimeEnvironment(localEnvironment, [localPath, fallbackPath]);
    assert.equal(localEnvironment.STUDIO_ENV_TEST_VALUE, 'local');
    assert.equal(localEnvironment.STUDIO_ENV_FALLBACK_ONLY, 'available');

    const shellEnvironment: NodeJS.ProcessEnv = { STUDIO_ENV_TEST_VALUE: 'shell' };
    loadRuntimeEnvironment(shellEnvironment, [localPath, fallbackPath]);
    assert.equal(shellEnvironment.STUDIO_ENV_TEST_VALUE, 'shell');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
