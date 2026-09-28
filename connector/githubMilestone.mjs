const GITHUB_MILESTONE_URL = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/milestone\/(\d+)\/?$/;
const MAX_DESCRIPTION_LENGTH = 80_000;
const MAX_IMAGES = 12;

/** Parse only canonical GitHub milestone URLs; no browser-supplied CLI args. */
export function parseGitHubMilestoneUrl(value) {
  const match = typeof value === 'string' ? value.trim().match(GITHUB_MILESTONE_URL) : null;
  if (!match || Number(match[3]) < 1) throw new Error('Enter a canonical GitHub milestone URL, for example https://github.com/owner/repository/milestone/42.');
  return { owner: match[1], repository: match[2], number: Number(match[3]), url: value.trim() };
}

function boundedText(value, limit = MAX_DESCRIPTION_LENGTH) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

function imageReferences(markdown) {
  const values = [];
  const seen = new Set();
  const pattern = /!\[([^\]]*)\]\((https:\/\/[^\s)]+)(?:\s+[^)]*)?\)/g;
  for (const match of String(markdown || '').matchAll(pattern)) {
    try {
      const url = new URL(match[2]);
      if (url.protocol !== 'https:' || seen.has(url.href)) continue;
      seen.add(url.href);
      values.push({ alt: boundedText(match[1], 240) || 'Milestone reference image', url: url.href });
      if (values.length === MAX_IMAGES) break;
    } catch { /* Ignore malformed external media; it is never fetched here. */ }
  }
  return values;
}

/** Keep private GitHub data compact and reviewable before it enters Studio. */
export function normalizeGitHubMilestone(source, milestone, issues) {
  if (!milestone || typeof milestone.title !== 'string' || !milestone.title.trim()) throw new Error('GitHub did not return a usable milestone title.');
  const entries = Array.isArray(issues) ? issues
    .filter((issue) => issue && !issue.pull_request && typeof issue.number === 'number' && typeof issue.title === 'string')
    .slice(0, 100)
    .map((issue) => ({ number: issue.number, title: boundedText(issue.title, 500), body: boundedText(issue.body), state: issue.state === 'closed' ? 'closed' : 'open', url: typeof issue.html_url === 'string' ? issue.html_url : undefined })) : [];
  const description = boundedText(milestone.description);
  return {
    sourceUrl: source.url,
    owner: source.owner,
    repository: source.repository,
    number: source.number,
    title: milestone.title.trim().slice(0, 500),
    description,
    images: imageReferences(description),
    state: milestone.state === 'closed' ? 'closed' : 'open',
    dueOn: typeof milestone.due_on === 'string' ? milestone.due_on : null,
    openIssues: Number.isInteger(milestone.open_issues) ? milestone.open_issues : entries.filter((item) => item.state === 'open').length,
    closedIssues: Number.isInteger(milestone.closed_issues) ? milestone.closed_issues : entries.filter((item) => item.state === 'closed').length,
    issues: entries,
  };
}
