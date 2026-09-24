import { createApplication, finalizeApplication } from './app';

// This deliberately contains only the request application. It is bundled for
// Vercel separately from server.ts, whose local-development bootstrap imports
// Vite and owns port/lifecycle behavior that a serverless function must not
// load.
export default finalizeApplication(createApplication());
