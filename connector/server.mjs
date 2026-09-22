#!/usr/bin/env node
/**
 * Spec-Kit Studio local connector.
 * Runs only on loopback and never writes a repository without an explicit apply request.
 * Start: STUDIO_ALLOWED_ROOTS=/absolute/parent npm run connector
 */
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

// The connector is a separate Node process, so load local connector settings itself.
// Existing shell environment variables take precedence over .env.local values.
dotenv.config({ path: '.env.local' });

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.STUDIO_CONNECTOR_PORT || 4318);
const TOKEN = process.env.STUDIO_CONNECTOR_TOKEN || '';
// ChatGPT-authenticated Codex no longer supports the retired gpt-5.4-mini
// default. Keep the connector self-contained while allowing a deliberate
// per-machine override for accounts with different model availability.
const CODEX_MODEL = process.env.STUDIO_CODEX_MODEL || 'gpt-5.6-luna';
const allowedRoots = (process.env.STUDIO_ALLOWED_ROOTS || process.cwd())
  .split(',').map((root) => path.resolve(root.trim())).filter(Boolean);
const allowedOrigins = (process.env.STUDIO_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '.venv', 'vendor']);
const managedToolsDir = path.join(process.cwd(), 'connector', '.tools');
const managedUv = path.join(managedToolsDir, 'bin', 'uv');
const managedPython = path.join(managedToolsDir, 'bin', 'python');
const jobs = new Map();
const runningProcesses = new Map();
const activeJobByRepository = new Map();
const MAX_JOB_OUTPUT = 1_000_000;
const MAX_REQUEST_BYTES = 1_000_000;

// Connector output is shown in the browser. Treat it as untrusted diagnostic
// material: common credential shapes must never be echoed back to Studio.
function redactSensitiveOutput(value) {
  return String(value || '')
    .replace(/\b(bearer)\s+[A-Za-z0-9._~+/-]+=*/gi, '$1 [REDACTED]')
    .replace(/\b((?:api[_-]?key|token|secret|password|authorization)\s*(?:=|:|is)\s*)([^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]');
}

function send(req, res, status, body) {
  const origin = req.headers.origin;
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, X-Studio-Token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Private-Network': 'true' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_REQUEST_BYTES) throw new Error('Request is too large. Reduce the pasted content and try again.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  } catch {
    throw new Error('Studio received malformed request data. Refresh the page and try again.');
  }
}
async function safeRoot(candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) throw new Error('Choose a repository folder before continuing.');
  const absolute = path.resolve(candidate);
  const real = await fs.realpath(absolute).catch(() => { throw new Error('Repository path does not exist.'); });
  if (!allowedRoots.some((root) => real === root || real.startsWith(`${root}${path.sep}`))) throw new Error('Repository path is outside STUDIO_ALLOWED_ROOTS.');
  return real;
}
async function command(command, args, cwd, timeout = 30_000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout, maxBuffer: 1_000_000 });
    return { ok: true, output: redactSensitiveOutput(`${stdout}${stderr}`.trim()) };
  } catch (error) {
    return { ok: false, output: redactSensitiveOutput(`${error.stdout || ''}${error.stderr || error.message || ''}`.trim()) };
  }
}
async function uvCommand(args, cwd, timeout = 30_000) {
  const systemUv = await command('uv', ['--version'], cwd);
  if (systemUv.ok) return command('uv', args, cwd, timeout);
  return command(managedUv, args, cwd, timeout);
}
async function specifyCommand(args, cwd, timeout = 30_000) {
  const direct = await command('specify', ['version'], cwd);
  if (direct.ok) return command('specify', args, cwd, timeout);
  const binDirectory = await uvCommand(['tool', 'dir', '--bin'], cwd);
  if (!binDirectory.ok) return direct;
  return command(path.join(binDirectory.output.trim(), 'specify'), args, cwd, timeout);
}
async function walk(root, relative = '', entries = [], limit = 1200) {
  if (entries.length >= limit) return entries;
  const directory = path.join(root, relative);
  const children = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  for (const child of children) {
    if (entries.length >= limit || ignored.has(child.name)) continue;
    const childRelative = path.join(relative, child.name);
    if (child.isDirectory()) await walk(root, childRelative, entries, limit);
    else if (child.isFile()) entries.push(childRelative);
  }
  return entries;
}
async function textIfPresent(root, file) {
  return fs.readFile(path.join(root, file), 'utf8').catch(() => null);
}
async function discoverBaselineCommands(root, files) {
  const commands = [];
  const add = (item) => {
    if (!commands.some((command) => command.id === item.id)) commands.push(item);
  };
  for (const manifest of files.filter((file) => file === 'package.json' || file.endsWith('/package.json'))) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(root, manifest), 'utf8'));
      const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
      for (const script of ['lint', 'test', 'build']) {
        if (parsed.scripts?.[script]) add({ id: `npm:${workingDirectory || 'root'}:${script}`, label: `${workingDirectory || 'Repository root'} — ${script}`, runner: 'npm', kind: script, commandName: 'npm', args: ['run', script], workingDirectory });
      }
    } catch { /* Invalid manifests are retained as scan evidence but never executable. */ }
  }
  for (const manifest of files.filter((file) => /(^|\/)(pyproject\.toml|pytest\.ini|tox\.ini|setup\.cfg)$/.test(file))) {
    const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
    add({ id: `python:${workingDirectory || 'root'}:test`, label: `${workingDirectory || 'Repository root'} — pytest`, runner: 'python', kind: 'test', commandName: 'python3', args: ['-m', 'pytest'], workingDirectory });
  }
  for (const manifest of files.filter((file) => file === 'go.mod' || file.endsWith('/go.mod'))) {
    const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
    add({ id: `go:${workingDirectory || 'root'}:test`, label: `${workingDirectory || 'Repository root'} — go test`, runner: 'go', kind: 'test', commandName: 'go', args: ['test', './...'], workingDirectory });
  }
  for (const manifest of files.filter((file) => file === 'Cargo.toml' || file.endsWith('/Cargo.toml'))) {
    const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
    add({ id: `cargo:${workingDirectory || 'root'}:test`, label: `${workingDirectory || 'Repository root'} — cargo test`, runner: 'cargo', kind: 'test', commandName: 'cargo', args: ['test'], workingDirectory });
  }
  for (const manifest of files.filter((file) => file === 'pom.xml' || file.endsWith('/pom.xml'))) {
    const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
    add({ id: `maven:${workingDirectory || 'root'}:test`, label: `${workingDirectory || 'Repository root'} — Maven test`, runner: 'maven', kind: 'test', commandName: 'mvn', args: ['test'], workingDirectory });
  }
  for (const manifest of files.filter((file) => file === 'build.gradle' || file === 'build.gradle.kts' || file.endsWith('/build.gradle') || file.endsWith('/build.gradle.kts'))) {
    const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
    const wrapper = path.join(root, workingDirectory, 'gradlew');
    const hasWrapper = await fs.stat(wrapper).then(() => true).catch(() => false);
    add({ id: `gradle:${workingDirectory || 'root'}:test`, label: `${workingDirectory || 'Repository root'} — Gradle test`, runner: 'gradle', kind: 'test', commandName: hasWrapper ? wrapper : 'gradle', args: ['test'], workingDirectory });
  }
  for (const manifest of files.filter((file) => file.endsWith('.sln') || file.endsWith('.csproj'))) {
    const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
    add({ id: `dotnet:${workingDirectory || 'root'}:test`, label: `${workingDirectory || 'Repository root'} — dotnet test`, runner: 'dotnet', kind: 'test', commandName: 'dotnet', args: ['test'], workingDirectory });
  }
  return commands;
}
async function discoverLocalAgents(root) {
  const candidates = [
    { id: 'claude', label: 'Claude Code', commandName: 'claude', args: ['--version'] },
    // `codex exec --help` verifies that the executable can launch without starting an agent session.
    { id: 'codex', label: 'Codex', commandName: 'codex', args: ['exec', '--help'] },
    { id: 'copilot', label: 'GitHub Copilot CLI', commandName: 'copilot', args: ['--version'] },
  ];
  return Promise.all(candidates.map(async (candidate) => {
    const result = await command(candidate.commandName, candidate.args, root, 5_000);
    return {
      id: candidate.id,
      label: candidate.label,
      installed: result.ok,
      // Version/help output is diagnostic only. Keep it short and never expose environment details.
      version: result.ok ? result.output.split('\n').find(Boolean)?.trim().slice(0, 160) || undefined : undefined,
    };
  }));
}
function techEvidence(files, packageJson) {
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const known = [
    ['Frontend', 'React', 'react'], ['Frontend', 'Next.js', 'next'], ['Backend', 'Express', 'express'],
    ['Backend', 'FastAPI', 'fastapi'], ['Database', 'Prisma', '@prisma/client'], ['Testing', 'Vitest', 'vitest'],
    ['Testing', 'Jest', 'jest'], ['Styling', 'Tailwind CSS', 'tailwindcss'], ['State', 'TanStack Query', '@tanstack/react-query'],
  ];
  const found = known.filter(([, , dep]) => deps[dep]).map(([category, name, dep]) => ({ category, name, version: deps[dep], evidence: 'package.json', confidence: 'high' }));
  if (files.includes('pyproject.toml') || files.includes('requirements.txt')) found.push({ category: 'Backend', name: 'Python', evidence: files.includes('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt', confidence: 'high' });
  if (files.includes('go.mod')) found.push({ category: 'Backend', name: 'Go', evidence: 'go.mod', confidence: 'high' });
  if (files.includes('Cargo.toml')) found.push({ category: 'Backend', name: 'Rust', evidence: 'Cargo.toml', confidence: 'high' });
  if (files.some((file) => /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/.test(file))) found.push({ category: 'Backend', name: 'Java', evidence: files.find((file) => /(^|\/)(pom\.xml|build\.gradle|build\.gradle\.kts)$/.test(file)), confidence: 'high' });
  if (files.some((file) => file.endsWith('.sln') || file.endsWith('.csproj'))) found.push({ category: 'Backend', name: '.NET', evidence: files.find((file) => file.endsWith('.sln') || file.endsWith('.csproj')), confidence: 'high' });
  if (files.some((file) => /(^|\/)(Gemfile|composer\.json)$/.test(file))) found.push({ category: 'Backend', name: files.some((file) => /(^|\/)Gemfile$/.test(file)) ? 'Ruby' : 'PHP', evidence: files.find((file) => /(^|\/)(Gemfile|composer\.json)$/.test(file)), confidence: 'high' });
  if (files.some((file) => /(^|\/)(Dockerfile|docker-compose\.ya?ml)$/.test(file))) found.push({ category: 'Infra/DevOps', name: 'Docker', evidence: files.find((file) => /(^|\/)(Dockerfile|docker-compose\.ya?ml)$/.test(file)), confidence: 'high' });
  return found;
}
async function scan(root) {
  const files = await walk(root);
  const packageRaw = await textIfPresent(root, 'package.json');
  let packageJson = null;
  try { packageJson = packageRaw ? JSON.parse(packageRaw) : null; } catch { /* listed as invalid evidence below */ }
  const git = await command('git', ['status', '--short', '--branch'], root);
  const branch = await command('git', ['branch', '--show-current'], root);
  const remotes = await command('git', ['remote', '-v'], root);
  const baselineCommands = await discoverBaselineCommands(root, files);
  const dependencyReadiness = await Promise.all([...new Set(baselineCommands
    .filter((item) => item.runner === 'npm')
    .map((item) => item.workingDirectory))].map(async (workingDirectory) => {
      const folder = path.join(root, workingDirectory);
      const [nodeModulesInstalled, hasPackageLock, hasShrinkwrap] = await Promise.all([
        fs.stat(path.join(folder, 'node_modules')).then((stat) => stat.isDirectory()).catch(() => false),
        fs.stat(path.join(folder, 'package-lock.json')).then((stat) => stat.isFile()).catch(() => false),
        fs.stat(path.join(folder, 'npm-shrinkwrap.json')).then((stat) => stat.isFile()).catch(() => false),
      ]);
      return { workingDirectory, manager: 'npm', nodeModulesInstalled, hasLockfile: hasPackageLock || hasShrinkwrap };
    }));
  const agents = await discoverLocalAgents(root);
  return {
    repositoryPath: root, repositoryName: path.basename(root), scannedAt: new Date().toISOString(), files,
    filesTruncated: files.length >= 1200, manifests: files.filter((file) => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|pom\.xml|build\.gradle|Dockerfile|schema\.prisma)$/.test(file)),
    technologies: techEvidence(files, packageJson), packageScripts: packageJson?.scripts || {}, baselineCommands, dependencyReadiness, agents,
    git: { available: git.ok, branch: branch.output || null, status: git.output || '', remotes: remotes.output || '' },
    specKit: {
      detected: files.some((file) => file.startsWith('.specify/')),
      featureFile: files.includes('.specify/feature.json'),
      artifactFiles: files.filter((file) => /^(?:specs\/[^/]+\/(?:spec|plan|tasks)\.md|\.specify\/(?:bugs|assessments)\/[^/]+\/[^/]+\.md)$/i.test(file)).slice(0, 200),
      hasWorkflowSetup: files.some((file) => file === '.specify/workflows/workflow-registry.json' || file === '.specify/integration.json'),
    },
  };
}
async function readSpecKitArtifacts(root) {
  const files = await walk(root, '', [], 5000);
  const candidates = files
    .filter((file) => (/^specs\/.+\/(spec|plan|tasks)\.md$/i.test(file) || /^\.specify\/bugs\/[^/]+\/(assessment|fix|test)\.md$/i.test(file) || /^\.specify\/assessments\/[^/]+\/(intake|research|problem|concept|decision)\.md$/i.test(file)))
    .map(async (file) => {
      const target = path.join(root, file);
      const [content, stat] = await Promise.all([fs.readFile(target, 'utf8'), fs.stat(target)]);
      const name = path.basename(file).toLowerCase();
      return { path: file, kind: name.replace('.md', ''), content: content.slice(0, 400_000), modifiedAt: stat.mtime.toISOString() };
    });
  const artifacts = await Promise.all(candidates);
  artifacts.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return { artifacts };
}
function normalizeRemote(value) {
  return String(value || '').trim().replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '').replace(/\/$/, '').toLowerCase();
}
async function featurePreflight(root, project, featureId) {
  const errors = [], warnings = [];
  const feature = featureId ? (project?.featureInbox || []).find((item) => item.id === featureId) : null;
  const [remote, branch, commit, gitDir] = await Promise.all([
    command('git', ['config', '--get', 'remote.origin.url'], root),
    command('git', ['branch', '--show-current'], root),
    command('git', ['rev-parse', 'HEAD'], root),
    command('git', ['rev-parse', '--git-dir'], root),
  ]);
  if (!project?.repositoryIdentity?.canonicalRemote) errors.push({ code: 'project-unbound', message: 'Studio project has no canonical repository identity. Scan Connected Workspace again before running an agent.' });
  if (!remote.ok || !remote.output.trim()) errors.push({ code: 'origin-missing', message: 'The selected folder has no readable origin remote.' });
  if (project?.repositoryIdentity?.canonicalRemote && normalizeRemote(remote.output) !== normalizeRemote(project.repositoryIdentity.canonicalRemote)) errors.push({ code: 'remote-mismatch', message: 'The selected folder does not match this Studio project’s canonical remote.' });
  if (!branch.output.trim()) errors.push({ code: 'detached-head', message: 'The selected folder is in detached HEAD state. Use a named feature branch.' });
  if (feature) {
    if (!feature.featureKey || !feature.slug) errors.push({ code: 'feature-identity-missing', message: 'The active feature needs a feature key and slug before it can run safely.' });
    if (feature.branch && feature.branch !== branch.output.trim()) errors.push({ code: 'branch-mismatch', message: `This feature expects ${feature.branch}, but the folder is on ${branch.output.trim()}.` });
    if (feature.worktreePath && path.resolve(feature.worktreePath) !== root) errors.push({ code: 'worktree-mismatch', message: 'The selected folder is not the worktree registered for this feature.' });
    if (!gitDir.output.includes('/worktrees/')) warnings.push({ code: 'main-checkout', message: 'This is the repository’s main checkout. Use a linked Git worktree before implementation work.' });
  }
  return { passed: errors.length === 0, errors, warnings, evidence: { remote: remote.output.trim(), branch: branch.output.trim(), commit: commit.output.trim(), isLinkedWorktree: gitDir.output.includes('/worktrees/') }, checkedAt: new Date().toISOString() };
}
async function createWorktree(root, targetPath, branch) {
  if (!/^feat\/[a-z0-9][a-z0-9/_-]{2,120}$/i.test(String(branch || ''))) throw new Error('Use a feature branch such as feat/cai-142-export-csv.');
  const target = path.resolve(String(targetPath || ''));
  if (!allowedRoots.some((allowed) => target.startsWith(`${allowed}${path.sep}`))) throw new Error('Worktree destination must be inside STUDIO_ALLOWED_ROOTS.');
  if (await fs.stat(target).then(() => true).catch(() => false)) throw new Error('Worktree destination already exists. Choose an empty, new folder.');
  const baseline = await command('git', ['rev-parse', 'HEAD'], root);
  if (!baseline.ok) throw new Error('Studio could not determine the current Git commit.');
  const result = await command('git', ['worktree', 'add', '-b', branch, target, 'HEAD'], root, 60_000);
  if (!result.ok) throw new Error(result.output || 'Git could not create the linked worktree.');
  return { repositoryPath: target, branch, baselineCommit: baseline.output.trim() };
}
async function runBaselineCommand(root, commandId) {
  const files = await walk(root);
  const selected = (await discoverBaselineCommands(root, files)).find((item) => item.id === commandId);
  if (!selected) throw new Error('Requested baseline command is no longer declared by this repository. Scan again and retry.');
  return { label: selected.label, ...await command(selected.commandName, selected.args, path.join(root, selected.workingDirectory), 180_000) };
}
function addJobOutput(job, chunk) {
  job.output = `${job.output}${redactSensitiveOutput(chunk)}`.slice(-MAX_JOB_OUTPUT);
}
function stopProcess(job, child, reason) {
  addJobOutput(job, `${reason}\n`);
  child.kill('SIGTERM');
  // A CLI that ignores SIGTERM must not leave the repository locked forever.
  setTimeout(() => {
    if (runningProcesses.get(job.id) === child) {
      addJobOutput(job, 'The process did not stop promptly; forcing it to exit.\n');
      child.kill('SIGKILL');
    }
  }, 10_000).unref();
}
function startCommandJob({ label, commandName, args, cwd, timeout, captureEvidence = false }) {
  const activeId = activeJobByRepository.get(cwd);
  if (activeId) {
    const active = jobs.get(activeId);
    const process = runningProcesses.get(activeId);
    // A connector crash, an interrupted child, or an older connector release
    // can leave an in-memory repository lock after the agent is gone. Never
    // make the user restart blindly: recover a lock only when there is no
    // live child process to protect.
    if (!active || active.status !== 'running' || !process) {
      activeJobByRepository.delete(cwd);
      runningProcesses.delete(activeId);
    } else {
      throw new Error('Another Studio job is already running for this repository. Review or cancel it before starting another.');
    }
  }
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const agentCommands = new Set(['codex', 'claude', 'copilot']);
  const commandPreview = agentCommands.has(commandName) ? `${commandName} <agent arguments redacted>` : `${commandName} ${args.join(' ')}`;
  const job = { id, label, command: commandPreview, status: 'running', output: '', startedAt: new Date().toISOString(), finishedAt: null, ok: null };
  jobs.set(id, job);
  // Agent work packets are passed as command arguments. Explicitly close stdin so
  // non-interactive CLIs such as `codex exec` do not wait indefinitely for more input.
  const child = spawn(commandName, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  runningProcesses.set(id, child);
  activeJobByRepository.set(cwd, id);
  const timeoutHandle = setTimeout(() => {
    if (job.status === 'running') stopProcess(job, child, `Stopped after ${Math.round(timeout / 1000)} seconds without completing.`);
  }, timeout);
  child.stdout.on('data', (chunk) => addJobOutput(job, chunk.toString()));
  child.stderr.on('data', (chunk) => addJobOutput(job, chunk.toString()));
  child.on('error', (error) => { clearTimeout(timeoutHandle); addJobOutput(job, `${error.message}\n`); job.status = 'failed'; job.ok = false; job.finishedAt = new Date().toISOString(); runningProcesses.delete(id); activeJobByRepository.delete(cwd); });
  child.on('close', async (code, signal) => {
    clearTimeout(timeoutHandle);
    if (signal) addJobOutput(job, `Process stopped by ${signal}.\n`);
    if (captureEvidence) {
      const [status, changedFiles, stagedFiles, diffStat] = await Promise.all([
        command('git', ['status', '--short', '--untracked-files=all'], cwd),
        command('git', ['diff', '--name-only'], cwd),
        command('git', ['diff', '--cached', '--name-only'], cwd),
        command('git', ['diff', '--stat'], cwd),
      ]);
      const filesFromStatus = status.output.split('\n').map((line) => line.slice(3).trim()).filter(Boolean).map((file) => file.includes(' -> ') ? file.split(' -> ').at(-1) : file);
      job.evidence = {
        repositoryStatus: status.output,
        changedFiles: [...new Set([...changedFiles.output.split('\n'), ...stagedFiles.output.split('\n'), ...filesFromStatus].map((file) => file.trim()).filter(Boolean))].slice(0, 200),
        diffStat: diffStat.output,
      };
    }
    if (job.status !== 'failed' && job.status !== 'cancelled') { job.ok = code === 0; job.status = code === 0 ? 'succeeded' : 'failed'; }
    job.finishedAt = new Date().toISOString();
    runningProcesses.delete(id);
    activeJobByRepository.delete(cwd);
  });
  return job;
}
async function startBaselineCommand(root, commandId) {
  const files = await walk(root);
  const selected = (await discoverBaselineCommands(root, files)).find((item) => item.id === commandId);
  if (!selected) throw new Error('Requested baseline command is no longer declared by this repository. Scan again and retry.');
  return startCommandJob({ label: selected.label, commandName: selected.commandName, args: selected.args, cwd: path.join(root, selected.workingDirectory), timeout: 180_000 });
}
async function startWorkspaceDependencyInstall(root, workingDirectory) {
  const files = await walk(root);
  const workspace = (await discoverBaselineCommands(root, files)).find((item) => item.workingDirectory === workingDirectory && item.runner === 'npm');
  if (!workspace) throw new Error('Studio can install dependencies automatically only for a declared npm workspace. Other project types remain importable and use their own package manager.');
  const workspaceRoot = path.join(root, workingDirectory);
  const hasLockfile = await fs.stat(path.join(workspaceRoot, 'package-lock.json')).then(() => true).catch(() => false);
  const args = [hasLockfile ? 'ci' : 'install'];
  return startCommandJob({ label: workspace.workingDirectory || 'Repository root', commandName: 'npm', args, cwd: workspaceRoot, timeout: 300_000 });
}
async function startFeatureVerification(root) {
  const files = await walk(root);
  const commands = await discoverBaselineCommands(root, files);
  const selected = commands.find((item) => item.kind === 'test' && item.workingDirectory === '') || commands.find((item) => item.kind === 'test');
  if (!selected) throw new Error('No declared automated test command was detected. Use the repository’s documented verification command, inspect the result, and record your review when ready.');
  return startCommandJob({ label: 'Feature verification · ' + selected.label, commandName: selected.commandName, args: selected.args, cwd: path.join(root, selected.workingDirectory), timeout: 300_000, captureEvidence: true });
}
function startSpecKitAgent(root, agent, prompt) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 50_000) throw new Error('A valid, reasonably sized Engine work packet is required.');
  const commands = {
    claude: { commandName: 'claude', args: ['-p', prompt], label: 'Claude Code · Spec-Kit planning' },
    codex: { commandName: 'codex', args: ['exec', '--model', CODEX_MODEL, prompt], label: `Codex (${CODEX_MODEL}) · Spec-Kit planning` },
    copilot: { commandName: 'copilot', args: ['-p', prompt], label: 'GitHub Copilot CLI · Spec-Kit planning' },
  };
  const selected = commands[agent];
  if (!selected) throw new Error('Unsupported local coding agent.');
  return startCommandJob({ ...selected, cwd: root, timeout: 600_000 });
}
function startLocalAgentImplementation(root, agent, prompt, taskId, featureTitle) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 80_000) throw new Error('A valid, reasonably sized feature task prompt is required.');
  if (!/^(T\d+|TASK-\d+)$/.test(String(taskId || '').trim())) throw new Error('Choose one approved feature task before running the selected agent. Select a task with an official ID such as T001 or TASK-101.');
  const guardrails = '\\n\\n## Studio execution boundary\\nYou are executing exactly ' + taskId + ' for feature "' + String(featureTitle || '').slice(0, 240) + '". Work only within this task’s approved scope. Do not commit, push, create branches, change unrelated tasks, or start a second agent. Before editing, inspect relevant files and state the file-level plan. Then implement, run focused verification, and finish with changed files, commands, results, and unresolved assumptions.';
  const commands = {
    codex: { commandName: 'codex', args: ['exec', '--json', '--sandbox', 'workspace-write', '--model', CODEX_MODEL, prompt + guardrails], label: 'Codex · ' + taskId + ' implementation' },
    claude: { commandName: 'claude', args: ['-p', prompt + guardrails], label: 'Claude Code · ' + taskId + ' implementation' },
    copilot: { commandName: 'copilot', args: ['-p', prompt + guardrails], label: 'GitHub Copilot CLI · ' + taskId + ' implementation' },
  };
  const selected = commands[agent];
  if (!selected) throw new Error('That agent cannot be run by the local connector. Copy the portable handoff instead.');
  return startCommandJob({
    ...selected,
    cwd: root,
    timeout: 900_000,
    captureEvidence: true,
  });
}
function cancelJob(id) {
  const job = jobs.get(id);
  const child = runningProcesses.get(id);
  if (!job || !child || job.status !== 'running') throw new Error('That local job is no longer running.');
  job.status = 'cancelled';
  job.ok = false;
  stopProcess(job, child, 'Cancelled by the Studio user.');
  return job;
}
function activeJob(root) {
  const id = activeJobByRepository.get(root);
  return id ? jobs.get(id) || null : null;
}
// This deliberately uses only Git read commands. It is the recovery path for
// a completed agent run whose browser job panel was lost (for example after a
// refresh or connector restart). It never starts an agent and never edits a
// repository; Studio still requires an explicit human review before recording
// a receipt because a working tree can contain changes from more than one task.
async function repositoryEvidence(root) {
  const [status, changedFiles, stagedFiles, diffStat] = await Promise.all([
    command('git', ['status', '--short', '--untracked-files=all'], root),
    command('git', ['diff', '--name-only'], root),
    command('git', ['diff', '--cached', '--name-only'], root),
    command('git', ['diff', '--stat'], root),
  ]);
  const filesFromStatus = status.output.split('\n').map((line) => line.slice(3).trim()).filter(Boolean).map((file) => file.includes(' -> ') ? file.split(' -> ').at(-1) : file);
  return {
    repositoryStatus: status.output,
    changedFiles: [...new Set([...changedFiles.output.split('\n'), ...stagedFiles.output.split('\n'), ...filesFromStatus].map((file) => file.trim()).filter(Boolean))].slice(0, 200),
    diffStat: diffStat.output,
  };
}

const codePreviewExtensions = new Set(['.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.go', '.java', '.cs', '.rb', '.php', '.rs', '.kt', '.kts', '.scala', '.sh', '.sql', '.html', '.css', '.scss', '.vue', '.svelte', '.tf', '.bicep']);
const previewArtifactPath = (file) => /(^|\/)(\.specify|specs?|docs?)(\/|$)|\.(md|mdx|ya?ml|json)$/i.test(file);
const previewCodePath = (file) => codePreviewExtensions.has(path.extname(file).toLowerCase()) && !previewArtifactPath(file);

function safeRelativePath(candidate) {
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const normalized = candidate.replace(/\\/g, '/').replace(/^\.\//, '');
  if (path.isAbsolute(normalized) || normalized.split('/').some((part) => part === '..' || !part)) return null;
  return normalized;
}

async function readFeatureCodeChanges(root, requestedPaths) {
  if (!Array.isArray(requestedPaths) || requestedPaths.length > 200) throw new Error('Choose up to 200 recorded files to preview.');
  const evidence = await repositoryEvidence(root);
  const changed = new Set(evidence.changedFiles.map((file) => file.replace(/\\/g, '/')));
  const selected = [...new Set(requestedPaths.map(safeRelativePath).filter((file) => file && changed.has(file) && previewCodePath(file)))].slice(0, 80);
  const files = await Promise.all(selected.map(async (file) => {
    const absolute = path.resolve(root, file);
    if (!absolute.startsWith(`${root}${path.sep}`)) return null;
    const stat = await fs.stat(absolute).catch(() => null);
    if (!stat?.isFile()) return { path: file, status: 'deleted', content: '', patch: '', truncated: false };
    const sizeLimit = 160_000;
    const raw = await fs.readFile(absolute).catch(() => null);
    if (!raw || raw.includes(0)) return { path: file, status: 'binary', content: '', patch: '', truncated: false };
    const truncated = raw.length > sizeLimit;
    const content = redactSensitiveOutput(raw.subarray(0, sizeLimit).toString('utf8'));
    const [workingPatch, stagedPatch] = await Promise.all([
      command('git', ['diff', '--no-ext-diff', '--unified=3', '--', file], root),
      command('git', ['diff', '--cached', '--no-ext-diff', '--unified=3', '--', file], root),
    ]);
    const patch = [workingPatch.output, stagedPatch.output].filter(Boolean).join('\n').slice(0, sizeLimit);
    const statusLine = evidence.repositoryStatus.split('\n').find((line) => line.slice(3).trim().replace(/\\/g, '/') === file) || '';
    return { path: file, status: statusLine.slice(0, 2).trim() || 'modified', content, patch, truncated };
  }));
  return { files: files.filter(Boolean), omitted: requestedPaths.length - selected.length };
}
function validate(project) {
  const errors = [], warnings = [];
  const requirements = new Set((project.spec?.functionalRequirements || []).map((item) => item.id));
  const tasks = project.tasks?.tasks || [];
  const duplicates = (items) => items.map((item) => item?.id).filter(Boolean).filter((id, index, ids) => ids.indexOf(id) !== index);
  for (const id of duplicates(project.spec?.functionalRequirements || [])) errors.push({ code: 'duplicate-requirement', message: `Requirement ID ${id} is duplicated; feature traceability would be ambiguous.` });
  for (const id of duplicates(project.spec?.userStories || [])) errors.push({ code: 'duplicate-story', message: `User story ID ${id} is duplicated; feature traceability would be ambiguous.` });
  for (const id of duplicates(tasks)) errors.push({ code: 'duplicate-task', message: `Task ID ${id} is duplicated; feature traceability would be ambiguous.` });
  const features = project.featureInbox || [];
  for (const key of features.map((feature) => feature.featureKey).filter(Boolean).filter((key, index, keys) => keys.indexOf(key) !== index)) errors.push({ code: 'duplicate-feature-key', message: `Feature key ${key} is duplicated.` });
  for (const slug of features.map((feature) => feature.slug).filter(Boolean).filter((slug, index, slugs) => slugs.indexOf(slug) !== index)) errors.push({ code: 'duplicate-feature-slug', message: `Feature slug ${slug} is duplicated.` });
  for (const requirement of project.spec?.functionalRequirements || []) if (!requirement.description?.trim()) errors.push({ code: 'requirement-description', message: `${requirement.id} has no description.` });
  for (const story of project.spec?.userStories || []) if (!story.acceptanceCriteria?.length) errors.push({ code: 'acceptance-criteria', message: `${story.id} has no acceptance criteria.` });
  for (const task of tasks) {
    if (!task.mappedRequirementId) errors.push({ code: 'unmapped-task', message: `${task.id} is not mapped to a requirement.` });
    else if (!requirements.has(task.mappedRequirementId)) errors.push({ code: 'broken-task-map', message: `${task.id} maps to missing ${task.mappedRequirementId}.` });
    for (const dependency of task.dependencies || []) if (!tasks.some((other) => other.id === dependency)) errors.push({ code: 'missing-dependency', message: `${task.id} depends on missing ${dependency}.` });
  }
  if (!project.constitution?.rules?.length) warnings.push({ code: 'no-constitution', message: 'No constitution rules are defined.' });
  if (!project.plan?.apiContracts?.length) warnings.push({ code: 'no-api-contracts', message: 'No API contracts are defined; confirm none are needed.' });
  return { passed: errors.length === 0, errors, warnings, checkedAt: new Date().toISOString() };
}
async function preview(root, files) {
  const changes = [];
  for (const file of files || []) {
    const target = path.resolve(root, file.path);
    if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Export path escapes the repository.');
    const current = await fs.readFile(target, 'utf8').catch(() => '');
    changes.push({ id: file.path, path: file.path, operation: current ? 'update' : 'create', current, proposed: String(file.content || '') });
  }
  return changes;
}
async function apply(root, files) {
  const changes = await preview(root, files);
  for (const change of changes) { await fs.mkdir(path.dirname(path.join(root, change.path)), { recursive: true }); await fs.writeFile(path.join(root, change.path), change.proposed, 'utf8'); }
  return changes.map(({ id, path, operation }) => ({ id, path, operation }));
}
async function initializeSpecKit(root, integration) {
  const allowedIntegrations = new Set(['copilot', 'claude', 'gemini', 'codebuddy', 'pi', 'omp']);
  if (!allowedIntegrations.has(integration)) throw new Error('Unsupported official Spec-Kit integration.');
  const existing = await fs.stat(path.join(root, '.specify')).then(() => true).catch(() => false);
  if (existing) throw new Error('This repository already contains .specify/. Review its existing setup instead of reinitializing it.');
  return specifyCommand(['init', '--here', '--force', '--non-interactive', '--integration', integration, '--ignore-agent-tools'], root, 180_000);
}
async function installSpecKit(root) {
  // This follows the official PyPI installation route. It is intentionally separate
  // from initialization: installation changes the developer toolchain; init changes a repo.
  return uvCommand(['tool', 'install', 'specify-cli'], root, 180_000);
}
async function installSpecKitExtension(root, extension) {
  if (!new Set(['bug', 'assess']).has(extension)) throw new Error('Unsupported Spec Kit extension.');
  return specifyCommand(['extension', 'add', extension], root, 180_000);
}
async function installUv(root) {
  // Keep Studio's prerequisite self-contained: system Python and Homebrew remain untouched.
  const createEnvironment = await command('python3', ['-m', 'venv', managedToolsDir], root, 120_000);
  if (!createEnvironment.ok) return createEnvironment;
  return command(managedPython, ['-m', 'pip', 'install', '--upgrade', 'uv'], root, 180_000);
}
const allowedExecutions = new Map([['typecheck', ['npm', ['run', 'lint']]], ['test', ['npm', ['test']]], ['build', ['npm', ['run', 'build']]], ['git-status', ['git', ['status', '--short', '--branch']]], ['specify-version', ['specify', ['version']]], ['specify-check', ['specify', ['self', 'check']]]]);

const server = http.createServer(async (req, res) => {
  if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
    return send(req, res, 403, { error: 'This Studio origin is not allowed by the local connector. Add it to STUDIO_ALLOWED_ORIGINS and restart the connector.' });
  }
  if (req.method === 'OPTIONS') return send(req, res, 204, {});
  // Health is intentionally unauthenticated: it reveals only whether pairing is needed,
  // enabling a friendly client-side setup flow without exposing repository access.
  if (req.method === 'GET' && req.url === '/health') return send(req, res, 200, { status: 'ok', version: '0.1.0', tokenRequired: Boolean(TOKEN) });
  if (TOKEN && req.headers['x-studio-token'] !== TOKEN) return send(req, res, 401, { error: 'Connector token is required.' });
  try {
    if (req.method === 'GET' && req.url?.startsWith('/v1/jobs/')) {
      const id = decodeURIComponent(req.url.slice('/v1/jobs/'.length));
      const job = jobs.get(id);
      return job ? send(req, res, 200, job) : send(req, res, 404, { error: 'Job not found. Start the installation again.' });
    }
    const payload = await body(req);
    if (req.method === 'POST' && req.url === '/v1/repository/scan') return send(req, res, 200, await scan(await safeRoot(payload.repositoryPath)));
    if (req.method === 'POST' && req.url === '/v1/feature/preflight') return send(req, res, 200, await featurePreflight(await safeRoot(payload.repositoryPath), payload.project, payload.featureId));
    if (req.method === 'POST' && req.url === '/v1/worktree/create') { if (payload.confirmation !== 'CREATE_WORKTREE') return send(req, res, 400, { error: 'Explicit confirmation is required.' }); return send(req, res, 200, await createWorktree(await safeRoot(payload.repositoryPath), payload.targetPath, payload.branch)); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/artifacts/read') return send(req, res, 200, await readSpecKitArtifacts(await safeRoot(payload.repositoryPath)));
    if (req.method === 'POST' && req.url === '/v1/spec-kit/status') { const root = await safeRoot(payload.repositoryPath); const uv = await uvCommand(['--version'], root); const version = uv.ok ? await specifyCommand(['version'], root) : { ok: false, output: 'uv is not available.' }; const check = version.ok ? await specifyCommand(['self', 'check'], root) : null; return send(req, res, 200, { installed: version.ok, version, check, prerequisites: { uvAvailable: uv.ok, uvOutput: uv.output } }); }
    if (req.method === 'POST' && req.url === '/v1/prerequisites/install-uv') { if (payload.confirmation !== 'INSTALL_UV') return send(req, res, 400, { error: 'Explicit uv installation confirmation is required.' }); return send(req, res, 200, await installUv(await safeRoot(payload.repositoryPath))); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/install') { if (payload.confirmation !== 'INSTALL_SPEC_KIT') return send(req, res, 400, { error: 'Explicit installation confirmation is required.' }); return send(req, res, 200, await installSpecKit(await safeRoot(payload.repositoryPath))); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/extension/install') { if (payload.confirmation !== 'INSTALL_SPEC_KIT_EXTENSION') return send(req, res, 400, { error: 'Explicit confirmation is required.' }); return send(req, res, 200, await installSpecKitExtension(await safeRoot(payload.repositoryPath), payload.extension)); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/initialize') { if (payload.confirmation !== 'INITIALIZE_SPEC_KIT') return send(req, res, 400, { error: 'Explicit initialization confirmation is required.' }); return send(req, res, 200, await initializeSpecKit(await safeRoot(payload.repositoryPath), payload.integration)); }
    if (req.method === 'POST' && req.url === '/v1/validate') return send(req, res, 200, validate(payload.project));
    if (req.method === 'POST' && req.url === '/v1/workspace/preview') return send(req, res, 200, { changes: await preview(await safeRoot(payload.repositoryPath), payload.files) });
    if (req.method === 'POST' && req.url === '/v1/workspace/apply') { if (payload.confirmation !== 'APPLY') return send(req, res, 400, { error: 'Explicit confirmation is required.' }); return send(req, res, 200, { applied: await apply(await safeRoot(payload.repositoryPath), payload.files) }); }
    if (req.method === 'POST' && req.url === '/v1/baseline/run') return send(req, res, 202, await startBaselineCommand(await safeRoot(payload.repositoryPath), payload.commandId));
    if (req.method === 'POST' && req.url === '/v1/dependencies/install') { if (payload.confirmation !== 'INSTALL_DEPENDENCIES') return send(req, res, 400, { error: 'Explicit dependency-install confirmation is required.' }); return send(req, res, 202, await startWorkspaceDependencyInstall(await safeRoot(payload.repositoryPath), payload.workingDirectory)); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/agent/run') { if (payload.confirmation !== 'RUN_SPEC_KIT_AGENT') return send(req, res, 400, { error: 'Explicit confirmation is required before Studio can run a local coding agent.' }); const root = await safeRoot(payload.repositoryPath); if (payload.project) { const preflight = await featurePreflight(root, payload.project, payload.featureId); if (!preflight.passed) throw new Error(preflight.errors.map((item) => item.message).join(' ')); } return send(req, res, 202, startSpecKitAgent(root, payload.agent, payload.prompt)); }
    if (req.method === 'POST' && req.url === '/v1/codex/task/run') { if (payload.confirmation !== 'RUN_CODEX_TASK') return send(req, res, 400, { error: 'Explicit confirmation is required before Studio can let Codex edit a local repository.' }); return send(req, res, 202, startLocalAgentImplementation(await safeRoot(payload.repositoryPath), 'codex', payload.prompt, payload.taskId, payload.featureTitle)); }
    if (req.method === 'POST' && req.url === '/v1/local-agent/task/run') { if (payload.confirmation !== 'RUN_LOCAL_AGENT_TASK') return send(req, res, 400, { error: 'Explicit confirmation is required before Studio can let a local coding agent edit a repository.' }); const root = await safeRoot(payload.repositoryPath); const preflight = await featurePreflight(root, payload.project, payload.featureId); if (!preflight.passed || !preflight.evidence.isLinkedWorktree) throw new Error([...preflight.errors.map((item) => item.message), ...(!preflight.evidence.isLinkedWorktree ? ['Implementation requires a linked Git worktree.'] : [])].join(' ')); return send(req, res, 202, startLocalAgentImplementation(root, payload.agent, payload.prompt, payload.taskId, payload.featureTitle)); }
    if (req.method === 'POST' && req.url === '/v1/feature/verify') { if (payload.confirmation !== 'VERIFY_FEATURE') return send(req, res, 400, { error: 'Explicit confirmation is required before Studio runs repository verification.' }); return send(req, res, 202, await startFeatureVerification(await safeRoot(payload.repositoryPath))); }
    if (req.method === 'POST' && req.url === '/v1/jobs/active') return send(req, res, 200, { job: activeJob(await safeRoot(payload.repositoryPath)) });
    if (req.method === 'POST' && req.url === '/v1/repository/evidence') return send(req, res, 200, { evidence: await repositoryEvidence(await safeRoot(payload.repositoryPath)) });
    if (req.method === 'POST' && req.url === '/v1/repository/feature-code') return send(req, res, 200, await readFeatureCodeChanges(await safeRoot(payload.repositoryPath), payload.paths));
    if (req.method === 'POST' && req.url === '/v1/jobs/cancel') return send(req, res, 200, cancelJob(String(payload.jobId || '')));
    if (req.method === 'POST' && req.url === '/v1/execute') { const root = await safeRoot(payload.repositoryPath); const entry = allowedExecutions.get(payload.action); if (!entry) return send(req, res, 400, { error: 'Action is not allowlisted.' }); const [bin, args] = entry; return send(req, res, 200, { action: payload.action, ...(await command(bin, args, root)) }); }
    return send(req, res, 404, { error: 'Not found.' });
  } catch (error) {
    const message = redactSensitiveOutput(error instanceof Error ? error.message : 'Connector request failed.');
    return send(req, res, 400, { error: message || 'Connector request failed.' });
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Spec-Kit Studio connector listening at http://127.0.0.1:${PORT}`));
