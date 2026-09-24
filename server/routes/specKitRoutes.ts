import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { HttpError } from '../middleware/errorHandling';
import { SPECKIT_RELEASE_TAG, SPECKIT_VERSION } from '../../src/lib/specKitCompliance';

function readCatalog(vendorPath: string, relativePath: string) {
  const target = path.join(vendorPath, relativePath);
  return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf-8')) : null;
}

export function createSpecKitRouter(vendorPath = path.join(process.cwd(), 'vendor', 'spec-kit')) {
  const router = Router();
  router.get(['/api/speckit/info', '/api/speckit/v107/info'], (_req, res) => {
    const installed = fs.existsSync(vendorPath);
    const presets = installed ? readCatalog(vendorPath, 'presets/catalog.json') : null;
    const extensions = installed ? readCatalog(vendorPath, 'extensions/catalog.json') : null;
    res.json({
      success: true,
      specKitVersion: SPECKIT_VERSION,
      releaseTag: SPECKIT_RELEASE_TAG,
      installed,
      vendorPath,
      presetsCount: Object.keys(presets?.presets || {}).length,
      extensionsCount: Object.keys(extensions?.extensions || {}).length,
      officialWorkflowStages: ['constitution', 'specify', 'clarify', 'plan', 'checklist', 'tasks', 'analyze', 'implement'],
      workflowStages: ['constitution', 'specify', 'clarify', 'plan', 'checklist', 'tasks', 'analyze', 'implement', 'converge'],
      compatibility: { strictProfile: true, featureRoot: 'specs/NNN-feature-name', minimumVersion: SPECKIT_VERSION },
    });
  });
  router.get(['/api/speckit/templates', '/api/speckit/v107/templates'], (_req, res) => {
    const templatesDir = path.join(vendorPath, 'templates');
    if (!fs.existsSync(templatesDir)) {
      throw new HttpError(404, 'SPECKIT_TEMPLATES_NOT_FOUND', `Spec-Kit ${SPECKIT_RELEASE_TAG} templates directory not found.`);
    }
    const templates = Object.fromEntries(fs.readdirSync(templatesDir).filter((file) => file.endsWith('.md') || file.endsWith('.json')).map((file) => [file, fs.readFileSync(path.join(templatesDir, file), 'utf-8')]));
    res.json({ success: true, version: SPECKIT_VERSION, templates });
  });
  router.get(['/api/speckit/catalogs', '/api/speckit/v107/catalogs'], (_req, res) => {
    res.json({ success: true, data: { version: SPECKIT_VERSION, presets: readCatalog(vendorPath, 'presets/catalog.json'), presetsCommunity: readCatalog(vendorPath, 'presets/catalog.community.json'), extensions: readCatalog(vendorPath, 'extensions/catalog.json'), extensionsCommunity: readCatalog(vendorPath, 'extensions/catalog.community.json') } });
  });
  return router;
}
