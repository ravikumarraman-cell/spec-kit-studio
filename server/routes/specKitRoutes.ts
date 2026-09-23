import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { HttpError } from '../middleware/errorHandling';

function readCatalog(vendorPath: string, relativePath: string) {
  const target = path.join(vendorPath, relativePath);
  return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf-8')) : null;
}

export function createSpecKitRouter(vendorPath = path.join(process.cwd(), 'vendor', 'spec-kit')) {
  const router = Router();
  router.get('/api/speckit/v107/info', (_req, res) => {
    const installed = fs.existsSync(vendorPath);
    const presets = installed ? readCatalog(vendorPath, 'presets/catalog.json') : null;
    const extensions = installed ? readCatalog(vendorPath, 'extensions/catalog.json') : null;
    res.json({ success: true, specKitVersion: '1.0.7', releaseTag: 'v1.0.7', installed, vendorPath, presetsCount: Object.keys(presets?.presets || {}).length, extensionsCount: Object.keys(extensions?.extensions || {}).length, workflowStages: ['constitution', 'specify', 'plan', 'tasks', 'implement'] });
  });
  router.get('/api/speckit/v107/templates', (_req, res) => {
    const templatesDir = path.join(vendorPath, 'templates');
    if (!fs.existsSync(templatesDir)) {
      throw new HttpError(404, 'SPECKIT_TEMPLATES_NOT_FOUND', 'Spec-Kit v1.0.7 templates directory not found.');
    }
    const templates = Object.fromEntries(fs.readdirSync(templatesDir).filter((file) => file.endsWith('.md') || file.endsWith('.json')).map((file) => [file, fs.readFileSync(path.join(templatesDir, file), 'utf-8')]));
    res.json({ success: true, version: '1.0.7', templates });
  });
  router.get('/api/speckit/v107/catalogs', (_req, res) => {
    res.json({ success: true, data: { version: '1.0.7', presets: readCatalog(vendorPath, 'presets/catalog.json'), presetsCommunity: readCatalog(vendorPath, 'presets/catalog.community.json'), extensions: readCatalog(vendorPath, 'extensions/catalog.json'), extensionsCommunity: readCatalog(vendorPath, 'extensions/catalog.community.json') } });
  });
  return router;
}
