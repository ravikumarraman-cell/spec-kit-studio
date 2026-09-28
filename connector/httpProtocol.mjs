/** Shared, fail-closed HTTP boundary for the loopback connector. */
export function redactSensitiveOutput(value) {
  return String(value || '')
    .replace(/\b(bearer)\s+[A-Za-z0-9._~+/-]+=*/gi, '$1 [REDACTED]')
    .replace(/\b((?:api[_-]?key|token|secret|password|authorization)\s*(?:=|:|is)\s*)([^\s,;]+)/gi, '$1[REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED]');
}

export function sendJson(req, res, status, payload, allowedOrigins) {
  const origin = req.headers.origin;
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  res.writeHead(status, {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Access-Control-Allow-Origin': corsOrigin, Vary: 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, X-Studio-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Private-Network': 'true',
  });
  res.end(JSON.stringify(payload));
}

export async function parseJsonBody(req, maximumBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maximumBytes) throw new Error('Request is too large. Reduce the pasted content and try again.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
  catch { throw new Error('Studio received malformed request data. Refresh the page and try again.'); }
}
