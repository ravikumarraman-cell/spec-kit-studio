import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGitHubMilestone, parseGitHubMilestoneUrl } from '../server/services/githubMilestone';

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
