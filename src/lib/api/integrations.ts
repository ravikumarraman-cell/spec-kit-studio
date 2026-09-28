import { postApi } from './client';
import { requireArray, requireString } from './guards';

export interface GitHubRepository { id: number; name: string; fullName: string; private: boolean; description?: string; htmlUrl: string; defaultBranch?: string; language?: string; updatedAt?: string; }
export interface JiraProject { id: string; key: string; name: string; projectTypeKey?: string; avatarUrl?: string; }

interface GitHubRepositoriesResponse { success: true; repos: GitHubRepository[]; }
interface JiraProjectsResponse { success: true; projects: JiraProject[]; }
interface CommitSpecResponse { success: true; message: string; }
export interface GitHubMilestoneImport { sourceUrl: string; owner: string; repository: string; number: number; title: string; description: string; images: Array<{ alt: string; url: string }>; state: 'open' | 'closed'; dueOn: string | null; openIssues: number; closedIssues: number; issues: Array<{ number: number; title: string; body: string; state: 'open' | 'closed'; url?: string }>; }
interface GitHubMilestoneResponse { success: true; milestone: GitHubMilestoneImport; }
interface CreateJiraIssueResponse { success: true; key: string; id: string; htmlUrl: string; }

export const integrationsApi = {
  listGitHubRepositories: (token?: string) => postApi<GitHubRepositoriesResponse, { token?: string }>('/api/github/repos', token ? { token } : {}, (envelope) => ({ success: true, repos: requireArray(envelope.repos, 'repos') as GitHubRepository[] })),
  readEnterpriseGitHubMilestone: (url: string) => postApi<GitHubMilestoneResponse, { url: string }>('/api/github/milestone', { url }, (envelope) => ({ success: true, milestone: envelope.milestone as GitHubMilestoneImport })),
  listJiraProjects: (request: { domain: string; email: string; apiToken: string }) =>
    postApi<JiraProjectsResponse, typeof request>('/api/jira/projects', request, (envelope) => ({ success: true, projects: requireArray(envelope.projects, 'projects') as JiraProject[] })),
  commitSpec: (request: { token?: string; owner: string; repo: string; branch: string; files: Record<string, string>; commitMessage: string }) =>
    postApi<CommitSpecResponse, typeof request>('/api/github/commit-spec', request, (envelope) => ({ success: true, message: requireString(envelope.message, 'message') })),
  createJiraIssue: (request: { domain: string; email: string; apiToken: string; projectKey: string; issueType: string; summary: string; description: string }) =>
    postApi<CreateJiraIssueResponse, typeof request>('/api/jira/create-issue', request, (envelope) => ({ success: true, key: requireString(envelope.key, 'key'), id: requireString(envelope.id, 'id'), htmlUrl: requireString(envelope.htmlUrl, 'htmlUrl') })),
};
