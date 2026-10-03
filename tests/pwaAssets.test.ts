import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

function pngDimensions(path: string) {
  const image = readFileSync(new URL(path, root));
  assert.equal(image.toString('ascii', 1, 4), 'PNG');
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

test('publishes fixed-size raster icons required by Chromium PWA installation', () => {
  const manifest = JSON.parse(readFileSync(new URL('public/manifest.webmanifest', root), 'utf8')) as {
    icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
  };

  assert.ok(manifest.icons.some((icon) => icon.src === 'pwa-icon-192.png' && icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(manifest.icons.some((icon) => icon.src === 'pwa-icon-512.png' && icon.sizes === '512x512' && icon.type === 'image/png'));
  assert.ok(manifest.icons.some((icon) => icon.src === 'pwa-maskable-icon-512.png' && icon.sizes === '512x512' && icon.purpose === 'maskable'));
  assert.deepEqual(pngDimensions('public/pwa-icon-192.png'), { width: 192, height: 192 });
  assert.deepEqual(pngDimensions('public/pwa-icon-512.png'), { width: 512, height: 512 });
  assert.deepEqual(pngDimensions('public/pwa-maskable-icon-512.png'), { width: 512, height: 512 });
});