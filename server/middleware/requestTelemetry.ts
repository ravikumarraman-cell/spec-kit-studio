import type { RequestHandler } from 'express';

export const requestTelemetry: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const event = {
      level: response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
      event: 'request_completed',
      requestId: response.locals.requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    };
    process.stdout.write(`${JSON.stringify(event)}\n`);
  });

  next();
};