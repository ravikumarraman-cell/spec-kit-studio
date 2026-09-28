import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const assetDirectory = path.resolve('dist/assets');
const files = await readdir(assetDirectory);
const entry = files.find((file) => /^index-.*\.js$/.test(file));
if (!entry) throw new Error('Bundle budget check could not find the application entry chunk.');
const bytes = gzipSync(await readFile(path.join(assetDirectory, entry))).byteLength;
const budget = 180 * 1024;
if (bytes > budget) throw new Error(`Initial application bundle is ${(bytes / 1024).toFixed(1)} KiB gzip; budget is ${(budget / 1024).toFixed(0)} KiB.`);
process.stdout.write(`Bundle budget passed: ${(bytes / 1024).toFixed(1)} KiB gzip (limit ${(budget / 1024).toFixed(0)} KiB).\n`);
