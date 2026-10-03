import { readFileSync } from 'node:fs';

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const required = [
  'FROM node:22.6.0-bookworm-slim AS build',
  'FROM node:22.6.0-bookworm-slim AS runtime',
  'RUN npm run build && npm prune --omit=dev',
  'ENV NODE_ENV=production',
  'USER node',
  'HEALTHCHECK',
  "fetch('http://127.0.0.1:3000/api/health')",
  'CMD ["node", "dist/server.cjs"]',
];

for (const expected of required) {
  if (!dockerfile.includes(expected)) throw new Error(`Dockerfile production contract is missing: ${expected}`);
}

for (const forbidden of ['COPY .env', 'COPY --from=build /app/.npmrc', 'USER root\n\nEXPOSE']) {
  if (dockerfile.includes(forbidden)) throw new Error(`Dockerfile must not include runtime secret or root contract: ${forbidden}`);
}

process.stdout.write('Container production contract passed.\n');
