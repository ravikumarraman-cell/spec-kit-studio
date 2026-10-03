import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { directoryPickerInvocation } from '../connector/directoryPicker.mjs';

test('native picker uses fixed, shell-free platform invocations', () => {
  const mac = directoryPickerInvocation('darwin');
  const windows = directoryPickerInvocation('win32');
  const linux = directoryPickerInvocation('linux');
  assert.equal(mac?.command, 'osascript');
  assert.equal(windows?.command, 'powershell.exe');
  assert.equal(linux?.command, 'zenity');
  assert.equal(directoryPickerInvocation('freebsd'), null);
  for (const invocation of [mac, windows, linux]) {
    assert.ok(invocation);
    assert.ok(invocation.args.every((argument) => typeof argument === 'string'));
  }
});

test('folder selection requires explicit confirmation and remains inside allowed roots', () => {
  const connector = readFileSync(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  const workspace = readFileSync(new URL('../src/components/workspace/WorkspaceControlCenter.tsx', import.meta.url), 'utf8');
  const picker = readFileSync(new URL('../src/components/workspace/RepositoryDirectoryPicker.tsx', import.meta.url), 'utf8');
  assert.match(connector, /OPEN_DIRECTORY_PICKER/);
  assert.match(connector, /repositoryPath: await safeRoot\(selected\)/);
  assert.match(connector, /repositoryDirectoryListing/);
  assert.match(connector, /entry\.isSymbolicLink\(\)/);
  assert.match(connector, /\/v1\/repository\/directories/);
  assert.match(workspace, /selectRepositoryDirectory\(\)/);
  assert.match(workspace, /RepositoryDirectoryPicker/);
  assert.match(workspace, /Choose folder opens Studio’s themed folder browser/);
  assert.match(picker, /Modal/);
  assert.match(picker, /Use system folder dialog/);
  assert.match(picker, /connectorCapabilityError/);
  assert.match(connector, /repository-directory-browser/);
  assert.match(workspace, /waits for you to start the read-only scan/);
});
