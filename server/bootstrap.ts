import express, { Express } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

export async function serveApplication(app: Express, port: number) {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(port, '0.0.0.0', () => console.log(`Spec-Kit Studio Server running on http://0.0.0.0:${port}`));
}
