import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGitHubIssue, normalizeGitHubMilestone, parseGitHubIssueUrl, parseGitHubMilestoneUrl } from '../server/services/githubMilestone';

test('enterprise milestone normalizer accepts only canonical GitHub milestone URLs', () => {
  assert.deepEqual(parseGitHubMilestoneUrl('https://github.com/acme/private-repo/milestone/42'), { owner: 'acme', repository: 'private-repo', number: 42, sourceUrl: 'https://github.com/acme/private-repo/milestone/42' });
  assert.throws(() => parseGitHubMilestoneUrl('https://github.com/acme/private-repo/issues/42'), /canonical GitHub milestone URL/);
});

test('enterprise milestone result keeps image references but never image bytes or pull requests', () => {
  const source = parseGitHubMilestoneUrl('https://github.com/acme/private-repo/milestone/42');
  const result = normalizeGitHubMilestone(source, { title: 'Import SSO', description: '![Architecture](https://images.example.test/architecture.png)', state: 'open', open_issues: 1, closed_issues: 0 }, [{ number: 7, title: 'Add login', body: 'Secure callback', state: 'open', html_url: 'https://github.com/acme/private-repo/issues/7' }, { number: 8, title: 'Not an issue', pull_request: {}, state: 'open' }]);
  assert.deepEqual(result.images, [{ alt: 'Architecture', url: 'https://images.example.test/architecture.png' }]);
  assert.deepEqual(result.issues.map((issue) => issue.number), [7]);
});

test('enterprise source normalizes a canonical issue without accepting pull requests', () => {
  const source = parseGitHubIssueUrl('https://github.com/acme/private-repo/issues/42');
  const result = normalizeGitHubIssue(source, { number: 42, title: 'Import SSO', body: '![Architecture](https://images.example.test/architecture.png)', state: 'open', html_url: source.sourceUrl });
  assert.equal(result.title, 'Import SSO');
  assert.deepEqual(result.issues.map((issue) => issue.number), [42]);
  assert.throws(() => normalizeGitHubIssue(source, { number: 42, title: 'PR', pull_request: {} }), /not a pull request/);
  assert.throws(() => parseGitHubIssueUrl('https://github.com/acme/private-repo/pull/42'), /canonical GitHub issue URL/);
});
