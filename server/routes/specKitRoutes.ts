import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export function createSpecKitRouter(vendorPath = path.join(process.cwd(), 'vendor', 'spec-kit')) {
  const router = Router();
  router.get('/api/speckit/v107/info', (_req, res) => {
    try {
      const installed = fs.existsSync(vendorPath);
      const readCatalog = (relative: string) => {
        const target = path.join(vendorPath, relative);
        return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf-8')) : null;
      };
      const presets = installed ? readCatalog('presets/catalog.json') : null;
      const extensions = installed ? readCatalog('extensions/catalog.json') : null;
      res.json({ success: true, specKitVersion: '1.0.7', releaseTag: 'v1.0.7', installed, vendorPath, presetsCount: Object.keys(presets?.presets || {}).length, extensionsCount: Object.keys(extensions?.extensions || {}).length, workflowStages: ['constitution', 'specify', 'plan', 'tasks', 'implement'] });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  });
  router.get('/api/speckit/v107/templates', (_req, res) => {
    try {
      const templatesDir = path.join(vendorPath, 'templates');
      if (!fs.existsSync(templatesDir)) return res.status(404).json({ success: false, error: 'Spec-Kit v1.0.7 templates directory not found.' });
      const templates = Object.fromEntries(fs.readdirSync(templatesDir).filter((file) => file.endsWith('.md') || file.endsWith('.json')).map((file) => [file, fs.readFileSync(path.join(templatesDir, file), 'utf-8')]));
      res.json({ success: true, version: '1.0.7', templates });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  });
  router.get('/api/speckit/v107/catalogs', (_req, res) => {
    try {
      const readCatalog = (relative: string) => { const target = path.join(vendorPath, relative); return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf-8')) : null; };
      res.json({ success: true, data: { version: '1.0.7', presets: readCatalog('presets/catalog.json'), presetsCommunity: readCatalog('presets/catalog.community.json'), extensions: readCatalog('extensions/catalog.json'), extensionsCommunity: readCatalog('extensions/catalog.community.json') } });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
  });
  return router;
}
