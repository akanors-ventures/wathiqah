import type { IncomingMessage } from 'http';

/**
 * Minimal cookie-header parser for WebSocket upgrade requests. `cookie-parser`
 * is Express middleware and never runs on the raw `upgrade` event graphql-ws
 * handles, so subscriptions need their own parse of `request.headers.cookie`.
 */
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

/**
 * Builds a GraphQL execution context for both transports behind one
 * `context` option: HTTP requests already have `req`/`res` from Express;
 * graphql-ws subscriptions only have the raw upgrade `request` inside
 * `extra`. For the WS case we synthesize a `req`-shaped object with
 * `.cookies` populated so the existing `GqlAuthGuard` (Passport JWT,
 * extracts from `req.cookies.accessToken`) and `OrgRolesGuard` (reads
 * `req.user`) work unchanged for subscriptions — no separate auth path to
 * maintain.
 *
 * Note: a subscription's org scope is fixed to whatever `activeOrgId` was in
 * the JWT at connection time. Switching org context in another tab doesn't
 * retarget already-open subscriptions until the client reconnects.
 */
export function buildGraphQLContext(ctxOrReqRes: {
  req?: unknown;
  res?: unknown;
  extra?: { request?: IncomingMessage };
}) {
  if (ctxOrReqRes?.req) {
    return { req: ctxOrReqRes.req, res: ctxOrReqRes.res };
  }

  const request = ctxOrReqRes?.extra?.request;
  const cookies = parseCookies(request?.headers.cookie);
  return { req: { cookies, headers: request?.headers ?? {} } };
}
