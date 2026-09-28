import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { migrateFeatureIdentityDirectory } from '../connector/featureIdentityMigration.mjs';

test('moves one legacy Studio feature directory to its official numbered identity', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spec-kit-identity-'));
  try {
    const source = path.join(root, 'specs', 'feat-2026-1-export-inventory');
    await mkdir(source, { recursive: true });
    await writeFile(path.join(source, 'plan.md'), '# Implementation Plan: Export inventory');

    const result = await migrateFeatureIdentityDirectory(root, 'feat-2026-1-export-inventory', '001-export-inventory');

    assert.deepEqual(result, { moved: true, fromPath: 'specs/feat-2026-1-export-inventory', toPath: 'specs/001-export-inventory' });
    assert.equal(await readFile(path.join(root, 'specs', '001-export-inventory', 'plan.md'), 'utf8'), '# Implementation Plan: Export inventory');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('refuses to merge legacy artifacts into an existing official directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'spec-kit-identity-'));
  try {
    await mkdir(path.join(root, 'specs', 'feat-2026-1-export-inventory'), { recursive: true });
    await mkdir(path.join(root, 'specs', '001-export-inventory'), { recursive: true });
    await assert.rejects(() => migrateFeatureIdentityDirectory(root, 'feat-2026-1-export-inventory', '001-export-inventory'), /will not merge or overwrite/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
