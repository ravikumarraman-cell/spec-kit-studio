import compression from 'compression';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { attachRequestId, errorHandler, notFoundHandler } from './middleware/errorHandling';
import { requestTelemetry } from './middleware/requestTelemetry';
import { createAuditRouter } from './routes/auditRoutes';
import { createGenerationRouter } from './routes/generationRoutes';
import { createHealthRouter } from './routes/healthRoutes';
import { createIntegrationRouter } from './routes/integrationRoutes';
import { createPromptRouter } from './routes/promptRoutes';
import { createRepositoryRouter } from './routes/repositoryRoutes';
import { createSpecKitRouter } from './routes/specKitRoutes';
import { createAuthRouter } from './routes/authRoutes';
import { AuthRuntime } from './auth/runtime';
import { loadAuthConfig } from './config';
import { requireCsrf, requireEnterpriseSession } from './middleware/authentication';
import { regulatoryResponseProtection } from './middleware/regulatorySecurity';
import { loadRegulatoryModeConfig } from './regulatoryMode';
import { createMutationRateLimit } from './middleware/mutationRateLimit';

export interface ApplicationOptions {
  configureRoutes?: (app: Express) => void;
  environment?: string;
  requestBodyLimit?: string;
  auth?: AuthRuntime;
}

export function createApplication(options: ApplicationOptions = {}) {
  const app = express();
  const isProduction = (options.environment || process.env.NODE_ENV) === 'production';
  const regulatory = loadRegulatoryModeConfig();
  const auth = options.auth || new AuthRuntime(loadAuthConfig(), isProduction);

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: isProduction ? { useDefaults: true, directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'", "'sha256-uT9A+EyREh4Vam4Bo2Ty6ZORureejCKyoYbcmMPvqVE='"],
      connectSrc: ["'self'", 'http://localhost:*', 'http://127.0.0.1:*'],
      imgSrc: ["'self'", 'data:', 'https:'],
    }} : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(attachRequestId);
  app.use(requestTelemetry);
  app.use(regulatoryResponseProtection(regulatory));
  // A process-local safeguard complements, but never replaces, the distributed
  // rate limiting required at a public deployment edge.
  if (isProduction) app.use(createMutationRateLimit({ maxRequests: 120, windowMs: 60_000 }));
  app.use(express.json({ limit: options.requestBodyLimit || '10mb' }));

  app.use(createHealthRouter());
  app.use(createAuthRouter(auth));
  // The React shell must remain reachable so AuthGate can initiate the OIDC
  // redirect. Protect application data/mutations, not the static SPA route.
  // Auth endpoints were mounted above and terminate their own requests.
  app.use('/api', requireEnterpriseSession(auth));
  app.use('/api', requireCsrf(auth));
  app.use(createSpecKitRouter());
  app.use(createIntegrationRouter(auth));
  app.use(createPromptRouter());
  app.use(createAuditRouter());
  app.use(createRepositoryRouter());
  app.use(createGenerationRouter());

  options.configureRoutes?.(app);
  app.use('/api', notFoundHandler);

  return app;
}

export function finalizeApplication(app: Express) {
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
