import express, { Express } from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import { finalizeApplication } from './app';
import type { ServerConfig } from './config';

export async function serveApplication(app: Express, config: ServerConfig): Promise<Server> {
  if (process.env.NODE_ENV !== 'production') {
    // Vite is ESM-only. Loading it only for development keeps the CommonJS
    // production server bundle runnable under the supported Node runtime.
    const { createServer: createViteServer } = await import('vite');
    // Middleware mode supplies its own server override, so repeat the HMR
    // decision here rather than relying on vite.config.ts to merge it. This
    // keeps local test servers isolated and avoids a shared websocket port.
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === 'true' ? false : undefined },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Vite fingerprints assets, so cache them aggressively. The HTML shell is
    // deliberately not cached: it must point browsers to the newest release.
    // The Node bundles are generated beside public assets for deployment
    // tooling, but must never be served by the application itself.
    app.use('/server.cjs', (_req, res) => res.sendStatus(404));
    app.use('/server.cjs.map', (_req, res) => res.sendStatus(404));
    app.use('/vercel.cjs', (_req, res) => res.sendStatus(404));
    app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true }));
    app.use(express.static(distPath, {
      index: false,
      maxAge: 0,
      setHeaders: (response) => response.setHeader('Cache-Control', 'no-cache'),
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  finalizeApplication(app);

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, () => {
      process.stdout.write(`${JSON.stringify({
        level: 'info',
        event: 'server_started',
        host: config.host,
        port: config.port,
        environment: process.env.NODE_ENV || 'development',
      })}\n`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

export function registerShutdownHandlers(server: Server, gracePeriodMs: number) {
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stdout.write(`${JSON.stringify({ level: 'info', event: 'server_stopping', signal })}\n`);

    const forceShutdown = setTimeout(() => {
      process.stderr.write(`${JSON.stringify({ level: 'error', event: 'server_shutdown_timeout' })}\n`);
      process.exit(1);
    }, gracePeriodMs);
    forceShutdown.unref();

    server.close((error) => {
      clearTimeout(forceShutdown);
      if (error) {
        process.stderr.write(`${JSON.stringify({ level: 'error', event: 'server_shutdown_failed', message: error.message })}\n`);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
