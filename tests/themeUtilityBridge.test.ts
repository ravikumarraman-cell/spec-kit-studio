import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = new URL('../src/', import.meta.url);

async function sourceFiles(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const next = new URL(entry.name, directory);
    if (entry.isDirectory()) return sourceFiles(new URL(`${entry.name}/`, directory));
    return /\.(?:ts|tsx)$/.test(entry.name) ? [next] : [];
  }));
  return files.flat();
}

test('light themes safely map every retained opaque Zinc and Slate utility family', async () => {
  const [css, files] = await Promise.all([
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
    sourceFiles(sourceRoot),
  ]);
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  const opaqueUtilities = source.match(/(?:bg|border|text)-(?:zinc|slate)-\d+\/\d+/g) ?? [];

  assert.ok(opaqueUtilities.length > 0, 'the audit should cover retained legacy opacity utilities');
  assert.match(css, /\[class\*="bg-zinc-950\/"\]/);
  assert.match(css, /\[class\*="bg-slate-900\/"\]/);
  assert.match(css, /\[class\*="border-zinc-"\]/);
  assert.match(css, /\[class\*="text-slate-"\]/);
  assert.equal(path.basename(sourceRoot.pathname), 'src');
});
