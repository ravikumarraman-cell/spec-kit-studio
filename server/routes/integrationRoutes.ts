import { Router } from 'express';
import { asyncRoute, HttpError } from '../middleware/errorHandling';
import {
  fetchIntegration,
  integrationResponseError,
  readIntegrationJson,
} from '../services/integrationClient';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  updated_at: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  labels: Array<{ name: string }>;
  user?: { login: string };
  created_at: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls?: Record<string, string>;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: { content?: Array<{ content?: Array<{ text?: string }> }> };
    status?: { name: string };
    issuetype?: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string };
  };
}

interface JiraCredentials {
  domain?: string;
  email?: string;
  apiToken?: string;
}

function githubHeaders(token?: string) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'spec-kit-studio',
  };
}

function jiraCredentials(body: Record<string, unknown>): JiraCredentials {
  return {
    domain: stringValue(body.domain) || process.env.JIRA_DOMAIN,
    email: stringValue(body.email) || process.env.JIRA_EMAIL,
    apiToken: stringValue(body.apiToken) || process.env.JIRA_API_TOKEN,
  };
}

function jiraHeaders(email: string, apiToken: string, includeContentType = false) {
  return {
    Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
    Accept: 'application/json',
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
  };
}

function normalizeJiraDomain(domain: string) {
  const candidate = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const parsed = new URL(`https://${candidate}`);
  if (parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new HttpError(400, 'INVALID_JIRA_DOMAIN', 'Jira Domain must be a hostname without a path or credentials.');
  }
  return parsed.hostname;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requireInput(condition: unknown, message: string): asserts condition {
  if (!condition) throw new HttpError(400, 'INVALID_INTEGRATION_REQUEST', message);
}

function githubPathSegment(value: string) {
  return encodeURIComponent(value);
}

export function createIntegrationRouter() {
  const router = Router();

  router.post('/api/github/repos', asyncRoute(async (request, response) => {
    const token = stringValue(request.body.token) || process.env.GITHUB_TOKEN;
    requireInput(token, 'GitHub Personal Access Token is required.');

    const upstream = await fetchIntegration('GitHub', 'https://api.github.com/user/repos?sort=updated&per_page=30', {
      headers: githubHeaders(token),
    });
    const repositories = await readIntegrationJson<GitHubRepository[]>('GitHub', upstream);

    response.json({
      success: true,
      repos: repositories.map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        private: repository.private,
        description: repository.description,
        htmlUrl: repository.html_url,
        defaultBranch: repository.default_branch,
        language: repository.language,
        updatedAt: repository.updated_at,
      })),
    });
  }));

  router.post('/api/github/issues', asyncRoute(async (request, response) => {
    const token = stringValue(request.body.token) || process.env.GITHUB_TOKEN;
    const owner = stringValue(request.body.owner);
    const repo = stringValue(request.body.repo);
    requireInput(owner && repo, 'Owner and Repo name are required.');

    const upstream = await fetchIntegration(
      'GitHub',
      `https://api.github.com/repos/${githubPathSegment(owner)}/${githubPathSegment(repo)}/issues?state=open&per_page=30`,
      { headers: githubHeaders(token) },
    );
    const issues = await readIntegrationJson<GitHubIssue[]>('GitHub', upstream);

    response.json({
      success: true,
      issues: issues.map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        htmlUrl: issue.html_url,
        labels: issue.labels.map((label) => label.name),
        user: issue.user?.login,
        createdAt: issue.created_at,
      })),
    });
  }));

  router.post('/api/github/commit-spec', asyncRoute(async (request, response) => {
    const token = stringValue(request.body.token) || process.env.GITHUB_TOKEN;
    const owner = stringValue(request.body.owner);
    const repo = stringValue(request.body.repo);
    const branch = stringValue(request.body.branch) || 'main';
    const commitMessage = stringValue(request.body.commitMessage);
    const files = request.body.files as Record<string, unknown> | undefined;
    requireInput(token, 'GitHub Personal Access Token is required to commit files.');
    requireInput(owner && repo && files && typeof files === 'object' && !Array.isArray(files), 'Owner, Repo, and files object are required.');

    const headers = githubHeaders(token);
    const results = [];
    for (const [requestedPath, content] of Object.entries(files)) {
      requireInput(typeof content === 'string', `File content for ${requestedPath} must be text.`);
      const pathInRepo = requestedPath.startsWith('.spec-kit/') ? requestedPath : `.spec-kit/${requestedPath}`;
      const encodedPath = pathInRepo.split('/').map(githubPathSegment).join('/');
      const contentsUrl = `https://api.github.com/repos/${githubPathSegment(owner)}/${githubPathSegment(repo)}/contents/${encodedPath}`;
      const current = await fetchIntegration('GitHub', `${contentsUrl}?ref=${encodeURIComponent(branch)}`, { headers });
      if (!current.ok && current.status !== 404) throw integrationResponseError('GitHub', current.status);
      const existing = current.ok
        ? await readIntegrationJson<{ sha?: string }>('GitHub', current)
        : undefined;
      const commit = await fetchIntegration('GitHub', contentsUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: commitMessage || `docs(spec-kit): update ${pathInRepo} via Spec-Kit Studio`,
          content: Buffer.from(content).toString('base64'),
          branch,
          ...(existing?.sha ? { sha: existing.sha } : {}),
        }),
      });
      const data = await readIntegrationJson<{ content?: { sha?: string; html_url?: string } }>('GitHub', commit);
      results.push({ path: pathInRepo, sha: data.content?.sha, htmlUrl: data.content?.html_url });
    }

    response.json({
      success: true,
      message: `Successfully committed ${results.length} files to ${owner}/${repo} (${branch}).`,
      results,
    });
  }));

  router.post('/api/jira/projects', asyncRoute(async (request, response) => {
    const { domain, email, apiToken } = jiraCredentials(request.body);
    requireInput(domain && email && apiToken, 'Jira Domain, Email, and API Token are required.');
    const normalizedDomain = normalizeJiraDomain(domain);
    const upstream = await fetchIntegration('Jira', `https://${normalizedDomain}/rest/api/3/project`, {
      headers: jiraHeaders(email, apiToken),
    });
    const projects = await readIntegrationJson<JiraProject[]>('Jira', upstream);

    response.json({
      success: true,
      projects: projects.map((project) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        projectTypeKey: project.projectTypeKey,
        avatarUrl: project.avatarUrls?.['48x48'],
      })),
    });
  }));

  router.post('/api/jira/issues', asyncRoute(async (request, response) => {
    const projectKey = stringValue(request.body.projectKey);
    const { domain, email, apiToken } = jiraCredentials(request.body);
    requireInput(domain && email && apiToken && projectKey, 'Jira Domain, Email, API Token, and Project Key are required.');
    const normalizedDomain = normalizeJiraDomain(domain);
    const jql = encodeURIComponent(`project = "${projectKey}" ORDER BY updated DESC`);
    const upstream = await fetchIntegration('Jira', `https://${normalizedDomain}/rest/api/3/search?jql=${jql}&maxResults=30`, {
      headers: jiraHeaders(email, apiToken),
    });
    const data = await readIntegrationJson<{ issues?: JiraIssue[] }>('Jira', upstream);

    response.json({
      success: true,
      issues: (data.issues || []).map((issue) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        descriptionText: issue.fields.description?.content?.[0]?.content?.[0]?.text || 'No description',
        status: issue.fields.status?.name,
        issueType: issue.fields.issuetype?.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
        htmlUrl: `https://${normalizedDomain}/browse/${issue.key}`,
      })),
    });
  }));

  router.post('/api/jira/create-issue', asyncRoute(async (request, response) => {
    const projectKey = stringValue(request.body.projectKey);
    const issueType = stringValue(request.body.issueType) || 'Story';
    const summary = stringValue(request.body.summary);
    const description = stringValue(request.body.description) || 'Created via Spec-Kit Studio';
    const { domain, email, apiToken } = jiraCredentials(request.body);
    requireInput(domain && email && apiToken && projectKey && summary, 'Jira Domain, Email, API Token, Project Key, and Summary are required.');
    const normalizedDomain = normalizeJiraDomain(domain);
    const upstream = await fetchIntegration('Jira', `https://${normalizedDomain}/rest/api/3/issue`, {
      method: 'POST',
      headers: jiraHeaders(email, apiToken, true),
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          description: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
          },
          issuetype: { name: issueType },
        },
      }),
    });
    const issue = await readIntegrationJson<{ key: string; id: string }>('Jira', upstream);

    response.json({
      success: true,
      key: issue.key,
      id: issue.id,
      htmlUrl: `https://${normalizedDomain}/browse/${issue.key}`,
    });
  }));

  return router;
}