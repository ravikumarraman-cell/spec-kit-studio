import express, { Express } from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { finalizeApplication } from './app';
import type { ServerConfig } from './config';

export async function serveApplication(app: Express, config: ServerConfig): Promise<Server> {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
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
