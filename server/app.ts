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

export interface ApplicationOptions {
  configureRoutes?: (app: Express) => void;
  environment?: string;
  requestBodyLimit?: string;
  auth?: AuthRuntime;
}

export function createApplication(options: ApplicationOptions = {}) {
  const app = express();
  const isProduction = (options.environment || process.env.NODE_ENV) === 'production';
  const auth = options.auth || new AuthRuntime(loadAuthConfig(), isProduction);

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(attachRequestId);
  app.use(requestTelemetry);
  app.use(express.json({ limit: options.requestBodyLimit || '10mb' }));

  app.use(createHealthRouter());
  app.use(createAuthRouter(auth));
  app.use(requireEnterpriseSession(auth));
  app.use(requireCsrf(auth));
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
