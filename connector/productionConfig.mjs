import path from 'node:path';

export const CONNECTOR_MODES = Object.freeze({
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
});

export const DEVELOPMENT_ALLOWED_ORIGINS = Object.freeze([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function commaSeparated(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function configurationError(messages) {
  return new Error(`Invalid Spec-Kit Studio connector configuration:\n- ${messages.join('\n- ')}`);
}

function isProductionOrigin(value) {
  try {
    const origin = new URL(value);
    return origin.protocol === 'https:' && origin.origin === value && !origin.username && !origin.password;
  } catch {
    return false;
  }
}

/**
 * Parses the local companion's environment without reading or logging secrets.
 * Development remains frictionless; production deliberately fails closed when
 * its repository boundary, browser origins, or pairing secret are implicit.
 */
export function loadConnectorConfiguration(environment = process.env, currentDirectory = process.cwd()) {
  const mode = environment.STUDIO_CONNECTOR_MODE || CONNECTOR_MODES.DEVELOPMENT;
  const configuredRootValues = commaSeparated(environment.STUDIO_ALLOWED_ROOTS);
  const configuredOriginValues = commaSeparated(environment.STUDIO_ALLOWED_ORIGINS);
  const token = environment.STUDIO_CONNECTOR_TOKEN || '';
  const configuredPort = environment.STUDIO_CONNECTOR_PORT || '4318';
  const port = Number(configuredPort);
  const errors = [];

  if (!Object.values(CONNECTOR_MODES).includes(mode)) {
    errors.push('STUDIO_CONNECTOR_MODE must be either development or production.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('STUDIO_CONNECTOR_PORT must be an integer between 1 and 65535.');
  }

  const allowedRoots = (configuredRootValues.length ? configuredRootValues : [currentDirectory])
    .filter((root) => {
      if (path.isAbsolute(root)) return true;
      errors.push(`STUDIO_ALLOWED_ROOTS entry "${root}" must be an absolute path.`);
      return false;
    })
    .map((root) => path.resolve(root));
  const allowedOrigins = configuredOriginValues.length ? configuredOriginValues : [...DEVELOPMENT_ALLOWED_ORIGINS];

  if (mode === CONNECTOR_MODES.PRODUCTION) {
    if (!configuredRootValues.length) errors.push('Production mode requires an explicit STUDIO_ALLOWED_ROOTS value; it cannot fall back to the connector working directory.');
    if (!configuredOriginValues.length) errors.push('Production mode requires explicit HTTPS STUDIO_ALLOWED_ORIGINS; it cannot fall back to localhost origins.');
    if (!token) errors.push('Production mode requires STUDIO_CONNECTOR_TOKEN.');
    else if (Buffer.byteLength(token, 'utf8') < 32) errors.push('STUDIO_CONNECTOR_TOKEN must contain at least 32 bytes in production mode.');
    for (const origin of allowedOrigins) {
      if (!isProductionOrigin(origin)) errors.push(`Production origin "${origin}" must be an exact HTTPS origin without credentials or a path.`);
    }
  }

  if (errors.length) throw configurationError(errors);

  return Object.freeze({
    mode,
    port,
    token,
    allowedRoots: Object.freeze([...new Set(allowedRoots)]),
    allowedOrigins: Object.freeze([...new Set(allowedOrigins)]),
    isProduction: mode === CONNECTOR_MODES.PRODUCTION,
  });
}
