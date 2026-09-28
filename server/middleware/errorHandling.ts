import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function asyncRoute(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    void Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export const attachRequestId: RequestHandler = (request, response, next) => {
  const suppliedRequestId = request.header('x-request-id');
  const requestId = suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();

  response.locals.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
};

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', `No route matches ${request.method} ${request.originalUrl}.`));
};

function normalizeError(error: unknown) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return new HttpError(400, 'INVALID_JSON', 'The request body contains invalid JSON.');
  }

  return new HttpError(500, 'INTERNAL_ERROR', 'The server could not complete the request.');
}

function logServerError(error: unknown, request: Request, requestId: string) {
  const cause = error instanceof Error ? error : new Error(String(error));
  const event = {
    level: 'error',
    event: 'request_failed',
    requestId,
    method: request.method,
    path: request.path,
    errorName: cause.name,
    errorMessage: cause.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : cause.stack,
  };

  process.stderr.write(`${JSON.stringify(event)}\n`);
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const normalized = normalizeError(error);
  const requestId = String(response.locals.requestId || randomUUID());

  if (normalized.status >= 500) {
    logServerError(error, request, requestId);
  }

  response.status(normalized.status).json({
    success: false,
    error: normalized.message,
    code: normalized.code,
    requestId,
    ...(normalized.details === undefined ? {} : { details: normalized.details }),
  });
};