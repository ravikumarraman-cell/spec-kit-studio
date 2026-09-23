import dotenv from "dotenv";
import { registerShutdownHandlers, serveApplication } from './server/bootstrap';
import { createApplication, finalizeApplication } from './server/app';
import { loadServerConfig } from './server/config';

dotenv.config();

const config = loadServerConfig();
const app = createApplication({ requestBodyLimit: config.requestBodyLimit });

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  void serveApplication(app, config)
    .then((server) => registerShutdownHandlers(server, config.shutdownGracePeriodMs))
    .catch((error: unknown) => {
      const cause = error instanceof Error ? error : new Error(String(error));
      process.stderr.write(`${JSON.stringify({ level: 'error', event: 'server_start_failed', message: cause.message })}\n`);
      process.exitCode = 1;
    });
} else {
  finalizeApplication(app);
}

export default app;
