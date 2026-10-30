import type { H3Event } from 'h3';
import { getRequestURL } from 'h3';
import { inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { organization } from '~~/server/db/schema';
import { logger } from './logger';

const SLOW_MS = 1000;

export type WideEventError = {
  type: string;
  message: string;
  stack?: string;
};

export type EmailSendResult = {
  ok: boolean;
  template: string;
  to: string[];
  error?: string;
};

export type WideEvent = {
  request_id: string;
  method: string;
  route: string;
  status_code?: number;
  duration_ms?: number;
  outcome?: 'success' | 'client_error' | 'error';
  user_id?: string;
  user_email?: string;
  impersonator_id?: string;
  organization_id?: string;
  organization_name?: string;
  error?: WideEventError;
  email?: {
    template?: string;
    to?: string[];
    ok?: boolean;
    attempted?: boolean;
    error?: string;
  };
  [key: string]: unknown;
};

type RouteParams = Record<string, string | undefined>;

export function emailErrorLabel(error: unknown): string {
  if (error instanceof Error) {
    if (error.name && error.name !== 'Error') return error.name;
    if (error.message) return error.message;
  }
  return 'Error';
}

/** Replaces param values with `:name` so tokens and ids stay out of `route`. */
function normalizeRoute(pathname: string, params?: RouteParams) {
  const path = pathname.split('?')[0] || pathname;
  if (!params) return path;

  const entries = Object.entries(params)
    .flatMap(([key, value]) => (value ? [[key, value] as const] : []))
    .sort((a, b) => b[1].length - a[1].length);

  let route = path;
  for (const [key, value] of entries) {
    if (value.length < 2) continue;
    route = route.split(value).join(`:${key}`);
  }
  return route;
}

export function enrichLog(event: H3Event, fields: Record<string, unknown>) {
  const wide = event.context.wideEvent;
  if (!wide) return;

  for (const [key, value] of Object.entries(fields)) {
    const current = wide[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      Object.assign(current, value);
      continue;
    }
    wide[key] = value;
  }
}

export function toLogError(error: unknown, status: number): WideEventError {
  const named = error instanceof Error ? error : undefined;
  const fields =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : {};
  const data = 'data' in fields ? fields.data : undefined;
  const dataMessage =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as { message?: unknown }).message
      : undefined;
  // Validation errors carry zod issues: log the field paths, never the values.
  const invalidFields = Array.isArray(data)
    ? data.flatMap((issue) => {
        const path = (issue as { path?: unknown } | null)?.path;
        if (!Array.isArray(path)) return [];
        const field = path
          .filter(
            (part) => typeof part === 'string' || typeof part === 'number'
          )
          .join('.');
        return field ? [field] : [];
      })
    : [];
  const statusMessage = fields.statusMessage;

  let message = status >= 500 ? 'Internal Server Error' : 'Request failed';
  if (typeof dataMessage === 'string' && dataMessage) message = dataMessage;
  else if (invalidFields.length > 0)
    message = `Validation failed: ${[...new Set(invalidFields)].join(', ')}`;
  else if (named?.message) message = named.message;
  else if (
    typeof statusMessage === 'string' &&
    statusMessage &&
    statusMessage !== 'Server Error'
  )
    message = statusMessage;

  const isH3Error =
    (fields.constructor as { __h3_error__?: boolean } | undefined)
      ?.__h3_error__ === true;
  const result: WideEventError = {
    type: isH3Error ? 'H3Error' : named?.name || 'Error',
    message,
  };
  if (status >= 500 && named?.stack) result.stack = named.stack;
  return result;
}

/** Fills `organization_name` (or `organization.name`) next to every organization id on the line. */
async function addOrganizationNames(wide: WideEvent) {
  type Fields = Record<string, unknown>;
  const targets: Array<{ fields: Fields; id: string; nameKey: string }> = [];
  const add = (fields: Fields, id: unknown, nameKey: string) => {
    if (typeof id === 'string' && id && !fields[nameKey]) {
      targets.push({ fields, id, nameKey });
    }
  };

  add(wide, wide.organization_id, 'organization_name');
  for (const [key, value] of Object.entries(wide)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const nested = value as Fields;
    if (key === 'organization') add(nested, nested.id, 'name');
    else add(nested, nested.organization_id, 'organization_name');
  }
  if (targets.length === 0) return;

  try {
    const ids = [...new Set(targets.map((target) => target.id))];
    const rows = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(inArray(organization.id, ids));
    const names = new Map(rows.map((row) => [row.id, row.name]));
    for (const target of targets) {
      const name = names.get(target.id);
      if (name) target.fields[target.nameKey] = name;
    }
  } catch {
    // The request line still goes out with ids only.
  }
}

export function emitWideEvent(event: H3Event) {
  if (event.context.wideEventEmitted) return;
  const wide = event.context.wideEvent;
  if (!wide) return;
  event.context.wideEventEmitted = true;

  const rawStatus = event.node.res.statusCode;
  const status = wide.status_code ?? (rawStatus >= 100 ? rawStatus : 200);
  wide.status_code = status;

  const startedAt = event.context.wideEventStartedAt ?? Date.now();
  wide.duration_ms = Date.now() - startedAt;

  const pathname = getRequestURL(event).pathname;
  wide.method = wide.method || event.method;
  wide.route = normalizeRoute(
    pathname,
    event.context.params as RouteParams | undefined
  );

  const principal = event.context.principal;
  if (!wide.user_id && principal?.user.id) wide.user_id = principal.user.id;
  if (!wide.user_email && principal?.user.email) {
    wide.user_email = principal.user.email;
  }
  // `user_*` is the impersonated user; this records the admin acting as them.
  if (principal?.impersonatorId)
    wide.impersonator_id = principal.impersonatorId;

  // Top-level `organization_id` is set by authorization for the organization the
  // request acted on; the caller's active workspace is kept apart so it can't be mistaken for it.
  const sessionOrganizationId = principal?.session.activeOrganizationId;
  if (sessionOrganizationId) {
    wide.session = { organization_id: sessionOrganizationId };
  }

  if (!wide.outcome) {
    wide.outcome =
      status >= 500 ? 'error' : status >= 400 ? 'client_error' : 'success';
  }

  if (status < 500 && wide.error) {
    delete wide.error.stack;
  }

  const emailFailed = wide.email?.ok === false;
  const failed = status >= 400 || emailFailed;
  const slow = wide.duration_ms > SLOW_MS;
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  const isNoisy =
    path === '/api/auth/get-session' ||
    path === '/api/public/image-proxy' ||
    /^\/api\/public\/cards\/[^/]+\/interactions$/.test(path);
  const method = wide.method.toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  // Logged: failures, slow calls, and writes outside the noisy routes.
  if (!failed && !slow && (isRead || isNoisy)) return;

  const level =
    status >= 500 || emailFailed ? 'error' : failed || slow ? 'warn' : 'info';
  void addOrganizationNames(wide).then(() => logger[level](wide));
}

export function settleEmailResults(
  event: H3Event,
  requestId: string | undefined,
  results: EmailSendResult[]
) {
  const failed = results.filter((result) => !result.ok);
  if (failed.length === 0) {
    if (!event.context.wideEventEmitted && results.length > 0) {
      enrichLog(event, {
        email: {
          ok: true,
          to: results.flatMap((result) => result.to),
          template: results.map((result) => result.template).join(','),
        },
      });
    }
    return;
  }

  const failure = {
    ok: false as const,
    to: failed.flatMap((result) => result.to),
    template: failed.map((result) => result.template).join(','),
    error: failed
      .map((result) => result.error)
      .filter(Boolean)
      .join('; '),
  };

  if (event.context.wideEvent && !event.context.wideEventEmitted) {
    enrichLog(event, { email: failure });
    return;
  }

  for (const result of failed) {
    logger.error({
      request_id: requestId,
      outcome: 'error',
      email: {
        template: result.template,
        to: result.to,
        ok: false,
        error: result.error,
      },
    });
  }
}

export function trackEmailSends(
  event: H3Event,
  sends: Promise<EmailSendResult[]>
) {
  const requestId = event.context.wideEvent?.request_id;
  void sends.then(
    (results) => settleEmailResults(event, requestId, results),
    (error: unknown) =>
      settleEmailResults(event, requestId, [
        {
          ok: false,
          template: 'email',
          to: [],
          error: emailErrorLabel(error),
        },
      ])
  );
}
