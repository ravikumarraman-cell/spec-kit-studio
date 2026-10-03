import dotenv from 'dotenv';

/**
 * Load local runtime configuration without ever overriding deployment or shell
 * values. The order deliberately mirrors the documented precedence:
 * environment, then .env.local, then .env.
 */
export function loadRuntimeEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  paths: readonly string[] = ['.env.local', '.env'],
) {
  for (const path of paths) {
    dotenv.config({ path, processEnv: environment, override: false, quiet: true });
  }
}
