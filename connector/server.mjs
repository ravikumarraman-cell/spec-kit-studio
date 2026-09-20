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
const allowedRoots = (process.env.STUDIO_ALLOWED_ROOTS || process.cwd())
  .split(',').map((root) => path.resolve(root.trim())).filter(Boolean);
const allowedOrigins = (process.env.STUDIO_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', '.venv', 'vendor']);
const managedToolsDir = path.join(process.cwd(), 'connector', '.tools');
const managedUv = path.join(managedToolsDir, 'bin', 'uv');
const managedPython = path.join(managedToolsDir, 'bin', 'python');
const jobs = new Map();
const MAX_JOB_OUTPUT = 1_000_000;

function send(req, res, status, body) {
  const origin = req.headers.origin;
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': corsOrigin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, X-Studio-Token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Private-Network': 'true' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
async function safeRoot(candidate) {
  const absolute = path.resolve(candidate);
  const real = await fs.realpath(absolute).catch(() => { throw new Error('Repository path does not exist.'); });
  if (!allowedRoots.some((root) => real === root || real.startsWith(`${root}${path.sep}`))) throw new Error('Repository path is outside STUDIO_ALLOWED_ROOTS.');
  return real;
}
async function command(command, args, cwd, timeout = 30_000) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout, maxBuffer: 1_000_000 });
    return { ok: true, output: `${stdout}${stderr}`.trim() };
  } catch (error) {
    return { ok: false, output: `${error.stdout || ''}${error.stderr || error.message || ''}`.trim() };
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
  for (const manifest of files.filter((file) => file === 'package.json' || file.endsWith('/package.json'))) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(root, manifest), 'utf8'));
      const workingDirectory = path.dirname(manifest) === '.' ? '' : path.dirname(manifest);
      for (const script of ['lint', 'test', 'build']) {
        if (parsed.scripts?.[script]) commands.push({ id: `npm:${workingDirectory || 'root'}:${script}`, label: `${workingDirectory || 'Repository root'} — ${script}`, runner: 'npm', script, workingDirectory });
      }
    } catch { /* Invalid manifests are retained as scan evidence but never executable. */ }
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
  const agents = await discoverLocalAgents(root);
  return {
    repositoryPath: root, repositoryName: path.basename(root), scannedAt: new Date().toISOString(), files,
    filesTruncated: files.length >= 1200, manifests: files.filter((file) => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|go\.mod|Cargo\.toml|pom\.xml|build\.gradle|Dockerfile|schema\.prisma)$/.test(file)),
    technologies: techEvidence(files, packageJson), packageScripts: packageJson?.scripts || {}, baselineCommands, agents,
    git: { available: git.ok, branch: branch.output || null, status: git.output || '', remotes: remotes.output || '' },
    specKit: { detected: files.some((file) => file.startsWith('.specify/')), featureFile: files.includes('.specify/feature.json') },
  };
}
async function runBaselineCommand(root, commandId) {
  const files = await walk(root);
  const selected = (await discoverBaselineCommands(root, files)).find((item) => item.id === commandId);
  if (!selected) throw new Error('Requested baseline command is no longer declared by this repository. Scan again and retry.');
  return { label: selected.label, ...await command('npm', ['run', selected.script], path.join(root, selected.workingDirectory), 180_000) };
}
function addJobOutput(job, chunk) {
  job.output = `${job.output}${chunk}`.slice(-MAX_JOB_OUTPUT);
}
function startCommandJob({ label, commandName, args, cwd, timeout }) {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job = { id, label, command: `${commandName} ${args.join(' ')}`, status: 'running', output: '', startedAt: new Date().toISOString(), finishedAt: null, ok: null };
  jobs.set(id, job);
  const child = spawn(commandName, args, { cwd, shell: false });
  const timeoutHandle = setTimeout(() => {
    if (job.status === 'running') { addJobOutput(job, `Stopped after ${Math.round(timeout / 1000)} seconds without completing.\n`); child.kill('SIGTERM'); }
  }, timeout);
  child.stdout.on('data', (chunk) => addJobOutput(job, chunk.toString()));
  child.stderr.on('data', (chunk) => addJobOutput(job, chunk.toString()));
  child.on('error', (error) => { clearTimeout(timeoutHandle); addJobOutput(job, `${error.message}\n`); job.status = 'failed'; job.ok = false; job.finishedAt = new Date().toISOString(); });
  child.on('close', (code, signal) => {
    clearTimeout(timeoutHandle);
    if (job.status !== 'failed') { job.ok = code === 0; job.status = code === 0 ? 'succeeded' : 'failed'; }
    if (signal) addJobOutput(job, `Process stopped by ${signal}.\n`);
    job.finishedAt = new Date().toISOString();
  });
  return job;
}
async function startBaselineCommand(root, commandId) {
  const files = await walk(root);
  const selected = (await discoverBaselineCommands(root, files)).find((item) => item.id === commandId);
  if (!selected) throw new Error('Requested baseline command is no longer declared by this repository. Scan again and retry.');
  return startCommandJob({ label: selected.label, commandName: 'npm', args: ['run', selected.script], cwd: path.join(root, selected.workingDirectory), timeout: 180_000 });
}
async function startWorkspaceDependencyInstall(root, workingDirectory) {
  const files = await walk(root);
  const workspace = (await discoverBaselineCommands(root, files)).find((item) => item.workingDirectory === workingDirectory);
  if (!workspace) throw new Error('This workspace does not declare a supported baseline command. Scan again and retry.');
  const workspaceRoot = path.join(root, workingDirectory);
  const hasLockfile = await fs.stat(path.join(workspaceRoot, 'package-lock.json')).then(() => true).catch(() => false);
  const args = [hasLockfile ? 'ci' : 'install'];
  return startCommandJob({ label: workspace.workingDirectory || 'Repository root', commandName: 'npm', args, cwd: workspaceRoot, timeout: 300_000 });
}
function startSpecKitAgent(root, agent, prompt) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 50_000) throw new Error('A valid, reasonably sized Engine work packet is required.');
  const commands = {
    claude: { commandName: 'claude', args: ['-p', prompt], label: 'Claude Code · Spec-Kit planning' },
    codex: { commandName: 'codex', args: ['exec', prompt], label: 'Codex · Spec-Kit planning' },
    copilot: { commandName: 'copilot', args: ['-p', prompt], label: 'GitHub Copilot CLI · Spec-Kit planning' },
  };
  const selected = commands[agent];
  if (!selected) throw new Error('Unsupported local coding agent.');
  return startCommandJob({ ...selected, cwd: root, timeout: 600_000 });
}
function validate(project) {
  const errors = [], warnings = [];
  const requirements = new Set((project.spec?.functionalRequirements || []).map((item) => item.id));
  const tasks = project.tasks?.tasks || [];
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
async function installUv(root) {
  // Keep Studio's prerequisite self-contained: system Python and Homebrew remain untouched.
  const createEnvironment = await command('python3', ['-m', 'venv', managedToolsDir], root, 120_000);
  if (!createEnvironment.ok) return createEnvironment;
  return command(managedPython, ['-m', 'pip', 'install', '--upgrade', 'uv'], root, 180_000);
}
const allowedExecutions = new Map([['typecheck', ['npm', ['run', 'lint']]], ['test', ['npm', ['test']]], ['build', ['npm', ['run', 'build']]], ['git-status', ['git', ['status', '--short', '--branch']]], ['specify-version', ['specify', ['version']]], ['specify-check', ['specify', ['self', 'check']]]]);

const server = http.createServer(async (req, res) => {
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
    if (req.method === 'POST' && req.url === '/v1/spec-kit/status') { const root = await safeRoot(payload.repositoryPath); const uv = await uvCommand(['--version'], root); const version = uv.ok ? await specifyCommand(['version'], root) : { ok: false, output: 'uv is not available.' }; const check = version.ok ? await specifyCommand(['self', 'check'], root) : null; return send(req, res, 200, { installed: version.ok, version, check, prerequisites: { uvAvailable: uv.ok, uvOutput: uv.output } }); }
    if (req.method === 'POST' && req.url === '/v1/prerequisites/install-uv') { if (payload.confirmation !== 'INSTALL_UV') return send(req, res, 400, { error: 'Explicit uv installation confirmation is required.' }); return send(req, res, 200, await installUv(await safeRoot(payload.repositoryPath))); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/install') { if (payload.confirmation !== 'INSTALL_SPEC_KIT') return send(req, res, 400, { error: 'Explicit installation confirmation is required.' }); return send(req, res, 200, await installSpecKit(await safeRoot(payload.repositoryPath))); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/initialize') { if (payload.confirmation !== 'INITIALIZE_SPEC_KIT') return send(req, res, 400, { error: 'Explicit initialization confirmation is required.' }); return send(req, res, 200, await initializeSpecKit(await safeRoot(payload.repositoryPath), payload.integration)); }
    if (req.method === 'POST' && req.url === '/v1/validate') return send(req, res, 200, validate(payload.project));
    if (req.method === 'POST' && req.url === '/v1/workspace/preview') return send(req, res, 200, { changes: await preview(await safeRoot(payload.repositoryPath), payload.files) });
    if (req.method === 'POST' && req.url === '/v1/workspace/apply') { if (payload.confirmation !== 'APPLY') return send(req, res, 400, { error: 'Explicit confirmation is required.' }); return send(req, res, 200, { applied: await apply(await safeRoot(payload.repositoryPath), payload.files) }); }
    if (req.method === 'POST' && req.url === '/v1/baseline/run') return send(req, res, 202, await startBaselineCommand(await safeRoot(payload.repositoryPath), payload.commandId));
    if (req.method === 'POST' && req.url === '/v1/dependencies/install') { if (payload.confirmation !== 'INSTALL_DEPENDENCIES') return send(req, res, 400, { error: 'Explicit dependency-install confirmation is required.' }); return send(req, res, 202, await startWorkspaceDependencyInstall(await safeRoot(payload.repositoryPath), payload.workingDirectory)); }
    if (req.method === 'POST' && req.url === '/v1/spec-kit/agent/run') { if (payload.confirmation !== 'RUN_SPEC_KIT_AGENT') return send(req, res, 400, { error: 'Explicit confirmation is required before Studio can run a local coding agent.' }); return send(req, res, 202, startSpecKitAgent(await safeRoot(payload.repositoryPath), payload.agent, payload.prompt)); }
    if (req.method === 'POST' && req.url === '/v1/execute') { const root = await safeRoot(payload.repositoryPath); const entry = allowedExecutions.get(payload.action); if (!entry) return send(req, res, 400, { error: 'Action is not allowlisted.' }); const [bin, args] = entry; return send(req, res, 200, { action: payload.action, ...(await command(bin, args, root)) }); }
    return send(req, res, 404, { error: 'Not found.' });
  } catch (error) { return send(req, res, 400, { error: error.message || 'Connector request failed.' }); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Spec-Kit Studio connector listening at http://127.0.0.1:${PORT}`));
