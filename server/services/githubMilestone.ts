import { HttpError } from '../middleware/errorHandling';

const URL_PATTERN = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/milestone\/(\d+)\/?$/;
const MAX_DESCRIPTION_LENGTH = 80_000;

export interface GitHubMilestoneImport {
  sourceUrl: string; owner: string; repository: string; number: number; title: string; description: string;
  images: Array<{ alt: string; url: string }>; state: 'open' | 'closed'; dueOn: string | null; openIssues: number; closedIssues: number;
  issues: Array<{ number: number; title: string; body: string; state: 'open' | 'closed'; url?: string }>;
}

export function parseGitHubMilestoneUrl(value: unknown) {
  const url = typeof value === 'string' ? value.trim() : ''; const match = url.match(URL_PATTERN);
  if (!match || Number(match[3]) < 1) throw new HttpError(400, 'INVALID_GITHUB_MILESTONE_URL', 'Enter a canonical GitHub milestone URL, for example https://github.com/owner/repository/milestone/42.');
  return { owner: match[1], repository: match[2], number: Number(match[3]), sourceUrl: url };
}
function bounded(value: unknown, length = MAX_DESCRIPTION_LENGTH) { return typeof value === 'string' ? value.slice(0, length) : ''; }
function images(markdown: string) {
  const results: GitHubMilestoneImport['images'] = []; const seen = new Set<string>(); const pattern = /!\[([^\]]*)\]\((https:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
  for (const match of markdown.matchAll(pattern)) { try { const url = new URL(match[2]); if (url.protocol === 'https:' && !seen.has(url.href)) { seen.add(url.href); results.push({ alt: bounded(match[1], 240) || 'Milestone reference image', url: url.href }); if (results.length === 12) break; } } catch { /* reject malformed sources */ } }
  return results;
}
export function normalizeGitHubMilestone(source: ReturnType<typeof parseGitHubMilestoneUrl>, milestone: Record<string, unknown>, issues: Array<Record<string, unknown>>): GitHubMilestoneImport {
  const title = bounded(milestone.title, 500).trim(); if (!title) throw new HttpError(502, 'GITHUB_MILESTONE_INVALID', 'GitHub did not return a usable milestone title.');
  const description = bounded(milestone.description);
  const entries = issues.filter((issue) => !issue.pull_request && typeof issue.number === 'number' && typeof issue.title === 'string').slice(0, 100).map((issue) => ({ number: issue.number as number, title: bounded(issue.title, 500), body: bounded(issue.body), state: issue.state === 'closed' ? 'closed' as const : 'open' as const, ...(typeof issue.html_url === 'string' ? { url: issue.html_url } : {}) }));
  return { sourceUrl: source.sourceUrl, owner: source.owner, repository: source.repository, number: source.number, title, description, images: images(description), state: milestone.state === 'closed' ? 'closed' : 'open', dueOn: typeof milestone.due_on === 'string' ? milestone.due_on : null, openIssues: Number.isInteger(milestone.open_issues) ? milestone.open_issues as number : entries.filter((item) => item.state === 'open').length, closedIssues: Number.isInteger(milestone.closed_issues) ? milestone.closed_issues as number : entries.filter((item) => item.state === 'closed').length, issues: entries };
}
