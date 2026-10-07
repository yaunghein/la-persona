import type { H3Event } from 'h3';
import { getRequestURL } from 'h3';
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

export function normalizeRoute(pathname: string, params?: RouteParams) {
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

export function isNoisyPath(pathname: string) {
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  return (
    path === '/api/auth/get-session' ||
    path === '/api/analytics' ||
    path === '/api/s3/image-proxy'
  );
}

export function shouldEmit(input: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  emailFailed: boolean;
}) {
  const failed = input.status >= 400 || input.emailFailed;
  const slow = input.durationMs > SLOW_MS;
  if (isNoisyPath(input.path)) return failed || slow;
  if (failed || slow) return true;
  const method = input.method.toUpperCase();
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
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

function statusFromUnknown(error: unknown) {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400) return statusCode;
  }
  return 500;
}

function validationFields(data: unknown) {
  if (!Array.isArray(data) || data.length === 0) return;
  const fields = data.flatMap((issue) => {
    if (!issue || typeof issue !== 'object' || !('path' in issue)) return [];
    const path = (issue as { path?: unknown }).path;
    if (!Array.isArray(path) || path.length === 0) return [];
    const field = path
      .filter((part) => typeof part === 'string' || typeof part === 'number')
      .join('.');
    return field ? [field] : [];
  });
  if (fields.length === 0) return;
  return `Validation failed: ${[...new Set(fields)].join(', ')}`;
}

function messageFromUnknown(error: unknown, status: number) {
  const data =
    error && typeof error === 'object' && 'data' in error
      ? (error as { data?: unknown }).data
      : undefined;
  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'message' in data &&
    typeof (data as { message?: unknown }).message === 'string' &&
    (data as { message: string }).message
  ) {
    return (data as { message: string }).message;
  }

  const fields = validationFields(data);
  if (fields) return fields;

  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'statusMessage' in error) {
    const statusMessage = (error as { statusMessage?: unknown }).statusMessage;
    if (
      typeof statusMessage === 'string' &&
      statusMessage &&
      statusMessage !== 'Server Error'
    ) {
      return statusMessage;
    }
  }
  return status >= 500 ? 'Internal Server Error' : 'Request failed';
}

function isH3Error(error: unknown) {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { constructor?: { __h3_error__?: boolean } }).constructor
      ?.__h3_error__ === true
  );
}

export function toLogError(error: unknown, status: number): WideEventError {
  const named = error instanceof Error ? error : undefined;
  const result: WideEventError = {
    type: isH3Error(error) ? 'H3Error' : named?.name || 'Error',
    message: messageFromUnknown(error, status),
  };
  if (status >= 500 && named?.stack) result.stack = named.stack;
  return result;
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

  const user = event.context.user;
  if (!wide.user_id && user?.id) wide.user_id = user.id;
  if (!wide.user_email && user?.email) wide.user_email = user.email;

  const organizationId = event.context.session?.activeOrganizationId;
  if (!wide.organization_id && organizationId) {
    wide.organization_id = organizationId;
  }

  if (!wide.outcome) {
    wide.outcome =
      status >= 500 ? 'error' : status >= 400 ? 'client_error' : 'success';
  }

  if (status < 500 && wide.error) {
    delete wide.error.stack;
  }

  const emailFailed = wide.email?.ok === false;
  if (
    !shouldEmit({
      method: wide.method,
      path: pathname,
      status,
      durationMs: wide.duration_ms,
      emailFailed,
    })
  ) {
    return;
  }

  if (status >= 500 || emailFailed) {
    logger.error(wide);
    return;
  }
  if (status >= 400 || wide.duration_ms > SLOW_MS) {
    logger.warn(wide);
    return;
  }
  logger.info(wide);
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
