import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const assetDirectory = path.resolve('dist/assets');
const files = await readdir(assetDirectory);
const entry = files.find((file) => /^index-.*\.js$/.test(file));
if (!entry) throw new Error('Bundle budget check could not find the application entry chunk.');
const bytes = gzipSync(await readFile(path.join(assetDirectory, entry))).byteLength;
// Vite 6 supports the Node 22.6 runtime floor and emits a slightly larger
// entry chunk than Vite 8 for the same application graph.
const budget = 190 * 1024;
if (bytes > budget) throw new Error(`Initial application bundle is ${(bytes / 1024).toFixed(1)} KiB gzip; budget is ${(budget / 1024).toFixed(0)} KiB.`);
process.stdout.write(`Bundle budget passed: ${(bytes / 1024).toFixed(1)} KiB gzip (limit ${(budget / 1024).toFixed(0)} KiB).\n`);
