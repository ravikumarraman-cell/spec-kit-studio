import type { RequestHandler } from 'express';
import { HttpError } from './errorHandling';

export interface MutationRateLimitOptions {
  /** Maximum state-changing API requests a client may make during one window. */
  maxRequests: number;
  /** A fixed window keeps the limiter predictable and makes Retry-After exact. */
  windowMs: number;
  now?: () => number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Provides a deliberately small, dependency-free backstop for mutation
 * endpoints. It is process-local by design: deployments with more than one
 * instance must retain their edge/gateway rate limit as the authoritative
 * distributed control.
 */
export function createMutationRateLimit(options: MutationRateLimitOptions): RequestHandler {
  if (!Number.isSafeInteger(options.maxRequests) || options.maxRequests <= 0) {
    throw new Error('Mutation rate-limit maxRequests must be a positive integer.');
  }
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs <= 0) {
    throw new Error('Mutation rate-limit windowMs must be a positive integer.');
  }

  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now || Date.now;

  return (request, response, next) => {
    if (!request.path.startsWith('/api/') || !MUTATING_METHODS.has(request.method)) {
      next();
      return;
    }

    const currentTime = now();
    const clientKey = request.ip || request.socket.remoteAddress || 'unknown';
    const previous = buckets.get(clientKey);
    const bucket = !previous || previous.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + options.windowMs }
      : previous;

    bucket.count += 1;
    buckets.set(clientKey, bucket);

    if (bucket.count <= options.maxRequests) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1_000));
    response.setHeader('Retry-After', String(retryAfterSeconds));
    next(new HttpError(429, 'MUTATION_RATE_LIMITED', 'Too many state-changing requests. Try again shortly.'));
  };
}
