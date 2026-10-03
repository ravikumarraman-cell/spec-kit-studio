import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageMetadata = JSON.parse(read('package.json'));
const canonicalSite = 'https://rraviku2-uhg.github.io/spec-kit-studio/';
const canonicalRepository = 'https://github.com/rraviku2_uhg/spec-kit-studio';
const linkedDocuments = [
  'README.md',
  'docs/README.md',
  'docs/index.html',
  'wiki/_Footer.md',
  'wiki/_Sidebar.md',
  'wiki/Architecture.md',
  'wiki/Delivery-Workflow.md',
  'wiki/FAQ.md',
  'wiki/Getting-Started.md',
  'wiki/Home.md',
  'wiki/Local-Connector.md',
  'wiki/Security-and-Trust.md',
];

test('public discovery assets expose one canonical project identity', () => {
  const page = read('docs/index.html');
  const robots = read('docs/robots.txt');
  const sitemap = read('docs/sitemap.xml');
  const llms = read('docs/llms.txt');

  assert.match(page, new RegExp(`<link rel="canonical" href="${canonicalSite}"`));
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.match(robots, new RegExp(`Sitemap: ${canonicalSite}sitemap\\.xml`));
  assert.match(sitemap, new RegExp(`<loc>${canonicalSite}</loc>`));
  assert.match(llms, /^# Spec-Kit Studio/m);
  assert.ok(llms.includes(canonicalRepository));
  for (const document of linkedDocuments) {
    assert.ok(!read(document).includes('github.com/rraviku2-uhg/'), `${document} contains a stale repository identity`);
  }
});

test('landing page structured data matches visible answer-first content', () => {
  const page = read('docs/index.html');
  const scripts = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const structuredData = JSON.parse(scripts[0][1]);
  const types = structuredData['@graph'].flatMap((entry: { '@type': string | string[] }) => entry['@type']);

  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('SoftwareApplication'));
  assert.ok(types.includes('SoftwareSourceCode'));
  assert.ok(types.includes('FAQPage'));
  assert.match(page, /<meta name="robots" content="index, follow/);
  for (const question of structuredData['@graph'].find((entry: { '@type': string }) => entry['@type'] === 'FAQPage').mainEntity) {
    assert.ok(page.includes(question.name), `FAQ answer is not visible: ${question.name}`);
  }
});

test('production app shell exposes canonical software discovery metadata', () => {
  const shell = read('index.html');
  const script = shell.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

  assert.ok(script);
  const structuredData = JSON.parse(script[1]);
  assert.deepEqual(structuredData['@type'], ['SoftwareApplication', 'SoftwareSourceCode']);
  assert.equal(structuredData.codeRepository, canonicalRepository);
  assert.match(shell, new RegExp(`<link rel="canonical" href="${canonicalSite}"`));
  assert.match(shell, /<link rel="alternate" type="text\/markdown" href="\/llms\.txt"/);
});

test('citation and CodeMeta versions match the package release', () => {
  const citation = read('CITATION.cff');
  const codemeta = JSON.parse(read('codemeta.json'));

  assert.match(citation, new RegExp(`version: ${packageMetadata.version}`));
  assert.match(citation, new RegExp(`repository-code: "${canonicalRepository}"`));
  assert.equal(codemeta.version, packageMetadata.version);
  assert.equal(codemeta.codeRepository, canonicalRepository);
  assert.equal(packageMetadata.repository.url, `${canonicalRepository}.git`);
  assert.equal(packageMetadata.homepage, canonicalSite);
});

test('Pages and production builds publish the same crawler guidance', () => {
  assert.equal(read('public/robots.txt'), read('docs/robots.txt'));
  assert.equal(read('public/sitemap.xml'), read('docs/sitemap.xml'));
  assert.equal(read('public/llms.txt'), read('docs/llms.txt'));
  assert.equal(read('public/llms-full.txt'), read('docs/llms-full.txt'));
  assert.doesNotThrow(() => JSON.parse(read('docs/manifest.webmanifest')));
});