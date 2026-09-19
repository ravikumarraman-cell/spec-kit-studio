import express from "express";
import dotenv from "dotenv";
import { createHealthRouter } from './server/routes/healthRoutes';
import { createSpecKitRouter } from './server/routes/specKitRoutes';
import { createIntegrationRouter } from './server/routes/integrationRoutes';
import { createPromptRouter } from './server/routes/promptRoutes';
import { createAuditRouter } from './server/routes/auditRoutes';
import { createRepositoryRouter } from './server/routes/repositoryRoutes';
import { createGenerationRouter } from './server/routes/generationRoutes';
import { serveApplication } from './server/bootstrap';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

app.use(createHealthRouter());
app.use(createSpecKitRouter());
app.use(createIntegrationRouter());
app.use(createPromptRouter());
app.use(createAuditRouter());
app.use(createRepositoryRouter());

app.use(createGenerationRouter());
app.use(createRepositoryRouter());

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  serveApplication(app, PORT);
}

export default app;
