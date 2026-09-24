import { createApplication, finalizeApplication } from '../server/app';

// Vercel invokes this module as a serverless function. Keep it independent of
// the standalone server bootstrap and its port/lifecycle configuration. A
// serverless handler never binds a port, and a malformed standalone-only env
// value must not make the health endpoint unavailable during module loading.
const app = createApplication();

export default finalizeApplication(app);
