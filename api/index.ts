import { createRequire } from 'node:module';

// Vercel transpiles this entrypoint but does not trace sibling TypeScript
// modules reliably for an ESM function. The build produces one explicit CJS
// request bundle and vercel.json includes it with this function.
const require = createRequire(import.meta.url);
const { default: app } = require('../dist/vercel.cjs') as { default: import('express').Express };

export default app;
