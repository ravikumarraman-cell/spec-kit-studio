import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const connectorUrl = new URL('../connector/server.mjs', import.meta.url);

test('connector launches command shims without platform-specific shell interpolation', async () => {
  const source = await readFile(connectorUrl, 'utf8');

  assert.match(source, /import spawn from 'cross-spawn'/);
  assert.match(source, /spawn\(executable, args, \{ cwd, env: environment, shell: false/);
  assert.match(source, /process\.env\.PATHEXT/);
  assert.match(source, /process\.env\.APPDATA/);
});

test('connector uses Windows-specific managed tools and test wrappers', async () => {
  const source = await readFile(connectorUrl, 'utf8');

  assert.match(source, /isWindows \? 'Scripts' : 'bin'/);
  assert.match(source, /isWindows \? 'uv\.exe' : 'uv'/);
  assert.match(source, /isWindows \? 'python\.exe' : 'python'/);
  assert.match(source, /isWindows \? 'gradlew\.bat' : 'gradlew'/);
  assert.match(source, /commandName: isWindows \? 'python' : 'python3'/);
});

test('connector terminates full process trees on Windows', async () => {
  const source = await readFile(connectorUrl, 'utf8');

  assert.match(source, /spawn\.sync\('taskkill', \['\/pid', String\(child\.pid\), '\/t'/);
  assert.doesNotMatch(source, /host\.child\.kill\(/);
});

test('workspace exports and connector setup include native Windows entry points', async () => {
  const [exportSource, setupSource, guide, readme] = await Promise.all([
    readFile(new URL('../src/lib/export.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/workspace/LocalConnectorSetup.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../docs/local-connector.md', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8'),
  ]);

  assert.match(exportSource, /rootDir\.file\('specify\.cmd', specifyCmd\)/);
  assert.match(setupSource, /New-Item -ItemType Directory -Force/);
  assert.match(setupSource, /C:\/Users\/your-name\/studio-repositories/);
  assert.match(guide, /Windows PowerShell:/);
  assert.match(guide, /C:\/Users\/your-name\/studio-repositories/);
  assert.match(readme, /### Windows PowerShell/);
  assert.match(readme, /### macOS and Linux/);
});
