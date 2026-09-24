import { createApplication, finalizeApplication } from '../server/app';
import { loadServerConfig } from '../server/config';

// Vercel invokes this module as a serverless function. Keep it independent of
// the standalone server bootstrap so it never attempts to bind a port or load
// local-only lifecycle behavior inside the function runtime.
const config = loadServerConfig();
const app = createApplication({ requestBodyLimit: config.requestBodyLimit });

export default finalizeApplication(app);
