import type { RequestHandler } from 'express';
import type { RegulatoryModeConfig } from '../regulatoryMode';

/** Extra response controls for APIs that may carry CUI or mission data. */
export function regulatoryResponseProtection(config: RegulatoryModeConfig): RequestHandler {
  return (request, response, next) => {
    if (config.regulated && request.path.startsWith('/api/')) {
      response.setHeader('Cache-Control', 'no-store, max-age=0');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
      response.setHeader('Referrer-Policy', 'no-referrer');
    }
    next();
  };
}
