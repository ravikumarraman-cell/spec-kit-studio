import { Router } from 'express';
import { loadRegulatoryModeConfig, publicDeploymentContext } from '../regulatoryMode';

export function createHealthRouter() {
  const router = Router();
  // Deliberately public: it gives the browser a truthful deployment label
  // before authentication, without exposing any security configuration.
  router.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), deployment: publicDeploymentContext(loadRegulatoryModeConfig()) }));
  return router;
}
