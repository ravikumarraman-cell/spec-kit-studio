import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGitHubMilestone, parseGitHubMilestoneUrl } from '../connector/githubMilestone.mjs';

test('parses only canonical GitHub milestone URLs', () => {
  assert.deepEqual(parseGitHubMilestoneUrl('https://github.com/optum-eeps/hcc-backlog/milestone/2135'), { owner: 'optum-eeps', repository: 'hcc-backlog', number: 2135, url: 'https://github.com/optum-eeps/hcc-backlog/milestone/2135' });
  assert.throws(() => parseGitHubMilestoneUrl('https://github.com/optum-eeps/hcc-backlog/issues/2135'), /canonical GitHub milestone URL/);
});

test('normalizes milestone evidence, images, and excludes pull requests', () => {
  const result = normalizeGitHubMilestone(parseGitHubMilestoneUrl('https://github.com/a/repo/milestone/1'), { title: 'Tenant Compass', description: 'A concise tenant summary.\n\n![Reference dashboard](https://images.example.test/summary.png)', state: 'open', open_issues: 1, closed_issues: 0 }, [{ number: 7, title: 'Add summary', body: 'Details', state: 'open', html_url: 'https://github.com/a/repo/issues/7' }, { number: 8, title: 'PR', pull_request: {}, state: 'open' }]);
  assert.equal(result.title, 'Tenant Compass');
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].number, 7);
  assert.deepEqual(result.images, [{ alt: 'Reference dashboard', url: 'https://images.example.test/summary.png' }]);
});
