# syntax=docker/dockerfile:1.7
# Dependencies are installed exclusively from the public npm registry.
FROM node:22.6.0-bookworm-slim AS build

WORKDIR /app

# The committed project .npmrc pins installs to the public npm registry.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . ./
RUN npm run build && npm prune --omit=dev

FROM node:22.6.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

COPY --chown=node:node --from=build /app/package.json ./
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

USER node

EXPOSE 3000

# Health remains deliberately unauthenticated and contains only public
# deployment posture. It is safe for an orchestrator readiness/liveness probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/server.cjs"]
